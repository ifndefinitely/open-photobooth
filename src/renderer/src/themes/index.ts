/**
 * Theme registry.
 *
 * Single source of truth for:
 *  - The set of available themes (id + human display name).
 *  - A palette snapshot for each theme, used by non-CSS consumers
 *    like `Apply theme to strip` (which copies colors into
 *    stripSettingsStore) and thumbnail generation.
 *
 * The actual token values still live in the theme CSS files
 * (drugstore.css / artDeco.css / wedding.css). This file is a
 * typed mirror of the subset that non-CSS code needs. When a value
 * changes in a CSS file, mirror the change here by hand.
 */

export type ThemeId = 'drugstore' | 'artDeco' | 'wedding'

export interface ThemeMetadata {
  id: ThemeId
  displayName: string
  /** Hex colors mirrored from the matching .css file. */
  palette: {
    bg: string
    surface: string
    text: string
    accent: string
    accentContrast: string
    border: string
  }
}

export const THEMES: readonly ThemeMetadata[] = [
  {
    id: 'drugstore',
    displayName: 'Drugstore',
    palette: {
      bg: '#1a1210',
      surface: '#2a1a15',
      text: '#faf3e7',
      accent: '#d32f2f',
      accentContrast: '#faf3e7',
      border: '#faf3e7'
    }
  },
  {
    id: 'artDeco',
    displayName: 'Art Deco',
    palette: {
      bg: '#0a0908',
      surface: '#141210',
      text: '#f6f0e4',
      accent: '#c9a646',
      accentContrast: '#0a0908',
      border: '#c9a646'
    }
  },
  {
    id: 'wedding',
    displayName: 'Elegant Wedding',
    palette: {
      bg: '#f4efe6',
      surface: '#ffffff',
      text: '#2a2622',
      accent: '#3a3532',
      accentContrast: '#ffffff',
      border: '#d4c9b8'
    }
  }
] as const

export function getTheme(id: string): ThemeMetadata | undefined {
  return THEMES.find((t) => t.id === id)
}

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value)
}
