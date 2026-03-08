import styles from './NumberStepper.module.css'

interface NumberStepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  disabled?: boolean
  description?: string
}

function NumberStepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  description
}: NumberStepperProps): React.JSX.Element {
  const atMin = value <= min
  const atMax = value >= max

  const decrement = (): void => {
    const next = value - step
    if (next >= min) onChange(next)
  }

  const increment = (): void => {
    const next = value + step
    if (next <= max) onChange(next)
  }

  return (
    <div className={`${styles.field}${disabled ? ` ${styles.disabled}` : ''}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={decrement}
          disabled={disabled || atMin}
          aria-label="Decrease"
        >
          -
        </button>
        <span className={styles.value}>{value}</span>
        <button
          type="button"
          className={styles.stepButton}
          onClick={increment}
          disabled={disabled || atMax}
          aria-label="Increase"
        >
          +
        </button>
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}

export default NumberStepper
