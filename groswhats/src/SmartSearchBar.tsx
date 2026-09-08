import { useMemo, useState } from 'react'
import type { Language } from './types'
import { t } from './i18n'
import { searchApp, suggestNames, type SearchHit } from './utils/smartSearch'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function shiftIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Barre de recherche + aide à l’écriture + calendrier (icône 📅) */
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
  const [calOpen, setCalOpen] = useState(Boolean(dateFrom || dateTo))
  const shown = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 8)
    return suggestions.slice(0, 10)
  }, [suggestions, value])

  const hasDates = Boolean(dateFrom || dateTo)

  function setPreset(preset: 'today' | 'yesterday' | 'week' | 'month' | 'clear') {
    if (preset === 'clear') {
      onDateFrom?.('')
      onDateTo?.('')
      return
    }
    if (preset === 'today') {
      const d = todayIso()
      onDateFrom?.(d)
      onDateTo?.(d)
      return
    }
    if (preset === 'yesterday') {
      const d = shiftIso(-1)
      onDateFrom?.(d)
      onDateTo?.(d)
      return
    }
    if (preset === 'week') {
      onDateFrom?.(shiftIso(-6))
      onDateTo?.(todayIso())
      return
    }
    onDateFrom?.(shiftIso(-29))
    onDateTo?.(todayIso())
  }

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
        {showCalendar ? (
          <button
            type="button"
            className={`smart-cal-btn ${hasDates || calOpen ? 'active' : ''}`}
            onClick={() => setCalOpen((v) => !v)}
            title={t(lang, 'searchByDate')}
            aria-label={t(lang, 'searchByDate')}
          >
            📅
          </button>
        ) : null}
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
      {showCalendar && calOpen ? (
        <div className="smart-dates">
          <div className="smart-date-presets">
            <button type="button" className="chip" onClick={() => setPreset('today')}>
              {t(lang, 'filterToday')}
            </button>
            <button type="button" className="chip" onClick={() => setPreset('yesterday')}>
              {t(lang, 'filterYesterday')}
            </button>
            <button type="button" className="chip" onClick={() => setPreset('week')}>
              {t(lang, 'filterWeek')}
            </button>
            <button type="button" className="chip" onClick={() => setPreset('month')}>
              {t(lang, 'filterMonth')}
            </button>
            <button type="button" className="chip" onClick={() => setPreset('clear')}>
              {t(lang, 'filterAll')}
            </button>
          </div>
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
  onOpenHistory,
}: {
  state: import('./types').AppState
  lang: Language
  onHit: (hit: SearchHit) => void
  /** Ouvre l’historique avec filtre dates (icône calendrier) */
  onOpenHistory?: (from: string, to: string) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const hits = useMemo(() => searchApp(state, q, lang, 10), [state, q, lang])
  const writeHelp = useMemo(() => {
    const names = [
      ...state.products.map((p) => p.name),
      ...state.clients.map((c) => c.name),
      ...state.orders
        .filter((o) => o.invoiceNumber)
        .slice(0, 30)
        .map((o) => `N°${o.invoiceNumber}`),
      ...state.orders.map((o) => o.clientName).filter(Boolean),
      lang === 'ar' ? 'مخزون' : 'stock',
      lang === 'ar' ? 'زبون' : 'client',
      lang === 'ar' ? 'فاتورة' : 'facture',
      lang === 'ar' ? 'أرباح' : 'gains',
      lang === 'ar' ? 'بيع' : 'vente',
      lang === 'ar' ? 'سجل' : 'historique',
    ]
    return suggestNames(names, q, 10)
  }, [state, q, lang])

  function applyHistoryDates() {
    const from = dateFrom || todayIso()
    const to = dateTo || todayIso()
    onOpenHistory?.(from, to)
    setCalOpen(false)
  }

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
        <button
          type="button"
          className={`smart-cal-btn ${calOpen || dateFrom || dateTo ? 'active' : ''}`}
          onClick={() => setCalOpen((v) => !v)}
          title={t(lang, 'searchByDate')}
          aria-label={t(lang, 'searchByDate')}
        >
          📅
        </button>
      </div>
      {calOpen ? (
        <div className="smart-dates">
          <div className="muted" style={{ marginBottom: 6 }}>
            {t(lang, 'searchByDate')} — {t(lang, 'salesHistoryBtn')}
          </div>
          <div className="smart-date-presets">
            <button
              type="button"
              className="chip"
              onClick={() => {
                const d = todayIso()
                setDateFrom(d)
                setDateTo(d)
              }}
            >
              {t(lang, 'filterToday')}
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                const d = shiftIso(-1)
                setDateFrom(d)
                setDateTo(d)
              }}
            >
              {t(lang, 'filterYesterday')}
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                setDateFrom(shiftIso(-6))
                setDateTo(todayIso())
              }}
            >
              {t(lang, 'filterWeek')}
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                setDateFrom(shiftIso(-29))
                setDateTo(todayIso())
              }}
            >
              {t(lang, 'filterMonth')}
            </button>
          </div>
          <label className="smart-date">
            <span>📅 {t(lang, 'dateFrom')}</span>
            <input
              type="date"
              value={dateFrom || ''}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="smart-date">
            <span>📅 {t(lang, 'dateTo')}</span>
            <input
              type="date"
              value={dateTo || ''}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <button type="button" className="btn block" onClick={applyHistoryDates}>
            📅 {t(lang, 'salesHistoryBtn')}
          </button>
        </div>
      ) : null}
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
      {open && (!q.trim() || hits.length === 0) && writeHelp.length > 0 ? (
        <div className="smart-suggest">
          {writeHelp.map((s) => (
            <button
              key={s}
              type="button"
              className="smart-suggest-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setQ(s)}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {open && q.trim() && hits.length === 0 && writeHelp.length === 0 ? (
        <div className="smart-suggest">
          <div className="smart-suggest-empty">{t(lang, 'noSearchHit')}</div>
        </div>
      ) : null}
    </div>
  )
}

export { suggestNames }
