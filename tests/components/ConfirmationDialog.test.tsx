import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmationDialog from '@/components/ConfirmationDialog/ConfirmationDialog'

describe('ConfirmationDialog', () => {
  const defaultProps = {
    title: 'Confirm Action',
    message: 'Are you sure?',
    confirmLabel: 'Yes',
    cancelLabel: 'No',
    onConfirm: vi.fn(),
    onCancel: vi.fn()
  }

  it('renders title, message, and button labels', () => {
    render(<ConfirmationDialog {...defaultProps} />)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />)
    const overlay = container.firstChild as HTMLElement
    fireEvent.click(overlay)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not call onCancel when card content is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Are you sure?'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('applies danger styling when variant is danger', () => {
    render(<ConfirmationDialog {...defaultProps} variant="danger" />)
    const confirmButton = screen.getByRole('button', { name: 'Yes' })
    expect(confirmButton.className).toContain('confirmDanger')
  })

  it('does not apply danger styling by default', () => {
    render(<ConfirmationDialog {...defaultProps} />)
    const confirmButton = screen.getByRole('button', { name: 'Yes' })
    expect(confirmButton.className).not.toContain('confirmDanger')
  })
})
