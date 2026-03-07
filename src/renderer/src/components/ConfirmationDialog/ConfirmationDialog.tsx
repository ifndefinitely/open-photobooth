import styles from './ConfirmationDialog.module.css'

interface ConfirmationDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'default' | 'danger'
}

function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'default'
}: ConfirmationDialogProps): React.JSX.Element {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`${styles.confirmButton}${variant === 'danger' ? ` ${styles.confirmDanger}` : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationDialog
