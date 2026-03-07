import { describe, it, expect, beforeEach } from 'vitest'
import { useNavigationStore } from '@/stores/navigationStore'
import type { ScreenName } from '@/stores/types'

describe('navigationStore', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset()
  })

  it('starts on the home screen', () => {
    const { currentScreen, previousScreen } = useNavigationStore.getState()
    expect(currentScreen).toBe('home')
    expect(previousScreen).toBeNull()
  })

  it('navigates to a valid screen', () => {
    useNavigationStore.getState().navigateTo('session')
    const { currentScreen, previousScreen } = useNavigationStore.getState()
    expect(currentScreen).toBe('session')
    expect(previousScreen).toBe('home')
  })

  it('tracks previous screen through multiple navigations', () => {
    const { navigateTo } = useNavigationStore.getState()
    navigateTo('session')
    navigateTo('review')
    const { currentScreen, previousScreen } = useNavigationStore.getState()
    expect(currentScreen).toBe('review')
    expect(previousScreen).toBe('session')
  })

  it('falls back to home for invalid screen names', () => {
    useNavigationStore.getState().navigateTo('nonexistent' as ScreenName)
    expect(useNavigationStore.getState().currentScreen).toBe('home')
  })

  it('navigates to all valid screens', () => {
    const screens: ScreenName[] = [
      'home',
      'session',
      'review',
      'print',
      'admin',
      'error',
      'thankyou'
    ]
    for (const screen of screens) {
      useNavigationStore.getState().navigateTo(screen)
      expect(useNavigationStore.getState().currentScreen).toBe(screen)
    }
  })

  it('goHome() navigates to home from any screen', () => {
    useNavigationStore.getState().navigateTo('review')
    useNavigationStore.getState().goHome()
    const { currentScreen, previousScreen } = useNavigationStore.getState()
    expect(currentScreen).toBe('home')
    expect(previousScreen).toBe('review')
  })

  it('reset() restores initial state', () => {
    useNavigationStore.getState().navigateTo('admin')
    useNavigationStore.getState().reset()
    const { currentScreen, previousScreen } = useNavigationStore.getState()
    expect(currentScreen).toBe('home')
    expect(previousScreen).toBeNull()
  })
})
