import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useNavigationStore } from '@/stores/navigationStore'
import SessionScreen from '@/screens/SessionScreen/SessionScreen'
import ReviewScreen from '@/screens/ReviewScreen/ReviewScreen'
import PrintScreen from '@/screens/PrintScreen/PrintScreen'
import ThankYouScreen from '@/screens/ThankYouScreen/ThankYouScreen'
import ErrorScreen from '@/screens/ErrorScreen/ErrorScreen'
import AdminScreen from '@/screens/AdminScreen/AdminScreen'

describe('SessionScreen', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('renders session title', () => {
    render(<SessionScreen />)
    expect(screen.getByText('Photo Session')).toBeInTheDocument()
  })

  it('navigates to review', () => {
    render(<SessionScreen />)
    fireEvent.click(screen.getByRole('button', { name: /review/i }))
    expect(useNavigationStore.getState().currentScreen).toBe('review')
  })
})

describe('ReviewScreen', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('renders review title', () => {
    render(<ReviewScreen />)
    expect(screen.getByText('Review Your Photos')).toBeInTheDocument()
  })

  it('navigates to print directly', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    expect(useNavigationStore.getState().currentScreen).toBe('print')
  })

  it('shows confirmation dialog on redo', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByText('Redo Photos?')).toBeInTheDocument()
  })

  it('navigates to session after confirming redo', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    // The confirm button inside the dialog also says "Redo"
    const redoButtons = screen.getAllByRole('button', { name: 'Redo' })
    fireEvent.click(redoButtons[redoButtons.length - 1])
    expect(useNavigationStore.getState().currentScreen).toBe('session')
  })

  it('dismisses redo dialog on cancel', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Redo Photos?')).not.toBeInTheDocument()
  })

  it('shows confirmation dialog on start over', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    expect(screen.getByText('Start Over?')).toBeInTheDocument()
  })

  it('navigates to home after confirming start over', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    const startOverButtons = screen.getAllByRole('button', { name: 'Start Over' })
    fireEvent.click(startOverButtons[startOverButtons.length - 1])
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})

describe('PrintScreen', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('renders printing title', () => {
    render(<PrintScreen />)
    expect(screen.getByText('Printing...')).toBeInTheDocument()
  })

  it('navigates to thank you', () => {
    render(<PrintScreen />)
    fireEvent.click(screen.getByRole('button', { name: /thank you/i }))
    expect(useNavigationStore.getState().currentScreen).toBe('thankyou')
  })
})

describe('ThankYouScreen', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('renders thank you title', () => {
    render(<ThankYouScreen />)
    expect(screen.getByText('Thank You!')).toBeInTheDocument()
  })

  it('navigates to home', () => {
    render(<ThankYouScreen />)
    fireEvent.click(screen.getByRole('button', { name: /home/i }))
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})

describe('ErrorScreen', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('renders error title', () => {
    render(<ErrorScreen />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('navigates to home', () => {
    render(<ErrorScreen />)
    fireEvent.click(screen.getByRole('button', { name: /home/i }))
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})

describe('AdminScreen', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('renders admin title', () => {
    render(<AdminScreen />)
    expect(screen.getByText('Admin Settings')).toBeInTheDocument()
  })

  it('navigates to home on exit', () => {
    render(<AdminScreen />)
    fireEvent.click(screen.getByRole('button', { name: /exit admin/i }))
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})

describe('Full navigation flow', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('completes the happy path: Home → Session → Review → Print → ThankYou → Home', () => {
    const { navigateTo, goHome } = useNavigationStore.getState()

    expect(useNavigationStore.getState().currentScreen).toBe('home')

    navigateTo('session')
    expect(useNavigationStore.getState().currentScreen).toBe('session')

    navigateTo('review')
    expect(useNavigationStore.getState().currentScreen).toBe('review')

    navigateTo('print')
    expect(useNavigationStore.getState().currentScreen).toBe('print')

    navigateTo('thankyou')
    expect(useNavigationStore.getState().currentScreen).toBe('thankyou')

    goHome()
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})
