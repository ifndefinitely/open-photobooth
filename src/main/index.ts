import { app, BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const isDev = is.dev
  const isLinux = process.platform === 'linux'

  const mainWindow = new BrowserWindow({
    // In dev on Linux, use large windowed mode instead of true fullscreen
    // (fullscreen is painful for dev — hard to access DevTools, terminal, etc.)
    ...(isDev && isLinux
      ? { width: 1280, height: 800 }
      : { fullscreen: true, fullscreenable: true }),
    frame: false,
    show: !isDev, // Show immediately in production, wait in dev (for DevTools)
    autoHideMenuBar: true,
    backgroundColor: '#000000', // Match app background to prevent flash
    ...(isLinux ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

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
}

app.whenReady().then(() => {
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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up global shortcuts when the app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
