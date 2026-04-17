import { describe, it, expect, afterEach } from 'vitest'
import { usePrinterSettingsStore } from '@/stores/printerSettingsStore'

describe('printerSettingsStore — reliability settings', () => {
  afterEach(() => {
    // Reset to defaults after mutations so other tests see a clean store
    usePrinterSettingsStore.setState({
      preflightTimeout: 10,
      verificationTimeout: 90,
      verificationPollInterval: 2,
      autoRetryOnce: true,
      offlineBehaviour: 'captureOnly',
      healthPollInterval: 10
    })
  })

  it('exposes defaults for the new reliability settings', () => {
    const s = usePrinterSettingsStore.getState()
    expect(s.preflightTimeout).toBe(10)
    expect(s.verificationTimeout).toBe(90)
    expect(s.verificationPollInterval).toBe(2)
    expect(s.autoRetryOnce).toBe(true)
    expect(s.offlineBehaviour).toBe('captureOnly')
    expect(s.healthPollInterval).toBe(5)
  })

  it('setters update the respective fields', () => {
    const s = usePrinterSettingsStore.getState()
    s.setPreflightTimeout(15)
    s.setVerificationTimeout(120)
    s.setVerificationPollInterval(3)
    s.setAutoRetryOnce(false)
    s.setOfflineBehaviour('halt')
    s.setHealthPollInterval(30)

    const after = usePrinterSettingsStore.getState()
    expect(after.preflightTimeout).toBe(15)
    expect(after.verificationTimeout).toBe(120)
    expect(after.verificationPollInterval).toBe(3)
    expect(after.autoRetryOnce).toBe(false)
    expect(after.offlineBehaviour).toBe('halt')
    expect(after.healthPollInterval).toBe(30)
  })
})
