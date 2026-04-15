import { ElectronAPI } from '@electron-toolkit/preload'

export interface PrinterInfo {
  name: string
  displayName: string
  description: string
}

export interface PrinterAvailability {
  available: boolean
  status: string
}

export interface PrintOptions {
  printerName: string
  imageDataUrl: string
  copies: number
  colorMode: 'color' | 'grayscale'
  paperSize: string
  margins: { top: number; right: number; bottom: number; left: number }
}

export interface PrintResult {
  success: boolean
  error?: string
}

export interface PrinterAPI {
  getPrinters: () => Promise<PrinterInfo[]>
  checkAvailability: (printerName: string) => Promise<PrinterAvailability>
  print: (options: PrintOptions) => Promise<PrintResult>
}

export interface SettingsAPI {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
  getAll: () => Promise<Record<string, unknown>>
  reset: (key: string) => Promise<void>
  resetAll: () => Promise<void>
  selectFile: (options?: {
    filters?: Array<{ name: string; extensions: string[] }>
  }) => Promise<string | null>
  selectDirectory: (options?: { title?: string }) => Promise<string | null>
}

export interface SessionSummary {
  id: string
  folderPath: string
  timestamp: string
  photoCount: number
  hasStrip: boolean
  thumbnailDataUrl: string
}

export interface SessionDetail {
  id: string
  folderPath: string
  timestamp: string
  photoCount: number
  filter: string
  photos: Array<{ filename: string; dataUrl: string }>
  stripDataUrl: string | null
  printSheetDataUrl: string | null
  metadata: Record<string, unknown>
}

export interface SaveSessionResult {
  success: boolean
  sessionFolder: string
  error?: string
}

export interface ValidateDirectoryResult {
  valid: boolean
  error?: string
}

export interface DeleteAllResult {
  deleted: number
  errors: string[]
}

export interface GalleryAPI {
  saveSession: (data: {
    photos: string[]
    timestamp: string
    photoCount: number
    filter: string
  }) => Promise<SaveSessionResult>
  saveStrip: (sessionFolder: string, stripBase64: string, printSheetBase64: string) => Promise<void>
  listSessions: () => Promise<SessionSummary[]>
  getSessionDetail: (sessionId: string) => Promise<SessionDetail | null>
  deleteSession: (sessionId: string) => Promise<void>
  deleteAllSessions: () => Promise<DeleteAllResult>
  validateDirectory: (dirPath: string) => Promise<ValidateDirectoryResult>
  openInExplorer: () => Promise<{ success: boolean; error?: string }>
  getDefaultPath: () => Promise<string>
}

export interface LoggingAPI {
  log: (level: string, source: string, message: string) => Promise<void>
  getLogPath: () => Promise<string>
}

export interface KioskAPI {
  setAdminPanelOpen: (open: boolean) => Promise<void>
}

export interface MusicLibraryTrack {
  filename: string
  url: string
  sizeBytes: number
}

export type PickAndImportResult =
  | { ok: true; track: MusicLibraryTrack }
  | {
      ok: false
      reason: 'cancelled' | 'invalid-extension' | 'file-too-large' | 'library-full' | 'io-error'
      message?: string
    }

export interface MusicLibraryAPI {
  pickAndImport: () => Promise<PickAndImportResult>
  remove: (filename: string) => Promise<void>
  resolveActive: () => Promise<string[]>
  list: () => Promise<MusicLibraryTrack[]>
}

export interface API {
  printer: PrinterAPI
  settings: SettingsAPI
  logging: LoggingAPI
  kiosk: KioskAPI
  gallery: GalleryAPI
  musicLibrary: MusicLibraryAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
