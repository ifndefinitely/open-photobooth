import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useNavigationStore } from '@/stores/navigationStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useStripStore } from '@/stores/stripStore'
import ReviewScreen from '@/screens/ReviewScreen/ReviewScreen'
import PrintScreen from '@/screens/PrintScreen/PrintScreen'
import ThankYouScreen from '@/screens/ThankYouScreen/ThankYouScreen'
import ErrorScreen from '@/screens/ErrorScreen/ErrorScreen'
import AdminScreen from '@/screens/AdminScreen/AdminScreen'

// Use the global window.api mock from tests/setup.ts
// Override printer mocks per-test as needed
const mockPrinterApi = window.api.printer as {
  getPrinters: ReturnType<typeof vi.fn>
  checkAvailability: ReturnType<typeof vi.fn>
  print: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrinterApi.checkAvailability.mockResolvedValue({ available: true, status: 'ready' })
  mockPrinterApi.print.mockResolvedValue({ success: true })
})

// SessionScreen is fully implemented in Epic 04 — placeholder tests removed.

describe('ReviewScreen', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset()
    usePrinterSettingsStore.getState().setPrinterName('TestPrinter')
  })

  it('renders review title', () => {
    render(<ReviewScreen />)
    expect(screen.getByText('Your Photos')).toBeInTheDocument()
  })

  it('shows print confirmation after printer check', async () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    await waitFor(() => {
      expect(screen.getByText('Print Your Photos?')).toBeInTheDocument()
    })
  })

  it('navigates to print after confirming', async () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    await waitFor(() => {
      expect(screen.getByText('Print Your Photos?')).toBeInTheDocument()
    })
    // There are two "Print" buttons — the action bar one and the dialog confirm one
    const printButtons = screen.getAllByRole('button', { name: 'Print' })
    fireEvent.click(printButtons[printButtons.length - 1])
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
    // The confirm button label is "Yes, Redo" (from i18n)
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Redo' }))
    expect(useNavigationStore.getState().currentScreen).toBe('session')
  })

  it('dismisses redo dialog on cancel', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    fireEvent.click(screen.getByRole('button', { name: 'No, Keep Photos' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Start Over' }))
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})

describe('PrintScreen', () => {
  const fakePrintSheet = {
    blob: new Blob(['test'], { type: 'image/png' }),
    dataUrl: 'data:image/png;base64,test',
    width: 600,
    height: 900
  }

  beforeEach(() => {
    useNavigationStore.getState().reset()
    usePrinterSettingsStore.getState().setPrinterName('TestPrinter')
    useStripStore.getState().setPrintSheetResult(fakePrintSheet)
    // Make print hang so we can see the "printing" state
    mockPrinterApi.print.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 60000))
    )
  })

  it('renders printing message', () => {
    render(<PrintScreen />)
    expect(screen.getByText('Printing your photos...')).toBeInTheDocument()
  })

  it('shows error state when print fails', async () => {
    mockPrinterApi.print.mockResolvedValueOnce({ success: false, error: 'Paper jam' })
    render(<PrintScreen />)
    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    })
  })

  it('shows try again and back buttons on error', async () => {
    mockPrinterApi.print.mockResolvedValueOnce({ success: false, error: 'Paper jam' })
    render(<PrintScreen />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    })
  })
})

describe('ThankYouScreen', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('renders thank you title', () => {
    render(<ThankYouScreen />)
    expect(screen.getByText('Enjoy Your Photos!')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<ThankYouScreen />)
    expect(screen.getByText('Thank you for visiting our photobooth!')).toBeInTheDocument()
  })

  it('navigates to home via Done button', () => {
    render(<ThankYouScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })
})

describe('ErrorScreen', () => {
  beforeEach(() => useNavigationStore.getState().reset())

  it('renders error title', () => {
    render(<ErrorScreen />)
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
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
