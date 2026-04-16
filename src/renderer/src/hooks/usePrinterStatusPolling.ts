import { useEffect, useRef } from 'react'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import type { PrinterStatus } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useNavigationStore } from '@/stores/navigationStore'

const POLLING_SCREENS = new Set(['home', 'admin'])

/**
 * Polls the main-process printer status at `healthPollInterval` seconds while
 * the app is on the HomeScreen or AdminScreen. Pauses on all other screens
 * (session/review/print) so polling never interferes with an active print job.
 */
export function usePrinterStatusPolling(): void {
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const intervalSeconds = usePrinterSettingsStore((s) => s.healthPollInterval)
  const currentScreen = useNavigationStore((s) => s.currentScreen)
  const setStatus = usePrinterStatusStore((s) => s.setStatus)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!POLLING_SCREENS.has(currentScreen)) {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }
    if (!printerName) return

    let cancelled = false
    const poll = async (): Promise<void> => {
      try {
        const status = (await window.api.printer.getStatus(printerName)) as PrinterStatus
        if (!cancelled) setStatus(status)
      } catch {
        // Swallow — next poll retries.
      }
    }

    poll()
    timerRef.current = setInterval(poll, intervalSeconds * 1000)

    return () => {
      cancelled = true
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [printerName, intervalSeconds, currentScreen, setStatus])
}
