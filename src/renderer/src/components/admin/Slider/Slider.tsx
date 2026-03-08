import styles from './Slider.module.css'

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  disabled?: boolean
  description?: string
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  description
}: SliderProps): React.JSX.Element {
  const id = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className={`${styles.field}${disabled ? ` ${styles.disabled}` : ''}`}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <span className={styles.value}>{value}</span>
      </div>
      <input
        id={id}
        type="range"
        className={styles.slider}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}

export default Slider
