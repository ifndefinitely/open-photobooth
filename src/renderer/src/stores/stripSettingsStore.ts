import { create } from 'zustand'

export type BorderStyle = 'none' | 'solid' | 'dashed' | 'double'
export type DateStampFormat = 'MMMM D, YYYY' | 'DD-MM-YYYY' | 'YYYY-MM-DD'

interface StripSettingsState {
  // Appearance (pre-Epic 07: stored in memory only, no persistence)
  backgroundColor: string
  borderColor: string
  borderStyle: BorderStyle
  borderWidth: number // 0-20
  logoPath: string // empty = no logo
  eventName: string // empty = no event name
  dateStampEnabled: boolean
  dateStampFormat: DateStampFormat

  // Filters
  filtersEnabled: boolean
  filterBlackAndWhite: boolean
  filterSepia: boolean
  filterVintage: boolean

  // Paper
  paperSize: string // '4x6' | '5x7' etc.
  cutGuideEnabled: boolean

  // Actions
  setBackgroundColor: (color: string) => void
  setBorderColor: (color: string) => void
  setBorderStyle: (style: BorderStyle) => void
  setBorderWidth: (width: number) => void
  setLogoPath: (path: string) => void
  setEventName: (name: string) => void
  setDateStampEnabled: (enabled: boolean) => void
  setDateStampFormat: (format: DateStampFormat) => void
  setFiltersEnabled: (enabled: boolean) => void
  setFilterBlackAndWhite: (enabled: boolean) => void
  setFilterSepia: (enabled: boolean) => void
  setFilterVintage: (enabled: boolean) => void
  setPaperSize: (size: string) => void
  setCutGuideEnabled: (enabled: boolean) => void
}

export const useStripSettingsStore = create<StripSettingsState>((set) => ({
  // Defaults match Epic 07 schema
  backgroundColor: '#FFFFFF',
  borderColor: '#000000',
  borderStyle: 'none',
  borderWidth: 0,
  logoPath: '',
  eventName: '',
  dateStampEnabled: true,
  dateStampFormat: 'MMMM D, YYYY',

  filtersEnabled: true,
  filterBlackAndWhite: true,
  filterSepia: true,
  filterVintage: true,

  paperSize: '4x6',
  cutGuideEnabled: true,

  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setBorderColor: (color) => set({ borderColor: color }),
  setBorderStyle: (style) => set({ borderStyle: style }),
  setBorderWidth: (width) => set({ borderWidth: Math.max(0, Math.min(20, Math.round(width))) }),
  setLogoPath: (path) => set({ logoPath: path }),
  setEventName: (name) => set({ eventName: name }),
  setDateStampEnabled: (enabled) => set({ dateStampEnabled: enabled }),
  setDateStampFormat: (format) => set({ dateStampFormat: format }),
  setFiltersEnabled: (enabled) => set({ filtersEnabled: enabled }),
  setFilterBlackAndWhite: (enabled) => set({ filterBlackAndWhite: enabled }),
  setFilterSepia: (enabled) => set({ filterSepia: enabled }),
  setFilterVintage: (enabled) => set({ filterVintage: enabled }),
  setPaperSize: (size) => set({ paperSize: size }),
  setCutGuideEnabled: (enabled) => set({ cutGuideEnabled: enabled })
}))
