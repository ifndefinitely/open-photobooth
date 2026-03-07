import { useSessionStore } from '@/stores/sessionStore'
import styles from './ThumbnailFeedback.module.css'

function ThumbnailFeedback(): React.JSX.Element | null {
  const photos = useSessionStore((s) => s.photos)
  const phase = useSessionStore((s) => s.phase)

  // Show thumbnail briefly after flash phase, while in 'pause' or transitioning
  // The thumbnail renders based on the last captured photo existing
  // It auto-hides via CSS animation
  const lastPhoto = photos[photos.length - 1]

  if (!lastPhoto || phase === 'countdown' || phase === 'idle') {
    return null
  }

  return (
    <div key={photos.length} className={styles.thumbnail}>
      <img src={lastPhoto.dataUrl} alt={`Photo ${photos.length}`} className={styles.image} />
    </div>
  )
}

export default ThumbnailFeedback
