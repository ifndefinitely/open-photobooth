import { create } from 'zustand'
import { type ScreenName, DEFAULT_SCREEN, VALID_SCREENS } from './types'

interface NavigationState {
  currentScreen: ScreenName
  previousScreen: ScreenName | null
  navigateTo: (screen: ScreenName) => void
  goHome: () => void
  reset: () => void
}

const initialState = {
  currentScreen: DEFAULT_SCREEN,
  previousScreen: null as ScreenName | null
}

export const useNavigationStore = create<NavigationState>((set) => ({
  ...initialState,

  navigateTo: (screen) =>
    set((state) => {
      const target = VALID_SCREENS.includes(screen) ? screen : DEFAULT_SCREEN
      return {
        currentScreen: target,
        previousScreen: state.currentScreen
      }
    }),

  goHome: () =>
    set((state) => ({
      currentScreen: DEFAULT_SCREEN,
      previousScreen: state.currentScreen
    })),

  reset: () => set(initialState)
}))
