import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HomeScreen from '@/screens/HomeScreen/HomeScreen'
import { useNavigationStore } from '@/stores/navigationStore'

describe('HomeScreen', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset()
  })

  it('renders the camera preview', () => {
    render(<HomeScreen />)
    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
  })

  it('renders the Take Photos button', () => {
    render(<HomeScreen />)
    const button = screen.getByRole('button', { name: 'Take Photos' })
    expect(button).toBeInTheDocument()
  })

  it('navigates to session when Take Photos is clicked', () => {
    render(<HomeScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Take Photos' }))
    expect(useNavigationStore.getState().currentScreen).toBe('session')
  })
})

describe('HomeScreen admin gesture', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders an invisible admin gesture target', () => {
    const { container } = render(<HomeScreen />)
    const target = container.querySelector('[aria-hidden="true"]')
    expect(target).toBeInTheDocument()
  })

  it('shows PIN dialog after 5 taps within 3 seconds', () => {
    const { container } = render(<HomeScreen />)
    const target = container.querySelector('[aria-hidden="true"]') as HTMLElement

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(150)
      fireEvent.click(target)
    }

    expect(screen.getByText('Enter PIN')).toBeInTheDocument()
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })

  it('does not show PIN dialog after only 4 taps', () => {
    const { container } = render(<HomeScreen />)
    const target = container.querySelector('[aria-hidden="true"]') as HTMLElement

    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(150)
      fireEvent.click(target)
    }

    expect(screen.queryByText('Enter PIN')).not.toBeInTheDocument()
  })

  it('navigates to admin after entering correct PIN', () => {
    const { container } = render(<HomeScreen />)
    const target = container.querySelector('[aria-hidden="true"]') as HTMLElement

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(150)
      fireEvent.click(target)
    }

    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    expect(useNavigationStore.getState().currentScreen).toBe('admin')
  })

  it('closes PIN dialog on cancel and stays on home', () => {
    const { container } = render(<HomeScreen />)
    const target = container.querySelector('[aria-hidden="true"]') as HTMLElement

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(150)
      fireEvent.click(target)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Enter PIN')).not.toBeInTheDocument()
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})
