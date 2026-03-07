import { useSessionSettingsStore } from '@/stores/sessionSettingsStore'
import styles from './PhotoSessionSection.module.css'

function PhotoSessionSection(): React.JSX.Element {
  const photoCount = useSessionSettingsStore((s) => s.photoCount)
  const countdownDuration = useSessionSettingsStore((s) => s.countdownDuration)
  const flashEffect = useSessionSettingsStore((s) => s.flashEffect)
  const setPhotoCount = useSessionSettingsStore((s) => s.setPhotoCount)
  const setCountdownDuration = useSessionSettingsStore((s) => s.setCountdownDuration)
  const setFlashEffect = useSessionSettingsStore((s) => s.setFlashEffect)

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Photo Session</h2>

      <div className={styles.controls}>
        {/* Number of photos per session */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="session-photo-count">
            Number of photos
          </label>
          <select
            id="session-photo-count"
            className={styles.select}
            value={photoCount}
            onChange={(e) => setPhotoCount(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Countdown duration */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="session-countdown-duration">
            Countdown duration (seconds)
          </label>
          <select
            id="session-countdown-duration"
            className={styles.select}
            value={countdownDuration}
            onChange={(e) => setCountdownDuration(Number(e.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </div>

        {/* Flash effect toggle */}
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={flashEffect}
              onChange={(e) => setFlashEffect(e.target.checked)}
            />
            Flash effect on capture
          </label>
        </div>
      </div>
    </div>
  )
}

export default PhotoSessionSection
