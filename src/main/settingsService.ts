import { readFile, writeFile, rename, mkdir } from 'fs/promises'
import { join } from 'path'

// ── Default settings (mirrors the schema from docs/07-epic-admin-settings.md) ──

interface SettingsSchema {
  appearance: {
    theme: string
    logoPath: string
    eventName: string
    dateStampEnabled: boolean
    dateStampFormat: string
    borderColor: string
    borderStyle: string
    borderWidth: number
    backgroundColor: string
  }
  camera: {
    deviceId: string
    resolution: string
    mirrorHorizontal: boolean
    flipVertical: boolean
    brightness: number
    contrast: number
    saturation: number
  }
  printer: {
    printerName: string
    paperSize: string
    quality: string
    colorMode: string
    margins: { top: number; right: number; bottom: number; left: number }
    copies: number
  }
  session: {
    photoCount: number
    countdownDuration: number
  }
  filters: {
    enabled: boolean
    blackAndWhite: boolean
    sepia: boolean
    vintage: boolean
  }
  audio: {
    musicMode: string
    musicVolume: number
    countdownBeep: boolean
    shutterSound: boolean
    flashEffect: boolean
    customMusicTracks: string[]
  }
  pin: {
    code: string
  }
  gallery: {
    savePath: string
  }
  kiosk: {
    autoStart: boolean
    preventSleep: boolean
    preventAltTab: boolean
    fullscreenLock: boolean
    idleTimeout: number
  }
  language: {
    userLocale: string
  }
}

const DEFAULTS: SettingsSchema = {
  appearance: {
    theme: 'drugstore',
    logoPath: '',
    eventName: '',
    dateStampEnabled: true,
    dateStampFormat: 'MMMM D, YYYY',
    borderColor: '#000000',
    borderStyle: 'none',
    borderWidth: 0,
    backgroundColor: '#FFFFFF'
  },
  camera: {
    deviceId: '',
    resolution: '1280x720',
    mirrorHorizontal: true,
    flipVertical: false,
    brightness: 0,
    contrast: 0,
    saturation: 0
  },
  printer: {
    printerName: '',
    paperSize: '4x6',
    quality: 'high',
    colorMode: 'color',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    copies: 1
  },
  session: {
    photoCount: 4,
    countdownDuration: 3
  },
  filters: {
    enabled: true,
    blackAndWhite: true,
    sepia: true,
    vintage: true
  },
  audio: {
    musicMode: 'idle',
    musicVolume: 50,
    countdownBeep: true,
    shutterSound: true,
    flashEffect: true,
    customMusicTracks: []
  },
  pin: {
    code: '0000'
  },
  gallery: {
    savePath: ''
  },
  kiosk: {
    autoStart: false,
    preventSleep: true,
    preventAltTab: true,
    fullscreenLock: true,
    idleTimeout: 60
  },
  language: {
    userLocale: 'en'
  }
}

// ── Module state ──

let cache: Record<string, unknown> = {}
let settingsFilePath = ''
let writeTimer: ReturnType<typeof setTimeout> | null = null

const DEBOUNCE_MS = 500
const SETTINGS_FILENAME = 'settings.json'

// ── Helpers ──

/** Deep clone a value (JSON-safe only) */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/** Deep merge source into target (source values override target) */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const sourceVal = source[key]
    const targetVal = target[key]
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      )
    } else {
      result[key] = sourceVal
    }
  }
  return result
}

/** Get a value from a nested object using a dot-path key (e.g., "appearance.logoPath") */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/** Set a value in a nested object using a dot-path key */
function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (
      current[part] === undefined ||
      typeof current[part] !== 'object' ||
      current[part] === null
    ) {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

/** Schedule a debounced write to disk */
function scheduleWrite(): void {
  if (writeTimer !== null) {
    clearTimeout(writeTimer)
  }
  writeTimer = setTimeout(() => {
    writeTimer = null
    writeToDisk().catch((err) => {
      console.error('[Settings] Failed to write settings to disk:', err)
    })
  }, DEBOUNCE_MS)
}

/** Atomic write: write to temp file, then rename */
async function writeToDisk(): Promise<void> {
  const tmpPath = settingsFilePath + '.tmp'
  const json = JSON.stringify(cache, null, 2)
  await writeFile(tmpPath, json, 'utf-8')
  await rename(tmpPath, settingsFilePath)
}

// ── Public API ──

/**
 * Initialize the settings service. Call once at app startup before creating windows.
 * @param userDataPath — The path from app.getPath('userData')
 */
export async function init(userDataPath: string): Promise<void> {
  settingsFilePath = join(userDataPath, SETTINGS_FILENAME)
  console.log(`[Settings] Settings file: ${settingsFilePath}`)

  // Ensure the directory exists
  await mkdir(userDataPath, { recursive: true })

  // Start with defaults
  cache = deepClone(DEFAULTS) as unknown as Record<string, unknown>

  // Try to read existing settings file
  try {
    const raw = await readFile(settingsFilePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Merge saved values over defaults (defaults fill in any missing keys)
      cache = deepMerge(cache, parsed as Record<string, unknown>)
    } else {
      console.warn('[Settings] Settings file contained non-object value, using defaults')
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('[Settings] No settings file found, using defaults')
    } else {
      console.warn('[Settings] Failed to read or parse settings file, using defaults:', err)
    }
  }
}

/** Get the value for a dot-path settings key, or the default if not set. */
export function get(key: string): unknown {
  const value = getByPath(cache, key)
  if (value !== undefined) return value
  // Fall back to default
  return getByPath(deepClone(DEFAULTS) as unknown as Record<string, unknown>, key)
}

/** Set a value and trigger debounced persistence. */
export function set(key: string, value: unknown): void {
  setByPath(cache, key, value)
  scheduleWrite()
}

/** Return the entire settings object (deep clone for safety). */
export function getAll(): Record<string, unknown> {
  return deepClone(cache)
}

/** Reset a key to its default value. */
export function reset(key: string): void {
  const defaultValue = getByPath(deepClone(DEFAULTS) as unknown as Record<string, unknown>, key)
  if (defaultValue !== undefined) {
    setByPath(cache, key, deepClone(defaultValue))
    scheduleWrite()
  }
}

/** Reset all settings to defaults. */
export function resetAll(): void {
  cache = deepClone(DEFAULTS) as unknown as Record<string, unknown>
  scheduleWrite()
}

/** Flush any pending writes immediately. Call before app quit. */
export async function flush(): Promise<void> {
  if (writeTimer !== null) {
    clearTimeout(writeTimer)
    writeTimer = null
    await writeToDisk()
  }
}
