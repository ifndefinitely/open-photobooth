import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MusicLibrarySection from '@/screens/AdminScreen/sections/MusicLibrarySection/MusicLibrarySection'

const mockApi = (): typeof window.api.musicLibrary => window.api.musicLibrary

beforeEach(() => {
  vi.clearAllMocks()
  ;(mockApi().list as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(mockApi().remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  ;(mockApi().pickAndImport as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    reason: 'cancelled'
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MusicLibrarySection', () => {
  it('renders the empty state when there are no tracks', async () => {
    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText(/No custom tracks yet/i)).toBeInTheDocument()
    })
    expect(screen.getByText('0 / 30 tracks')).toBeInTheDocument()
  })

  it('renders rows for each track returned by list()', async () => {
    ;(mockApi().list as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { filename: 'a.mp3', url: 'custom-music://library/a.mp3', sizeBytes: 100 },
      { filename: 'b.wav', url: 'custom-music://library/b.wav', sizeBytes: 200 }
    ])

    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText('a.mp3')).toBeInTheDocument()
      expect(screen.getByText('b.wav')).toBeInTheDocument()
    })
    expect(screen.getByText('2 / 30 tracks')).toBeInTheDocument()
  })

  it('disables the Add button when 30 tracks are present', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      filename: `t${i}.mp3`,
      url: `custom-music://library/t${i}.mp3`,
      sizeBytes: 10
    }))
    ;(mockApi().list as ReturnType<typeof vi.fn>).mockResolvedValueOnce(many)

    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText('30 / 30 tracks')).toBeInTheDocument()
    })
    const addButton = screen.getByRole('button', { name: /Add music file/ })
    expect(addButton).toBeDisabled()
  })

  it('removes a track and refetches the list', async () => {
    const listMock = mockApi().list as ReturnType<typeof vi.fn>
    listMock
      .mockResolvedValueOnce([
        { filename: 'a.mp3', url: 'custom-music://library/a.mp3', sizeBytes: 100 }
      ])
      .mockResolvedValueOnce([])

    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText('a.mp3')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Remove a.mp3/ }))

    await waitFor(() => {
      expect(mockApi().remove).toHaveBeenCalledWith('a.mp3')
      expect(screen.getByText(/No custom tracks yet/i)).toBeInTheDocument()
    })
  })

  it('shows a friendly error message for invalid-extension on import', async () => {
    ;(mockApi().pickAndImport as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: 'invalid-extension',
      message: 'not supported'
    })

    render(<MusicLibrarySection />)
    await waitFor(() => {
      expect(screen.getByText(/No custom tracks yet/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Add music file/ }))

    await waitFor(() => {
      expect(screen.getByText('Only MP3 and WAV files are supported.')).toBeInTheDocument()
    })
  })

  it('shows a file-too-large error message', async () => {
    ;(mockApi().pickAndImport as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: 'file-too-large'
    })

    render(<MusicLibrarySection />)
    await waitFor(() => screen.getByText(/No custom tracks yet/i))
    fireEvent.click(screen.getByRole('button', { name: /Add music file/ }))
    await waitFor(() => {
      expect(screen.getByText('File is too large. Maximum size is 50 MB.')).toBeInTheDocument()
    })
  })

  it('does nothing when the user cancels the file dialog', async () => {
    render(<MusicLibrarySection />)
    await waitFor(() => screen.getByText(/No custom tracks yet/i))
    fireEvent.click(screen.getByRole('button', { name: /Add music file/ }))
    await waitFor(() => {
      expect(screen.queryByText(/Only MP3 and WAV/)).not.toBeInTheDocument()
    })
  })
})
