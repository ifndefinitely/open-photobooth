import { useCallback, useEffect, useRef } from 'react'

const REQUIRED_TAPS = 5
const TIME_WINDOW_MS = 3000
const MIN_TAP_INTERVAL_MS = 100

export function useAdminGesture(onActivate: () => void): { handleTap: () => void } {
  const tapCountRef = useRef(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapTimeRef = useRef(0)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  const resetCount = useCallback(() => {
    tapCountRef.current = 0
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
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
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
      }
      resetTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0
        resetTimerRef.current = null
      }, TIME_WINDOW_MS)
    }

    if (tapCountRef.current >= REQUIRED_TAPS) {
      resetCount()
      onActivate()
    }
  }, [onActivate, resetCount])

  return { handleTap }
}
