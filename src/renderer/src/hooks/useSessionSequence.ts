import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useSessionSettingsStore } from '@/stores/sessionSettingsStore'
import { useNavigationStore } from '@/stores/navigationStore'
import { useCameraStore } from '@/stores/cameraStore'
import { useStripStore } from '@/stores/stripStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { playSFX, SFX } from '@/services/audioService'
import { t } from '@/i18n'

/**
 * Orchestrates the entire photo session sequence:
 * countdown → capture → flash → thumbnail → pause ("Get Ready!") → repeat
 *
 * All timers are tracked and cleaned up on unmount or interruption.
 * Uses plain functions (not useCallback) to avoid circular dependency
 * issues with React 19's strict ESLint rules.
 */
export function useSessionSequence(): void {
  const timersRef = useRef<Set<number>>(new Set())
  const mountedRef = useRef(true)

  // Main effect: start the session and clean up on unmount
  useEffect(() => {
    mountedRef.current = true
    useSessionStore.getState().resetSession()
    useStripStore.getState().resetStrip()

    // --- Timer helpers (scoped to this effect) ---

    function cancelAllTimers(): void {
      for (const id of timersRef.current) {
        window.clearTimeout(id)
        window.clearInterval(id)
      }
      timersRef.current.clear()
    }

    function safeTimeout(fn: () => void, ms: number): number {
      const id = window.setTimeout(() => {
        timersRef.current.delete(id)
        if (mountedRef.current) {
          fn()
        }
      }, ms)
      timersRef.current.add(id)
      return id
    }

    function safeInterval(fn: () => void, ms: number): number {
      const id = window.setInterval(() => {
        if (mountedRef.current) {
          fn()
        }
      }, ms)
      timersRef.current.add(id)
      return id
    }

    // --- Sequence functions ---

    function startCountdown(): void {
      const { countdownDuration } = useSessionSettingsStore.getState()
      const { setPhase, setCountdownValue } = useSessionStore.getState()
      const { audioCountdownBeep } = useAppSettingsStore.getState()

      let remaining = countdownDuration
      setPhase('countdown')
      setCountdownValue(remaining)

      // Beep on the first displayed number
      if (audioCountdownBeep) {
        playSFX(remaining === 1 ? SFX.BEEP_FINAL : SFX.BEEP)
      }

      const intervalId = safeInterval(() => {
        remaining -= 1
        if (remaining > 0) {
          useSessionStore.getState().setCountdownValue(remaining)
          if (audioCountdownBeep) {
            playSFX(remaining === 1 ? SFX.BEEP_FINAL : SFX.BEEP)
          }
        } else {
          window.clearInterval(intervalId)
          timersRef.current.delete(intervalId)
          useSessionStore.getState().setCountdownValue(null)
          doCapture()
        }
      }, 1000)
    }

    async function doCapture(): Promise<void> {
      const { setPhase, addPhoto, advancePhoto } = useSessionStore.getState()
      const { photoCount } = useSessionSettingsStore.getState()
      const { audioShutterSound } = useAppSettingsStore.getState()

      setPhase('capture')

      // Shutter click at the moment of capture (before the async frame grab)
      if (audioShutterSound) {
        playSFX(SFX.SHUTTER)
      }
      try {
        const result = await useCameraStore.getState().captureFrame()
        if (!mountedRef.current) return

        addPhoto(result)
        setPhase('flash')

        safeTimeout(() => {
          const { photos } = useSessionStore.getState()
          const isLastPhoto = photos.length >= photoCount

          if (isLastPhoto) {
            setPhase('complete')
            safeTimeout(() => {
              useNavigationStore.getState().navigateTo('review')
            }, 500)
          } else {
            advancePhoto()
            setPhase('pause')
            safeTimeout(() => {
              startCountdown()
            }, 1500)
          }
        }, 150)
      } catch (err) {
        console.error('Failed to capture frame:', err)
        if (!mountedRef.current) return
        useSessionStore.getState().setPhase('complete')
        useNavigationStore.getState().navigateTo('review')
      }
    }

    // --- Camera disconnect detection ---

    const unsubscribe = useCameraStore.subscribe((state, prevState) => {
      if (!mountedRef.current) return

      const { phase } = useSessionStore.getState()
      if (phase === 'idle' || phase === 'complete') return

      const streamLost = prevState.stream !== null && state.stream === null
      const errorOccurred = state.error !== null && prevState.error === null

      if (streamLost || errorOccurred) {
        cancelAllTimers()

        const deviceName = prevState.devices.find(
          (d) => d.deviceId === prevState.settings.deviceId
        )?.label
        const details = [
          deviceName ? `Device: ${deviceName}` : null,
          state.error ? `Error: ${state.error}` : null
        ]
          .filter(Boolean)
          .join('\n')

        useSessionStore.getState().setLastError({
          message: t('error.cameraDisconnected'),
          details: details || undefined
        })

        useNavigationStore.getState().navigateTo('error')
      }
    })

    // --- Start the sequence ---
    startCountdown()

    return () => {
      mountedRef.current = false
      cancelAllTimers()
      unsubscribe()
      useSessionStore.getState().resetSession()
    }
  }, [])
}
