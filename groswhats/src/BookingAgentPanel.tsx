import { useEffect, useMemo, useState } from 'react'
import type { AppState, Language } from './types'
import { t } from './i18n'
import {
  addAppointment,
  deleteAppointment,
  upcomingAppointments,
  updateAppointment,
} from './store'
import { metierPackFor } from './locale/metierPacks'
import { shopVocab } from './locale/adapt'
import { formatDa } from './utils/format'
import {
  evaluateBooking,
  parseLocalInput,
  suggestNearestSlots,
  toLocalInputValue,
  verdictReasons,
} from './booking/agent'
import {
  bookingPackFor,
  optionLabel,
  resourceLabel,
  type BookingSegment,
} from './booking/packs'

function formatWhen(iso: string, lang: Language): string {
  try {
    return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function segmentLabel(seg: BookingSegment | string, lang: Language): string {
  const key = `bookSeg_${seg}`
  const translated = t(lang, key)
  return translated === key ? seg : translated
}

export function BookingAgentPanel({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const family = metierPackFor(
    state.settings.domainId,
    state.settings.commerceMode,
  ).family
  const pack = bookingPackFor(family)
  const vocab = shopVocab(
    state.settings.commerceMode,
    lang,
    state.settings.domainId,
  )
  const upcoming = useMemo(() => upcomingAppointments(state, 24), [state])

  const [clientId, setClientId] = useState(state.clients[0]?.id ?? '')
  const [when, setWhen] = useState(() => {
    const d = new Date()
    d.setHours(Math.max(d.getHours() + 2, pack.openHour), 0, 0, 0)
    return toLocalInputValue(d)
  })
  const [duration, setDuration] = useState(String(pack.defaultDurationMin))
  const [options, setOptions] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(true)

  useEffect(() => {
    setDuration(String(pack.defaultDurationMin))
    setOptions([])
  }, [pack.family, pack.defaultDurationMin])

  const atDate = parseLocalInput(when)
  const durationMin = Math.max(15, Math.round(Number(duration) || pack.defaultDurationMin))

  const verdict = useMemo(() => {
    if (!atDate) return null
    return evaluateBooking(state, family, {
      at: atDate,
      durationMin,
      optionIds: options,
    })
  }, [state, family, atDate, durationMin, options])

  const liveAlts = useMemo(() => {
    if (!atDate) return []
    return suggestNearestSlots(state, family, {
      from: atDate,
      durationMin,
      optionIds: options,
      count: 6,
    })
  }, [state, family, atDate, durationMin, options])

  function toggleOpt(id: string) {
    setOptions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function applySlot(d: Date) {
    setWhen(toLocalInputValue(d))
  }

  function save() {
    if (!clientId) {
      onFlash(t(lang, 'bookNeedClient'))
      return
    }
    if (!atDate || !verdict) {
      onFlash(t(lang, 'bookBadDate'))
      return
    }
    if (verdict.decision === 'rejected') {
      onFlash(t(lang, 'bookRejected'))
      return
    }
    if (verdict.decision === 'proposed') {
      onFlash(t(lang, 'bookPickAlt'))
      return
    }
    const reason = verdictReasons(verdict, lang).join(' · ')
    onState(
      addAppointment(state, {
        clientId,
        at: atDate.toISOString(),
        note,
        durationMin: verdict.durationMin,
        optionIds: verdict.optionIds,
        segment: verdict.segment,
        quoteDa: verdict.quoteDa,
        agentDecision: 'accepted',
        agentReason: reason,
      }),
    )
    setNote('')
    setOptions([])
    onFlash(t(lang, 'bookSaved'))
  }

  const decisionClass =
    verdict?.decision === 'accepted'
      ? 'book-verdict is-ok'
      : verdict?.decision === 'proposed'
        ? 'book-verdict is-propose'
        : 'book-verdict is-reject'

  return (
    <div className="card booking-agent">
      <div className="booking-agent-head">
        <div>
          <h2 style={{ margin: 0 }}>{t(lang, 'bookTitle')}</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {t(lang, 'bookHint').replace(
              '{resource}',
              resourceLabel(pack, lang),
            )}
          </p>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t(lang, 'hideDetails') : t(lang, 'bookNew')}
        </button>
      </div>

      {showForm ? (
        <div className="booking-agent-form">
          <div className="field">
            <label>{vocab.client}</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">{t(lang, 'bookPickClient')}</option>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>{t(lang, 'bookWhen')}</label>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t(lang, 'bookDuration')}</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {pack.durationPresets.map((m) => (
                  <option key={m} value={String(m)}>
                    {m >= 60 && m % 60 === 0
                      ? `${m / 60} h`
                      : `${m} min`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {pack.options.length > 0 ? (
            <div className="field">
              <label>{t(lang, 'bookOptions')}</label>
              <div className="book-options">
                {pack.options.map((o) => (
                  <label key={o.id} className="book-option-chip">
                    <input
                      type="checkbox"
                      checked={options.includes(o.id)}
                      onChange={() => toggleOpt(o.id)}
                    />
                    <span>
                      {optionLabel(o, lang)}
                      {o.priceDa > 0 ? (
                        <em> · {formatDa(o.priceDa)}</em>
                      ) : null}
                      {o.extraMin ? (
                        <em className="muted"> +{o.extraMin}′</em>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="field">
            <label>{t(lang, 'bookNote')}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(lang, 'bookNoteHint')}
            />
          </div>

          {verdict ? (
            <div className={decisionClass} role="status">
              <strong>
                {verdict.decision === 'accepted'
                  ? t(lang, 'bookDecisionOk')
                  : verdict.decision === 'proposed'
                    ? t(lang, 'bookDecisionPropose')
                    : t(lang, 'bookDecisionNo')}
              </strong>
              <ul>
                {verdictReasons(verdict, lang).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="book-quote">
                {segmentLabel(verdict.segment, lang)} · {verdict.durationMin} min
                {verdict.quoteDa > 0
                  ? ` · ≈ ${formatDa(verdict.quoteDa)}`
                  : ''}
              </div>
            </div>
          ) : null}

          <div className="book-alts">
            <div className="muted book-alts-title">{t(lang, 'bookNearSlots')}</div>
            <div className="book-alt-row">
              {(verdict?.alternatives?.length ? verdict.alternatives : liveAlts).map(
                (s) => (
                  <button
                    key={s.at.toISOString()}
                    type="button"
                    className="btn ghost book-alt-chip"
                    onClick={() => applySlot(s.at)}
                  >
                    {formatWhen(s.at.toISOString(), lang)}
                    {s.quoteDa > 0 ? (
                      <span className="muted"> · {formatDa(s.quoteDa)}</span>
                    ) : null}
                  </button>
                ),
              )}
              {(verdict?.alternatives?.length ? verdict.alternatives : liveAlts)
                .length === 0 ? (
                <span className="muted">{t(lang, 'bookNoAlt')}</span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="btn block"
            disabled={
              !clientId ||
              !verdict ||
              verdict.decision !== 'accepted'
            }
            onClick={save}
          >
            {t(lang, 'bookConfirm')}
          </button>
        </div>
      ) : null}

      <div className="booking-upcoming">
        <h3 style={{ margin: '12px 0 6px' }}>{t(lang, 'bookUpcoming')}</h3>
        {upcoming.length === 0 ? (
          <p className="muted">{t(lang, 'bookEmpty')}</p>
        ) : (
          <ul className="booking-list">
            {upcoming.map((a) => (
              <li key={a.id} className="booking-list-item">
                <div>
                  <strong>{a.clientName}</strong>
                  <div className="muted">
                    {formatWhen(a.at, lang)}
                    {a.durationMin ? ` · ${a.durationMin} min` : ''}
                    {a.segment ? ` · ${segmentLabel(a.segment, lang)}` : ''}
                    {typeof a.quoteDa === 'number' && a.quoteDa > 0
                      ? ` · ${formatDa(a.quoteDa)}`
                      : ''}
                  </div>
                  {a.optionIds?.length ? (
                    <div className="muted book-item-opts">
                      {a.optionIds
                        .map((id) => {
                          const o = pack.options.find((x) => x.id === id)
                          return o ? optionLabel(o, lang) : id
                        })
                        .join(' · ')}
                    </div>
                  ) : null}
                  {a.note ? <div className="muted">{a.note}</div> : null}
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      onState(updateAppointment(state, a.id, { status: 'done' }))
                      onFlash(t(lang, 'agendaDone'))
                    }}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      onState(
                        updateAppointment(state, a.id, { status: 'cancelled' }),
                      )
                    }}
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => onState(deleteAppointment(state, a.id))}
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
