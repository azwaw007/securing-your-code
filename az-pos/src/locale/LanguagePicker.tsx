import type { Language } from '../types'
import { t } from '../i18n'
import { LANG_LABEL, suggestedLangs } from './langs'

export function LanguagePicker({
  lang,
  value,
  countryCode,
  onChange,
}: {
  lang: Language
  value: Language
  countryCode?: string
  onChange: (l: Language) => void
}) {
  const order = suggestedLangs(countryCode || 'DZ')
  return (
    <div className="btn-row" style={{ flexWrap: 'wrap' }}>
      {order.map((id) => (
        <button
          key={id}
          type="button"
          className={`btn ${value === id ? '' : 'ghost'}`}
          onClick={() => onChange(id)}
        >
          {t(lang, `lang_${id}`) || LANG_LABEL[id]}
        </button>
      ))}
    </div>
  )
}
