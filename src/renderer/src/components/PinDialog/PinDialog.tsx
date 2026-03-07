import { useState, useCallback, useEffect, useRef } from 'react'
import styles from './PinDialog.module.css'

const DEFAULT_PIN = '0000'
const MAX_ATTEMPTS = 3
const ERROR_DISPLAY_MS = 500

interface PinDialogProps {
  onSuccess: () => void
  onCancel: () => void
}

function PinDialog({ onSuccess, onCancel }: PinDialogProps): React.JSX.Element {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const failureCountRef = useRef(0)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (pin.length !== 4) return

    if (pin === DEFAULT_PIN) {
      onSuccess()
    } else {
      failureCountRef.current += 1

      if (failureCountRef.current >= MAX_ATTEMPTS) {
        onCancel()
      } else {
        setTimeout(() => setError('Incorrect PIN'), 0)
        clearTimerRef.current = setTimeout(() => {
          setPin('')
          setError(null)
          clearTimerRef.current = null
        }, ERROR_DISPLAY_MS)
      }
    }
  }, [pin, onSuccess, onCancel])

  const handleDigit = useCallback((digit: string) => {
    setError(null)
    setPin((prev) => (prev.length >= 4 ? prev : prev + digit))
  }, [])

  const handleBackspace = useCallback(() => {
    setError(null)
    setPin((prev) => prev.slice(0, -1))
  }, [])

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'empty', '0', 'backspace']

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>Enter PIN</h2>

        <div className={styles.dots}>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              data-dot
              className={`${styles.dot}${i < pin.length ? ` ${styles.dotFilled}` : ''}`}
            />
          ))}
        </div>

        <div className={styles.error}>{error ?? ''}</div>

        <div className={styles.keypad}>
          {keys.map((key) => {
            if (key === 'empty') {
              return <div key={key} className={`${styles.key} ${styles.keyEmpty}`} />
            }
            if (key === 'backspace') {
              return (
                <button
                  key={key}
                  className={`${styles.key} ${styles.keyBackspace}`}
                  onClick={handleBackspace}
                  aria-label="Backspace"
                >
                  &#x232B;
                </button>
              )
            }
            return (
              <button key={key} className={styles.key} onClick={() => handleDigit(key)}>
                {key}
              </button>
            )
          })}
        </div>

        <button className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default PinDialog
