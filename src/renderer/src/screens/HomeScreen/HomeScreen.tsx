import { useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useCameraStore } from '@/stores/cameraStore'
import { useAdminGesture } from '@/hooks/useAdminGesture'
import { useCaptureAvailability } from '@/hooks/useCaptureAvailability'
import { useT } from '@/i18n'
import PinDialog from '@/components/PinDialog/PinDialog'
import CameraPreview from '@/components/CameraPreview/CameraPreview'
import PrinterHealthPill from '@/components/PrinterHealthPill/PrinterHealthPill'
import styles from './HomeScreen.module.css'

function HomeScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)
  const cameraError = useCameraStore((s) => s.error)
  const cameraStream = useCameraStore((s) => s.stream)
  const cameraReady = cameraStream !== null && !cameraError
  const { allowCaptures, bannerMode } = useCaptureAvailability()
  const [showPinDialog, setShowPinDialog] = useState(false)
  const { handleTap } = useAdminGesture(() => setShowPinDialog(true))
  const t = useT()

  const startDisabled = !cameraReady || !allowCaptures

  return (
    <div className={styles.container}>
      {bannerMode !== 'none' && (
        <div
          className={`${styles.banner} ${
            bannerMode === 'halt' ? styles.bannerHalt : styles.bannerCaptureOnly
          }`}
        >
          {bannerMode === 'halt'
            ? t('home.printer.unavailable.halt')
            : t('home.printer.unavailable.captureOnly')}
        </div>
      )}
      <div className={styles.adminGestureTarget} onClick={handleTap} aria-hidden="true" />
      <CameraPreview className={styles.preview} />
      <div className={styles.buttonArea}>
        <button
          className={styles.takePhotosButton}
          onClick={() => navigateTo('session')}
          disabled={startDisabled}
        >
          {t('home.takePhotos')}
        </button>
      </div>
      {bannerMode === 'none' && <PrinterHealthPill />}
      {showPinDialog && (
        <PinDialog
          onSuccess={() => {
            setShowPinDialog(false)
            navigateTo('admin')
          }}
          onCancel={() => setShowPinDialog(false)}
        />
      )}
    </div>
  )
}

export default HomeScreen
