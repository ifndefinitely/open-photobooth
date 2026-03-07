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

export interface API {
  printer: PrinterAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
