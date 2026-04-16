import { useNavigationStore } from '@/stores/navigationStore'
import { useCameraStore } from '@/stores/cameraStore'
import { useT } from '@/i18n'
import CameraPreview from '@/components/CameraPreview/CameraPreview'
import styles from './HomeScreen.module.css'

function HomeScreen(): React.JSX.Element {
  const navigateTo = useNavigationStore((state) => state.navigateTo)
  const cameraError = useCameraStore((s) => s.error)
  const cameraStream = useCameraStore((s) => s.stream)
  const cameraReady = cameraStream !== null && !cameraError
  const t = useT()

  return (
    <div className={styles.container}>
      <CameraPreview className={styles.preview} />
      <div className={styles.buttonArea}>
        <button
          className={styles.takePhotosButton}
          onClick={() => navigateTo('session')}
          disabled={!cameraReady}
        >
          {t('home.takePhotos')}
        </button>
      </div>
    </div>
  )
}

export default HomeScreen
