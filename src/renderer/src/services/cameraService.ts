// Camera service — pure functions for camera operations.
// No internal state; receives arguments and returns results.

export interface CameraDevice {
  deviceId: string
  label: string
}

/**
 * Enumerate all connected video input devices.
 * Returns an empty array if none are found (caller handles the error state).
 */
export async function enumerateVideoDevices(): Promise<CameraDevice[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d) => ({
      deviceId: d.deviceId,
      label: d.label || `Camera ${d.deviceId.slice(0, 8)}`
    }))
}

/**
 * Parse a resolution string like "1280x720" into width and height.
 */
export function parseResolution(resolution: string): { width: number; height: number } {
  const [w, h] = resolution.split('x').map(Number)
  return { width: w || 1280, height: h || 720 }
}

/**
 * Start a camera stream with the given device and resolution constraints.
 * Returns the MediaStream on success; throws on failure.
 */
export async function startStream(deviceId: string, resolution: string): Promise<MediaStream> {
  const { width, height } = parseResolution(resolution)

  const constraints: MediaStreamConstraints = {
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      width: { ideal: width },
      height: { ideal: height }
    },
    audio: false
  }

  return navigator.mediaDevices.getUserMedia(constraints)
}

/**
 * Stop all tracks on a media stream.
 */
export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop())
}

/** Common resolutions to offer, in ascending order. */
export const COMMON_RESOLUTIONS = ['640x480', '1280x720', '1920x1080'] as const

/**
 * Determine which of the common resolutions a camera supports.
 * Uses getCapabilities() (Chromium-guaranteed) to check the supported range,
 * then filters COMMON_RESOLUTIONS to those within range.
 * Falls back to probing via getUserMedia if getCapabilities is unavailable.
 */
export async function getSupportedResolutions(deviceId: string): Promise<string[]> {
  try {
    // Open a temporary stream to inspect capabilities
    const tempStream = await navigator.mediaDevices.getUserMedia({
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false
    })

    const track = tempStream.getVideoTracks()[0]
    if (!track) {
      tempStream.getTracks().forEach((t) => t.stop())
      return ['1280x720']
    }

    // Try getCapabilities (available in Chromium)
    if (typeof track.getCapabilities === 'function') {
      const caps = track.getCapabilities()
      tempStream.getTracks().forEach((t) => t.stop())

      const maxW = caps.width?.max ?? 1920
      const maxH = caps.height?.max ?? 1080

      return COMMON_RESOLUTIONS.filter((res) => {
        const { width, height } = parseResolution(res)
        return width <= maxW && height <= maxH
      })
    }

    // Fallback: just stop and return all common resolutions
    tempStream.getTracks().forEach((t) => t.stop())
    return [...COMMON_RESOLUTIONS]
  } catch {
    return ['1280x720']
  }
}

/**
 * Find the closest available resolution to the requested one.
 * Prefers exact match, then closest by total pixel count.
 */
export function findClosestResolution(requested: string, available: string[]): string {
  if (available.includes(requested)) return requested
  if (available.length === 0) return '1280x720'

  const { width: rw, height: rh } = parseResolution(requested)
  const requestedPixels = rw * rh

  let closest = available[0]
  let closestDiff = Infinity

  for (const res of available) {
    const { width, height } = parseResolution(res)
    const diff = Math.abs(width * height - requestedPixels)
    if (diff < closestDiff) {
      closestDiff = diff
      closest = res
    }
  }

  return closest
}

/**
 * Build a CSS filter string from brightness, contrast, and saturation values.
 * Each value ranges from -100 to +100 with 0 meaning no adjustment.
 * Mapping: CSS value = 1 + (slider / 100).
 * Returns empty string if all values are at default (0).
 */
export function buildCssFilter(brightness: number, contrast: number, saturation: number): string {
  if (brightness === 0 && contrast === 0 && saturation === 0) return ''
  const b = 1 + brightness / 100
  const c = 1 + contrast / 100
  const s = 1 + saturation / 100
  return `brightness(${b}) contrast(${c}) saturate(${s})`
}

export interface CaptureResult {
  blob: Blob
  dataUrl: string
  width: number
  height: number
}

export interface CaptureSettings {
  mirrorHorizontal: boolean
  flipVertical: boolean
  brightness: number
  contrast: number
  saturation: number
}

/**
 * Capture a single frame from the active video element.
 * Returns the image at the full video resolution (not display size)
 * with mirror/flip transforms and CSS filters applied.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  settings: CaptureSettings
): Promise<CaptureResult> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new Error('Camera stream is not ready for capture')
  }

  const width = video.videoWidth
  const height = video.videoHeight

  if (width === 0 || height === 0) {
    throw new Error('Camera stream has no video data')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas rendering context')
  }

  // Apply mirror/flip transforms
  ctx.save()

  if (settings.mirrorHorizontal && settings.flipVertical) {
    ctx.translate(width, height)
    ctx.scale(-1, -1)
  } else if (settings.mirrorHorizontal) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  } else if (settings.flipVertical) {
    ctx.translate(0, height)
    ctx.scale(1, -1)
  }

  // Apply CSS filter (supported in Chromium's canvas 2D context)
  const filter = buildCssFilter(settings.brightness, settings.contrast, settings.saturation)
  if (filter) {
    ctx.filter = filter
  }

  ctx.drawImage(video, 0, 0, width, height)
  ctx.restore()

  // Convert to PNG blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Failed to create image blob'))
    }, 'image/png')
  })

  const dataUrl = canvas.toDataURL('image/png')

  return { blob, dataUrl, width, height }
}
