import { MUSIC_TRACKS } from '@/services/audioService'

/**
 * Returns the playlist the audio service should use for music playback.
 * If the admin has imported any custom tracks, their custom-music:// URLs
 * are returned. Otherwise the bundled MUSIC_TRACKS array is returned.
 *
 * On IPC failure, falls back to the bundled tracks and logs a warning —
 * music is an enhancement, not a session blocker.
 */
export async function getActiveMusicTracks(): Promise<string[]> {
  try {
    const custom = await window.api.musicLibrary.resolveActive()
    if (custom.length > 0) return custom
  } catch (err) {
    console.warn('[musicLibraryService] resolveActive failed, using defaults:', err)
  }
  return MUSIC_TRACKS
}
