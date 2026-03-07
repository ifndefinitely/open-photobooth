import { useCallback, useEffect, useRef } from 'react'

const REQUIRED_TAPS = 5
const TAP_TIME_WINDOW_MS = 3000
const MIN_TAP_INTERVAL_MS = 100
const REQUIRED_KEY_PRESSES = 5
const KEY_TIME_WINDOW_MS = 5000

export function useAdminGesture(onActivate: () => void): { handleTap: () => void } {
  const tapCountRef = useRef(0)
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapTimeRef = useRef(0)

  const keyCountRef = useRef(0)
  const keyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (tapResetTimerRef.current !== null) {
        clearTimeout(tapResetTimerRef.current)
      }
      if (keyResetTimerRef.current !== null) {
        clearTimeout(keyResetTimerRef.current)
      }
    }
  }, [])

  const resetTapCount = useCallback(() => {
    tapCountRef.current = 0
    if (tapResetTimerRef.current !== null) {
      clearTimeout(tapResetTimerRef.current)
      tapResetTimerRef.current = null
    }
  }, [])

  const resetKeyCount = useCallback(() => {
    keyCountRef.current = 0
    if (keyResetTimerRef.current !== null) {
      clearTimeout(keyResetTimerRef.current)
      keyResetTimerRef.current = null
    }
  }, [])

  const handleTap = useCallback(() => {
    const now = Date.now()

    if (now - lastTapTimeRef.current < MIN_TAP_INTERVAL_MS) {
      return
    }
    lastTapTimeRef.current = now

    tapCountRef.current += 1

    if (tapCountRef.current === 1) {
      if (tapResetTimerRef.current !== null) {
        clearTimeout(tapResetTimerRef.current)
      }
      tapResetTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0
        tapResetTimerRef.current = null
      }, TAP_TIME_WINDOW_MS)
    }

    if (tapCountRef.current >= REQUIRED_TAPS) {
      resetTapCount()
      onActivate()
    }
  }, [onActivate, resetTapCount])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter') {
        return
      }

      keyCountRef.current += 1

      if (keyCountRef.current === 1) {
        if (keyResetTimerRef.current !== null) {
          clearTimeout(keyResetTimerRef.current)
        }
        keyResetTimerRef.current = setTimeout(() => {
          keyCountRef.current = 0
          keyResetTimerRef.current = null
        }, KEY_TIME_WINDOW_MS)
      }

      if (keyCountRef.current >= REQUIRED_KEY_PRESSES) {
        resetKeyCount()
        onActivate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onActivate, resetKeyCount])

  return { handleTap }
}
