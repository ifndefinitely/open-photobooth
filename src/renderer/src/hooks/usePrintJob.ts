import { useReducer, useEffect, useCallback, useRef } from 'react'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { logger } from '@/services/loggerService'

export type PrintJobState =
  | 'preflighting'
  | 'submitting'
  | 'verifying'
  | 'retrying'
  | 'succeeded'
  | 'failed_hard'

export interface PrintJobError {
  reason: string
  detail?: string
  jobId?: number
}

interface State {
  state: PrintJobState
  error: PrintJobError | null
  attempt: number // 1 = first try, 2 = auto-retry
}

type Action =
  | { type: 'start_preflight' }
  | { type: 'start_submit' }
  | { type: 'start_verify' }
  | { type: 'succeed' }
  | { type: 'soft_fail'; error: PrintJobError }
  | { type: 'hard_fail'; error: PrintJobError }
  | { type: 'start_retry' }
  | { type: 'manual_retry' }

const initial: State = { state: 'preflighting', error: null, attempt: 1 }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start_preflight':
      return { ...state, state: 'preflighting', error: null }
    case 'start_submit':
      return { ...state, state: 'submitting' }
    case 'start_verify':
      return { ...state, state: 'verifying' }
    case 'succeed':
      return { ...state, state: 'succeeded', error: null }
    case 'soft_fail':
      return { ...state, state: 'retrying', error: action.error, attempt: state.attempt + 1 }
    case 'hard_fail':
      return { ...state, state: 'failed_hard', error: action.error }
    case 'start_retry':
      return { ...state, state: 'preflighting', error: null }
    case 'manual_retry':
      return { state: 'preflighting', error: null, attempt: 1 }
  }
}

export interface PrintJobResult {
  state: PrintJobState
  error: PrintJobError | null
  retry: () => void
}

export function usePrintJob(): PrintJobResult {
  const printSheetResult = useStripStore((s) => s.printSheetResult)
  const printerName = usePrinterSettingsStore((s) => s.printerName)
  const paperSize = usePrinterSettingsStore((s) => s.paperSize)
  const colorMode = usePrinterSettingsStore((s) => s.colorMode)
  const margins = usePrinterSettingsStore((s) => s.margins)
  const copies = usePrinterSettingsStore((s) => s.copies)
  const autoRetryOnce = usePrinterSettingsStore((s) => s.autoRetryOnce)

  const [state, dispatch] = useReducer(reducer, initial)
  const runningRef = useRef(false)

  const runOnce = useCallback(
    async (currentAttempt: number): Promise<void> => {
      if (!printerName) {
        dispatch({
          type: 'hard_fail',
          error: { reason: 'no_printer', detail: 'No printer configured' }
        })
        return
      }
      if (!printSheetResult?.dataUrl) {
        dispatch({
          type: 'hard_fail',
          error: { reason: 'no_sheet', detail: 'Print sheet not ready' }
        })
        return
      }

      logger.info('Printer', `Print attempt ${currentAttempt} — preflight`)
      dispatch({ type: 'start_preflight' })
      const availability = await window.api.printer.checkAvailability(printerName)
      if (!availability.available) {
        const err: PrintJobError = {
          reason: availability.specificReason ?? availability.status,
          detail: availability.detail ?? `Printer status: ${availability.status}`
        }
        if (currentAttempt === 1 && autoRetryOnce) {
          logger.warn('Printer', `Preflight failed, auto-retrying: ${availability.status}`)
          dispatch({ type: 'soft_fail', error: err })
          return
        }
        logger.error('Printer', `Preflight failed (hard): ${availability.status}`)
        dispatch({ type: 'hard_fail', error: err })
        return
      }

      dispatch({ type: 'start_submit' })
      logger.info('Printer', `Preflight OK, submitting print job`)

      const sheet = printSheetResult.dataUrl
      const result = await window.api.printer.print({
        printerName,
        imageDataUrl: sheet,
        copies,
        colorMode,
        paperSize,
        margins
      })

      dispatch({ type: 'start_verify' })

      // Treat unverifiable as success — UI should still navigate away.
      if (result.success) {
        logger.info(
          'Printer',
          `Print verified=${result.verified}${result.jobId ? ` jobId=${result.jobId}` : ''}`
        )
        dispatch({ type: 'succeed' })
        return
      }

      const err: PrintJobError = {
        reason: result.reason ?? 'unknown',
        detail: result.error ?? result.reason ?? 'Print failed',
        jobId: result.jobId
      }
      if (currentAttempt === 1 && autoRetryOnce) {
        logger.warn('Printer', `Print failed (reason=${err.reason}), auto-retrying once`)
        dispatch({ type: 'soft_fail', error: err })
        return
      }
      logger.error('Printer', `Print failed (hard, reason=${err.reason})`)
      dispatch({ type: 'hard_fail', error: err })
    },
    [printerName, printSheetResult, paperSize, colorMode, margins, copies, autoRetryOnce]
  )

  const run = useCallback(async (): Promise<void> => {
    if (runningRef.current) return
    runningRef.current = true
    try {
      await runOnce(1)
    } finally {
      runningRef.current = false
    }
  }, [runOnce])

  // Effect to drive auto-retry when state === 'retrying'
  useEffect(() => {
    if (state.state !== 'retrying') return
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      dispatch({ type: 'start_retry' })
      await runOnce(state.attempt)
    }, 750) // brief overlay delay for the "retrying" UI
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [state.state, state.attempt, runOnce])

  // Run once on mount
  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retry = useCallback(() => {
    dispatch({ type: 'manual_retry' })
    runningRef.current = false
    run()
  }, [run])

  return { state: state.state, error: state.error, retry }
}
