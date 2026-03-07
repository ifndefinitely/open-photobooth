import { create } from 'zustand'

export type PaperSize = '4x6' | '5x7' | 'letter' | 'a6'
export type PrintQuality = 'draft' | 'normal' | 'high'
export type ColorMode = 'color' | 'grayscale'

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

  setPrinterName: (name: string) => void
  setPaperSize: (size: PaperSize) => void
  setQuality: (quality: PrintQuality) => void
  setColorMode: (mode: ColorMode) => void
  setMargins: (margins: PrintMargins) => void
  setCopies: (copies: number) => void
}

export const usePrinterSettingsStore = create<PrinterSettingsState>((set) => ({
  printerName: '',
  paperSize: '4x6',
  quality: 'high',
  colorMode: 'color',
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
  copies: 1,

  setPrinterName: (printerName) => set({ printerName }),
  setPaperSize: (paperSize) => set({ paperSize }),
  setQuality: (quality) => set({ quality }),
  setColorMode: (colorMode) => set({ colorMode }),
  setMargins: (margins) => set({ margins }),
  setCopies: (copies) => set({ copies: Math.max(1, Math.min(5, copies)) })
}))
