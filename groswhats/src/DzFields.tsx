import type { Language } from './types'
import { OFFICIAL_WILAYAS, matchWilayaCode, wilayaByCode } from './data/wilayas'
import { t } from './i18n'
import { formatDzPhoneInput } from './utils/format'

export function WilayaSelect({
  lang,
  value,
  onChange,
}: {
  lang: Language
  value: string
  onChange: (city: string) => void
}) {
  const matched = matchWilayaCode(value)
  const officialMatch = matched && Number(matched) <= 58 ? matched : null
  const extra = value.trim() && !officialMatch ? value.trim() : ''

  return (
    <select
      value={officialMatch ?? (extra ? '__extra__' : '')}
      onChange={(e) => {
        const next = e.target.value
        if (!next || next === '__extra__') {
          if (next !== '__extra__') onChange('')
          return
        }
        const w = wilayaByCode(next)
        onChange(w ? (lang === 'ar' ? w.nameAr : w.name) : next)
      }}
    >
      <option value="">{t(lang, 'wilayaPick')}</option>
      {extra ? <option value="__extra__">{extra}</option> : null}
      {OFFICIAL_WILAYAS.map((w) => (
        <option key={w.code} value={w.code}>
          {w.code} · {lang === 'ar' ? w.nameAr : w.name}
        </option>
      ))}
    </select>
  )
}

export function DzPhoneInput({
  value,
  onChange,
}: {
  value: string
  onChange: (phone: string) => void
}) {
  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="0555 12 34 56"
      value={value}
      onChange={(e) => onChange(formatDzPhoneInput(e.target.value))}
    />
  )
}
