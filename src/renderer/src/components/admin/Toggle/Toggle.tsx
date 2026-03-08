import styles from './Toggle.module.css'

interface ToggleProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  description?: string
}

function Toggle({
  label,
  value,
  onChange,
  disabled = false,
  description
}: ToggleProps): React.JSX.Element {
  const id = `toggle-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className={`${styles.field}${disabled ? ` ${styles.disabled}` : ''}`}>
      <div className={styles.row}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={value}
          className={`${styles.track}${value ? ` ${styles.trackOn}` : ''}`}
          onClick={() => onChange(!value)}
          disabled={disabled}
        >
          <span className={`${styles.thumb}${value ? ` ${styles.thumbOn}` : ''}`} />
        </button>
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}

export default Toggle
