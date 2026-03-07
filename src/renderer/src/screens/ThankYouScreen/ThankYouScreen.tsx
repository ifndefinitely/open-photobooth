import { useNavigationStore } from '@/stores/navigationStore'
import styles from '@/styles/placeholder.module.css'

function ThankYouScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Thank You!</h1>
      <p className={styles.subtitle}>Your photo strip is printing. Enjoy!</p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={goHome}>
          Back to Home
        </button>
      </div>
    </div>
  )
}

export default ThankYouScreen
