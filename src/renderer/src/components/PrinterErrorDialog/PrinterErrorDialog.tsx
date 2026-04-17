import { useState } from 'react'
import { useT } from '@/i18n'
import { useNavigationStore } from '@/stores/navigationStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useStripStore } from '@/stores/stripStore'
import PinDialog from '@/components/PinDialog/PinDialog'
import type { PrintJobError } from '@/hooks/usePrintJob'
import styles from './PrinterErrorDialog.module.css'

interface ResetState {
  status: 'idle' | 'inProgress' | 'success' | 'failed'
}

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
  const [resetState, setResetState] = useState<ResetState>({ status: 'idle' })

  const reasonKey = REASON_KEY_MAP[error.reason] ?? 'printer.error.needsAttention'
  const plainReason = t(reasonKey)

  const handleSkip = (): void => {
    setWasPrinted(false)
    navigateTo('thankyou')
  }

  const handleReset = async (): Promise<void> => {
    if (!printerName || resetState.status === 'inProgress') return
    setResetState({ status: 'inProgress' })
    try {
      const result = await window.api.printer.resetPrinter(printerName)
      setResetState({ status: result.success ? 'success' : 'failed' })
    } catch {
      setResetState({ status: 'failed' })
    }
  }

  const handleRetry = async (): Promise<void> => {
    if (resetState.status === 'inProgress') return
    if (printerName) {
      setResetState({ status: 'inProgress' })
      try {
        await window.api.printer.resetPrinter(printerName)
      } catch {
        // proceed to retry regardless
      }
      setResetState({ status: 'idle' })
    }
    onRetry()
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

          {resetState.status === 'success' && (
            <p className={styles.resetSuccess}>{t('printer.reset.success')}</p>
          )}
          {resetState.status === 'failed' && (
            <p className={styles.resetFailed}>{t('printer.reset.failed')}</p>
          )}

          <div className={styles.actions}>
            <button
              className={styles.buttonPrimary}
              onClick={() => void handleRetry()}
              disabled={resetState.status === 'inProgress'}
            >
              {resetState.status === 'inProgress'
                ? t('printer.reset.inProgress')
                : t('printer.error.buttonRetry')}
            </button>
            <button
              className={styles.buttonSecondary}
              onClick={handleReset}
              disabled={!printerName || resetState.status === 'inProgress'}
            >
              {resetState.status === 'inProgress'
                ? t('printer.reset.inProgress')
                : t('printer.error.buttonReset')}
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
