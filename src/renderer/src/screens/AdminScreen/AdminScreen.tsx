import { useNavigationStore } from '@/stores/navigationStore'
import styles from '@/styles/placeholder.module.css'

function AdminScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Panel</h1>
      <p className={styles.subtitle}>Placeholder — admin settings will be added in Story 2.7</p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={goHome}>
          Exit Admin
        </button>
      </div>
    </div>
  )
}

export default AdminScreen
