import type { ThemeId } from '@/themes'
import styles from './ThemePreviewPane.module.css'

interface ThemePreviewPaneProps {
  themeId: ThemeId
}

/**
 * Scoped live preview of a theme.
 *
 * Wraps the mock content in <div data-theme={themeId}>, which re-scopes
 * every var(--color-*) / var(--font-*) / var(--button-radius) lookup
 * inside it to that theme. The admin UI around this div keeps its own
 * neutral --admin-* palette.
 *
 * The mock intentionally does NOT reuse the real HomeScreen component —
 * HomeScreen depends on navigation, camera state, and the idle-timeout
 * hook, none of which belong in an admin preview pane. Instead it shows
 * the essential visual ingredients: background, heading in --font-display,
 * a primary button, and muted supporting text. That's enough to convey
 * what each theme feels like without the coupling risk.
 */
function ThemePreviewPane({ themeId }: ThemePreviewPaneProps): React.JSX.Element {
  return (
    <div className={styles.frame}>
      <div className={styles.scope} data-theme={themeId}>
        <div className={styles.stage}>
          <h1 className={styles.heading}>Take Your Photos</h1>
          <p className={styles.subheading}>Tap the button to start</p>
          <button type="button" className={styles.primaryButton}>
            START
          </button>
          <p className={styles.footer}>Powered by Open Photobooth</p>
        </div>
      </div>
    </div>
  )
}

export default ThemePreviewPane
