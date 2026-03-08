import { useState } from 'react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { TextInput } from '@/components/admin'
import styles from './PinSection.module.css'

function PinSection(): React.JSX.Element {
  const pinCode = useAppSettingsStore((s) => s.pinCode)
  const setPinCode = useAppSettingsStore((s) => s.setPinCode)

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({})
  const [success, setSuccess] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const clearForm = (): void => {
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setErrors({})
  }

  const handleChangePin = (): void => {
    setSuccess(null)
    const newErrors: typeof errors = {}

    if (currentPin !== pinCode) {
      newErrors.current = 'Incorrect current PIN.'
    }

    if (!/^\d{4}$/.test(newPin)) {
      newErrors.new = 'PIN must be exactly 4 digits.'
    }

    if (newPin !== confirmPin) {
      newErrors.confirm = 'PINs do not match.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setPinCode(newPin)
    clearForm()
    setSuccess('PIN changed successfully')
  }

  const handleResetToDefault = (): void => {
    setPinCode('0000')
    clearForm()
    setShowResetConfirm(false)
    setSuccess('PIN reset to default (0000)')
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>PIN</h2>

      <div className={styles.controls}>
        {success && <p className={styles.success}>{success}</p>}

        <TextInput
          label="Current PIN"
          value={currentPin}
          onChange={(v) => {
            setCurrentPin(v.replace(/\D/g, '').slice(0, 4))
            setErrors((prev) => ({ ...prev, current: undefined }))
            setSuccess(null)
          }}
          type="password"
          maxLength={4}
          error={errors.current}
        />

        <TextInput
          label="New PIN"
          value={newPin}
          onChange={(v) => {
            setNewPin(v.replace(/\D/g, '').slice(0, 4))
            setErrors((prev) => ({ ...prev, new: undefined }))
            setSuccess(null)
          }}
          type="password"
          maxLength={4}
          error={errors.new}
        />

        <TextInput
          label="Confirm New PIN"
          value={confirmPin}
          onChange={(v) => {
            setConfirmPin(v.replace(/\D/g, '').slice(0, 4))
            setErrors((prev) => ({ ...prev, confirm: undefined }))
            setSuccess(null)
          }}
          type="password"
          maxLength={4}
          error={errors.confirm}
        />

        <div className={styles.actions}>
          <button type="button" className={styles.changePinButton} onClick={handleChangePin}>
            Change PIN
          </button>

          {!showResetConfirm ? (
            <button
              type="button"
              className={styles.resetButton}
              onClick={() => setShowResetConfirm(true)}
            >
              Reset to Default
            </button>
          ) : (
            <div className={styles.confirmRow}>
              <span className={styles.confirmText}>Reset PIN to 0000?</span>
              <button type="button" className={styles.confirmYes} onClick={handleResetToDefault}>
                Yes, Reset
              </button>
              <button
                type="button"
                className={styles.confirmNo}
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PinSection
