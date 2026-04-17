import { useState, useRef, useEffect } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useCameraStore } from '@/stores/cameraStore'
import { useCaptureAvailability } from '@/hooks/useCaptureAvailability'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import type { PrinterStatus } from '@/stores/printerStatusStore'
import { useT } from '@/i18n'
import CameraPreview from '@/components/CameraPreview/CameraPreview'
import PrinterHealthPill from '@/components/PrinterHealthPill/PrinterHealthPill'
import styles from './HomeScreen.module.css'

type BannerResetState = 'idle' | 'inProgress' | 'failed'

function HomeScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)
  const cameraError = useCameraStore((s) => s.error)
  const cameraStream = useCameraStore((s) => s.stream)
  const cameraReady = cameraStream !== null && !cameraError
  const { allowCaptures, bannerMode } = useCaptureAvailability()
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const setStatus = usePrinterStatusStore((s) => s.setStatus)
  const t = useT()

  const [bannerResetState, setBannerResetState] = useState<BannerResetState>('idle')
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
    }
  }, [])

  const startDisabled = !cameraReady || !allowCaptures

  const handleBannerReset = async (): Promise<void> => {
    if (!printerName || bannerResetState === 'inProgress') return
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
    setBannerResetState('inProgress')
    try {
      const result = await window.api.printer.resetPrinter(printerName)
      if (result.success) {
        const fresh = await window.api.printer.getStatus(printerName)
        setStatus(fresh as PrinterStatus)
        setBannerResetState('idle')
      } else {
        setBannerResetState('failed')
        resetTimeoutRef.current = setTimeout(() => setBannerResetState('idle'), 4000)
      }
    } catch {
      setBannerResetState('failed')
      resetTimeoutRef.current = setTimeout(() => setBannerResetState('idle'), 4000)
    }
  }

  const bannerResetLabel = (): string => {
    if (bannerResetState === 'inProgress') return t('printer.reset.inProgress')
    if (bannerResetState === 'failed') return t('printer.reset.buttonFailed')
    return t('printer.error.buttonReset')
  }

  return (
    <div className={styles.container}>
      {bannerMode === 'halt' && (
        <div className={`${styles.banner} ${styles.bannerHalt}`}>
          {t('home.printer.unavailable.halt')}
        </div>
      )}
      {bannerMode === 'captureOnly' && (
        <div className={`${styles.banner} ${styles.bannerCaptureOnly}`}>
          <button
            className={`${styles.bannerResetButton} ${bannerResetState === 'failed' ? styles.bannerResetButtonFailed : ''}`}
            onClick={handleBannerReset}
            disabled={bannerResetState === 'inProgress'}
          >
            {bannerResetLabel()}
          </button>
          {t('home.printer.unavailable.captureOnly')}
        </div>
      )}
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
    </div>
  )
}

export default HomeScreen
