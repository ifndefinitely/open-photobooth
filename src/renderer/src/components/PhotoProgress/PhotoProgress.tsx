import { useSessionStore } from '@/stores/sessionStore'
import { useSessionSettingsStore } from '@/stores/sessionSettingsStore'
import styles from './PhotoProgress.module.css'

function PhotoProgress(): React.JSX.Element {
  const currentPhotoIndex = useSessionStore((s) => s.currentPhotoIndex)
  const photosCount = useSessionStore((s) => s.photos.length)
  const photoCount = useSessionSettingsStore((s) => s.photoCount)

  return (
    <div className={styles.container}>
      <div className={styles.dots}>
        {Array.from({ length: photoCount }, (_, i) => {
          let dotClass = styles.dotUpcoming
          if (i < photosCount) {
            dotClass = styles.dotCaptured
          } else if (i === currentPhotoIndex) {
            dotClass = styles.dotCurrent
          }
          return <span key={i} className={dotClass} />
        })}
      </div>
      <span className={styles.label}>
        Photo {currentPhotoIndex + 1} of {photoCount}
      </span>
    </div>
  )
}

export default PhotoProgress
