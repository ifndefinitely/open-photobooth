import { create } from 'zustand'

/** Matches the shape returned by window.api.printer.getStatus() */
export type PrinterState = 'ready' | 'busy' | 'warmingUp' | 'offline' | 'error'

export interface PrinterStatus {
  name: string
  state: PrinterState
  rawStatusCode: number
  jobCount: number
  detail: string
  queriedAt: number
}

export interface RecentErrorEntry {
  detail: string
  rawStatusCode: number
  at: number
}

interface PrinterStatusState {
  status: PrinterStatus | null
  recentErrors: RecentErrorEntry[]
  lastCheckedAt: number | null

  setStatus: (status: PrinterStatus) => void
  reset: () => void
}

const MAX_RECENT_ERRORS = 5

export const usePrinterStatusStore = create<PrinterStatusState>((set) => ({
  status: null,
  recentErrors: [],
  lastCheckedAt: null,

  setStatus: (status) =>
    set((state) => {
      const isError = status.state === 'error' || status.state === 'offline'
      const recent = isError
        ? [
            { detail: status.detail, rawStatusCode: status.rawStatusCode, at: status.queriedAt },
            ...state.recentErrors
          ].slice(0, MAX_RECENT_ERRORS)
        : state.recentErrors
      return {
        status,
        recentErrors: recent,
        lastCheckedAt: status.queriedAt
      }
    }),

  reset: () => set({ status: null, recentErrors: [], lastCheckedAt: null })
}))
