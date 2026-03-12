import { useEffect, useRef } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useStripStore } from '@/stores/stripStore'
import { logger } from '@/services/loggerService'

const CYCLE_INTERVAL_MS = 30_000

// Fake 1x1 white pixel as base64 (minimal memory footprint for testing)
const FAKE_PHOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Dev-only stress test utility.
 * Press Ctrl+Shift+T to start/stop auto-cycling through the photobooth flow.
 * Each cycle: home → session (add fake photos) → review → print → thankyou → home.
 * Monitors memory usage and logs timing data to the console.
 */
export function useStressTest(): void {
  const activeRef = useRef(false)
  const cycleCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function runCycle(): Promise<void> {
      if (!activeRef.current) return

      const cycleNum = ++cycleCountRef.current
      const startTime = performance.now()

      const memBefore =
        'memory' in performance
          ? (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
          : 0

      logger.info('StressTest', `Cycle ${cycleNum} starting`)

      try {
        // Step 1: Navigate to session
        useNavigationStore.getState().navigateTo('session')

        // Step 2: Add fake photos (simulate 4-photo session)
        const sessionStore = useSessionStore.getState()
        sessionStore.resetSession()
        for (let i = 0; i < 4; i++) {
          sessionStore.addPhoto({
            dataUrl: FAKE_PHOTO,
            blob: new Blob([''], { type: 'image/png' }),
            width: 1,
            height: 1
          })
        }

        // Wait briefly for state to settle
        await sleep(500)
        if (!activeRef.current) return

        // Step 3: Navigate to review (strip composition will trigger)
        useNavigationStore.getState().navigateTo('review')
        await sleep(3000) // Allow strip composition
        if (!activeRef.current) return

        // Step 4: Skip print (mock), go to thankyou
        useNavigationStore.getState().navigateTo('thankyou')
        await sleep(2000)
        if (!activeRef.current) return

        // Step 5: Return home and clean up
        useNavigationStore.getState().goHome()
        useSessionStore.getState().resetSession()
        useStripStore.getState().resetStrip()

        const elapsed = Math.round(performance.now() - startTime)
        const memAfter =
          'memory' in performance
            ? (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
                .usedJSHeapSize
            : 0
        const memDeltaMB = ((memAfter - memBefore) / 1024 / 1024).toFixed(2)
        const totalMB = (memAfter / 1024 / 1024).toFixed(1)

        logger.info(
          'StressTest',
          `Cycle ${cycleNum} complete in ${elapsed}ms | Memory: ${totalMB}MB (delta: ${memDeltaMB}MB)`
        )

        // Schedule next cycle
        if (activeRef.current) {
          const remaining = Math.max(0, CYCLE_INTERVAL_MS - elapsed)
          timerRef.current = setTimeout(runCycle, remaining)
        }
      } catch (err) {
        logger.error('StressTest', `Cycle ${cycleNum} failed: ${err}`)
        if (activeRef.current) {
          // Recover and continue
          useNavigationStore.getState().goHome()
          useSessionStore.getState().resetSession()
          useStripStore.getState().resetStrip()
          timerRef.current = setTimeout(runCycle, CYCLE_INTERVAL_MS)
        }
      }
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        activeRef.current = !activeRef.current
        if (activeRef.current) {
          cycleCountRef.current = 0
          logger.info('StressTest', 'Stress test STARTED (Ctrl+Shift+T to stop)')
          runCycle()
        } else {
          if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
          }
          logger.info('StressTest', `Stress test STOPPED after ${cycleCountRef.current} cycles`)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      activeRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])
}
