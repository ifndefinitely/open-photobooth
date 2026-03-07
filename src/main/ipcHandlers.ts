import { BrowserWindow, ipcMain } from 'electron'
import { getPrinters, checkPrinterAvailability, print } from './printerService'
import type { PrintOptions } from './printerService'

/**
 * Register all IPC handlers for the main process.
 * Call this once after the main window is created.
 */
export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Printer: get list of installed printers
  ipcMain.handle('printer:get-list', async () => {
    return getPrinters(mainWindow)
  })

  // Printer: check if a specific printer is available
  ipcMain.handle('printer:check-availability', async (_event, printerName: string) => {
    return checkPrinterAvailability(mainWindow, printerName)
  })

  // Printer: send a silent print job
  ipcMain.handle('printer:print', async (_event, options: PrintOptions) => {
    return print(options)
  })
}
