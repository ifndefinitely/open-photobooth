import { useState } from 'react'
import { useT } from '@/i18n'
import { useNavigationStore } from '@/stores/navigationStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useStripStore } from '@/stores/stripStore'
import PinDialog from '@/components/PinDialog/PinDialog'
import type { PrintJobError } from '@/hooks/usePrintJob'
import styles from './PrinterErrorDialog.module.css'

interface Props {
  error: PrintJobError
  onRetry: () => void
}

const REASON_KEY_MAP: Record<string, string> = {
  paper_out: 'printer.error.paperOut',
  paper_jam: 'printer.error.paperJam',
  job_error: 'printer.error.needsAttention',
  needs_attention: 'printer.error.needsAttention',
  paused: 'printer.error.needsAttention',
  offline: 'printer.error.offline',
  error: 'printer.error.offline',
  not_found: 'printer.error.offline',
  verification_timeout: 'printer.error.verificationTimeout',
  stalled_in_spooler: 'printer.error.stalledInSpooler',
  no_printer: 'printer.error.offline'
}

function PrinterErrorDialog({ error, onRetry }: Props): React.JSX.Element {
  const t = useT()
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const setWasPrinted = useStripStore((s) => s.setWasPrinted)
  const [pinOpen, setPinOpen] = useState(false)

  const reasonKey = REASON_KEY_MAP[error.reason] ?? 'printer.error.needsAttention'
  const plainReason = t(reasonKey)

  const handleSkip = (): void => {
    setWasPrinted(false)
    navigateTo('thankyou')
  }

  return (
    <>
      <div className={styles.backdrop} role="dialog" aria-modal="true">
        <div className={styles.dialog}>
          <h1 className={styles.title}>{t('printer.error.title')}</h1>
          <p className={styles.reason}>{plainReason}</p>

          <details className={styles.details}>
            <summary className={styles.summary}>Technical detail</summary>
            <div className={styles.detailContent}>
              <div>Reason code: {error.reason}</div>
              {error.jobId !== undefined && <div>Job ID: {error.jobId}</div>}
              {error.detail && <div>Detail: {error.detail}</div>}
              {printerName && <div>Printer: {printerName}</div>}
              <div>Time: {new Date().toISOString()}</div>
            </div>
          </details>

          <div className={styles.actions}>
            <button className={styles.buttonPrimary} onClick={onRetry}>
              {t('printer.error.buttonRetry')}
            </button>
            <button className={styles.buttonSecondary} onClick={handleSkip}>
              {t('printer.error.buttonSkip')}
            </button>
            <button className={styles.buttonTertiary} onClick={() => setPinOpen(true)}>
              {t('printer.error.buttonAdmin')}
            </button>
          </div>
        </div>
      </div>
      {pinOpen && (
        <PinDialog
          onSuccess={() => {
            setPinOpen(false)
            navigateTo('admin')
          }}
          onCancel={() => setPinOpen(false)}
        />
      )}
    </>
  )
}

export default PrinterErrorDialog
