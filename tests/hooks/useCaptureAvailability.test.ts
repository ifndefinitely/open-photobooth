import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCaptureAvailability } from '@/hooks/useCaptureAvailability'
import { usePrinterStatusStore } from '@/stores/printerStatusStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import type { PrinterState } from '@/stores/printerStatusStore'

const setStatus = (state: PrinterState): void => {
  usePrinterStatusStore.setState({
    status: {
      name: 'test',
      state,
      rawStatusCode: 0,
      jobCount: 0,
      detail: 'test',
      queriedAt: Date.now()
    },
    recentErrors: [],
    lastCheckedAt: Date.now()
  })
}

describe('useCaptureAvailability', () => {
  beforeEach(() => {
    usePrinterStatusStore.getState().reset()
    usePrinterSettingsStore.setState({ offlineBehaviour: 'captureOnly' })
  })

  it('allows captures with no banner when status is ready', () => {
    setStatus('ready')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('none')
  })

  it('allows captures with no banner when status is busy', () => {
    setStatus('busy')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('none')
  })

  it('allows captures with no banner when status is warmingUp', () => {
    setStatus('warmingUp')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('none')
  })

  it('blocks captures + red banner in halt mode when offline', () => {
    usePrinterSettingsStore.setState({ offlineBehaviour: 'halt' })
    setStatus('offline')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(false)
    expect(result.current.bannerMode).toBe('halt')
  })

  it('allows captures + amber banner in captureOnly mode when offline', () => {
    usePrinterSettingsStore.setState({ offlineBehaviour: 'captureOnly' })
    setStatus('offline')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('captureOnly')
  })

  it('allows captures + amber banner in captureOnly mode when error', () => {
    usePrinterSettingsStore.setState({ offlineBehaviour: 'captureOnly' })
    setStatus('error')
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('captureOnly')
  })

  it('treats null status (never polled) as allow-no-banner', () => {
    const { result } = renderHook(() => useCaptureAvailability())
    expect(result.current.allowCaptures).toBe(true)
    expect(result.current.bannerMode).toBe('none')
  })
})
