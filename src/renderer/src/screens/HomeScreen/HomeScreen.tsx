import { useNavigationStore } from '@/stores/navigationStore'
import styles from './HomeScreen.module.css'

function HomeScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)

  return (
    <div className={styles.container}>
      <div className={styles.preview}>Camera Preview</div>
      <div className={styles.buttonArea}>
        <button className={styles.takePhotosButton} onClick={() => navigateTo('session')}>
          Take Photos
        </button>
      </div>
    </div>
  )
}

export default HomeScreen
