import { create } from 'zustand'
import { useNavigationStore } from './navigationStore'

export interface ErrorAction {
  labelKey: string
  handler: () => void
}

interface ShowErrorOptions {
  titleKey?: string
  messageKey?: string
  debugInfo?: string
  actions?: ErrorAction[]
}

interface ErrorState {
  titleKey: string
  messageKey: string
  debugInfo: string | null
  actions: ErrorAction[]
  hasError: boolean

  showError: (options?: ShowErrorOptions) => void
  clearError: () => void
}

const initialState = {
  titleKey: 'error.title',
  messageKey: 'error.generic',
  debugInfo: null as string | null,
  actions: [] as ErrorAction[],
  hasError: false
}

export const useErrorStore = create<ErrorState>((set) => ({
  ...initialState,

  showError: (options) => {
    set({
      titleKey: options?.titleKey ?? 'error.title',
      messageKey: options?.messageKey ?? 'error.generic',
      debugInfo: options?.debugInfo ?? null,
      actions: options?.actions ?? [],
      hasError: true
    })
    useNavigationStore.getState().navigateTo('error')
  },

  clearError: () => set(initialState)
}))
