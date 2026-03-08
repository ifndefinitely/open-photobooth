import { useAppSettingsStore } from '../stores/appSettingsStore'
import en from './en.json'
import nl from './nl.json'

type TranslationMap = Record<string, string>

const locales: Record<string, TranslationMap> = { en, nl }

export function t(key: string, params?: Record<string, string | number>): string {
  const locale = useAppSettingsStore.getState().userLocale
  const map: TranslationMap = locales[locale] ?? locales.en
  let value = map[key] ?? locales.en[key] ?? key
  if (params) {
    value = value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
  }
  return value
}

export function useT(): typeof t {
  // Subscribe to locale changes so components re-render on locale switch
  useAppSettingsStore((s) => s.userLocale)
  return t
}

export function setLocale(locale: string): void {
  useAppSettingsStore.getState().setUserLocale(locale)
}

export function getLocale(): string {
  return useAppSettingsStore.getState().userLocale
}
