import { useReducer, useEffect, useCallback } from 'react'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { t } from '@/i18n'
import { logger } from '@/services/loggerService'

export type PrintStatus = 'idle' | 'printing' | 'success' | 'error'

interface PrintJobState {
  status: PrintStatus
  error: string | null
}

type PrintJobAction = { type: 'start' } | { type: 'success' } | { type: 'error'; error: string }

function printJobReducer(_state: PrintJobState, action: PrintJobAction): PrintJobState {
  switch (action.type) {
    case 'start':
      return { status: 'printing', error: null }
    case 'success':
      return { status: 'success', error: null }
    case 'error':
      return { status: 'error', error: action.error }
  }
}

interface PrintJobResult {
  status: PrintStatus
  error: string | null
  retry: () => void
}

/**
 * Orchestrates the print flow: reads the print sheet from the strip store,
 * sends it to the printer via the preload API, and tracks status.
 */
export function usePrintJob(): PrintJobResult {
  const printSheetResult = useStripStore((s) => s.printSheetResult)
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const paperSize = usePrinterSettingsStore((s) => s.paperSize)
  const colorMode = usePrinterSettingsStore((s) => s.colorMode)
  const margins = usePrinterSettingsStore((s) => s.margins)
  const copies = usePrinterSettingsStore((s) => s.copies)

  const [state, dispatch] = useReducer(printJobReducer, { status: 'idle', error: null })

  const sendPrintJob = useCallback(async () => {
    dispatch({ type: 'start' })

    const imageDataUrl = printSheetResult?.dataUrl
    if (!imageDataUrl) {
      const msg = 'No print sheet data available'
      logger.error('Printer', msg)
      dispatch({ type: 'error', error: t('error.printFailed') })
      return
    }

    if (!printerName) {
      logger.error('Printer', 'No printer configured')
      dispatch({ type: 'error', error: t('error.printerNotFound') })
      return
    }

    logger.info(
      'Printer',
      `Print job sent (printer: ${printerName}, paper: ${paperSize}, copies: ${copies})`
    )

    try {
      const result = await window.api.printer.print({
        printerName,
        imageDataUrl,
        copies,
        colorMode,
        paperSize,
        margins
      })

      if (result.success) {
        logger.info('Printer', 'Print job completed successfully')
        dispatch({ type: 'success' })
      } else {
        logger.error('Printer', `Print job failed: ${result.error || 'Unknown error'}`)
        dispatch({ type: 'error', error: result.error || 'Unknown print error' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send print job'
      logger.error('Printer', `Print job error: ${msg}`)
      dispatch({
        type: 'error',
        error: msg
      })
    }
  }, [printSheetResult, printerName, paperSize, colorMode, margins, copies])

  // Send the print job on mount
  useEffect(() => {
    sendPrintJob()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally run once on mount

  return {
    status: state.status === 'idle' ? 'printing' : state.status,
    error: state.error,
    retry: sendPrintJob
  }
}
