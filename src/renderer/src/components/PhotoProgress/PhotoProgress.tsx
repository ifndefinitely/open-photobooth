import { useSessionStore } from '@/stores/sessionStore'
import { useSessionSettingsStore } from '@/stores/sessionSettingsStore'
import { useT } from '@/i18n'
import styles from './PhotoProgress.module.css'

function PhotoProgress(): React.JSX.Element {
  const currentPhotoIndex = useSessionStore((s) => s.currentPhotoIndex)
  const photosCount = useSessionStore((s) => s.photos.length)
  const photoCount = useSessionSettingsStore((s) => s.photoCount)
  const t = useT()

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
        {t('session.photoProgress', { current: currentPhotoIndex + 1, total: photoCount })}
      </span>
    </div>
  )
}

export default PhotoProgress
