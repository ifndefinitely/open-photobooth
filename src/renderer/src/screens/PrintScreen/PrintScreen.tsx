import { useState, useEffect } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { usePrintJob } from '@/hooks/usePrintJob'
import { useT } from '@/i18n'
import styles from './PrintScreen.module.css'

const LONG_WAIT_THRESHOLD_MS = 60_000

function PrintScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const stripResult = useStripStore((s) => s.stripResult)
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const paperSize = usePrinterSettingsStore((s) => s.paperSize)

  const { status, error, retry } = usePrintJob()
  const [showLongWait, setShowLongWait] = useState(false)
  const t = useT()

  // Show secondary message after 60 seconds of printing
  useEffect(() => {
    if (status !== 'printing') return
    const timer = setTimeout(() => setShowLongWait(true), LONG_WAIT_THRESHOLD_MS)
    return () => clearTimeout(timer)
  }, [status])

  // Auto-navigate to thank you on success
  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => navigateTo('thankyou'), 1500)
    return () => clearTimeout(timer)
  }, [status, navigateTo])

  // Printing state
  if (status === 'printing') {
    return (
      <div className={styles.container}>
        {stripResult?.dataUrl && (
          <img className={styles.stripPreview} src={stripResult.dataUrl} alt="Your photo strip" />
        )}
        <div className={styles.spinner} />
        <p className={styles.message}>{t('print.printing')}</p>
        {showLongWait && <p className={styles.secondaryMessage}>{t('print.stillPrinting')}</p>}
      </div>
    )
  }

  // Success state (brief)
  if (status === 'success') {
    return (
      <div className={styles.container}>
        {stripResult?.dataUrl && (
          <img className={styles.stripPreview} src={stripResult.dataUrl} alt="Your photo strip" />
        )}
        <p className={styles.message}>{t('print.success')}</p>
      </div>
    )
  }

  // Error state
  return (
    <div className={styles.container}>
      <div className={styles.errorContainer}>
        <h1 className={styles.errorTitle}>{t('error.title')}</h1>
        <p className={styles.errorMessage}>{t('error.printFailed')}</p>
        <p className={styles.errorCta}>{t('error.contactOwner')}</p>

        <details className={styles.errorDetails}>
          <summary className={styles.errorDetailsSummary}>{t('error.debugDetails')}</summary>
          <div className={styles.errorDetailsContent}>
            {`Error: ${error}\nPrinter: ${printerName || '(none)'}\nPaper size: ${paperSize}\nTime: ${new Date().toISOString()}`}
          </div>
        </details>

        <div className={styles.errorActions}>
          <button className={styles.button} onClick={retry}>
            {t('error.tryAgain')}
          </button>
          <button className={styles.buttonSecondary} onClick={() => navigateTo('review')}>
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrintScreen
