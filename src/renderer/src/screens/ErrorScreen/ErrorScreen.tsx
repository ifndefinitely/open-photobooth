import { useNavigationStore } from '@/stores/navigationStore'
import { useSessionStore } from '@/stores/sessionStore'
import styles from '@/styles/placeholder.module.css'

function ErrorScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)
  const lastError = useSessionStore((state) => state.lastError)
  const clearError = useSessionStore((state) => state.setLastError)

  const handleGoHome = (): void => {
    clearError(null)
    goHome()
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{lastError?.message ?? 'Something went wrong'}</h1>
      <p className={styles.subtitle}>
        {lastError?.details ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={handleGoHome}>
          Back to Home
        </button>
      </div>
    </div>
  )
}

export default ErrorScreen
