import { useNavigationStore } from '@/stores/navigationStore'
import styles from '@/styles/placeholder.module.css'

function SessionScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Photo Session</h1>
      <p className={styles.subtitle}>
        Placeholder — countdown and capture will be added in Epic 04
      </p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={() => navigateTo('review')}>
          Next → Review
        </button>
      </div>
    </div>
  )
}

export default SessionScreen
