import { create } from 'zustand'

export type PaperSize = '4x6' | '5x7' | 'letter' | 'a6'
export type PrintQuality = 'draft' | 'normal' | 'high'
export type ColorMode = 'color' | 'grayscale'
export type OfflineBehaviour = 'halt' | 'captureOnly'

export interface PrintMargins {
  top: number
  right: number
  bottom: number
  left: number
}

interface PrinterSettingsState {
  printerName: string
  paperSize: PaperSize
  quality: PrintQuality
  colorMode: ColorMode
  margins: PrintMargins
  copies: number

  // Reliability settings
  preflightTimeout: number
  verificationTimeout: number
  verificationPollInterval: number
  autoRetryOnce: boolean
  offlineBehaviour: OfflineBehaviour
  healthPollInterval: number

  setPrinterName: (name: string) => void
  setPaperSize: (size: PaperSize) => void
  setQuality: (quality: PrintQuality) => void
  setColorMode: (mode: ColorMode) => void
  setMargins: (margins: PrintMargins) => void
  setCopies: (copies: number) => void

  setPreflightTimeout: (seconds: number) => void
  setVerificationTimeout: (seconds: number) => void
  setVerificationPollInterval: (seconds: number) => void
  setAutoRetryOnce: (value: boolean) => void
  setOfflineBehaviour: (mode: OfflineBehaviour) => void
  setHealthPollInterval: (seconds: number) => void
}

export const usePrinterSettingsStore = create<PrinterSettingsState>((set) => ({
  printerName: '',
  paperSize: '4x6',
  quality: 'high',
  colorMode: 'color',
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
  copies: 1,

  preflightTimeout: 10,
  verificationTimeout: 90,
  verificationPollInterval: 2,
  autoRetryOnce: true,
  offlineBehaviour: 'captureOnly',
  healthPollInterval: 10,

  setPrinterName: (printerName) => set({ printerName }),
  setPaperSize: (paperSize) => set({ paperSize }),
  setQuality: (quality) => set({ quality }),
  setColorMode: (colorMode) => set({ colorMode }),
  setMargins: (margins) => set({ margins }),
  setCopies: (copies) => set({ copies: Math.max(1, Math.min(5, copies)) }),

  setPreflightTimeout: (v) => set({ preflightTimeout: Math.max(5, Math.min(30, v)) }),
  setVerificationTimeout: (v) => set({ verificationTimeout: Math.max(30, Math.min(180, v)) }),
  setVerificationPollInterval: (v) =>
    set({ verificationPollInterval: Math.max(1, Math.min(10, v)) }),
  setAutoRetryOnce: (autoRetryOnce) => set({ autoRetryOnce }),
  setOfflineBehaviour: (offlineBehaviour) => set({ offlineBehaviour }),
  setHealthPollInterval: (v) => set({ healthPollInterval: Math.max(5, Math.min(60, v)) })
}))
