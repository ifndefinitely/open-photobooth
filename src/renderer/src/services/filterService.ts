// Filter service — pure functions for applying color filters to photos.
// No internal state; receives arguments and returns results.

import type { CaptureResult } from '@/services/cameraService'
import type { FilterType } from '@/stores/stripStore'

// ─── Filter Application ─────────────────────────────────────────────────────

/**
 * Apply a color filter to a single photo.
 * Returns a new CaptureResult with the filter applied to the image data.
 * The 'none' filter returns the original unchanged.
 */
export async function applyFilter(
  photo: CaptureResult,
  filter: FilterType
): Promise<CaptureResult> {
  if (filter === 'none') return photo

  const img = await loadImageFromDataUrl(photo.dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas rendering context')

  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  switch (filter) {
    case 'bw':
      applyGrayscale(data)
      break
    case 'sepia':
      applySepia(data)
      break
    case 'vintage':
      applyVintage(data, canvas.width, canvas.height)
      break
  }

  ctx.putImageData(imageData, 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Failed to create filtered image blob'))
    }, 'image/png')
  })

  const dataUrl = canvas.toDataURL('image/png')

  return { blob, dataUrl, width: canvas.width, height: canvas.height }
}

/**
 * Apply a color filter to all photos in an array.
 * Processes sequentially to avoid excessive memory usage.
 */
export async function applyFilterToAll(
  photos: CaptureResult[],
  filter: FilterType
): Promise<CaptureResult[]> {
  if (filter === 'none') return photos

  const results: CaptureResult[] = []
  for (const photo of photos) {
    results.push(await applyFilter(photo, filter))
  }
  return results
}

/**
 * Generate a small filter preview thumbnail.
 * Returns a dataUrl of the filtered image scaled to maxSize.
 */
export async function generateFilterThumbnail(
  photo: CaptureResult,
  filter: FilterType,
  maxSize: number
): Promise<string> {
  const img = await loadImageFromDataUrl(photo.dataUrl)

  // Scale down first for performance
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas rendering context')

  ctx.drawImage(img, 0, 0, w, h)

  if (filter !== 'none') {
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data

    switch (filter) {
      case 'bw':
        applyGrayscale(data)
        break
      case 'sepia':
        applySepia(data)
        break
      case 'vintage':
        applyVintage(data, w, h)
        break
    }

    ctx.putImageData(imageData, 0, 0)
  }

  return canvas.toDataURL('image/png')
}

// ─── Filter Algorithms ───────────────────────────────────────────────────────

function applyGrayscale(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
    // alpha unchanged
  }
}

function applySepia(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = Math.min(255, gray * 1.2) // R — warm
    data[i + 1] = gray * 1.0 // G — neutral
    data[i + 2] = gray * 0.8 // B — reduced
  }
}

function applyVintage(data: Uint8ClampedArray, width: number, height: number): void {
  const cx = width / 2
  const cy = height / 2
  const maxDist = Math.sqrt(cx * cx + cy * cy)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4

      // Reduce contrast
      let r = data[i] * 0.8 + 25
      let g = data[i + 1] * 0.8 + 25
      let b = data[i + 2] * 0.8 + 25

      // Warm tint
      r *= 1.1
      b *= 0.9

      // Vignette — darken edges with smooth falloff
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const vignette = 1 - 0.4 * Math.pow(dist / maxDist, 2)
      r *= vignette
      g *= vignette
      b *= vignette

      data[i] = Math.min(255, Math.max(0, r))
      data[i + 1] = Math.min(255, Math.max(0, g))
      data[i + 2] = Math.min(255, Math.max(0, b))
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image for filtering'))
    img.src = dataUrl
  })
}
