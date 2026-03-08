/**
 * Audio playback service for Open Photobooth.
 *
 * Provides two independent channels:
 *   - Music channel: single HTMLAudioElement for background music (play/pause/fade/loop playlist)
 *   - SFX channel: pre-loaded HTMLAudioElements cloned on each play (fire-and-forget, overlapping OK)
 *
 * This is a renderer-side service (plain TypeScript module, no React).
 * Consumed by hooks (useMusicLifecycle, useSessionSequence) and components (AudioSection).
 */

// ---------------------------------------------------------------------------
// Asset imports (resolved to URLs by Vite at build time)
// ---------------------------------------------------------------------------

import trackUpbeatUrl from '@/assets/audio/music/track-upbeat.mp3'
import trackLoungeUrl from '@/assets/audio/music/track-lounge.mp3'
import trackRetroUrl from '@/assets/audio/music/track-retro.mp3'

import beepUrl from '@/assets/audio/sfx/beep.wav'
import beepFinalUrl from '@/assets/audio/sfx/beep-final.wav'
import shutterUrl from '@/assets/audio/sfx/shutter.mp3'

/** All bundled music tracks in playlist order. */
export const MUSIC_TRACKS = [trackUpbeatUrl, trackLoungeUrl, trackRetroUrl]

/** SFX name constants for use with playSFX(). */
export const SFX = {
  BEEP: 'beep',
  BEEP_FINAL: 'beep-final',
  SHUTTER: 'shutter'
} as const

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let musicElement: HTMLAudioElement | null = null
let musicPlaylist: string[] = []
let musicIndex = 0
let musicVolume = 0.5 // 0–1 (converted from the 0–100 setting value)
let fadeTimer: ReturnType<typeof setInterval> | null = null

const sfxCache = new Map<string, HTMLAudioElement>()

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Call once on app startup after settings are loaded.
 * Sets the initial music volume and pre-loads all SFX for instant playback.
 */
export function initAudio(config: { musicVolume: number }): void {
  musicVolume = clampVolume(config.musicVolume / 100)

  // Pre-load all SFX so first play is instant
  preloadSFX(SFX.BEEP, beepUrl)
  preloadSFX(SFX.BEEP_FINAL, beepFinalUrl)
  preloadSFX(SFX.SHUTTER, shutterUrl)
}

// ---------------------------------------------------------------------------
// Music channel
// ---------------------------------------------------------------------------

/**
 * Start playing a playlist of tracks. Stops any currently playing music first.
 * Tracks play sequentially and loop back to the first track when the last ends.
 */
export function playMusic(tracks: string[]): void {
  stopMusicImmediate()

  if (tracks.length === 0) return

  musicPlaylist = [...tracks]
  musicIndex = 0
  startTrack(musicPlaylist[musicIndex])
}

/**
 * Stop music playback.
 * @param fade If true, fade out over 500 ms then stop. Otherwise stop immediately.
 */
export function stopMusic(fade = false): void {
  if (fade && musicElement && !musicElement.paused) {
    fadeOutMusic().then(() => stopMusicImmediate())
    return
  }
  stopMusicImmediate()
}

/** Pause the current music track (retains position). */
export function pauseMusic(): void {
  musicElement?.pause()
}

/** Resume a paused music track. */
export function resumeMusic(): void {
  if (musicElement && musicElement.paused && musicElement.src) {
    musicElement.play().catch(logPlayError)
  }
}

/**
 * Fade music in from silence to the target volume over ~500 ms.
 * If music is already stopped, starts the current playlist from where it left off.
 */
export function fadeInMusic(): void {
  cancelFade()

  if (!musicElement) {
    // No element yet — start the playlist
    if (musicPlaylist.length > 0) {
      startTrack(musicPlaylist[musicIndex])
    }
    return
  }

  musicElement.volume = 0
  if (musicElement.paused && musicElement.src) {
    musicElement.play().catch(logPlayError)
  }

  const step = musicVolume / (500 / 30) // reach target in ~500 ms
  fadeTimer = setInterval(() => {
    if (!musicElement) {
      cancelFade()
      return
    }
    const next = Math.min(musicElement.volume + step, musicVolume)
    musicElement.volume = next
    if (next >= musicVolume) {
      cancelFade()
    }
  }, 30)
}

/**
 * Fade music out from current volume to silence over ~500 ms, then pause.
 * Returns a promise that resolves when the fade completes.
 */
export function fadeOutMusic(): Promise<void> {
  return new Promise((resolve) => {
    cancelFade()

    if (!musicElement || musicElement.paused) {
      resolve()
      return
    }

    const startVol = musicElement.volume
    const step = startVol / (500 / 30)

    fadeTimer = setInterval(() => {
      if (!musicElement) {
        cancelFade()
        resolve()
        return
      }
      const next = Math.max(musicElement.volume - step, 0)
      musicElement.volume = next
      if (next <= 0) {
        cancelFade()
        musicElement.pause()
        resolve()
      }
    }, 30)
  })
}

/**
 * Set music volume (0–100). Applies immediately to currently playing audio.
 */
export function setMusicVolume(volume: number): void {
  musicVolume = clampVolume(volume / 100)
  if (musicElement && !musicElement.paused) {
    musicElement.volume = musicVolume
  }
}

/** Returns true if music is currently playing (not paused). */
export function isMusicPlaying(): boolean {
  return musicElement !== null && !musicElement.paused
}

// ---------------------------------------------------------------------------
// SFX channel
// ---------------------------------------------------------------------------

/**
 * Pre-load a sound effect so it can be played instantly later.
 * Call during app init for each SFX asset.
 */
export function preloadSFX(name: string, url: string): void {
  const audio = new Audio()
  audio.src = url
  audio.preload = 'auto'
  audio.load()
  sfxCache.set(name, audio)
}

/**
 * Play a pre-loaded sound effect by name.
 * Uses cloneNode() so multiple overlapping plays are possible.
 */
export function playSFX(name: string): void {
  const cached = sfxCache.get(name)
  if (!cached) {
    console.warn(`[audioService] SFX not found: "${name}"`)
    return
  }

  const clone = cached.cloneNode() as HTMLAudioElement
  clone.volume = 1.0
  clone.play().catch(logPlayError)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function startTrack(src: string): void {
  musicElement = new Audio(src)
  musicElement.volume = musicVolume
  musicElement.addEventListener('ended', onTrackEnded)
  musicElement.play().catch(logPlayError)
}

function onTrackEnded(): void {
  if (musicPlaylist.length === 0) return

  musicIndex = (musicIndex + 1) % musicPlaylist.length
  // Clean up old element before creating a new one
  if (musicElement) {
    musicElement.removeEventListener('ended', onTrackEnded)
  }
  startTrack(musicPlaylist[musicIndex])
}

function stopMusicImmediate(): void {
  cancelFade()
  if (musicElement) {
    musicElement.pause()
    musicElement.removeEventListener('ended', onTrackEnded)
    musicElement.src = ''
    musicElement = null
  }
}

function cancelFade(): void {
  if (fadeTimer !== null) {
    clearInterval(fadeTimer)
    fadeTimer = null
  }
}

function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function logPlayError(err: unknown): void {
  // Autoplay restrictions or element disposal — non-critical, log and move on
  console.warn('[audioService] play() rejected:', err)
}
