import { useReducer, useEffect, useCallback } from 'react'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'

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
      dispatch({ type: 'error', error: 'No print sheet available. Please go back and try again.' })
      return
    }

    if (!printerName) {
      dispatch({
        type: 'error',
        error: 'No printer selected. Please configure a printer in Admin Settings.'
      })
      return
    }

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
        dispatch({ type: 'success' })
      } else {
        dispatch({ type: 'error', error: result.error || 'Unknown print error' })
      }
    } catch (err) {
      dispatch({
        type: 'error',
        error: err instanceof Error ? err.message : 'Failed to send print job'
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
