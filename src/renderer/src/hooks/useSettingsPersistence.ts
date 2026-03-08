import { useState, useEffect, useRef } from 'react'
import { useCameraStore } from '@/stores/cameraStore'
import { useSessionSettingsStore } from '@/stores/sessionSettingsStore'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'
import { useStripSettingsStore } from '@/stores/stripSettingsStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import type { BorderStyle, DateStampFormat } from '@/stores/stripSettingsStore'
import type {
  PaperSize,
  PrintQuality,
  ColorMode,
  PrintMargins
} from '@/stores/printerSettingsStore'

// ── Settings key → Store mapping ──
// Each entry maps a dot-path settings key to how to read/write it from a Zustand store.

interface SettingsMapping {
  key: string
  get: () => unknown
  set: (value: unknown) => void
  subscribe: (callback: () => void) => () => void
}

function buildMappings(): SettingsMapping[] {
  const camera = useCameraStore
  const session = useSessionSettingsStore
  const printer = usePrinterSettingsStore
  const strip = useStripSettingsStore
  const app = useAppSettingsStore

  return [
    // ── Appearance ──
    {
      key: 'appearance.logoPath',
      get: () => strip.getState().logoPath,
      set: (v) => strip.getState().setLogoPath(v as string),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.logoPath !== prev.logoPath) cb()
        })
    },
    {
      key: 'appearance.eventName',
      get: () => strip.getState().eventName,
      set: (v) => strip.getState().setEventName(v as string),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.eventName !== prev.eventName) cb()
        })
    },
    {
      key: 'appearance.dateStampEnabled',
      get: () => strip.getState().dateStampEnabled,
      set: (v) => strip.getState().setDateStampEnabled(v as boolean),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.dateStampEnabled !== prev.dateStampEnabled) cb()
        })
    },
    {
      key: 'appearance.dateStampFormat',
      get: () => strip.getState().dateStampFormat,
      set: (v) => strip.getState().setDateStampFormat(v as DateStampFormat),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.dateStampFormat !== prev.dateStampFormat) cb()
        })
    },
    {
      key: 'appearance.borderColor',
      get: () => strip.getState().borderColor,
      set: (v) => strip.getState().setBorderColor(v as string),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.borderColor !== prev.borderColor) cb()
        })
    },
    {
      key: 'appearance.borderStyle',
      get: () => strip.getState().borderStyle,
      set: (v) => strip.getState().setBorderStyle(v as BorderStyle),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.borderStyle !== prev.borderStyle) cb()
        })
    },
    {
      key: 'appearance.borderWidth',
      get: () => strip.getState().borderWidth,
      set: (v) => strip.getState().setBorderWidth(v as number),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.borderWidth !== prev.borderWidth) cb()
        })
    },
    {
      key: 'appearance.backgroundColor',
      get: () => strip.getState().backgroundColor,
      set: (v) => strip.getState().setBackgroundColor(v as string),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.backgroundColor !== prev.backgroundColor) cb()
        })
    },

    // ── Camera ──
    {
      key: 'camera.deviceId',
      get: () => camera.getState().settings.deviceId,
      set: (v) => camera.getState().setDeviceId(v as string),
      subscribe: (cb) =>
        camera.subscribe((s, prev) => {
          if (s.settings.deviceId !== prev.settings.deviceId) cb()
        })
    },
    {
      key: 'camera.resolution',
      get: () => camera.getState().settings.resolution,
      set: (v) => {
        // Use setDeviceId-like direct state update instead of setResolution (which restarts camera)
        useCameraStore.setState((state) => ({
          settings: { ...state.settings, resolution: v as string }
        }))
      },
      subscribe: (cb) =>
        camera.subscribe((s, prev) => {
          if (s.settings.resolution !== prev.settings.resolution) cb()
        })
    },
    {
      key: 'camera.mirrorHorizontal',
      get: () => camera.getState().settings.mirrorHorizontal,
      set: (v) => camera.getState().setMirrorHorizontal(v as boolean),
      subscribe: (cb) =>
        camera.subscribe((s, prev) => {
          if (s.settings.mirrorHorizontal !== prev.settings.mirrorHorizontal) cb()
        })
    },
    {
      key: 'camera.flipVertical',
      get: () => camera.getState().settings.flipVertical,
      set: (v) => camera.getState().setFlipVertical(v as boolean),
      subscribe: (cb) =>
        camera.subscribe((s, prev) => {
          if (s.settings.flipVertical !== prev.settings.flipVertical) cb()
        })
    },
    {
      key: 'camera.brightness',
      get: () => camera.getState().settings.brightness,
      set: (v) => camera.getState().setBrightness(v as number),
      subscribe: (cb) =>
        camera.subscribe((s, prev) => {
          if (s.settings.brightness !== prev.settings.brightness) cb()
        })
    },
    {
      key: 'camera.contrast',
      get: () => camera.getState().settings.contrast,
      set: (v) => camera.getState().setContrast(v as number),
      subscribe: (cb) =>
        camera.subscribe((s, prev) => {
          if (s.settings.contrast !== prev.settings.contrast) cb()
        })
    },
    {
      key: 'camera.saturation',
      get: () => camera.getState().settings.saturation,
      set: (v) => camera.getState().setSaturation(v as number),
      subscribe: (cb) =>
        camera.subscribe((s, prev) => {
          if (s.settings.saturation !== prev.settings.saturation) cb()
        })
    },

    // ── Printer ──
    {
      key: 'printer.printerName',
      get: () => printer.getState().printerName,
      set: (v) => printer.getState().setPrinterName(v as string),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.printerName !== prev.printerName) cb()
        })
    },
    {
      key: 'printer.paperSize',
      get: () => printer.getState().paperSize,
      set: (v) => printer.getState().setPaperSize(v as PaperSize),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.paperSize !== prev.paperSize) cb()
        })
    },
    {
      key: 'printer.quality',
      get: () => printer.getState().quality,
      set: (v) => printer.getState().setQuality(v as PrintQuality),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.quality !== prev.quality) cb()
        })
    },
    {
      key: 'printer.colorMode',
      get: () => printer.getState().colorMode,
      set: (v) => printer.getState().setColorMode(v as ColorMode),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.colorMode !== prev.colorMode) cb()
        })
    },
    {
      key: 'printer.margins',
      get: () => printer.getState().margins,
      set: (v) => printer.getState().setMargins(v as PrintMargins),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          const m = s.margins,
            p = prev.margins
          if (m.top !== p.top || m.right !== p.right || m.bottom !== p.bottom || m.left !== p.left)
            cb()
        })
    },
    {
      key: 'printer.copies',
      get: () => printer.getState().copies,
      set: (v) => printer.getState().setCopies(v as number),
      subscribe: (cb) =>
        printer.subscribe((s, prev) => {
          if (s.copies !== prev.copies) cb()
        })
    },

    // ── Session ──
    {
      key: 'session.photoCount',
      get: () => session.getState().photoCount,
      set: (v) => session.getState().setPhotoCount(v as number),
      subscribe: (cb) =>
        session.subscribe((s, prev) => {
          if (s.photoCount !== prev.photoCount) cb()
        })
    },
    {
      key: 'session.countdownDuration',
      get: () => session.getState().countdownDuration,
      set: (v) => session.getState().setCountdownDuration(v as number),
      subscribe: (cb) =>
        session.subscribe((s, prev) => {
          if (s.countdownDuration !== prev.countdownDuration) cb()
        })
    },

    // ── Filters ──
    {
      key: 'filters.enabled',
      get: () => strip.getState().filtersEnabled,
      set: (v) => strip.getState().setFiltersEnabled(v as boolean),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.filtersEnabled !== prev.filtersEnabled) cb()
        })
    },
    {
      key: 'filters.blackAndWhite',
      get: () => strip.getState().filterBlackAndWhite,
      set: (v) => strip.getState().setFilterBlackAndWhite(v as boolean),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.filterBlackAndWhite !== prev.filterBlackAndWhite) cb()
        })
    },
    {
      key: 'filters.sepia',
      get: () => strip.getState().filterSepia,
      set: (v) => strip.getState().setFilterSepia(v as boolean),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.filterSepia !== prev.filterSepia) cb()
        })
    },
    {
      key: 'filters.vintage',
      get: () => strip.getState().filterVintage,
      set: (v) => strip.getState().setFilterVintage(v as boolean),
      subscribe: (cb) =>
        strip.subscribe((s, prev) => {
          if (s.filterVintage !== prev.filterVintage) cb()
        })
    },

    // ── Audio (flashEffect is in sessionSettingsStore but persisted under audio.*) ──
    {
      key: 'audio.flashEffect',
      get: () => session.getState().flashEffect,
      set: (v) => session.getState().setFlashEffect(v as boolean),
      subscribe: (cb) =>
        session.subscribe((s, prev) => {
          if (s.flashEffect !== prev.flashEffect) cb()
        })
    },
    {
      key: 'audio.musicMode',
      get: () => app.getState().audioMusicMode,
      set: (v) => app.getState().setAudioMusicMode(v as string),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.audioMusicMode !== prev.audioMusicMode) cb()
        })
    },
    {
      key: 'audio.musicVolume',
      get: () => app.getState().audioMusicVolume,
      set: (v) => app.getState().setAudioMusicVolume(v as number),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.audioMusicVolume !== prev.audioMusicVolume) cb()
        })
    },
    {
      key: 'audio.countdownBeep',
      get: () => app.getState().audioCountdownBeep,
      set: (v) => app.getState().setAudioCountdownBeep(v as boolean),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.audioCountdownBeep !== prev.audioCountdownBeep) cb()
        })
    },
    {
      key: 'audio.shutterSound',
      get: () => app.getState().audioShutterSound,
      set: (v) => app.getState().setAudioShutterSound(v as boolean),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.audioShutterSound !== prev.audioShutterSound) cb()
        })
    },

    // ── PIN ──
    {
      key: 'pin.code',
      get: () => app.getState().pinCode,
      set: (v) => app.getState().setPinCode(v as string),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.pinCode !== prev.pinCode) cb()
        })
    },

    // ── Gallery ──
    {
      key: 'gallery.savePath',
      get: () => app.getState().gallerySavePath,
      set: (v) => app.getState().setGallerySavePath(v as string),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.gallerySavePath !== prev.gallerySavePath) cb()
        })
    },

    // ── Kiosk ──
    {
      key: 'kiosk.autoStart',
      get: () => app.getState().kioskAutoStart,
      set: (v) => app.getState().setKioskAutoStart(v as boolean),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.kioskAutoStart !== prev.kioskAutoStart) cb()
        })
    },
    {
      key: 'kiosk.preventSleep',
      get: () => app.getState().kioskPreventSleep,
      set: (v) => app.getState().setKioskPreventSleep(v as boolean),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.kioskPreventSleep !== prev.kioskPreventSleep) cb()
        })
    },
    {
      key: 'kiosk.preventAltTab',
      get: () => app.getState().kioskPreventAltTab,
      set: (v) => app.getState().setKioskPreventAltTab(v as boolean),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.kioskPreventAltTab !== prev.kioskPreventAltTab) cb()
        })
    },
    {
      key: 'kiosk.fullscreenLock',
      get: () => app.getState().kioskFullscreenLock,
      set: (v) => app.getState().setKioskFullscreenLock(v as boolean),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.kioskFullscreenLock !== prev.kioskFullscreenLock) cb()
        })
    },
    {
      key: 'kiosk.idleTimeout',
      get: () => app.getState().kioskIdleTimeout,
      set: (v) => app.getState().setKioskIdleTimeout(v as number),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.kioskIdleTimeout !== prev.kioskIdleTimeout) cb()
        })
    },

    // ── Language ──
    {
      key: 'language.userLocale',
      get: () => app.getState().userLocale,
      set: (v) => app.getState().setUserLocale(v as string),
      subscribe: (cb) =>
        app.subscribe((s, prev) => {
          if (s.userLocale !== prev.userLocale) cb()
        })
    }
  ]
}

// ── Helper: get a nested value from a plain object by dot-path ──

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// ── The hook ──

/**
 * Hydrates all Zustand stores from persisted settings on mount,
 * then subscribes to store changes and persists them back via IPC.
 *
 * Call once in App.tsx. Returns { ready } — render children only when ready.
 */
export function useSettingsPersistence(): { ready: boolean } {
  const [ready, setReady] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true

    const mappings = buildMappings()
    const unsubscribers: Array<() => void> = []

    // Phase 1: Hydrate stores from persisted settings
    window.api.settings.getAll().then((persisted) => {
      // Suppress persistence during hydration
      let isHydrating = true

      for (const mapping of mappings) {
        const value = getByPath(persisted, mapping.key)
        if (value !== undefined) {
          mapping.set(value)
        }
      }

      // Phase 2: Subscribe to store changes and persist back
      // Use a small delay to avoid persisting the hydration writes
      setTimeout(() => {
        isHydrating = false
      }, 50)

      for (const mapping of mappings) {
        const unsub = mapping.subscribe(() => {
          if (isHydrating) return
          const value = mapping.get()
          window.api.settings.set(mapping.key, value)
        })
        unsubscribers.push(unsub)
      }

      setReady(true)
    })

    return () => {
      for (const unsub of unsubscribers) {
        unsub()
      }
    }
  }, [])

  return { ready }
}
