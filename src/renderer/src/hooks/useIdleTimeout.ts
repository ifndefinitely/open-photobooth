import { useState, useEffect, useRef, useCallback } from 'react'

const DEFAULT_TIMEOUT_MS = 60000
const DEFAULT_WARNING_MS = 10000
const ACTIVITY_EVENTS = ['click', 'touchstart', 'keydown', 'pointerdown'] as const

interface UseIdleTimeoutOptions {
  timeoutMs?: number
  warningMs?: number
  onTimeout: () => void
}

interface UseIdleTimeoutResult {
  remainingSeconds: number | null
}

export function useIdleTimeout({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
  onTimeout
}: UseIdleTimeoutOptions): UseIdleTimeoutResult {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const mainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTimeoutRef = useRef(onTimeout)
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  })

  const clearAllTimers = useCallback(() => {
    if (mainTimerRef.current !== null) {
      clearTimeout(mainTimerRef.current)
      mainTimerRef.current = null
    }
    if (warningTimerRef.current !== null) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (countdownRef.current !== null) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const startTimers = useCallback(() => {
    clearAllTimers()

    const warningStart = Math.max(timeoutMs - warningMs, 0)

    warningTimerRef.current = setTimeout(() => {
      let seconds = Math.ceil(warningMs / 1000)
      setRemainingSeconds(seconds)

      countdownRef.current = setInterval(() => {
        seconds -= 1
        if (seconds <= 0) {
          clearAllTimers()
          setRemainingSeconds(null)
          onTimeoutRef.current()
        } else {
          setRemainingSeconds(seconds)
        }
      }, 1000)
    }, warningStart)

    mainTimerRef.current = setTimeout(() => {
      clearAllTimers()
      setRemainingSeconds(null)
      onTimeoutRef.current()
    }, timeoutMs)
  }, [timeoutMs, warningMs, clearAllTimers])

  useEffect(() => {
    startTimers()

    const handleActivity = (): void => {
      setRemainingSeconds(null)
      startTimers()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity)
    }

    return () => {
      clearAllTimers()
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity)
      }
    }
  }, [startTimers, clearAllTimers])

  return { remainingSeconds }
}
