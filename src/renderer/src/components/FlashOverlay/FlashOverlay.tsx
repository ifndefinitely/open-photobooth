import { useSessionStore } from '@/stores/sessionStore'
import { useSessionSettingsStore } from '@/stores/sessionSettingsStore'
import styles from './FlashOverlay.module.css'

function FlashOverlay(): React.JSX.Element | null {
  const phase = useSessionStore((s) => s.phase)
  const flashEffect = useSessionSettingsStore((s) => s.flashEffect)

  if (phase !== 'flash' || !flashEffect) {
    return null
  }

  return <div className={styles.flash} />
}

export default FlashOverlay
