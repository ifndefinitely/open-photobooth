import { useSessionSettingsStore } from '@/stores/sessionSettingsStore'
import { NumberStepper, Dropdown, Toggle } from '@/components/admin'
import styles from './PhotoSessionSection.module.css'

const COUNTDOWN_OPTIONS = [
  { label: '1 second', value: '1' },
  { label: '2 seconds', value: '2' },
  { label: '3 seconds', value: '3' },
  { label: '5 seconds', value: '5' }
]

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
        <NumberStepper
          label="Number of photos"
          value={photoCount}
          onChange={setPhotoCount}
          min={1}
          max={6}
        />

        <Dropdown
          label="Countdown duration"
          value={String(countdownDuration)}
          onChange={(v) => setCountdownDuration(Number(v))}
          options={COUNTDOWN_OPTIONS}
        />

        <Toggle label="Flash effect on capture" value={flashEffect} onChange={setFlashEffect} />

        <p className={styles.note}>Changes will take effect for the next photo session.</p>
      </div>
    </div>
  )
}

export default PhotoSessionSection
