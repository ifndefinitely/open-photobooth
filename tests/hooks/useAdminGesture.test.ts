import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdminGesture } from '@/hooks/useAdminGesture'

describe('useAdminGesture', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call onActivate before 5 taps', () => {
    const onActivate = vi.fn()
    const { result } = renderHook(() => useAdminGesture(onActivate))

    act(() => {
      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(150)
        result.current.handleTap()
      }
    })

    expect(onActivate).not.toHaveBeenCalled()
  })

  it('calls onActivate after exactly 5 taps within the time window', () => {
    const onActivate = vi.fn()
    const { result } = renderHook(() => useAdminGesture(onActivate))

    act(() => {
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(150)
        result.current.handleTap()
      }
    })

    expect(onActivate).toHaveBeenCalledOnce()
  })

  it('resets tap count if 3-second window expires before reaching 5 taps', () => {
    const onActivate = vi.fn()
    const { result } = renderHook(() => useAdminGesture(onActivate))

    act(() => {
      vi.advanceTimersByTime(150)
      result.current.handleTap() // tap 1 — starts 3s window
      vi.advanceTimersByTime(150)
      result.current.handleTap() // tap 2
      vi.advanceTimersByTime(3001) // window expires — counter resets
      result.current.handleTap() // tap 1 again (new window)
      vi.advanceTimersByTime(150)
      result.current.handleTap() // tap 2
      vi.advanceTimersByTime(150)
      result.current.handleTap() // tap 3
      vi.advanceTimersByTime(150)
      result.current.handleTap() // tap 4
    })

    expect(onActivate).not.toHaveBeenCalled()
  })

  it('allows a full sequence after the previous window expired', () => {
    const onActivate = vi.fn()
    const { result } = renderHook(() => useAdminGesture(onActivate))

    act(() => {
      // Partial sequence that expires
      for (let i = 0; i < 2; i++) {
        vi.advanceTimersByTime(150)
        result.current.handleTap()
      }
      vi.advanceTimersByTime(3001) // window expires

      // Full 5-tap sequence
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(150)
        result.current.handleTap()
      }
    })

    expect(onActivate).toHaveBeenCalledOnce()
  })

  it('ignores taps that arrive faster than 100ms apart', () => {
    const onActivate = vi.fn()
    const { result } = renderHook(() => useAdminGesture(onActivate))

    act(() => {
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(50)
        result.current.handleTap()
      }
    })

    expect(onActivate).not.toHaveBeenCalled()
  })

  it('can be activated multiple times in a row', () => {
    const onActivate = vi.fn()
    const { result } = renderHook(() => useAdminGesture(onActivate))

    // First activation
    act(() => {
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(150)
        result.current.handleTap()
      }
    })
    expect(onActivate).toHaveBeenCalledOnce()

    // Second activation
    act(() => {
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(150)
        result.current.handleTap()
      }
    })
    expect(onActivate).toHaveBeenCalledTimes(2)
  })

  it('clears the timer on unmount to prevent stale callbacks', () => {
    const onActivate = vi.fn()
    const { result, unmount } = renderHook(() => useAdminGesture(onActivate))

    act(() => {
      vi.advanceTimersByTime(150)
      result.current.handleTap() // tap 1 — starts 3s window
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(3001)
    })

    expect(onActivate).not.toHaveBeenCalled()
  })
})
