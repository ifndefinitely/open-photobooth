import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import IdleCountdown from '@/components/IdleCountdown/IdleCountdown'

describe('IdleCountdown', () => {
  it('renders the countdown text with the given seconds', () => {
    render(<IdleCountdown remainingSeconds={10} />)
    expect(screen.getByText('Returning to home in 10s...')).toBeInTheDocument()
  })

  it('updates text when seconds change', () => {
    const { rerender } = render(<IdleCountdown remainingSeconds={5} />)
    expect(screen.getByText('Returning to home in 5s...')).toBeInTheDocument()

    rerender(<IdleCountdown remainingSeconds={3} />)
    expect(screen.getByText('Returning to home in 3s...')).toBeInTheDocument()
  })
})
