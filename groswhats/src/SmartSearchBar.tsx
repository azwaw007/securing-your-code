import { useMemo, useState } from 'react'
import type { Language } from './types'
import { t } from './i18n'
import { searchApp, suggestNames, type SearchHit } from './utils/smartSearch'

/** Barre de recherche + suggestions (aide à l’écriture) */
export function SmartSearchBar({
  lang,
  value,
  onChange,
  placeholder,
  suggestions,
  onPickSuggestion,
  showCalendar,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
}: {
  lang: Language
  value: string
  onChange: (v: string) => void
  placeholder: string
  suggestions: string[]
  onPickSuggestion?: (s: string) => void
  showCalendar?: boolean
  dateFrom?: string
  dateTo?: string
  onDateFrom?: (v: string) => void
  onDateTo?: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const shown = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 6)
    return suggestions.slice(0, 8)
  }, [suggestions, value])

  return (
    <div className="smart-search">
      <div className="smart-search-row">
        <span className="smart-search-icon" aria-hidden>
          🔍
        </span>
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            className="smart-search-clear"
            onClick={() => onChange('')}
            aria-label="clear"
          >
            ×
          </button>
        ) : null}
      </div>
      {open && shown.length > 0 ? (
        <div className="smart-suggest">
          {shown.map((s) => (
            <button
              key={s}
              type="button"
              className="smart-suggest-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s)
                onPickSuggestion?.(s)
                setOpen(false)
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {showCalendar ? (
        <div className="smart-dates">
          <label className="smart-date">
            <span>📅 {t(lang, 'dateFrom')}</span>
            <input
              type="date"
              value={dateFrom || ''}
              onChange={(e) => onDateFrom?.(e.target.value)}
            />
          </label>
          <label className="smart-date">
            <span>📅 {t(lang, 'dateTo')}</span>
            <input
              type="date"
              value={dateTo || ''}
              onChange={(e) => onDateTo?.(e.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export function GlobalSmartSearch({
  state,
  lang,
  onHit,
}: {
  state: import('./types').AppState
  lang: Language
  onHit: (hit: SearchHit) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const hits = useMemo(() => searchApp(state, q, lang, 10), [state, q, lang])

  return (
    <div className="smart-search global">
      <div className="smart-search-row">
        <span className="smart-search-icon" aria-hidden>
          🔍
        </span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          placeholder={t(lang, 'homeSearchHint')}
          autoComplete="off"
        />
      </div>
      {open && q.trim() && hits.length > 0 ? (
        <div className="smart-suggest">
          {hits.map((h) => (
            <button
              key={h.id}
              type="button"
              className="smart-suggest-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onHit(h)
                setQ('')
                setOpen(false)
              }}
            >
              <strong>
                {h.kind === 'product'
                  ? '📦 '
                  : h.kind === 'client'
                    ? '👤 '
                    : h.kind === 'invoice'
                      ? '🧾 '
                      : '➡️ '}
                {h.label}
              </strong>
              {h.hint ? <span className="muted"> · {h.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {open && q.trim() && hits.length === 0 ? (
        <div className="smart-suggest">
          <div className="smart-suggest-empty">{t(lang, 'noSearchHit')}</div>
        </div>
      ) : null}
    </div>
  )
}

export { suggestNames }
