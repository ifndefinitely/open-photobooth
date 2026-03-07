import { useEffect, useRef, useCallback } from 'react'
import { useCameraStore } from '@/stores/cameraStore'
import { buildCssFilter } from '@/services/cameraService'
import styles from './CameraPreview.module.css'

interface CameraPreviewProps {
  className?: string
}

function CameraPreview({ className }: CameraPreviewProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stream = useCameraStore((s) => s.stream)
  const error = useCameraStore((s) => s.error)
  const isLoading = useCameraStore((s) => s.isLoading)
  const mirrorHorizontal = useCameraStore((s) => s.settings.mirrorHorizontal)
  const flipVertical = useCameraStore((s) => s.settings.flipVertical)
  const brightness = useCameraStore((s) => s.settings.brightness)
  const contrast = useCameraStore((s) => s.settings.contrast)
  const saturation = useCameraStore((s) => s.settings.saturation)
  const setVideoElement = useCameraStore((s) => s.setVideoElement)

  // Register/unregister video element with the store
  const videoRefCallback = useCallback(
    (el: HTMLVideoElement | null) => {
      ;(videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
      setVideoElement(el)
    },
    [setVideoElement]
  )

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      video.srcObject = stream
    } else {
      video.srcObject = null
    }
  }, [stream])

  // Compute transforms and filters
  const scaleX = mirrorHorizontal ? -1 : 1
  const scaleY = flipVertical ? -1 : 1
  const transform = `scale(${scaleX}, ${scaleY})`
  const filter = buildCssFilter(brightness, contrast, saturation) || undefined

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      <video
        ref={videoRefCallback}
        className={styles.video}
        autoPlay
        playsInline
        muted
        style={{ transform, filter }}
      />
      {isLoading && (
        <div className={styles.overlay}>
          <span>Starting camera...</span>
        </div>
      )}
      {error && !isLoading && (
        <div className={styles.overlay}>
          <span className={styles.errorText}>{error}</span>
        </div>
      )}
    </div>
  )
}

export default CameraPreview
