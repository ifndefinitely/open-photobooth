import { useSessionStore } from '@/stores/sessionStore'
import styles from './CountdownOverlay.module.css'

function CountdownOverlay(): React.JSX.Element | null {
  const phase = useSessionStore((s) => s.phase)
  const countdownValue = useSessionStore((s) => s.countdownValue)

  if (phase !== 'countdown' || countdownValue === null) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div key={countdownValue} className={styles.number}>
        {countdownValue}
      </div>
    </div>
  )
}

export default CountdownOverlay
