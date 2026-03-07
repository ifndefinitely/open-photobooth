import { useNavigationStore } from '@/stores/navigationStore'
import styles from '@/styles/placeholder.module.css'

function PrintScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Printing...</h1>
      <p className={styles.subtitle}>Placeholder — print progress will be added in Epic 06</p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={() => navigateTo('thankyou')}>
          Next → Thank You
        </button>
      </div>
    </div>
  )
}

export default PrintScreen
