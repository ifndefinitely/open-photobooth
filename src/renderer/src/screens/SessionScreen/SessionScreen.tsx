import CameraPreview from '@/components/CameraPreview/CameraPreview'
import CountdownOverlay from '@/components/CountdownOverlay/CountdownOverlay'
import FlashOverlay from '@/components/FlashOverlay/FlashOverlay'
import ThumbnailFeedback from '@/components/ThumbnailFeedback/ThumbnailFeedback'
import PhotoProgress from '@/components/PhotoProgress/PhotoProgress'
import GetReadyOverlay from '@/components/GetReadyOverlay/GetReadyOverlay'
import { useSessionSequence } from '@/hooks/useSessionSequence'
import styles from './SessionScreen.module.css'

function SessionScreen(): React.JSX.Element {
  useSessionSequence()

  return (
    <div className={styles.container}>
      <CameraPreview className={styles.preview} />
      <PhotoProgress />
      <CountdownOverlay />
      <GetReadyOverlay />
      <FlashOverlay />
      <ThumbnailFeedback />
    </div>
  )
}

export default SessionScreen
