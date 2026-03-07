// Strip composition service — pure functions for assembling photo strips.
// No internal state; receives arguments and returns results.

import type { CaptureResult } from '@/services/cameraService'
import type { BorderStyle, DateStampFormat } from '@/stores/stripSettingsStore'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StripResult {
  blob: Blob
  dataUrl: string
  width: number
  height: number
}

export interface BorderSettings {
  color: string
  style: BorderStyle
  width: number
}

export interface BrandingSettings {
  logoPath: string
  eventName: string
  dateStampEnabled: boolean
  dateStampFormat: DateStampFormat
}

export interface CompositionSettings {
  backgroundColor: string
  photoPadding: number // pixels between photos
  stripWidth: number
  stripHeight: number
  border: BorderSettings
  branding: BrandingSettings
}

export interface PrintSheetSettings {
  paperWidth: number // pixels at 300 DPI
  paperHeight: number // pixels at 300 DPI
  cutGuide: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default strip dimensions for a 2" × 6" strip at 300 DPI. */
export const DEFAULT_STRIP_WIDTH = 600
export const DEFAULT_STRIP_HEIGHT = 1800

/** Default padding between photos (10px at 300 DPI equivalent). */
export const DEFAULT_PHOTO_PADDING = 30

/** Font family for branding text — must match the @font-face declaration. */
const BRANDING_FONT_FAMILY = 'Inter, sans-serif'

/** Maximum branding area height as a fraction of total strip height. */
const MAX_BRANDING_FRACTION = 0.15

/** Month names for date formatting. */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Load an image from a data URL or file URL.
 * Returns a fully loaded HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}...`))
    img.src = src
  })
}

/**
 * Compute auto-contrast text color based on background luminance.
 * Returns dark text on light backgrounds and vice versa.
 */
function getContrastTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 128 ? '#000000' : '#FFFFFF'
}

/**
 * Format a date according to the configured format.
 */
function formatDate(date: Date, format: DateStampFormat): string {
  const day = date.getDate()
  const month = date.getMonth() // 0-based
  const year = date.getFullYear()
  const dd = String(day).padStart(2, '0')
  const mm = String(month + 1).padStart(2, '0')

  switch (format) {
    case 'MMMM D, YYYY':
      return `${MONTH_NAMES[month]} ${day}, ${year}`
    case 'DD-MM-YYYY':
      return `${dd}-${mm}-${year}`
    case 'YYYY-MM-DD':
      return `${year}-${mm}-${dd}`
    default:
      return `${MONTH_NAMES[month]} ${day}, ${year}`
  }
}

/**
 * Auto-size a font to fit text within a given width.
 * Returns the font size in pixels.
 */
function autoSizeFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontWeight: string,
  startSize: number,
  minSize: number
): number {
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `${fontWeight} ${size}px ${BRANDING_FONT_FAMILY}`
    const metrics = ctx.measureText(text)
    if (metrics.width <= maxWidth) {
      return size
    }
  }
  return minSize
}

/**
 * Look up paper dimensions in pixels at 300 DPI.
 */
export function getPaperDimensions(paperSize: string): { width: number; height: number } {
  const sizes: Record<string, { width: number; height: number }> = {
    '4x6': { width: 1200, height: 1800 },
    '5x7': { width: 1500, height: 2100 },
    A6: { width: 1240, height: 1748 },
    letter: { width: 2550, height: 3300 }
  }
  return sizes[paperSize] ?? sizes['4x6']
}

// ─── Branding ────────────────────────────────────────────────────────────────

interface BrandingLayout {
  totalHeight: number
  render: (ctx: CanvasRenderingContext2D, yStart: number) => void
}

/**
 * Prepare branding elements (logo, event name, date stamp).
 * Calculates total height and returns a render function.
 */
async function prepareBranding(
  settings: BrandingSettings,
  stripWidth: number,
  stripHeight: number,
  backgroundColor: string
): Promise<BrandingLayout> {
  const textColor = getContrastTextColor(backgroundColor)
  const padding = 20
  const availableWidth = stripWidth - padding * 2
  const maxBrandingHeight = stripHeight * MAX_BRANDING_FRACTION

  let totalHeight = 0
  const elements: Array<{
    render: (ctx: CanvasRenderingContext2D, y: number) => void
    height: number
  }> = []

  // Ensure Inter font is loaded for canvas rendering
  try {
    await document.fonts.load(`bold 36px ${BRANDING_FONT_FAMILY}`)
    await document.fonts.load(`20px ${BRANDING_FONT_FAMILY}`)
  } catch {
    // Font load failed — will fall back to sans-serif
  }

  // We need a temporary canvas context for text measurement
  const measureCanvas = document.createElement('canvas')
  measureCanvas.width = stripWidth
  measureCanvas.height = 100
  const measureCtx = measureCanvas.getContext('2d')!

  // Event name
  if (settings.eventName.trim()) {
    const fontSize = autoSizeFont(measureCtx, settings.eventName, availableWidth, 'bold', 36, 14)
    const lineHeight = fontSize * 1.3
    elements.push({
      height: lineHeight,
      render: (ctx, y) => {
        ctx.font = `bold ${fontSize}px ${BRANDING_FONT_FAMILY}`
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(settings.eventName, stripWidth / 2, y)
      }
    })
    totalHeight += lineHeight
  }

  // Date stamp
  if (settings.dateStampEnabled) {
    const dateText = formatDate(new Date(), settings.dateStampFormat)
    const fontSize = 20
    const lineHeight = fontSize * 1.3
    elements.push({
      height: lineHeight,
      render: (ctx, y) => {
        ctx.font = `${fontSize}px ${BRANDING_FONT_FAMILY}`
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(dateText, stripWidth / 2, y)
      }
    })
    totalHeight += lineHeight
  }

  // Logo
  if (settings.logoPath) {
    try {
      const logoImg = await loadImage(settings.logoPath)
      const logoScale = Math.min(availableWidth / logoImg.width, 1)
      const logoWidth = logoImg.width * logoScale
      let logoHeight = logoImg.height * logoScale

      // Cap logo height
      const maxLogoHeight = maxBrandingHeight - totalHeight
      if (logoHeight > maxLogoHeight && maxLogoHeight > 0) {
        const capScale = maxLogoHeight / logoHeight
        logoHeight *= capScale
      }

      elements.push({
        height: logoHeight,
        render: (ctx, y) => {
          const scaledWidth = logoWidth * (logoHeight / (logoImg.height * logoScale))
          const x = (stripWidth - scaledWidth) / 2
          ctx.drawImage(logoImg, x, y, scaledWidth, logoHeight)
        }
      })
      totalHeight += logoHeight
    } catch {
      // Logo load failed — skip it silently
    }
  }

  // Add spacing between elements
  const spacingPerGap = elements.length > 1 ? 8 : 0
  totalHeight += spacingPerGap * (elements.length - 1)

  // Add top padding before branding area
  if (elements.length > 0) {
    totalHeight += padding
  }

  return {
    totalHeight,
    render: (ctx, yStart) => {
      let y = yStart + (elements.length > 0 ? padding / 2 : 0)
      for (let i = 0; i < elements.length; i++) {
        elements[i].render(ctx, y)
        y += elements[i].height + spacingPerGap
      }
    }
  }
}

// ─── Border Drawing ──────────────────────────────────────────────────────────

function drawPhotoBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  border: BorderSettings
): void {
  if (border.style === 'none' || border.width <= 0) return

  ctx.strokeStyle = border.color
  ctx.lineWidth = border.width

  // Offset inward by half the border width so strokes align with the photo edge
  const offset = border.width / 2
  const bx = x - offset
  const by = y - offset
  const bw = w + border.width
  const bh = h + border.width

  switch (border.style) {
    case 'solid':
      ctx.setLineDash([])
      ctx.strokeRect(bx, by, bw, bh)
      break

    case 'dashed':
      ctx.setLineDash([border.width * 3, border.width * 2])
      ctx.strokeRect(bx, by, bw, bh)
      ctx.setLineDash([])
      break

    case 'double': {
      const outerOffset = border.width * 0.15
      const innerOffset = border.width * 0.85
      ctx.lineWidth = border.width * 0.3
      ctx.setLineDash([])
      // Outer rect
      ctx.strokeRect(x - innerOffset, y - innerOffset, w + innerOffset * 2, h + innerOffset * 2)
      // Inner rect
      ctx.strokeRect(x + outerOffset, y + outerOffset, w - outerOffset * 2, h - outerOffset * 2)
      break
    }
  }
}

// ─── Strip Composition (Stories 5.1 + 5.2 + 5.3) ────────────────────────────

/**
 * Build default composition settings from strip settings store values.
 */
export function buildCompositionSettings(storeValues: {
  backgroundColor: string
  borderColor: string
  borderStyle: BorderStyle
  borderWidth: number
  logoPath: string
  eventName: string
  dateStampEnabled: boolean
  dateStampFormat: DateStampFormat
}): CompositionSettings {
  return {
    backgroundColor: storeValues.backgroundColor,
    photoPadding: DEFAULT_PHOTO_PADDING,
    stripWidth: DEFAULT_STRIP_WIDTH,
    stripHeight: DEFAULT_STRIP_HEIGHT,
    border: {
      color: storeValues.borderColor,
      style: storeValues.borderStyle,
      width: storeValues.borderWidth
    },
    branding: {
      logoPath: storeValues.logoPath,
      eventName: storeValues.eventName,
      dateStampEnabled: storeValues.dateStampEnabled,
      dateStampFormat: storeValues.dateStampFormat
    }
  }
}

/**
 * Compose a vertical photo strip from an array of captured photos.
 * Includes branding (logo, event name, date) and borders.
 */
export async function composeStrip(
  photos: CaptureResult[],
  settings: CompositionSettings
): Promise<StripResult> {
  if (photos.length === 0) {
    throw new Error('Cannot compose strip with no photos')
  }

  const { stripWidth, stripHeight, backgroundColor, photoPadding, border, branding } = settings

  // Prepare branding layout (calculates height needed)
  const brandingLayout = await prepareBranding(branding, stripWidth, stripHeight, backgroundColor)

  // Calculate photo layout
  const hasBorder = border.style !== 'none' && border.width > 0
  const borderInset = hasBorder ? border.width : 0

  // Available height for photos = strip height - branding - padding around all edges
  const topPadding = photoPadding
  const availableHeight = stripHeight - brandingLayout.totalHeight - topPadding - photoPadding
  const totalGaps = (photos.length - 1) * photoPadding
  const slotHeight = (availableHeight - totalGaps) / photos.length

  // Photo area inside each slot (shrink for border)
  const photoX = photoPadding + borderInset
  const photoWidth = stripWidth - photoPadding * 2 - borderInset * 2
  const photoHeight = slotHeight - borderInset * 2

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = stripWidth
  canvas.height = stripHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas rendering context')

  // Fill background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, stripWidth, stripHeight)

  // Load and draw each photo
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const img = await loadImage(photo.dataUrl)

    const slotY = topPadding + i * (slotHeight + photoPadding)
    const photoY = slotY + borderInset

    // Centered crop: compare aspect ratios
    const slotAspect = photoWidth / photoHeight
    const imgAspect = img.width / img.height

    let sx: number, sy: number, sw: number, sh: number

    if (imgAspect > slotAspect) {
      // Image is wider than slot — crop sides
      sh = img.height
      sw = sh * slotAspect
      sx = (img.width - sw) / 2
      sy = 0
    } else {
      // Image is taller than slot — crop top/bottom
      sw = img.width
      sh = sw / slotAspect
      sx = 0
      sy = (img.height - sh) / 2
    }

    ctx.drawImage(img, sx, sy, sw, sh, photoX, photoY, photoWidth, photoHeight)

    // Draw border around this photo
    if (hasBorder) {
      drawPhotoBorder(ctx, photoX, photoY, photoWidth, photoHeight, border)
    }
  }

  // Render branding at the bottom
  if (brandingLayout.totalHeight > 0) {
    brandingLayout.render(ctx, stripHeight - brandingLayout.totalHeight)
  }

  // Export
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Failed to create strip blob'))
    }, 'image/png')
  })

  const dataUrl = canvas.toDataURL('image/png')

  return { blob, dataUrl, width: stripWidth, height: stripHeight }
}

// ─── 2-Up Print Sheet (Story 5.4) ───────────────────────────────────────────

/**
 * Compose a print-ready sheet with two identical strips side-by-side.
 */
export async function composePrintSheet(
  strip: StripResult,
  settings: PrintSheetSettings
): Promise<StripResult> {
  const { paperWidth, paperHeight, cutGuide } = settings

  const canvas = document.createElement('canvas')
  canvas.width = paperWidth
  canvas.height = paperHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas rendering context')

  // White background for print
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, paperWidth, paperHeight)

  // Load strip image
  const stripImg = await loadImage(strip.dataUrl)

  // Each strip gets half the paper width
  const halfWidth = paperWidth / 2
  const scaleX = halfWidth / strip.width
  const scaleY = paperHeight / strip.height
  const scale = Math.min(scaleX, scaleY)

  const scaledWidth = strip.width * scale
  const scaledHeight = strip.height * scale

  // Center each strip in its half
  const leftX = (halfWidth - scaledWidth) / 2
  const rightX = halfWidth + (halfWidth - scaledWidth) / 2
  const y = (paperHeight - scaledHeight) / 2

  ctx.drawImage(stripImg, leftX, y, scaledWidth, scaledHeight)
  ctx.drawImage(stripImg, rightX, y, scaledWidth, scaledHeight)

  // Cut guide
  if (cutGuide) {
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 1
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(paperWidth / 2, 0)
    ctx.lineTo(paperWidth / 2, paperHeight)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Export
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Failed to create print sheet blob'))
    }, 'image/png')
  })

  const dataUrl = canvas.toDataURL('image/png')

  return { blob, dataUrl, width: paperWidth, height: paperHeight }
}
