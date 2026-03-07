import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import PinDialog from '@/components/PinDialog/PinDialog'

describe('PinDialog', () => {
  let onSuccess: ReturnType<typeof vi.fn>
  let onCancel: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    onSuccess = vi.fn()
    onCancel = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the title and 4 dot indicators', () => {
    const { container } = render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)
    expect(screen.getByText('Enter PIN')).toBeInTheDocument()
    const dots = container.querySelectorAll('[data-dot]')
    expect(dots.length).toBe(4)
  })

  it('renders all numeric keys 0-9, backspace, and cancel', () => {
    render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Backspace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('fills dots as digits are entered', () => {
    const { container } = render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    let filled = container.querySelectorAll('[class*="dotFilled"]')
    expect(filled.length).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    filled = container.querySelectorAll('[class*="dotFilled"]')
    expect(filled.length).toBe(2)
  })

  it('calls onSuccess when the correct PIN is entered', () => {
    render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('shows error and clears input on incorrect PIN', () => {
    const { container } = render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: '4' }))

    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(screen.getByText('Incorrect PIN')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    const filled = container.querySelectorAll('[class*="dotFilled"]')
    expect(filled.length).toBe(0)
  })

  it('calls onCancel after 3 consecutive incorrect attempts', () => {
    render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)

    for (let attempt = 0; attempt < 3; attempt++) {
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '2' }))
      fireEvent.click(screen.getByRole('button', { name: '3' }))
      fireEvent.click(screen.getByRole('button', { name: '4' }))
      if (attempt < 2) {
        act(() => {
          vi.advanceTimersByTime(500)
        })
      }
    }

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Cancel button is clicked', () => {
    render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('removes last digit on backspace', () => {
    const { container } = render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(container.querySelectorAll('[class*="dotFilled"]').length).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: 'Backspace' }))
    expect(container.querySelectorAll('[class*="dotFilled"]').length).toBe(1)
  })

  it('clears error when user starts typing again', () => {
    render(<PinDialog onSuccess={onSuccess} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: '4' }))

    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(screen.getByText('Incorrect PIN')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(screen.queryByText('Incorrect PIN')).not.toBeInTheDocument()
  })
})
