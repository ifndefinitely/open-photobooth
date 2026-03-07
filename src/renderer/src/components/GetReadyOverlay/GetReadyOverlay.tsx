import { useSessionStore } from '@/stores/sessionStore'
import styles from './GetReadyOverlay.module.css'

function GetReadyOverlay(): React.JSX.Element | null {
  const phase = useSessionStore((s) => s.phase)

  if (phase !== 'pause') {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.text}>Get Ready!</div>
    </div>
  )
}

export default GetReadyOverlay
