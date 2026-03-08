import { useSessionStore } from '@/stores/sessionStore'
import { useT } from '@/i18n'
import styles from './GetReadyOverlay.module.css'

function GetReadyOverlay(): React.JSX.Element | null {
  const phase = useSessionStore((s) => s.phase)
  const t = useT()

  if (phase !== 'pause') {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.text}>{t('session.getReady')}</div>
    </div>
  )
}

export default GetReadyOverlay
