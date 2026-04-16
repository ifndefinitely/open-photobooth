import { useEffect } from 'react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { isThemeId } from '@/themes'

/**
 * Mirrors appSettingsStore.theme onto <html data-theme="...">.
 *
 * Mount once at the app root. The CSS cascade handles everything else:
 * per-theme :root[data-theme="X"] rules in themes/*.css win over the
 * defaults in tokens.css, instantly restyling the entire user-facing UI.
 *
 * If the stored value is not a recognized theme id (e.g., the settings
 * file was hand-edited with garbage), falls back to the default theme
 * (drugstore) rather than letting every token revert to its :root
 * default — which on a first-boot could look worse than the wrong theme.
 */
export function useThemeApplication(): void {
  const theme = useAppSettingsStore((s) => s.theme)

  useEffect(() => {
    const effectiveTheme = isThemeId(theme) ? theme : 'drugstore'
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }, [theme])
}
