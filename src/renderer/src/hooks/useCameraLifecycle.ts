import { useEffect } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useCameraStore } from '@/stores/cameraStore'

const CAMERA_SCREENS = new Set(['home', 'session'])

/**
 * Central camera lifecycle hook — call once from App.tsx.
 * Starts the camera on screens that need it, stops it otherwise.
 * Also manages device change listening.
 */
export function useCameraLifecycle(): void {
  const currentScreen = useNavigationStore((s) => s.currentScreen)
  const startCamera = useCameraStore((s) => s.startCamera)
  const stopCamera = useCameraStore((s) => s.stopCamera)
  const startDeviceListening = useCameraStore((s) => s.startDeviceListening)
  const stopDeviceListening = useCameraStore((s) => s.stopDeviceListening)

  // Device change listener — active for the lifetime of the app
  useEffect(() => {
    startDeviceListening()
    return () => stopDeviceListening()
  }, [startDeviceListening, stopDeviceListening])

  // Start/stop camera based on current screen
  useEffect(() => {
    if (CAMERA_SCREENS.has(currentScreen)) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [currentScreen, startCamera, stopCamera])
}
