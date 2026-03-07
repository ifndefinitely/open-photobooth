import { create } from 'zustand'
import {
  enumerateVideoDevices,
  startStream as startStreamService,
  stopStream as stopStreamService,
  getSupportedResolutions,
  findClosestResolution,
  captureFrame as captureFrameService,
  type CameraDevice,
  type CaptureResult
} from '@/services/cameraService'

export interface CameraSettings {
  deviceId: string
  resolution: string
  mirrorHorizontal: boolean
  flipVertical: boolean
  brightness: number
  contrast: number
  saturation: number
}

const DEFAULT_SETTINGS: CameraSettings = {
  deviceId: '',
  resolution: '1280x720',
  mirrorHorizontal: true,
  flipVertical: false,
  brightness: 0,
  contrast: 0,
  saturation: 0
}

interface CameraState {
  // Device enumeration
  devices: CameraDevice[]
  // Active stream
  stream: MediaStream | null
  // Video element reference (set by CameraPreview component)
  videoElement: HTMLVideoElement | null
  // Error state
  error: string | null
  isLoading: boolean
  // Settings (pre-Epic 07: stored in memory only, no persistence)
  settings: CameraSettings
  // Available resolutions for the selected camera
  availableResolutions: string[]
  // Notice shown if stored resolution had to be changed
  resolutionNotice: string | null

  // Actions — device enumeration
  refreshDevices: () => Promise<void>
  startDeviceListening: () => void
  stopDeviceListening: () => void

  // Actions — settings
  setDeviceId: (id: string) => void
  setMirrorHorizontal: (value: boolean) => void
  setFlipVertical: (value: boolean) => void
  setBrightness: (value: number) => void
  setContrast: (value: number) => void
  setSaturation: (value: number) => void

  // Actions — resolution
  setResolution: (resolution: string) => Promise<void>
  probeResolutions: () => Promise<void>

  // Actions — stream
  startCamera: () => Promise<void>
  stopCamera: () => void

  // Actions — capture
  captureFrame: () => Promise<CaptureResult>

  // Actions — video element
  setVideoElement: (el: HTMLVideoElement | null) => void
}

// Module-level handler reference for devicechange cleanup
let deviceChangeHandler: (() => void) | null = null

export const useCameraStore = create<CameraState>((set, get) => ({
  devices: [],
  stream: null,
  videoElement: null,
  error: null,
  isLoading: false,
  settings: { ...DEFAULT_SETTINGS },
  availableResolutions: [],
  resolutionNotice: null,

  refreshDevices: async () => {
    try {
      const devices = await enumerateVideoDevices()
      set({ devices })
      if (devices.length === 0) {
        set({ error: 'No cameras detected' })
      } else {
        // Clear device-related errors if cameras are now available
        const currentError = get().error
        if (currentError === 'No cameras detected') {
          set({ error: null })
        }
      }
    } catch {
      set({ error: 'Failed to enumerate cameras' })
    }
  },

  startDeviceListening: () => {
    if (deviceChangeHandler) return // Already listening
    deviceChangeHandler = () => {
      get().refreshDevices()
    }
    navigator.mediaDevices.addEventListener('devicechange', deviceChangeHandler)
    // Initial enumeration
    get().refreshDevices()
  },

  stopDeviceListening: () => {
    if (deviceChangeHandler) {
      navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandler)
      deviceChangeHandler = null
    }
  },

  setDeviceId: (id) => set((state) => ({ settings: { ...state.settings, deviceId: id } })),

  setMirrorHorizontal: (value) =>
    set((state) => ({ settings: { ...state.settings, mirrorHorizontal: value } })),

  setFlipVertical: (value) =>
    set((state) => ({ settings: { ...state.settings, flipVertical: value } })),

  setBrightness: (value) =>
    set((state) => ({ settings: { ...state.settings, brightness: value } })),

  setContrast: (value) => set((state) => ({ settings: { ...state.settings, contrast: value } })),

  setSaturation: (value) =>
    set((state) => ({ settings: { ...state.settings, saturation: value } })),

  setResolution: async (resolution) => {
    set((state) => ({
      settings: { ...state.settings, resolution },
      resolutionNotice: null
    }))
    // Restart the camera at the new resolution if it's running
    const { stream } = get()
    if (stream) {
      get().stopCamera()
      await get().startCamera()
    }
  },

  probeResolutions: async () => {
    const { settings } = get()
    const deviceId = settings.deviceId
    const available = await getSupportedResolutions(deviceId)
    set({ availableResolutions: available })

    // Check if current resolution is still valid
    if (!available.includes(settings.resolution)) {
      const closest = findClosestResolution(settings.resolution, available)
      set((state) => ({
        settings: { ...state.settings, resolution: closest },
        resolutionNotice: `Resolution ${settings.resolution} not available. Using ${closest} instead.`
      }))
    }
  },

  startCamera: async () => {
    const { stream: existing, settings } = get()
    if (existing) return // Already running

    set({ isLoading: true, error: null })
    try {
      // Ensure device list is fresh
      await get().refreshDevices()

      const stream = await startStreamService(settings.deviceId, settings.resolution)

      // Listen for track ended (camera disconnected)
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          set({ stream: null, error: 'Camera disconnected' })
        })
      }

      set({ stream, isLoading: false, error: null })
    } catch (err) {
      const message =
        err instanceof DOMException
          ? err.name === 'NotFoundError'
            ? 'Camera not found'
            : err.name === 'NotAllowedError'
              ? 'Camera access denied'
              : err.name === 'NotReadableError'
                ? 'Camera is in use by another application'
                : `Camera error: ${err.message}`
          : 'Failed to start camera'
      set({ stream: null, isLoading: false, error: message })
    }
  },

  stopCamera: () => {
    const { stream } = get()
    if (stream) {
      stopStreamService(stream)
      set({ stream: null })
    }
  },

  captureFrame: async () => {
    const { videoElement, stream, settings } = get()
    if (!stream) {
      throw new Error('Camera stream is not active')
    }
    if (!videoElement) {
      throw new Error('Video element is not available')
    }
    return captureFrameService(videoElement, settings)
  },

  setVideoElement: (el) => set({ videoElement: el })
}))
