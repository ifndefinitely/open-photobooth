import { useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import ConfirmationDialog from '@/components/ConfirmationDialog/ConfirmationDialog'
import IdleCountdown from '@/components/IdleCountdown/IdleCountdown'
import styles from '@/styles/placeholder.module.css'

type ConfirmAction = 'redo' | 'abort' | null

function ReviewScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)
  const goHome = useNavigationStore((state) => state.goHome)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const { remainingSeconds } = useIdleTimeout({ onTimeout: goHome })

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Review Your Photos</h1>
      <p className={styles.subtitle}>Placeholder — photo strip preview will be added in Epic 05</p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={() => navigateTo('print')}>
          Print
        </button>
        <button className={styles.buttonSecondary} onClick={() => setConfirmAction('redo')}>
          Redo
        </button>
        <button className={styles.buttonDanger} onClick={() => setConfirmAction('abort')}>
          Start Over
        </button>
      </div>
      {confirmAction === 'redo' && (
        <ConfirmationDialog
          title="Redo Photos?"
          message="This will discard your current photos. Are you sure?"
          confirmLabel="Redo"
          cancelLabel="Cancel"
          onConfirm={() => navigateTo('session')}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'abort' && (
        <ConfirmationDialog
          title="Start Over?"
          message="This will discard your photos and return to the home screen. Are you sure?"
          confirmLabel="Start Over"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => navigateTo('home')}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {remainingSeconds !== null && <IdleCountdown remainingSeconds={remainingSeconds} />}
    </div>
  )
}

export default ReviewScreen
