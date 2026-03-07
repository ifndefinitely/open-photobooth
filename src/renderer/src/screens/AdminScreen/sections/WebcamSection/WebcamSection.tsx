import { useEffect } from 'react'
import { useCameraStore } from '@/stores/cameraStore'
import CameraPreview from '@/components/CameraPreview/CameraPreview'
import styles from './WebcamSection.module.css'

function WebcamSection(): React.JSX.Element {
  const devices = useCameraStore((s) => s.devices)
  const settings = useCameraStore((s) => s.settings)
  const availableResolutions = useCameraStore((s) => s.availableResolutions)
  const resolutionNotice = useCameraStore((s) => s.resolutionNotice)
  const startCamera = useCameraStore((s) => s.startCamera)
  const stopCamera = useCameraStore((s) => s.stopCamera)
  const refreshDevices = useCameraStore((s) => s.refreshDevices)
  const probeResolutions = useCameraStore((s) => s.probeResolutions)
  const setDeviceId = useCameraStore((s) => s.setDeviceId)
  const setResolution = useCameraStore((s) => s.setResolution)
  const setMirrorHorizontal = useCameraStore((s) => s.setMirrorHorizontal)
  const setFlipVertical = useCameraStore((s) => s.setFlipVertical)
  const setBrightness = useCameraStore((s) => s.setBrightness)
  const setContrast = useCameraStore((s) => s.setContrast)
  const setSaturation = useCameraStore((s) => s.setSaturation)

  // Start camera and probe resolutions when section mounts
  useEffect(() => {
    refreshDevices()
    probeResolutions()
    startCamera()
    return () => stopCamera()
  }, [refreshDevices, probeResolutions, startCamera, stopCamera])

  const handleDeviceChange = async (deviceId: string): Promise<void> => {
    setDeviceId(deviceId)
    // Restart camera with new device
    stopCamera()
    // Need to wait for state to propagate, then probe and restart
    // Use setTimeout to yield to React's state update
    setTimeout(async () => {
      await probeResolutions()
      await startCamera()
    }, 0)
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Webcam</h2>

      <div className={styles.previewArea}>
        <CameraPreview className={styles.preview} />
      </div>

      <div className={styles.controls}>
        {/* Device selector */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="webcam-device">
            Camera
          </label>
          <select
            id="webcam-device"
            className={styles.select}
            value={settings.deviceId}
            onChange={(e) => handleDeviceChange(e.target.value)}
          >
            <option value="">Default camera</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution selector */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="webcam-resolution">
            Resolution
          </label>
          <select
            id="webcam-resolution"
            className={styles.select}
            value={settings.resolution}
            onChange={(e) => setResolution(e.target.value)}
          >
            {availableResolutions.map((res) => (
              <option key={res} value={res}>
                {res}
              </option>
            ))}
          </select>
          {resolutionNotice && <p className={styles.notice}>{resolutionNotice}</p>}
        </div>

        {/* Mirror / Flip toggles */}
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.mirrorHorizontal}
              onChange={(e) => setMirrorHorizontal(e.target.checked)}
            />
            Mirror horizontally
          </label>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.flipVertical}
              onChange={(e) => setFlipVertical(e.target.checked)}
            />
            Flip vertically
          </label>
        </div>

        {/* Brightness slider */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="webcam-brightness">
            Brightness: {settings.brightness}
          </label>
          <input
            id="webcam-brightness"
            type="range"
            min={-100}
            max={100}
            value={settings.brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        {/* Contrast slider */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="webcam-contrast">
            Contrast: {settings.contrast}
          </label>
          <input
            id="webcam-contrast"
            type="range"
            min={-100}
            max={100}
            value={settings.contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        {/* Saturation slider */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="webcam-saturation">
            Saturation: {settings.saturation}
          </label>
          <input
            id="webcam-saturation"
            type="range"
            min={-100}
            max={100}
            value={settings.saturation}
            onChange={(e) => setSaturation(Number(e.target.value))}
            className={styles.slider}
          />
        </div>
      </div>
    </div>
  )
}

export default WebcamSection
