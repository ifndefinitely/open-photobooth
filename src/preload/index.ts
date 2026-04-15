import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { MusicLibraryTrack, PickAndImportResult } from './index.d'

// Custom APIs for renderer
const api = {
  printer: {
    getPrinters: (): Promise<unknown[]> => ipcRenderer.invoke('printer:get-list'),
    checkAvailability: (printerName: string): Promise<unknown> =>
      ipcRenderer.invoke('printer:check-availability', printerName),
    print: (options: unknown): Promise<unknown> => ipcRenderer.invoke('printer:print', options)
  },
  settings: {
    get: (key: string): Promise<unknown> => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown): Promise<void> =>
      ipcRenderer.invoke('settings:set', key, value),
    getAll: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:getAll'),
    reset: (key: string): Promise<void> => ipcRenderer.invoke('settings:reset', key),
    resetAll: (): Promise<void> => ipcRenderer.invoke('settings:resetAll'),
    selectFile: (options?: {
      filters?: Array<{ name: string; extensions: string[] }>
    }): Promise<string | null> => ipcRenderer.invoke('settings:selectFile', options),
    selectDirectory: (options?: { title?: string }): Promise<string | null> =>
      ipcRenderer.invoke('settings:selectDirectory', options)
  },
  logging: {
    log: (level: string, source: string, message: string): Promise<void> =>
      ipcRenderer.invoke('logging:log', level, source, message),
    getLogPath: (): Promise<string> => ipcRenderer.invoke('logging:getLogPath')
  },
  kiosk: {
    setAdminPanelOpen: (open: boolean): Promise<void> =>
      ipcRenderer.invoke('kiosk:set-admin-panel-open', open)
  },
  gallery: {
    saveSession: (data: {
      photos: string[]
      timestamp: string
      photoCount: number
      filter: string
    }): Promise<{ success: boolean; sessionFolder: string; error?: string }> =>
      ipcRenderer.invoke('gallery:save-session', data),
    saveStrip: (
      sessionFolder: string,
      stripBase64: string,
      printSheetBase64: string
    ): Promise<void> =>
      ipcRenderer.invoke('gallery:save-strip', sessionFolder, stripBase64, printSheetBase64),
    listSessions: (): Promise<unknown[]> => ipcRenderer.invoke('gallery:list-sessions'),
    getSessionDetail: (sessionId: string): Promise<unknown> =>
      ipcRenderer.invoke('gallery:get-session-detail', sessionId),
    deleteSession: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke('gallery:delete-session', sessionId),
    deleteAllSessions: (): Promise<{ deleted: number; errors: string[] }> =>
      ipcRenderer.invoke('gallery:delete-all-sessions'),
    validateDirectory: (dirPath: string): Promise<{ valid: boolean; error?: string }> =>
      ipcRenderer.invoke('gallery:validate-directory', dirPath),
    openInExplorer: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('gallery:open-in-explorer'),
    getDefaultPath: (): Promise<string> => ipcRenderer.invoke('gallery:get-default-path')
  },
  musicLibrary: {
    pickAndImport: (): Promise<PickAndImportResult> =>
      ipcRenderer.invoke('musicLibrary:pickAndImport'),
    remove: (filename: string): Promise<void> =>
      ipcRenderer.invoke('musicLibrary:remove', filename),
    resolveActive: (): Promise<string[]> => ipcRenderer.invoke('musicLibrary:resolveActive'),
    list: (): Promise<MusicLibraryTrack[]> => ipcRenderer.invoke('musicLibrary:list')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
