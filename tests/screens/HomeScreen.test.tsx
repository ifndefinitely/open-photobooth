import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HomeScreen from '@/screens/HomeScreen/HomeScreen'
import AdminGestureOverlay from '@/components/AdminGestureOverlay/AdminGestureOverlay'
import { useNavigationStore } from '@/stores/navigationStore'
import { useCameraStore } from '@/stores/cameraStore'

// Create a minimal mock MediaStream so cameraReady = true
const mockStream = { getVideoTracks: () => [], getAudioTracks: () => [], getTracks: () => [] }

describe('HomeScreen', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset()
    // Set a mock stream so the "Take Photos" button is enabled
    useCameraStore.setState({ stream: mockStream as unknown as MediaStream, error: null })
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

  it('disables Take Photos button when camera has no stream', () => {
    useCameraStore.setState({ stream: null, error: null })
    render(<HomeScreen />)
    expect(screen.getByRole('button', { name: 'Take Photos' })).toBeDisabled()
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
    const { container } = render(
      <>
        <HomeScreen />
        <AdminGestureOverlay />
      </>
    )
    const target = container.querySelector('[aria-hidden="true"]')
    expect(target).toBeInTheDocument()
  })

  it('shows PIN dialog after 5 taps within 3 seconds', () => {
    const { container } = render(
      <>
        <HomeScreen />
        <AdminGestureOverlay />
      </>
    )
    const target = container.querySelector('[aria-hidden="true"]') as HTMLElement

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(150)
      fireEvent.pointerDown(target)
    }

    expect(screen.getByText('Enter PIN')).toBeInTheDocument()
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })

  it('does not show PIN dialog after only 4 taps', () => {
    const { container } = render(
      <>
        <HomeScreen />
        <AdminGestureOverlay />
      </>
    )
    const target = container.querySelector('[aria-hidden="true"]') as HTMLElement

    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(150)
      fireEvent.pointerDown(target)
    }

    expect(screen.queryByText('Enter PIN')).not.toBeInTheDocument()
  })

  it('navigates to admin after entering correct PIN', () => {
    const { container } = render(
      <>
        <HomeScreen />
        <AdminGestureOverlay />
      </>
    )
    const target = container.querySelector('[aria-hidden="true"]') as HTMLElement

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(150)
      fireEvent.pointerDown(target)
    }

    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    expect(useNavigationStore.getState().currentScreen).toBe('admin')
  })

  it('closes PIN dialog on cancel and stays on home', () => {
    const { container } = render(
      <>
        <HomeScreen />
        <AdminGestureOverlay />
      </>
    )
    const target = container.querySelector('[aria-hidden="true"]') as HTMLElement

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(150)
      fireEvent.pointerDown(target)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Enter PIN')).not.toBeInTheDocument()
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})
