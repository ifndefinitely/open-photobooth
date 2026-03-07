import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onTimeout after the specified duration with no activity', () => {
    const onTimeout = vi.fn()
    renderHook(() => useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout }))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it('does not call onTimeout before the timeout elapses', () => {
    const onTimeout = vi.fn()
    renderHook(() => useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout }))

    act(() => {
      vi.advanceTimersByTime(4999)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('resets timer on click event', () => {
    const onTimeout = vi.fn()
    renderHook(() => useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout }))

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    act(() => {
      window.dispatchEvent(new Event('click'))
    })

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(onTimeout).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it('resets timer on touchstart event', () => {
    const onTimeout = vi.fn()
    renderHook(() => useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout }))

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    act(() => {
      window.dispatchEvent(new Event('touchstart'))
    })

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('resets timer on keydown event', () => {
    const onTimeout = vi.fn()
    renderHook(() => useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout }))

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    act(() => {
      window.dispatchEvent(new Event('keydown'))
    })

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('returns null remainingSeconds before warning period', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout })
    )

    expect(result.current.remainingSeconds).toBeNull()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.remainingSeconds).toBeNull()
  })

  it('counts down remainingSeconds during warning period', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout })
    )

    // Advance to warning period start (5000 - 2000 = 3000ms)
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.remainingSeconds).toBe(2)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.remainingSeconds).toBe(1)
  })

  it('resets remainingSeconds to null on activity during warning', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout })
    )

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(result.current.remainingSeconds).not.toBeNull()

    act(() => {
      window.dispatchEvent(new Event('click'))
    })

    expect(result.current.remainingSeconds).toBeNull()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('cleans up timers and listeners on unmount', () => {
    const onTimeout = vi.fn()
    const { unmount } = renderHook(() =>
      useIdleTimeout({ timeoutMs: 5000, warningMs: 2000, onTimeout })
    )

    unmount()

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('uses default timeout of 60s and warning of 10s', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() => useIdleTimeout({ onTimeout }))

    act(() => {
      vi.advanceTimersByTime(49999)
    })

    expect(result.current.remainingSeconds).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(result.current.remainingSeconds).toBe(10)
  })
})
