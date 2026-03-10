import { useErrorStore } from '@/stores/errorStore'
import { useAppRecovery } from '@/hooks/useAppRecovery'
import { useT } from '@/i18n'
import styles from './ErrorScreen.module.css'

function WarningIcon(): React.JSX.Element {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

interface ErrorScreenProps {
  onResetBoundary?: () => void
}

function ErrorScreen({ onResetBoundary }: ErrorScreenProps = {}): React.JSX.Element {
  const titleKey = useErrorStore((s) => s.titleKey)
  const messageKey = useErrorStore((s) => s.messageKey)
  const debugInfo = useErrorStore((s) => s.debugInfo)
  const actions = useErrorStore((s) => s.actions)
  const t = useT()

  const recover = useAppRecovery(onResetBoundary)

  // Use custom actions if provided, otherwise default "Back to Home"
  const displayActions =
    actions.length > 0 ? actions : [{ labelKey: 'error.backToHome', handler: recover }]

  return (
    <div className={styles.container}>
      <WarningIcon />
      <h1 className={styles.title}>{t(titleKey)}</h1>
      <p className={styles.message}>{t(messageKey)}</p>
      <p className={styles.cta}>{t('error.contactOwner')}</p>

      {debugInfo && (
        <details className={styles.details}>
          <summary className={styles.detailsSummary}>{t('error.debugDetails')}</summary>
          <pre className={styles.detailsContent}>{debugInfo}</pre>
        </details>
      )}

      <div className={styles.actions}>
        {displayActions.map((action) => (
          <button key={action.labelKey} className={styles.actionButton} onClick={action.handler}>
            {t(action.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ErrorScreen
