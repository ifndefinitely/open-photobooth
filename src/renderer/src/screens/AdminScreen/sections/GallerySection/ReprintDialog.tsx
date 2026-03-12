import { useState, useEffect, useRef, useCallback } from 'react'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import styles from './ReprintDialog.module.css'

type ItemStatus = 'pending' | 'printing' | 'success' | 'error'

interface ReprintItem {
  sessionId: string
  status: ItemStatus
  error?: string
}

interface ReprintDialogProps {
  sessionIds: string[]
  onClose: () => void
}

function ReprintDialog({ sessionIds, onClose }: ReprintDialogProps): React.JSX.Element {
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const paperSize = usePrinterSettingsStore((s) => s.paperSize)
  const colorMode = usePrinterSettingsStore((s) => s.colorMode)
  const margins = usePrinterSettingsStore((s) => s.margins)
  const copies = usePrinterSettingsStore((s) => s.copies)

  const [items, setItems] = useState<ReprintItem[]>(() =>
    sessionIds.map((id) => ({ sessionId: id, status: 'pending' }))
  )
  const [isDone, setIsDone] = useState(!printerName)
  const stoppedRef = useRef(false)

  const completedCount = items.filter((i) => i.status === 'success' || i.status === 'error').length
  const totalCount = items.length

  const updateItem = useCallback((index: number, update: Partial<ReprintItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...update } : item)))
  }, [])

  useEffect(() => {
    if (!printerName) return

    let cancelled = false

    async function runQueue(): Promise<void> {
      for (let i = 0; i < sessionIds.length; i++) {
        if (cancelled || stoppedRef.current) break

        updateItem(i, { status: 'printing' })

        try {
          const detail = await window.api.gallery.getSessionDetail(sessionIds[i])
          if (cancelled || stoppedRef.current) break

          if (!detail?.printSheetDataUrl) {
            updateItem(i, { status: 'error', error: 'No print data available' })
            continue
          }

          const result = await window.api.printer.print({
            printerName,
            imageDataUrl: detail.printSheetDataUrl,
            copies,
            colorMode,
            paperSize,
            margins
          })

          if (cancelled || stoppedRef.current) break

          if (result.success) {
            updateItem(i, { status: 'success' })
          } else {
            updateItem(i, { status: 'error', error: result.error || 'Print failed' })
          }
        } catch (err) {
          if (cancelled || stoppedRef.current) break
          const msg = err instanceof Error ? err.message : 'Unknown error'
          updateItem(i, { status: 'error', error: msg })
        }
      }

      if (!cancelled) {
        setIsDone(true)
      }
    }

    runQueue()

    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const handleStop = (): void => {
    stoppedRef.current = true
    setIsDone(true)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>
          {isDone
            ? 'Reprint Complete'
            : `Reprinting${totalCount > 1 ? ` (${completedCount + 1} of ${totalCount})` : ''}...`}
        </h2>

        {!printerName && (
          <div className={styles.errorMessage}>
            No printer configured. Please set up a printer in the Printer section first.
          </div>
        )}

        {totalCount > 1 && (
          <>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>

            <ul className={styles.statusList}>
              {items.map((item, i) => (
                <li key={item.sessionId} className={styles.statusItem}>
                  <span className={styles.statusIcon}>
                    {item.status === 'pending' && <span className={styles.statusPending}>-</span>}
                    {item.status === 'printing' && (
                      <span className={styles.statusPrinting}>...</span>
                    )}
                    {item.status === 'success' && <span className={styles.statusSuccess}>✓</span>}
                    {item.status === 'error' && <span className={styles.statusError}>✗</span>}
                  </span>
                  <span
                    className={
                      item.status === 'printing'
                        ? styles.statusPrinting
                        : item.status === 'error'
                          ? styles.statusError
                          : item.status === 'success'
                            ? styles.statusSuccess
                            : styles.statusPending
                    }
                  >
                    Session {i + 1}
                  </span>
                  {item.error && <span className={styles.errorDetail}>({item.error})</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        {totalCount === 1 && items[0].error && (
          <div className={styles.errorMessage}>{items[0].error}</div>
        )}

        <div className={styles.actions}>
          {isDone ? (
            <button className={styles.doneButton} onClick={onClose}>
              Done
            </button>
          ) : (
            <button className={styles.stopButton} onClick={handleStop}>
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReprintDialog
