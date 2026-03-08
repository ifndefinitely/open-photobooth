import { create } from 'zustand'

interface AppSettingsState {
  // PIN
  pinCode: string

  // Kiosk
  kioskAutoStart: boolean
  kioskPreventSleep: boolean
  kioskPreventAltTab: boolean
  kioskFullscreenLock: boolean
  kioskIdleTimeout: number // seconds (0 = disabled)

  // Language
  userLocale: string // "en" or "nl"

  // Gallery
  gallerySavePath: string

  // Audio
  audioMusicMode: string // "idle" | "session" | "always" | "off"
  audioMusicVolume: number // 0-100
  audioCountdownBeep: boolean
  audioShutterSound: boolean

  // Actions
  setPinCode: (code: string) => void
  setKioskAutoStart: (enabled: boolean) => void
  setKioskPreventSleep: (enabled: boolean) => void
  setKioskPreventAltTab: (enabled: boolean) => void
  setKioskFullscreenLock: (enabled: boolean) => void
  setKioskIdleTimeout: (seconds: number) => void
  setUserLocale: (locale: string) => void
  setGallerySavePath: (path: string) => void
  setAudioMusicMode: (mode: string) => void
  setAudioMusicVolume: (volume: number) => void
  setAudioCountdownBeep: (enabled: boolean) => void
  setAudioShutterSound: (enabled: boolean) => void
}

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  pinCode: '0000',
  kioskAutoStart: false,
  kioskPreventSleep: true,
  kioskPreventAltTab: true,
  kioskFullscreenLock: true,
  kioskIdleTimeout: 60,
  userLocale: 'en',
  gallerySavePath: '',
  audioMusicMode: 'idle',
  audioMusicVolume: 50,
  audioCountdownBeep: true,
  audioShutterSound: true,

  setPinCode: (code) => set({ pinCode: code }),
  setKioskAutoStart: (enabled) => set({ kioskAutoStart: enabled }),
  setKioskPreventSleep: (enabled) => set({ kioskPreventSleep: enabled }),
  setKioskPreventAltTab: (enabled) => set({ kioskPreventAltTab: enabled }),
  setKioskFullscreenLock: (enabled) => set({ kioskFullscreenLock: enabled }),
  setKioskIdleTimeout: (seconds) => set({ kioskIdleTimeout: seconds }),
  setUserLocale: (locale) => set({ userLocale: locale }),
  setGallerySavePath: (path) => set({ gallerySavePath: path }),
  setAudioMusicMode: (mode) => set({ audioMusicMode: mode }),
  setAudioMusicVolume: (volume) => set({ audioMusicVolume: Math.max(0, Math.min(100, volume)) }),
  setAudioCountdownBeep: (enabled) => set({ audioCountdownBeep: enabled }),
  setAudioShutterSound: (enabled) => set({ audioShutterSound: enabled })
}))
