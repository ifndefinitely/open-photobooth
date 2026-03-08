import { useT } from '@/i18n'
import styles from './IdleCountdown.module.css'

interface IdleCountdownProps {
  remainingSeconds: number
}

function IdleCountdown({ remainingSeconds }: IdleCountdownProps): React.JSX.Element {
  const t = useT()
  return (
    <div className={styles.countdown}>{t('idle.returning', { seconds: remainingSeconds })}</div>
  )
}

export default IdleCountdown
