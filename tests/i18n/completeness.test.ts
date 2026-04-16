import { describe, it, expect } from 'vitest'
import en from '@/i18n/en.json'
import nl from '@/i18n/nl.json'

describe('i18n completeness', () => {
  it('has every en.json key in nl.json', () => {
    const enKeys = Object.keys(en)
    const nlKeys = new Set(Object.keys(nl))
    const missing = enKeys.filter((k) => !nlKeys.has(k))
    expect(missing).toEqual([])
  })

  it('has every nl.json key in en.json (no orphans)', () => {
    const nlKeys = Object.keys(nl)
    const enKeys = new Set(Object.keys(en))
    const orphans = nlKeys.filter((k) => !enKeys.has(k))
    expect(orphans).toEqual([])
  })

  const requiredNewKeys = [
    'printer.status.warmingUp',
    'printer.status.printing',
    'printer.status.verifying',
    'printer.status.retrying',
    'printer.error.title',
    'printer.error.paperOut',
    'printer.error.paperJam',
    'printer.error.offline',
    'printer.error.needsAttention',
    'printer.error.verificationTimeout',
    'printer.error.stalledInSpooler',
    'printer.error.buttonRetry',
    'printer.error.buttonSkip',
    'printer.error.buttonAdmin',
    'home.printer.unavailable.halt',
    'home.printer.unavailable.captureOnly',
    'review.button.saveOnly',
    'thankyou.title.saved',
    'thankyou.subtitle.saved'
  ]

  it.each(requiredNewKeys)('en.json has key %s', (key) => {
    expect(en as Record<string, string>).toHaveProperty(key)
  })

  it.each(requiredNewKeys)('nl.json has key %s', (key) => {
    expect(nl as Record<string, string>).toHaveProperty(key)
  })
})
