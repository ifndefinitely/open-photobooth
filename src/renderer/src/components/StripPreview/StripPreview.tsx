import styles from './StripPreview.module.css'

interface StripPreviewProps {
  dataUrl: string | null
  isLoading: boolean
}

function StripPreview({ dataUrl, isLoading }: StripPreviewProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}
      {dataUrl && (
        <img
          src={dataUrl}
          alt="Photo strip preview"
          className={styles.stripImage}
          draggable={false}
        />
      )}
      {!dataUrl && !isLoading && <div className={styles.placeholder}>Generating strip...</div>}
    </div>
  )
}

export default StripPreview
