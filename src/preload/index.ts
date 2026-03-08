import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
