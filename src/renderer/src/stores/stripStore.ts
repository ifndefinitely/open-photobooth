import { create } from 'zustand'

export type FilterType = 'none' | 'bw' | 'sepia' | 'vintage'

export interface StripResult {
  blob: Blob
  dataUrl: string
  width: number
  height: number
}

interface StripState {
  selectedFilter: FilterType
  stripResult: StripResult | null
  printSheetResult: StripResult | null
  isComposing: boolean
  compositionError: string | null

  setSelectedFilter: (filter: FilterType) => void
  setStripResult: (result: StripResult | null) => void
  setPrintSheetResult: (result: StripResult | null) => void
  setIsComposing: (value: boolean) => void
  setCompositionError: (error: string | null) => void
  resetStrip: () => void
}

export const useStripStore = create<StripState>((set) => ({
  selectedFilter: 'none',
  stripResult: null,
  printSheetResult: null,
  isComposing: false,
  compositionError: null,

  setSelectedFilter: (filter) => set({ selectedFilter: filter }),
  setStripResult: (result) => set({ stripResult: result }),
  setPrintSheetResult: (result) => set({ printSheetResult: result }),
  setIsComposing: (value) => set({ isComposing: value }),
  setCompositionError: (error) => set({ compositionError: error }),
  resetStrip: () =>
    set({
      selectedFilter: 'none',
      stripResult: null,
      printSheetResult: null,
      isComposing: false,
      compositionError: null
    })
}))
