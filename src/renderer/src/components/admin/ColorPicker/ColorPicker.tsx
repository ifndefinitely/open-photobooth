import styles from './ColorPicker.module.css'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  description?: string
}

function ColorPicker({
  label,
  value,
  onChange,
  disabled = false,
  description
}: ColorPickerProps): React.JSX.Element {
  const id = `color-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className={`${styles.field}${disabled ? ` ${styles.disabled}` : ''}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.pickerRow}>
        <input
          id={id}
          type="color"
          className={styles.colorInput}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className={styles.hexValue}>{value.toUpperCase()}</span>
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}

export default ColorPicker
