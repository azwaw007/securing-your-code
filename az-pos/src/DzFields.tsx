import type { Language } from './types'
import { isRtl } from './locale/langs'
import { cityLabel } from './locale/adapt'
import { countryByCode } from './data/countries'
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
        onChange(w ? (isRtl(lang) ? w.nameAr : w.name) : next)
      }}
    >
      <option value="">{t(lang, 'wilayaPick')}</option>
      {extra ? <option value="__extra__">{extra}</option> : null}
      {OFFICIAL_WILAYAS.map((w) => (
        <option key={w.code} value={w.code}>
          {w.code} · {isRtl(lang) ? w.nameAr : w.name}
        </option>
      ))}
    </select>
  )
}

export function DzPhoneInput({
  value,
  onChange,
  countryCode = 'DZ',
  placeholder,
}: {
  value: string
  onChange: (phone: string) => void
  countryCode?: string
  placeholder?: string
}) {
  const hint = placeholder || (countryCode === 'DZ' ? '0555 12 34 56' : undefined)
  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={hint}
      value={value}
      onChange={(e) =>
        onChange(
          countryCode === 'DZ' ? formatDzPhoneInput(e.target.value) : e.target.value,
        )
      }
    />
  )
}

export function CityField({
  lang,
  countryCode,
  value,
  onChange,
}: {
  lang: Language
  countryCode: string
  value: string
  onChange: (city: string) => void
}) {
  return (
    <div className="field">
      <label>{cityLabel(countryCode, lang)}</label>
      {countryCode === 'DZ' ? (
        <WilayaSelect lang={lang} value={value} onChange={onChange} />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={countryByCode(countryCode).cityLabelFr}
        />
      )}
    </div>
  )
}
