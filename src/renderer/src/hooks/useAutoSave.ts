import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useStripStore } from '@/stores/stripStore'

/**
 * Automatically saves session photos and strips to disk after capture completes.
 *
 * Call this hook inside ReviewScreen. On mount it:
 * 1. Saves individual photos immediately via the gallery API.
 * 2. Watches for strip + print sheet composition to complete, then saves those too.
 *
 * All operations are fire-and-forget — failures are logged but never affect UX.
 */
export function useAutoSave(): void {
  const sessionFolderRef = useRef<string | null>(null)
  const stripSavedRef = useRef(false)

  const photos = useSessionStore((s) => s.photos)
  const selectedFilter = useStripStore((s) => s.selectedFilter)
  const stripResult = useStripStore((s) => s.stripResult)
  const printSheetResult = useStripStore((s) => s.printSheetResult)

  // Save individual photos on mount
  useEffect(() => {
    if (photos.length === 0) return

    // Extract base64 data from each photo's dataUrl
    const photoBase64Strings = photos.map((p) => {
      const commaIndex = p.dataUrl.indexOf(',')
      return commaIndex >= 0 ? p.dataUrl.substring(commaIndex + 1) : p.dataUrl
    })

    window.api.gallery
      .saveSession({
        photos: photoBase64Strings,
        timestamp: new Date().toISOString(),
        photoCount: photos.length,
        filter: selectedFilter
      })
      .then((result) => {
        if (result.success) {
          sessionFolderRef.current = result.sessionFolder
          console.log(`[AutoSave] Photos saved to: ${result.sessionFolder}`)
        } else {
          console.error(`[AutoSave] Failed to save photos: ${result.error}`)
        }
      })
      .catch((err) => {
        console.error('[AutoSave] Failed to save photos:', err)
      })

    // Reset strip-saved flag for this session
    stripSavedRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount — photos are stable at this point

  // Save strip + print sheet when composition completes
  useEffect(() => {
    if (!stripResult || !printSheetResult) return
    if (!sessionFolderRef.current) return
    if (stripSavedRef.current) return

    stripSavedRef.current = true

    const stripBase64 = stripResult.dataUrl.substring(stripResult.dataUrl.indexOf(',') + 1)
    const printSheetBase64 = printSheetResult.dataUrl.substring(
      printSheetResult.dataUrl.indexOf(',') + 1
    )

    window.api.gallery
      .saveStrip(sessionFolderRef.current, stripBase64, printSheetBase64)
      .then(() => {
        console.log('[AutoSave] Strip and print sheet saved')
      })
      .catch((err) => {
        console.error('[AutoSave] Failed to save strip:', err)
      })
  }, [stripResult, printSheetResult])
}
