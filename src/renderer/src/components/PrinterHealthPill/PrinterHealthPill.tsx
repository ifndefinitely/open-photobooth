import { useState } from 'react'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import PinDialog from '@/components/PinDialog/PinDialog'
import PrinterHealthDialog from '@/components/PrinterHealthDialog/PrinterHealthDialog'
import styles from './PrinterHealthPill.module.css'

type PillMode = 'hidden' | 'warmingUp' | 'red'

function PrinterHealthPill(): React.JSX.Element | null {
  const status = usePrinterStatusStore((s) => s.status)
  const [stage, setStage] = useState<'pill' | 'pin' | 'dialog'>('pill')

  const mode: PillMode =
    !status || status.state === 'ready' || status.state === 'busy'
      ? 'hidden'
      : status.state === 'warmingUp'
        ? 'warmingUp'
        : 'red'

  if (mode === 'hidden') return null

  return (
    <>
      <button
        className={`${styles.pill} ${mode === 'red' ? styles.red : styles.amber}`}
        onClick={() => setStage('pin')}
        aria-label="Printer status"
        type="button"
      >
        <span className={styles.icon} aria-hidden="true">
          {mode === 'red' ? '✕' : '!'}
        </span>
      </button>
      {stage === 'pin' && (
        <PinDialog onSuccess={() => setStage('dialog')} onCancel={() => setStage('pill')} />
      )}
      {stage === 'dialog' && <PrinterHealthDialog onClose={() => setStage('pill')} />}
    </>
  )
}

export default PrinterHealthPill
