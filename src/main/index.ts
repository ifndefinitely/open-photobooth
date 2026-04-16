import { app, BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipcHandlers'
import * as settingsService from './settingsService'
import * as loggingService from './loggingService'
import * as kioskService from './kioskService'

function createWindow(): BrowserWindow {
  const isDev = is.dev
  const isLinux = process.platform === 'linux'

  // Start maximized (not fullscreen). The kioskService will apply fullscreen
  // based on the kiosk.fullscreenLock setting after init.
  // In dev on Linux, use a smaller windowed mode for easier DevTools access.
  const mainWindow = new BrowserWindow({
    ...(isDev && isLinux ? { width: 1280, height: 800 } : { width: 1920, height: 1080 }),
    frame: false,
    show: !isDev, // Show immediately in production, wait in dev (for DevTools)
    autoHideMenuBar: true,
    backgroundColor: '#000000', // Match app background to prevent flash
    ...(isLinux ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  // Maximize the window (not fullscreen — kioskService handles that)
  if (!(isDev && isLinux)) {
    mainWindow.maximize()
  }

  // In dev, wait for content before showing (so DevTools can attach cleanly)
  if (isDev) {
    mainWindow.on('ready-to-show', () => {
      mainWindow.show()
    })
  }

  // Dev-only: open DevTools in a detached window
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // Load the remote URL for development or the local html file for production
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(async () => {
  // Initialize core services before anything else
  const userDataPath = app.getPath('userData')
  await loggingService.init(userDataPath)
  await settingsService.init(userDataPath)

  electronApp.setAppUserModelId('com.openphotobooth.app')

  // Dev-only: watch for F5/Ctrl+R to reload
  if (is.dev) {
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })
  }

  // Dev-only: register Ctrl+Q / Cmd+Q to quit the app
  if (is.dev) {
    globalShortcut.register('CommandOrControl+Q', () => {
      app.quit()
    })
  }

  const mainWindow = createWindow()
  registerIpcHandlers(mainWindow)
  loggingService.attachRendererMirror(mainWindow.webContents)
  kioskService.init(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Flush pending settings writes and clean up before quitting
app.on('will-quit', () => {
  loggingService.log('INFO', 'App', 'Application shutting down')
  kioskService.destroy()
  settingsService.flush()
  globalShortcut.unregisterAll()
})
