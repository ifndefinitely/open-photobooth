import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { THEMES, type ThemeId } from '@/themes'
import styles from './ThemePicker.module.css'

/**
 * Horizontal row of theme tiles. Clicking a tile persists the selection
 * via the appSettingsStore → useSettingsPersistence → settingsService path.
 *
 * Each tile is rendered inside a data-theme scope so it shows the actual
 * theme — no PNG thumbnails to maintain. Adding a new theme later is a
 * one-line registry change; the picker picks it up automatically.
 */
function ThemePicker(): React.JSX.Element {
  const selectedTheme = useAppSettingsStore((s) => s.theme)
  const setTheme = useAppSettingsStore((s) => s.setTheme)

  return (
    <div className={styles.wrapper}>
      <div className={styles.tileRow}>
        {THEMES.map((theme) => {
          const isSelected = theme.id === selectedTheme
          return (
            <button
              key={theme.id}
              type="button"
              className={`${styles.tile} ${isSelected ? styles.tileSelected : ''}`}
              onClick={() => setTheme(theme.id)}
              aria-pressed={isSelected}
              aria-label={`Select ${theme.displayName} theme`}
            >
              <div className={styles.tilePreview} data-theme={theme.id}>
                <div className={styles.tileStage}>
                  <div className={styles.tileHeading}>Aa</div>
                  <div className={styles.tileChip} />
                </div>
              </div>
              <div className={styles.tileLabel}>{theme.displayName}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ThemePicker

export type { ThemeId }
