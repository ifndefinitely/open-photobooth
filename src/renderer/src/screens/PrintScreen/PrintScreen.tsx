import { useEffect } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { usePrintJob } from '@/hooks/usePrintJob'
import PrinterErrorDialog from '@/components/PrinterErrorDialog/PrinterErrorDialog'
import { useT } from '@/i18n'
import styles from './PrintScreen.module.css'

function PrintScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const printSheetResult = useStripStore((s) => s.printSheetResult)
  const verificationTimeout = usePrinterSettingsStore((s) => s.verificationTimeout)

  const { state, error, retry } = usePrintJob()
  const t = useT()

  // Auto-advance to thank-you on success
  useEffect(() => {
    if (state !== 'succeeded') return
    const timer = setTimeout(() => navigateTo('thankyou'), 1500)
    return () => clearTimeout(timer)
  }, [state, navigateTo])

  const messageKey =
    state === 'preflighting'
      ? 'printer.status.warmingUp'
      : state === 'submitting'
        ? 'print.printing'
        : state === 'verifying'
          ? 'printer.status.printing'
          : state === 'retrying'
            ? 'printer.status.retrying'
            : state === 'succeeded'
              ? 'print.success'
              : 'printer.error.title'

  const progressPercent = Math.min(
    100,
    state === 'preflighting'
      ? 15
      : state === 'submitting'
        ? 35
        : state === 'verifying'
          ? 75
          : state === 'retrying'
            ? 25
            : state === 'succeeded'
              ? 100
              : 0
  )

  return (
    <div className={styles.container}>
      <div className={styles.glowRing}>
        {printSheetResult?.dataUrl && (
          <img
            className={styles.stripPreview}
            src={printSheetResult.dataUrl}
            alt="Your photo strip"
          />
        )}
      </div>

      <div className={styles.messageArea}>
        <p className={styles.message}>{t(messageKey)}</p>
        <div className={styles.progressBar} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
        <p className={styles.timingHint}>
          {t('print.stillPrinting')} ({verificationTimeout}s max)
        </p>
      </div>

      {state === 'failed_hard' && error && <PrinterErrorDialog error={error} onRetry={retry} />}
    </div>
  )
}

export default PrintScreen
