import { useEffect, useState } from 'react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { Toggle, Dropdown, TextInput } from '@/components/admin'
import styles from './KioskSection.module.css'

const IDLE_TIMEOUT_OPTIONS = [
  { label: '30 seconds', value: '30' },
  { label: '60 seconds', value: '60' },
  { label: '90 seconds', value: '90' },
  { label: '120 seconds', value: '120' },
  { label: 'Disabled', value: '0' }
]

function KioskSection(): React.JSX.Element {
  const [logPath, setLogPath] = useState('')

  useEffect(() => {
    window.api.logging
      .getLogPath()
      .then(setLogPath)
      .catch(() => {})
  }, [])

  const kioskAutoStart = useAppSettingsStore((s) => s.kioskAutoStart)
  const kioskPreventSleep = useAppSettingsStore((s) => s.kioskPreventSleep)
  const kioskPreventAltTab = useAppSettingsStore((s) => s.kioskPreventAltTab)
  const kioskFullscreenLock = useAppSettingsStore((s) => s.kioskFullscreenLock)
  const kioskIdleTimeout = useAppSettingsStore((s) => s.kioskIdleTimeout)

  const setKioskAutoStart = useAppSettingsStore((s) => s.setKioskAutoStart)
  const setKioskPreventSleep = useAppSettingsStore((s) => s.setKioskPreventSleep)
  const setKioskPreventAltTab = useAppSettingsStore((s) => s.setKioskPreventAltTab)
  const setKioskFullscreenLock = useAppSettingsStore((s) => s.setKioskFullscreenLock)
  const setKioskIdleTimeout = useAppSettingsStore((s) => s.setKioskIdleTimeout)

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Kiosk</h2>

      <div className={styles.controls}>
        <Toggle
          label="Auto-start on boot"
          value={kioskAutoStart}
          onChange={(enabled) => {
            if (enabled) {
              const confirmed = window.confirm(
                'The app will start automatically when this device boots. ' +
                  'Make sure all settings are configured correctly before enabling this.'
              )
              if (!confirmed) return
            }
            setKioskAutoStart(enabled)
          }}
          description="When enabled, the app will start automatically when this device boots up."
        />

        <Toggle
          label="Prevent sleep"
          value={kioskPreventSleep}
          onChange={setKioskPreventSleep}
          description="Keeps the screen on and prevents the device from sleeping."
        />

        <Toggle
          label="Prevent Alt-Tab / Taskbar"
          value={kioskPreventAltTab}
          onChange={setKioskPreventAltTab}
          description="Blocks users from switching away from the app. Ctrl+Alt+Delete still works for admin access."
        />

        <Toggle
          label="Fullscreen lock"
          value={kioskFullscreenLock}
          onChange={setKioskFullscreenLock}
          description="Forces the app to remain in fullscreen mode."
        />

        <Dropdown
          label="Idle timeout"
          value={String(kioskIdleTimeout)}
          onChange={(v) => setKioskIdleTimeout(Number(v))}
          options={IDLE_TIMEOUT_OPTIONS}
          description="Time before the app automatically returns to the home screen when no one interacts."
        />

        <TextInput
          label="Log file directory"
          value={logPath}
          onChange={() => {}}
          disabled
          description="Application logs are stored here. Share these files when reporting issues."
        />
      </div>
    </div>
  )
}

export default KioskSection
