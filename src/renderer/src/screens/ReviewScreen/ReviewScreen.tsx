import { useNavigationStore } from '@/stores/navigationStore'
import styles from '@/styles/placeholder.module.css'

function ReviewScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Review Your Photos</h1>
      <p className={styles.subtitle}>Placeholder — photo strip preview will be added in Epic 05</p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={() => navigateTo('print')}>
          Print
        </button>
        <button className={styles.buttonSecondary} onClick={() => navigateTo('session')}>
          Redo
        </button>
        <button className={styles.buttonDanger} onClick={() => navigateTo('home')}>
          Start Over
        </button>
      </div>
    </div>
  )
}

export default ReviewScreen
