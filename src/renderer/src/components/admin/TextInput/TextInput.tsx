import styles from './TextInput.module.css'

interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  type?: 'text' | 'password'
  disabled?: boolean
  description?: string
  error?: string
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  disabled = false,
  description,
  error
}: TextInputProps): React.JSX.Element {
  const id = `textinput-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className={`${styles.field}${disabled ? ` ${styles.disabled}` : ''}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={`${styles.input}${error ? ` ${styles.inputError}` : ''}`}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className={styles.error}>{error}</p>}
      {description && !error && <p className={styles.description}>{description}</p>}
    </div>
  )
}

export default TextInput
