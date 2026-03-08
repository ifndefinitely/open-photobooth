import { useNavigationStore } from '@/stores/navigationStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useT } from '@/i18n'
import styles from '@/styles/placeholder.module.css'

function ErrorScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)
  const lastError = useSessionStore((state) => state.lastError)
  const clearError = useSessionStore((state) => state.setLastError)
  const t = useT()

  const handleGoHome = (): void => {
    clearError(null)
    goHome()
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{lastError?.message ?? t('error.title')}</h1>
      <p className={styles.subtitle}>{lastError?.details ?? t('error.generic')}</p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={handleGoHome}>
          {t('error.backToHome')}
        </button>
      </div>
    </div>
  )
}

export default ErrorScreen
