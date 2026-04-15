import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getActiveMusicTracks } from '@/services/musicLibraryService'
import { MUSIC_TRACKS } from '@/services/audioService'

describe('getActiveMusicTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns bundled MUSIC_TRACKS when the custom list is empty', async () => {
    ;(window.api.musicLibrary.resolveActive as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
    const result = await getActiveMusicTracks()
    expect(result).toEqual(MUSIC_TRACKS)
  })

  it('returns the custom URLs verbatim when the list is non-empty', async () => {
    const urls = ['custom-music://library/a.mp3', 'custom-music://library/b.mp3']
    ;(window.api.musicLibrary.resolveActive as ReturnType<typeof vi.fn>).mockResolvedValueOnce(urls)
    const result = await getActiveMusicTracks()
    expect(result).toEqual(urls)
  })

  it('falls back to MUSIC_TRACKS if the IPC call rejects', async () => {
    ;(window.api.musicLibrary.resolveActive as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ipc failure')
    )
    const result = await getActiveMusicTracks()
    expect(result).toEqual(MUSIC_TRACKS)
  })
})
