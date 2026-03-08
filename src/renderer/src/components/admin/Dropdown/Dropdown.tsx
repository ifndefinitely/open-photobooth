import styles from './Dropdown.module.css'

interface DropdownOption {
  label: string
  value: string
}

interface DropdownProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  disabled?: boolean
  description?: string
}

function Dropdown({
  label,
  value,
  onChange,
  options,
  disabled = false,
  description
}: DropdownProps): React.JSX.Element {
  const id = `dropdown-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className={`${styles.field}${disabled ? ` ${styles.disabled}` : ''}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}

export default Dropdown
