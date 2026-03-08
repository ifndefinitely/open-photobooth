import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { Dropdown } from '@/components/admin'
import styles from './LanguageSection.module.css'

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Nederlands (Dutch)', value: 'nl' }
]

function LanguageSection(): React.JSX.Element {
  const userLocale = useAppSettingsStore((s) => s.userLocale)
  const setUserLocale = useAppSettingsStore((s) => s.setUserLocale)

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Language</h2>

      <div className={styles.controls}>
        <Dropdown
          label="User-facing language"
          value={userLocale}
          onChange={setUserLocale}
          options={LANGUAGE_OPTIONS}
        />

        <p className={styles.note}>
          This changes user-facing text only. Admin settings remain in English.
        </p>
      </div>
    </div>
  )
}

export default LanguageSection
