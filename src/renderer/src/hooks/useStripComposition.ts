import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useStripStore } from '@/stores/stripStore'
import { useStripSettingsStore } from '@/stores/stripSettingsStore'
import { applyFilterToAll } from '@/services/filterService'
import {
  composeStrip,
  composePrintSheet,
  buildCompositionSettings,
  getPaperDimensions
} from '@/services/stripService'
import type { FilterType } from '@/stores/stripStore'

/**
 * Orchestrates the strip composition pipeline.
 * On mount and when the selected filter changes, runs:
 *   photos → filter → compose strip → compose print sheet → update store
 */
export function useStripComposition(): void {
  const compositionIdRef = useRef(0)

  const photos = useSessionStore((s) => s.photos)
  const selectedFilter = useStripStore((s) => s.selectedFilter)
  const setStripResult = useStripStore((s) => s.setStripResult)
  const setPrintSheetResult = useStripStore((s) => s.setPrintSheetResult)
  const setIsComposing = useStripStore((s) => s.setIsComposing)
  const setCompositionError = useStripStore((s) => s.setCompositionError)

  const backgroundColor = useStripSettingsStore((s) => s.backgroundColor)
  const borderColor = useStripSettingsStore((s) => s.borderColor)
  const borderStyle = useStripSettingsStore((s) => s.borderStyle)
  const borderWidth = useStripSettingsStore((s) => s.borderWidth)
  const logoPath = useStripSettingsStore((s) => s.logoPath)
  const eventName = useStripSettingsStore((s) => s.eventName)
  const dateStampEnabled = useStripSettingsStore((s) => s.dateStampEnabled)
  const dateStampFormat = useStripSettingsStore((s) => s.dateStampFormat)
  const paperSize = useStripSettingsStore((s) => s.paperSize)
  const cutGuideEnabled = useStripSettingsStore((s) => s.cutGuideEnabled)

  useEffect(() => {
    if (photos.length === 0) return

    const compositionId = ++compositionIdRef.current

    async function runPipeline(filter: FilterType): Promise<void> {
      setIsComposing(true)
      setCompositionError(null)

      try {
        // Step 1: Apply filter
        const filteredPhotos = await applyFilterToAll(photos, filter)
        if (compositionId !== compositionIdRef.current) return

        // Step 2: Compose strip
        const compositionSettings = buildCompositionSettings({
          backgroundColor,
          borderColor,
          borderStyle,
          borderWidth,
          logoPath,
          eventName,
          dateStampEnabled,
          dateStampFormat
        })
        const strip = await composeStrip(filteredPhotos, compositionSettings)
        if (compositionId !== compositionIdRef.current) return

        setStripResult(strip)

        // Step 3: Compose print sheet
        const paper = getPaperDimensions(paperSize)
        const printSheet = await composePrintSheet(strip, {
          paperWidth: paper.width,
          paperHeight: paper.height,
          cutGuide: cutGuideEnabled
        })
        if (compositionId !== compositionIdRef.current) return

        setPrintSheetResult(printSheet)
      } catch (err) {
        if (compositionId !== compositionIdRef.current) return
        const message = err instanceof Error ? err.message : 'Strip composition failed'
        setCompositionError(message)
      } finally {
        if (compositionId === compositionIdRef.current) {
          setIsComposing(false)
        }
      }
    }

    runPipeline(selectedFilter)
  }, [
    photos,
    selectedFilter,
    backgroundColor,
    borderColor,
    borderStyle,
    borderWidth,
    logoPath,
    eventName,
    dateStampEnabled,
    dateStampFormat,
    paperSize,
    cutGuideEnabled,
    setStripResult,
    setPrintSheetResult,
    setIsComposing,
    setCompositionError
  ])
}
