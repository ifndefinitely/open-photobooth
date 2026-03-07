import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HomeScreen from '@/screens/HomeScreen/HomeScreen'
import { useNavigationStore } from '@/stores/navigationStore'

describe('HomeScreen', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset()
  })

  it('renders the camera preview placeholder', () => {
    render(<HomeScreen />)
    expect(screen.getByText('Camera Preview')).toBeInTheDocument()
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
