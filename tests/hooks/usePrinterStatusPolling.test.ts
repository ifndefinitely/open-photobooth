import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePrinterStatusPolling } from '@/hooks/usePrinterStatusPolling'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useNavigationStore } from '@/stores/navigationStore'

describe('usePrinterStatusPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    usePrinterStatusStore.getState().reset()
    usePrinterSettingsStore.setState({
      printerName: 'Canon SELPHY CP1500',
      healthPollInterval: 10
    })
    useNavigationStore.setState({ currentScreen: 'home', previousScreen: null })
    vi.mocked(window.api.printer.getStatus).mockResolvedValue({
      name: 'Canon SELPHY CP1500',
      state: 'ready',
      rawStatusCode: 3,
      jobCount: 0,
      detail: 'Ready (code 3)',
      queriedAt: Date.now()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls on mount and stores the result', async () => {
    const { unmount } = renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(window.api.printer.getStatus).toHaveBeenCalledWith('Canon SELPHY CP1500')
    expect(usePrinterStatusStore.getState().status?.state).toBe('ready')
    unmount()
  })

  it('polls again after healthPollInterval seconds', async () => {
    const { unmount } = renderHook(() => usePrinterStatusPolling())
    // Let initial poll settle
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const callsAfterMount = vi.mocked(window.api.printer.getStatus).mock.calls.length

    // Advance by the poll interval
    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(vi.mocked(window.api.printer.getStatus).mock.calls.length).toBeGreaterThan(
      callsAfterMount
    )
    unmount()
  })

  it('does not poll while on a non-idle screen (e.g. session)', async () => {
    useNavigationStore.setState({ currentScreen: 'session', previousScreen: null })
    const { unmount } = renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    expect(window.api.printer.getStatus).not.toHaveBeenCalled()
    unmount()
  })

  it('does not call getStatus when no printer is configured', async () => {
    usePrinterSettingsStore.setState({ printerName: '' })
    const { unmount } = renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    expect(window.api.printer.getStatus).not.toHaveBeenCalled()
    unmount()
  })

  it('records a recent error when status is error-level', async () => {
    vi.mocked(window.api.printer.getStatus).mockResolvedValue({
      name: 'Canon SELPHY CP1500',
      state: 'error',
      rawStatusCode: 9,
      jobCount: 0,
      detail: 'Paper out (code 9)',
      queriedAt: Date.now()
    })
    const { unmount } = renderHook(() => usePrinterStatusPolling())
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const store = usePrinterStatusStore.getState()
    expect(store.status?.state).toBe('error')
    expect(store.recentErrors.length).toBeGreaterThanOrEqual(1)
    expect(store.recentErrors[0].detail).toContain('Paper out')
    unmount()
  })
})
