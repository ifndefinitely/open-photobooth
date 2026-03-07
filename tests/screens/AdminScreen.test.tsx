import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminScreen from '@/screens/AdminScreen/AdminScreen'
import { useNavigationStore } from '@/stores/navigationStore'
import { ADMIN_SECTIONS } from '@/screens/AdminScreen/adminSections'

describe('AdminScreen', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset()
  })

  it('renders all 10 section labels in the sidebar', () => {
    render(<AdminScreen />)
    for (const section of ADMIN_SECTIONS) {
      expect(screen.getByRole('button', { name: section.label })).toBeInTheDocument()
    }
  })

  it('shows Appearance section as active by default', () => {
    render(<AdminScreen />)
    expect(
      screen.getByText('Settings for Appearance will be added in a future epic.')
    ).toBeInTheDocument()
  })

  it('switches content when a different section is clicked', () => {
    render(<AdminScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Webcam' }))
    expect(
      screen.getByText('Settings for Webcam will be added in a future epic.')
    ).toBeInTheDocument()
  })

  it('highlights the active section in the sidebar', () => {
    render(<AdminScreen />)
    const webcamButton = screen.getByRole('button', { name: 'Webcam' })
    fireEvent.click(webcamButton)
    expect(webcamButton.className).toContain('sidebarItemActive')
  })

  it('navigates to home when Exit Admin is clicked', () => {
    useNavigationStore.getState().navigateTo('admin')
    render(<AdminScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Exit Admin' }))
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })

  it('renders the Admin Settings title', () => {
    render(<AdminScreen />)
    expect(screen.getByText('Admin Settings')).toBeInTheDocument()
  })
})
