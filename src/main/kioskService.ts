import { BrowserWindow, globalShortcut, powerSaveBlocker, app } from 'electron'
import * as settingsService from './settingsService'
import * as loggingService from './loggingService'

// ── Module state ──

let mainWindow: BrowserWindow | null = null
let powerSaveBlockerId: number | null = null
let focusReclaimTimeout: ReturnType<typeof setTimeout> | null = null
let isAdminPanelOpen = false

/** Shortcuts registered by kiosk features (tracked for selective cleanup). */
const registeredShortcuts: string[] = []

// ── Helpers ──

function isWindows(): boolean {
  return process.platform === 'win32'
}

function isLinux(): boolean {
  return process.platform === 'linux'
}

function registerShortcut(accelerator: string, callback: () => void): void {
  try {
    if (!globalShortcut.isRegistered(accelerator)) {
      globalShortcut.register(accelerator, callback)
      registeredShortcuts.push(accelerator)
    }
  } catch (err) {
    loggingService.log('WARN', 'KioskService', `Failed to register shortcut ${accelerator}: ${err}`)
  }
}

function unregisterKioskShortcuts(): void {
  for (const shortcut of registeredShortcuts) {
    try {
      globalShortcut.unregister(shortcut)
    } catch {
      // Ignore — may already be unregistered
    }
  }
  registeredShortcuts.length = 0
}

// ── Fullscreen Lock (Story 12.1) ──

function applyFullscreenLock(): void {
  if (!mainWindow) return
  const enabled = settingsService.get('kiosk.fullscreenLock') as boolean

  if (!enabled) {
    removeFullscreenLock()
    return
  }

  loggingService.log('INFO', 'KioskService', 'Applying fullscreen lock')

  if (isWindows()) {
    mainWindow.setFullScreen(true)
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  } else if (isLinux()) {
    mainWindow.setKiosk(true)
  }

  // Block F11 and Escape to prevent exiting fullscreen
  registerShortcut('F11', () => {})
  registerShortcut('Escape', () => {})

  // Reclaim focus if window loses it (unless admin panel is open)
  mainWindow.on('blur', handleWindowBlur)
}

function removeFullscreenLock(): void {
  if (!mainWindow) return

  loggingService.log('INFO', 'KioskService', 'Removing fullscreen lock')

  mainWindow.removeListener('blur', handleWindowBlur)
  clearFocusReclaim()

  // Unregister F11/Escape if they were registered by us
  const toRemove = ['F11', 'Escape']
  for (const key of toRemove) {
    const idx = registeredShortcuts.indexOf(key)
    if (idx !== -1) {
      try {
        globalShortcut.unregister(key)
      } catch {
        // Ignore
      }
      registeredShortcuts.splice(idx, 1)
    }
  }

  if (isWindows()) {
    mainWindow.setAlwaysOnTop(false)
    mainWindow.setFullScreen(false)
  } else if (isLinux()) {
    mainWindow.setKiosk(false)
  }
}

function handleWindowBlur(): void {
  if (isAdminPanelOpen || !mainWindow) return

  const enabled = settingsService.get('kiosk.fullscreenLock') as boolean
  if (!enabled) return

  // Reclaim focus after a short delay to avoid flickering
  clearFocusReclaim()
  focusReclaimTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !isAdminPanelOpen) {
      mainWindow.focus()
      loggingService.log('DEBUG', 'KioskService', 'Reclaimed window focus')
    }
  }, 1000)
}

function clearFocusReclaim(): void {
  if (focusReclaimTimeout) {
    clearTimeout(focusReclaimTimeout)
    focusReclaimTimeout = null
  }
}

// ── Prevent Alt-Tab / System Shortcuts (Story 12.2) ──

function applyPreventAltTab(): void {
  const enabled = settingsService.get('kiosk.preventAltTab') as boolean
  if (!enabled || isAdminPanelOpen) {
    removePreventAltTab()
    return
  }

  loggingService.log('INFO', 'KioskService', 'Applying Alt-Tab prevention')

  // Register system shortcuts as no-ops to swallow them.
  // Alt+F4 is blocked here — admins use Ctrl+Shift+Q to exit instead.
  registerShortcut('Alt+F4', () => {})
  registerShortcut('Alt+Tab', () => {})
  registerShortcut('Super', () => {})
  registerShortcut('Ctrl+Escape', () => {})
}

function removePreventAltTab(): void {
  loggingService.log('INFO', 'KioskService', 'Removing Alt-Tab prevention')

  const toRemove = ['Alt+F4', 'Alt+Tab', 'Super', 'Ctrl+Escape']
  for (const key of toRemove) {
    const idx = registeredShortcuts.indexOf(key)
    if (idx !== -1) {
      try {
        globalShortcut.unregister(key)
      } catch {
        // Ignore
      }
      registeredShortcuts.splice(idx, 1)
    }
  }
}

// ── Prevent Sleep (Story 12.3) ──

function applyPreventSleep(): void {
  const enabled = settingsService.get('kiosk.preventSleep') as boolean
  if (!enabled) {
    removePreventSleep()
    return
  }

  if (powerSaveBlockerId !== null) return // Already active

  powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep')
  loggingService.log(
    'INFO',
    'KioskService',
    `Power save blocker started (id: ${powerSaveBlockerId})`
  )
}

function removePreventSleep(): void {
  if (powerSaveBlockerId === null) return

  powerSaveBlocker.stop(powerSaveBlockerId)
  loggingService.log(
    'INFO',
    'KioskService',
    `Power save blocker stopped (id: ${powerSaveBlockerId})`
  )
  powerSaveBlockerId = null
}

// ── Auto-Start (Story 12.4) ──

function applyAutoStart(): void {
  const enabled = settingsService.get('kiosk.autoStart') as boolean
  app.setLoginItemSettings({ openAtLogin: enabled })
  loggingService.log('INFO', 'KioskService', `Auto-start ${enabled ? 'enabled' : 'disabled'}`)
}

// ── Public API ──

/**
 * Initialize the kiosk service. Call once after the main window is created
 * and settings are loaded.
 */
export function init(window: BrowserWindow): void {
  mainWindow = window

  loggingService.log('INFO', 'KioskService', 'Initializing kiosk service')

  // Admin escape hatch: Ctrl+Shift+Q always quits the app.
  // Guests won't know this combo; admins use it to exit kiosk mode.
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    loggingService.log('INFO', 'KioskService', 'Escape hatch triggered (Ctrl+Shift+Q)')
    app.quit()
  })

  // Apply settings-driven features
  applyFullscreenLock()
  applyPreventSleep()
  applyPreventAltTab()
  applyAutoStart()
}

/**
 * React to a kiosk setting change at runtime.
 * Called when a `kiosk.*` key is written via the settings IPC.
 */
export function updateSetting(key: string): void {
  switch (key) {
    case 'kiosk.fullscreenLock':
      applyFullscreenLock()
      break
    case 'kiosk.preventSleep':
      applyPreventSleep()
      break
    case 'kiosk.preventAltTab':
      applyPreventAltTab()
      break
    case 'kiosk.autoStart':
      applyAutoStart()
      break
    // kiosk.idleTimeout is handled entirely in the renderer — no main-process action needed
  }
}

/**
 * Notify the service that the admin panel has been opened or closed.
 * When open, kiosk restrictions are temporarily lifted so the admin
 * can interact with OS dialogs (file pickers, etc.).
 */
export function setAdminPanelOpen(open: boolean): void {
  isAdminPanelOpen = open
  loggingService.log('INFO', 'KioskService', `Admin panel ${open ? 'opened' : 'closed'}`)

  if (open) {
    // Lift restrictions
    removePreventAltTab()
    clearFocusReclaim()
  } else {
    // Restore restrictions
    applyPreventAltTab()
  }
}

/**
 * Clean up all kiosk features. Call on app shutdown (`will-quit`).
 */
export function destroy(): void {
  loggingService.log('INFO', 'KioskService', 'Destroying kiosk service')

  clearFocusReclaim()
  removePreventSleep()
  unregisterKioskShortcuts()

  mainWindow = null
}
