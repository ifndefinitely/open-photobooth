import styles from './FilePicker.module.css'

interface FilePickerProps {
  label: string
  value: string
  onChange: (path: string) => void
  accept?: string[]
  showRemove?: boolean
  disabled?: boolean
  description?: string
}

function FilePicker({
  label,
  value,
  onChange,
  accept,
  showRemove = true,
  disabled = false,
  description
}: FilePickerProps): React.JSX.Element {
  const filename = value ? (value.split(/[\\/]/).pop() ?? value) : ''

  const handleBrowse = async (): Promise<void> => {
    const filters = accept
      ? [{ name: 'Allowed files', extensions: accept.map((ext) => ext.replace(/^\./, '')) }]
      : undefined
    const result = await window.api.settings.selectFile({ filters })
    if (result) {
      onChange(result)
    }
  }

  return (
    <div className={`${styles.field}${disabled ? ` ${styles.disabled}` : ''}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.browseButton}
          onClick={handleBrowse}
          disabled={disabled}
        >
          Browse...
        </button>
        <span className={styles.filename}>{filename || 'No file selected'}</span>
        {showRemove && value && (
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => onChange('')}
            disabled={disabled}
          >
            Remove
          </button>
        )}
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}

export default FilePicker
