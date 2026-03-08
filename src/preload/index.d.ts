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

export interface API {
  printer: PrinterAPI
  settings: SettingsAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
