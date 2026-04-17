import { BrowserWindow, dialog, ipcMain, app } from 'electron'
import { getPrinters, checkPrinterAvailability, print } from './printerService'
import type { PrintOptions } from './printerService'
import * as settingsService from './settingsService'
import * as storageService from './storageService'
import type { SaveSessionData } from './storageService'
import * as loggingService from './loggingService'
import type { LogLevel } from './loggingService'
import * as kioskService from './kioskService'
import * as musicLibraryService from './musicLibraryService'
import { MusicLibraryError } from './musicLibraryService'
import type { ImportErrorReason } from './musicLibraryService'
import * as statusService from './printerStatusService'
import * as printerResetService from './printerResetService'

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
    const preflightSeconds = settingsService.get('printer.preflightTimeout')
    const timeoutSec =
      typeof preflightSeconds === 'number' &&
      Number.isFinite(preflightSeconds) &&
      preflightSeconds > 0
        ? preflightSeconds
        : 10
    return checkPrinterAvailability(mainWindow, printerName, {
      preflightTimeoutMs: timeoutSec * 1000
    })
  })

  ipcMain.handle('printer:print', async (_event, options: PrintOptions) => {
    const verifyTimeout = settingsService.get('printer.verificationTimeout')
    const verifyInterval = settingsService.get('printer.verificationPollInterval')
    const timeoutSec =
      typeof verifyTimeout === 'number' && Number.isFinite(verifyTimeout) && verifyTimeout > 0
        ? verifyTimeout
        : 90
    const intervalSec =
      typeof verifyInterval === 'number' && Number.isFinite(verifyInterval) && verifyInterval > 0
        ? verifyInterval
        : 2
    return print({
      ...options,
      verificationTimeoutMs: timeoutSec * 1000,
      verificationPollIntervalMs: intervalSec * 1000
    })
  })

  // ── Settings ──

  ipcMain.handle('settings:get', (_event, key: string) => {
    return settingsService.get(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    settingsService.set(key, value)

    // Forward kiosk setting changes so kioskService can react at runtime
    if (key.startsWith('kiosk.')) {
      kioskService.updateSetting(key)
    }
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

  // ── Gallery ──

  ipcMain.handle('gallery:save-session', async (_event, data: SaveSessionData) => {
    return storageService.saveSession(data)
  })

  ipcMain.handle(
    'gallery:save-strip',
    async (_event, sessionFolder: string, stripBase64: string, printSheetBase64: string) => {
      return storageService.saveStrip(sessionFolder, stripBase64, printSheetBase64)
    }
  )

  ipcMain.handle('gallery:list-sessions', async () => {
    return storageService.listSessions()
  })

  ipcMain.handle('gallery:get-session-detail', async (_event, sessionId: string) => {
    return storageService.getSessionDetail(sessionId)
  })

  ipcMain.handle('gallery:delete-session', async (_event, sessionId: string) => {
    return storageService.deleteSession(sessionId)
  })

  ipcMain.handle('gallery:delete-all-sessions', async () => {
    return storageService.deleteAllSessions()
  })

  ipcMain.handle('gallery:validate-directory', async (_event, dirPath: string) => {
    return storageService.validateDirectory(dirPath)
  })

  ipcMain.handle('gallery:open-in-explorer', async () => {
    return storageService.openInFileExplorer()
  })

  ipcMain.handle('gallery:get-default-path', () => {
    return storageService.getDefaultPath()
  })

  // ── Kiosk ──

  ipcMain.handle('kiosk:set-admin-panel-open', (_event, open: boolean) => {
    kioskService.setAdminPanelOpen(open)
  })

  // ── Logging ──

  ipcMain.handle('logging:log', (_event, level: LogLevel, source: string, message: string) => {
    loggingService.log(level, source, message)
  })

  ipcMain.handle('logging:getLogPath', () => {
    return loggingService.getLogPath()
  })

  // ── Music Library ──

  ipcMain.handle('musicLibrary:pickAndImport', async () => {
    const dialogResult = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Import music file',
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav'] }]
    })
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return { ok: false, reason: 'cancelled' as const }
    }
    const sourcePath = dialogResult.filePaths[0]

    try {
      const { storedFilename } = await musicLibraryService.importTrackFile(sourcePath)

      const current = (settingsService.get('audio.customMusicTracks') as string[] | undefined) ?? []
      settingsService.set('audio.customMusicTracks', [...current, storedFilename])

      const [track] = await musicLibraryService.listTracks([storedFilename])
      if (!track) {
        settingsService.set('audio.customMusicTracks', current)
        return { ok: false, reason: 'io-error' as const, message: 'Imported file disappeared' }
      }

      return { ok: true as const, track }
    } catch (err) {
      if (err instanceof MusicLibraryError) {
        return {
          ok: false as const,
          reason: err.reason as ImportErrorReason,
          message: err.message
        }
      }
      loggingService.log(
        'ERROR',
        'music-library',
        `pickAndImport unexpected error: ${(err as Error).message}`
      )
      return { ok: false as const, reason: 'io-error' as const, message: (err as Error).message }
    }
  })

  ipcMain.handle('musicLibrary:remove', async (_event, filename: string) => {
    await musicLibraryService.deleteTrackFile(filename)
    const current = (settingsService.get('audio.customMusicTracks') as string[] | undefined) ?? []
    settingsService.set(
      'audio.customMusicTracks',
      current.filter((f) => f !== filename)
    )
  })

  ipcMain.handle('musicLibrary:resolveActive', async () => {
    const list = (settingsService.get('audio.customMusicTracks') as string[] | undefined) ?? []
    const tracks = await musicLibraryService.listTracks(list)
    return tracks.map((t) => t.url)
  })

  ipcMain.handle('musicLibrary:list', async () => {
    const list = (settingsService.get('audio.customMusicTracks') as string[] | undefined) ?? []
    return musicLibraryService.listTracks(list)
  })

  // ── Printer Status ──

  ipcMain.handle('printer:get-status', async (_event, printerName: string) => {
    return statusService.getStatus(printerName)
  })

  // ── Printer Reset ──

  ipcMain.handle('printer:reset', async (_event, printerName: string) => {
    return printerResetService.resetPrinter(printerName)
  })

  // ── Log buffer ──

  ipcMain.handle(
    'logging:get-recent',
    (_event, options: { limit: number; source?: string; level?: LogLevel }) => {
      return loggingService.getRecent(options)
    }
  )

  // ── Dev-only mock status override (NODE_ENV === 'development') ──
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    let mockStatus: import('./printerStatusService').PrinterStatus | null = null

    ipcMain.handle(
      '__dev:set-mock-printer-status',
      (
        _event,
        override: null | {
          state: 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error'
          rawStatusCode: number
          detail: string
        }
      ) => {
        if (override === null) {
          mockStatus = null
          return
        }
        mockStatus = {
          name: 'MOCK',
          state: override.state,
          rawStatusCode: override.rawStatusCode,
          jobCount: 0,
          detail: override.detail,
          queriedAt: Date.now()
        }
      }
    )

    // Replace the real get-status handler when a mock is set
    ipcMain.removeHandler('printer:get-status')
    ipcMain.handle('printer:get-status', async (_event, printerName: string) => {
      if (mockStatus) return { ...mockStatus, name: printerName }
      return statusService.getStatus(printerName)
    })
  }
}
