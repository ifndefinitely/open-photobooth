import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'

export type BannerMode = 'none' | 'halt' | 'captureOnly'

interface CaptureAvailability {
  allowCaptures: boolean
  bannerMode: BannerMode
}

/**
 * Derives whether new photo sessions are allowed and which (if any) banner to
 * show, based on current printer health and the admin's offlineBehaviour setting.
 *
 * Green/busy/warmingUp → captures allowed, no banner.
 * Red (offline/error):
 *   - halt mode → captures blocked, red banner
 *   - captureOnly mode → captures allowed, amber banner, save-only path
 */
export function useCaptureAvailability(): CaptureAvailability {
  const status = usePrinterStatusStore((s) => s.status)
  const offlineBehaviour = usePrinterSettingsStore((s) => s.offlineBehaviour)

  if (!status) {
    return { allowCaptures: true, bannerMode: 'none' }
  }

  const isRed = status.state === 'offline' || status.state === 'error'

  if (!isRed) {
    return { allowCaptures: true, bannerMode: 'none' }
  }

  if (offlineBehaviour === 'halt') {
    return { allowCaptures: false, bannerMode: 'halt' }
  }

  return { allowCaptures: true, bannerMode: 'captureOnly' }
}
