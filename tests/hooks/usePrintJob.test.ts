import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePrintJob } from '@/hooks/usePrintJob'
import { useStripStore } from '@/stores/stripStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'

const mockSheet = {
  dataUrl: 'data:image/png;base64,mock',
  blob: new Blob(['mock'], { type: 'image/png' }),
  width: 100,
  height: 100
}

function primeStores(): void {
  useStripStore.setState({
    selectedFilter: 'none',
    stripResult: mockSheet,
    printSheetResult: mockSheet,
    isComposing: false,
    compositionError: null,
    wasPrinted: true
  })
  usePrinterSettingsStore.setState({
    printerName: 'Canon SELPHY CP1500',
    paperSize: '4x6',
    quality: 'high',
    colorMode: 'color',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    copies: 1,
    preflightTimeout: 10,
    verificationTimeout: 90,
    verificationPollInterval: 2,
    autoRetryOnce: true,
    offlineBehaviour: 'captureOnly',
    healthPollInterval: 10
  })
}

describe('usePrintJob — state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    primeStores()
  })

  it('transitions to succeeded on happy path', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print).mockResolvedValue({
      success: true,
      verified: true,
      jobId: 42
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('succeeded')
    })
    expect(window.api.printer.checkAvailability).toHaveBeenCalledWith('Canon SELPHY CP1500')
    expect(window.api.printer.print).toHaveBeenCalledTimes(1)
  })

  it('transitions to succeeded when verification returns unverifiable', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print).mockResolvedValue({
      success: true,
      verified: false,
      reason: 'unverifiable'
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('succeeded')
    })
  })

  it('auto-retries once on verified failure when autoRetryOnce is true', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print)
      .mockResolvedValueOnce({ success: false, verified: false, reason: 'paper_out' })
      .mockResolvedValueOnce({ success: true, verified: true, jobId: 43 })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(
      () => {
        expect(result.current.state).toBe('succeeded')
      },
      { timeout: 3000 }
    )
    expect(window.api.printer.print).toHaveBeenCalledTimes(2)
  }, 10000)

  it('escalates to failed_hard after second verified failure', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print).mockResolvedValue({
      success: false,
      verified: false,
      reason: 'paper_out'
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(
      () => {
        expect(result.current.state).toBe('failed_hard')
      },
      { timeout: 3000 }
    )
    expect(result.current.error?.reason).toBe('paper_out')
    expect(window.api.printer.print).toHaveBeenCalledTimes(2)
  }, 10000)

  it('does not auto-retry when autoRetryOnce is false', async () => {
    usePrinterSettingsStore.setState({ autoRetryOnce: false })
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print).mockResolvedValue({
      success: false,
      verified: false,
      reason: 'paper_out'
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(() => {
      expect(result.current.state).toBe('failed_hard')
    })
    expect(window.api.printer.print).toHaveBeenCalledTimes(1)
  })

  it('moves to failed_hard when preflight says printer is offline', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: false,
      status: 'offline'
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(
      () => {
        expect(result.current.state).toBe('failed_hard')
      },
      { timeout: 3000 }
    )
    expect(result.current.error?.reason).toBe('offline')
    expect(window.api.printer.print).not.toHaveBeenCalled()
  }, 10000)

  it('uses specificReason from preflight when available', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: false,
      status: 'error',
      specificReason: 'paper_out',
      detail: 'PaperOut (code 16)',
      rawStatusCode: 16
    })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(
      () => {
        expect(result.current.state).toBe('failed_hard')
      },
      { timeout: 3000 }
    )
    expect(result.current.error?.reason).toBe('paper_out')
    expect(window.api.printer.print).not.toHaveBeenCalled()
  }, 10000)

  it('manual retry from failed_hard restarts the flow', async () => {
    vi.mocked(window.api.printer.checkAvailability).mockResolvedValue({
      available: true,
      status: 'ready'
    })
    vi.mocked(window.api.printer.print)
      .mockResolvedValueOnce({ success: false, verified: false, reason: 'paper_out' })
      .mockResolvedValueOnce({ success: false, verified: false, reason: 'paper_out' })
      .mockResolvedValueOnce({ success: true, verified: true, jobId: 50 })

    const { result } = renderHook(() => usePrintJob())

    await waitFor(
      () => {
        expect(result.current.state).toBe('failed_hard')
      },
      { timeout: 3000 }
    )

    // Manual retry
    result.current.retry()

    await waitFor(() => {
      expect(result.current.state).toBe('succeeded')
    })
  }, 10000)
})
