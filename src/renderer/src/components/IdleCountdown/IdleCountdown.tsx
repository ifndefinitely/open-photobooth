import styles from './IdleCountdown.module.css'

interface IdleCountdownProps {
  remainingSeconds: number
}

function IdleCountdown({ remainingSeconds }: IdleCountdownProps): React.JSX.Element {
  return <div className={styles.countdown}>Returning to home in {remainingSeconds}s...</div>
}

export default IdleCountdown
