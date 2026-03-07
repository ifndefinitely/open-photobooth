export type ScreenName = 'home' | 'session' | 'review' | 'print' | 'admin' | 'error' | 'thankyou'

export const VALID_SCREENS: readonly ScreenName[] = [
  'home',
  'session',
  'review',
  'print',
  'admin',
  'error',
  'thankyou'
] as const

export const DEFAULT_SCREEN: ScreenName = 'home'
