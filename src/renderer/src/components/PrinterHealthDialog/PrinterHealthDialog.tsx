import { useEffect, useState, useCallback } from 'react'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import type { PrinterStatus } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import styles from './PrinterHealthDialog.module.css'

interface Props {
  onClose: () => void
}

interface LogEntry {
  timestamp: string
  level: string
  source: string
  message: string
}

function PrinterHealthDialog({ onClose }: Props): React.JSX.Element {
  const status = usePrinterStatusStore((s) => s.status)
  const setStatus = usePrinterStatusStore((s) => s.setStatus)
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadLogs = useCallback(async () => {
    const entries = (await window.api.logging.getRecent({
      limit: 5,
      source: 'Printer',
      level: 'ERROR'
    })) as LogEntry[]
    setRecentLogs(entries)
  }, [])

  const refresh = useCallback(async () => {
    if (!printerName) return
    setRefreshing(true)
    try {
      const fresh = (await window.api.printer.getStatus(printerName)) as PrinterStatus
      setStatus(fresh)
      await loadLogs()
    } finally {
      setRefreshing(false)
    }
  }, [printerName, setStatus, loadLogs])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        <h2 className={styles.title}>Printer Health</h2>

        <div className={styles.statusRow}>
          <span className={`${styles.badge} ${styles[`badge_${status?.state ?? 'unknown'}`]}`}>
            {status?.state ?? 'unknown'}
          </span>
          <span className={styles.detail}>{status?.detail ?? 'No data yet'}</span>
        </div>

        <h3 className={styles.subtitle}>Raw detail</h3>
        <pre className={styles.raw}>{JSON.stringify(status, null, 2)}</pre>

        <h3 className={styles.subtitle}>Recent errors (last 5)</h3>
        {recentLogs.length === 0 ? (
          <p className={styles.noLogs}>No recent printer errors logged.</p>
        ) : (
          <ul className={styles.logList}>
            {recentLogs.map((entry, i) => (
              <li key={`${entry.timestamp}-${i}`} className={styles.logEntry}>
                <span className={styles.logTimestamp}>{entry.timestamp}</span>
                <span className={styles.logMessage}>{entry.message}</span>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <button className={styles.button} onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className={styles.buttonPrimary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrinterHealthDialog
