import { useNavigationStore } from '@/stores/navigationStore'
import styles from '@/styles/placeholder.module.css'

function ErrorScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.subtitle}>
        Placeholder — detailed error messages will be added in Epic 11
      </p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={goHome}>
          Back to Home
        </button>
      </div>
    </div>
  )
}

export default ErrorScreen
