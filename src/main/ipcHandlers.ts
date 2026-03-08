import { BrowserWindow, dialog, ipcMain } from 'electron'
import { getPrinters, checkPrinterAvailability, print } from './printerService'
import type { PrintOptions } from './printerService'
import * as settingsService from './settingsService'

interface FileDialogOptions {
  filters?: Array<{ name: string; extensions: string[] }>
}

interface DirectoryDialogOptions {
  title?: string
}

/**
 * Register all IPC handlers for the main process.
 * Call this once after the main window is created.
 */
export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // ── Printer ──

  ipcMain.handle('printer:get-list', async () => {
    return getPrinters(mainWindow)
  })

  ipcMain.handle('printer:check-availability', async (_event, printerName: string) => {
    return checkPrinterAvailability(mainWindow, printerName)
  })

  ipcMain.handle('printer:print', async (_event, options: PrintOptions) => {
    return print(options)
  })

  // ── Settings ──

  ipcMain.handle('settings:get', (_event, key: string) => {
    return settingsService.get(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    settingsService.set(key, value)
  })

  ipcMain.handle('settings:getAll', () => {
    return settingsService.getAll()
  })

  ipcMain.handle('settings:reset', (_event, key: string) => {
    settingsService.reset(key)
  })

  ipcMain.handle('settings:resetAll', () => {
    settingsService.resetAll()
  })

  ipcMain.handle('settings:selectFile', async (_event, options?: FileDialogOptions) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options?.filters
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('settings:selectDirectory', async (_event, options?: DirectoryDialogOptions) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: options?.title
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}
