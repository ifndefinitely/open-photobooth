import { useNavigationStore } from '@/stores/navigationStore'
import { useStripStore } from '@/stores/stripStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import IdleCountdown from '@/components/IdleCountdown/IdleCountdown'
import styles from './ThankYouScreen.module.css'

function ThankYouScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)
  const stripResult = useStripStore((s) => s.stripResult)
  const { remainingSeconds } = useIdleTimeout({ onTimeout: goHome })

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Enjoy Your Photos!</h1>
      <p className={styles.subtitle}>Thank you for visiting our photobooth!</p>

      {stripResult?.dataUrl && (
        <img className={styles.stripPreview} src={stripResult.dataUrl} alt="Your photo strip" />
      )}

      <button className={styles.doneButton} onClick={goHome}>
        Done
      </button>

      {remainingSeconds !== null && <IdleCountdown remainingSeconds={remainingSeconds} />}
    </div>
  )
}

export default ThankYouScreen
