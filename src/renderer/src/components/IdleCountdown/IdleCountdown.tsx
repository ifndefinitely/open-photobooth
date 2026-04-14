import { useT } from '@/i18n'
import styles from './IdleCountdown.module.css'

interface IdleCountdownProps {
  remainingSeconds: number
  variant?: 'fixed' | 'inline'
}

function IdleCountdown({
  remainingSeconds,
  variant = 'fixed'
}: IdleCountdownProps): React.JSX.Element {
  const t = useT()
  const className = variant === 'inline' ? styles.inline : styles.countdown
  return <div className={className}>{t('idle.returning', { seconds: remainingSeconds })}</div>
}

export default IdleCountdown
