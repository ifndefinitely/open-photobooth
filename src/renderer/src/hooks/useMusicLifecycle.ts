import { useEffect, useRef } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import type { ScreenName } from '@/stores/types'
import {
  initAudio,
  playMusic,
  stopMusic,
  fadeInMusic,
  fadeOutMusic,
  setMusicVolume,
  isMusicPlaying
} from '@/services/audioService'
import { getActiveMusicTracks } from '@/services/musicLibraryService'

/**
 * Determines whether music should be playing for the given screen and mode.
 */
function shouldPlayMusic(screen: ScreenName, mode: string): boolean {
  if (mode === 'off') return false
  if (screen === 'admin' || screen === 'error') return false

  switch (mode) {
    case 'idle':
      return screen === 'home'
    case 'session':
      return screen === 'session' || screen === 'review'
    case 'always':
      return true
    default:
      return false
  }
}

/**
 * Orchestrates background music across screen transitions.
 *
 * Subscribes to the current screen and music mode setting.
 * Fades music in/out (0.5 s) when the screen changes to one
 * where music should or should not be playing.
 *
 * Call once in App.tsx after settings are loaded.
 */
export function useMusicLifecycle(): void {
  const initialised = useRef(false)

  // One-time init: set volume and preload SFX
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    const { audioMusicVolume } = useAppSettingsStore.getState()
    initAudio({ musicVolume: audioMusicVolume })
  }, [])

  // React to screen changes and music mode changes
  useEffect(() => {
    // Subscribe to both stores outside React's render cycle
    const unsubNav = useNavigationStore.subscribe(() => reconcile())
    const unsubMode = useAppSettingsStore.subscribe((state, prev) => {
      if (state.audioMusicMode !== prev.audioMusicMode) reconcile()
    })

    // Run once immediately for the current state
    reconcile()

    return () => {
      unsubNav()
      unsubMode()
      stopMusic()
    }
  }, [])

  // React to volume slider changes
  useEffect(() => {
    const unsub = useAppSettingsStore.subscribe((state, prev) => {
      if (state.audioMusicVolume !== prev.audioMusicVolume) {
        setMusicVolume(state.audioMusicVolume)
      }
    })
    return unsub
  }, [])
}

/**
 * Compare desired state (should music play?) with actual state (is music playing?)
 * and fade in/out accordingly.
 *
 * Async because `getActiveMusicTracks()` resolves via IPC. The post-await
 * re-check prevents a race where two back-to-back state changes both start
 * a playMusic() call.
 */
async function reconcile(): Promise<void> {
  const screen = useNavigationStore.getState().currentScreen
  const mode = useAppSettingsStore.getState().audioMusicMode
  const want = shouldPlayMusic(screen, mode)
  const playing = isMusicPlaying()

  if (want && !playing) {
    const tracks = await getActiveMusicTracks()
    if (
      !isMusicPlaying() &&
      shouldPlayMusic(
        useNavigationStore.getState().currentScreen,
        useAppSettingsStore.getState().audioMusicMode
      )
    ) {
      playMusic(tracks)
      fadeInMusic()
    }
  } else if (!want && playing) {
    fadeOutMusic()
  }
}
