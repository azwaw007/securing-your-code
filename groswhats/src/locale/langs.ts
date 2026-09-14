import type { Language } from '../types'
import { countryByCode } from '../data/countries'

export const ALL_LANGS: Language[] = [
  'fr',
  'ar',
  'darja',
  'en',
  'es',
  'tr',
  'it',
  'de',
]

export const LANG_LABEL: Record<Language, string> = {
  fr: 'Français',
  ar: 'العربية',
  darja: 'دارجة',
  en: 'English',
  es: 'Español',
  tr: 'Türkçe',
  it: 'Italiano',
  de: 'Deutsch',
}

export const LANG_SHORT: Record<Language, string> = {
  fr: 'FR',
  ar: 'ع',
  darja: 'DZ',
  en: 'EN',
  es: 'ES',
  tr: 'TR',
  it: 'IT',
  de: 'DE',
}

export function isRtl(lang: Language): boolean {
  return lang === 'ar' || lang === 'darja'
}

export function htmlLang(lang: Language): string {
  if (lang === 'darja') return 'ar-DZ'
  if (lang === 'ar') return 'ar'
  return lang
}

export function parseLanguage(raw: unknown, fallback: Language = 'fr'): Language {
  return ALL_LANGS.includes(raw as Language) ? (raw as Language) : fallback
}

/** Langues de l’app pour ce pays uniquement (défaut = première). */
export function suggestedLangs(countryCode: string): Language[] {
  const langs = countryByCode(countryCode).langs
  return langs.length > 0 ? langs : ['fr']
}

export function defaultLang(countryCode: string): Language {
  return suggestedLangs(countryCode)[0]
}

export function langInCountry(lang: Language, countryCode: string): boolean {
  return suggestedLangs(countryCode).includes(lang)
}

export function nextSuggestedLang(current: Language, countryCode: string): Language {
  const list = suggestedLangs(countryCode)
  const i = list.indexOf(current)
  return list[(i < 0 ? 0 : i + 1) % list.length]
}
