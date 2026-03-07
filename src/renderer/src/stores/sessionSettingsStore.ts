import { create } from 'zustand'

const ALLOWED_COUNTDOWN_DURATIONS = [1, 2, 3, 5] as const

interface SessionSettingsState {
  // Settings (pre-Epic 07: stored in memory only, no persistence)
  photoCount: number // 1-6, default 4
  countdownDuration: number // 1, 2, 3, or 5 seconds, default 3
  flashEffect: boolean // default true (schema key: audio.flashEffect)

  // Actions
  setPhotoCount: (count: number) => void
  setCountdownDuration: (duration: number) => void
  setFlashEffect: (enabled: boolean) => void
}

export const useSessionSettingsStore = create<SessionSettingsState>((set) => ({
  photoCount: 4,
  countdownDuration: 3,
  flashEffect: true,

  setPhotoCount: (count) => {
    const clamped = Math.max(1, Math.min(6, Math.round(count)))
    set({ photoCount: clamped })
  },

  setCountdownDuration: (duration) => {
    if (
      ALLOWED_COUNTDOWN_DURATIONS.includes(duration as (typeof ALLOWED_COUNTDOWN_DURATIONS)[number])
    ) {
      set({ countdownDuration: duration })
    }
  },

  setFlashEffect: (enabled) => set({ flashEffect: enabled })
}))
