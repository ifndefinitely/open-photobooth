import { useNavigationStore } from '@/stores/navigationStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import IdleCountdown from '@/components/IdleCountdown/IdleCountdown'
import styles from '@/styles/placeholder.module.css'

function ThankYouScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)
  const { remainingSeconds } = useIdleTimeout({ onTimeout: goHome })

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Thank You!</h1>
      <p className={styles.subtitle}>Your photo strip is printing. Enjoy!</p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={goHome}>
          Back to Home
        </button>
      </div>
      {remainingSeconds !== null && <IdleCountdown remainingSeconds={remainingSeconds} />}
    </div>
  )
}

export default ThankYouScreen
