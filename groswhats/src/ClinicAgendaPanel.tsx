import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, Appointment, AppointmentRemindStage, Language } from './types'
import { t } from './i18n'
import {
  addAppointment,
  appointmentsNeedingReminder,
  deleteAppointment,
  markAppointmentReminded,
  upcomingAppointments,
  updateAppointment,
  updateSettings,
} from './store'
import {
  buildAppointmentReminder,
  openWhatsappText,
} from './utils/whatsapp'
import { ensureNotificationPermission } from './utils/notify'

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

function toLocalInputValue(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ClinicAgendaPanel({
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
  const upcoming = useMemo(() => upcomingAppointments(state, 12), [state])
  const [clientId, setClientId] = useState(state.clients[0]?.id ?? '')
  const [when, setWhen] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 2, 0, 0, 0)
    return toLocalInputValue(d)
  })
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)
  const sendingRef = useRef(false)
  const auto = state.settings.appointmentAutoRemind !== false

  function sendRemind(
    apt: Appointment,
    stage: AppointmentRemindStage | 'manual',
    nextState?: AppState,
  ) {
    const phone = apt.clientPhone
    if (!phone) {
      onFlash(t(lang, 'agendaNoPhone'))
      return nextState ?? state
    }
    const msg = buildAppointmentReminder(state.settings, apt, stage)
    openWhatsappText(phone, msg)
    if (stage === 'manual') {
      onFlash(t(lang, 'agendaRemindSent'))
      return nextState ?? state
    }
    const marked = markAppointmentReminded(nextState ?? state, apt.id, stage)
    onFlash(
      stage === '2h'
        ? t(lang, 'agendaAuto2h').replace('{name}', apt.clientName)
        : t(lang, 'agendaAuto24h').replace('{name}', apt.clientName),
    )
    return marked
  }

  useEffect(() => {
    if (!auto) return
    let cancelled = false
    const tick = async () => {
      if (cancelled || sendingRef.current) return
      const needs = appointmentsNeedingReminder(state)
      if (needs.length === 0) return
      const first = needs[0]
      sendingRef.current = true
      try {
        await ensureNotificationPermission()
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(
              lang === 'ar' ? 'تذكير موعد' : 'Rappel RDV',
              {
                body: `${first.appointment.clientName} — ${formatWhen(first.appointment.at, lang)}`,
                tag: `az-rdv-${first.appointment.id}-${first.stage}`,
              },
            )
          } catch {
            /* ignore */
          }
        }
        const next = sendRemind(first.appointment, first.stage)
        onState(next)
      } finally {
        window.setTimeout(() => {
          sendingRef.current = false
        }, 8000)
      }
    }
    tick()
    const id = window.setInterval(tick, 45_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.appointments, auto, lang])

  return (
    <section className="clinic-agenda card">
      <div className="clinic-agenda-head">
        <div>
          <div className="muted">{t(lang, 'agendaTitle')}</div>
          <strong>{t(lang, 'agendaSmart')}</strong>
        </div>
        <label className="clinic-auto">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) =>
              onState(updateSettings(state, { appointmentAutoRemind: e.target.checked }))
            }
          />
          <span>{t(lang, 'agendaAutoOn')}</span>
        </label>
      </div>
      <p className="muted clinic-agenda-hint">{t(lang, 'agendaHint')}</p>

      <div className="btn-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t(lang, 'cancel') : `＋ ${t(lang, 'agendaNew')}`}
        </button>
      </div>

      {showForm ? (
        <div className="clinic-agenda-form">
          <div className="field">
            <label>{t(lang, 'agendaPatient')}</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {state.clients.length === 0 ? (
                <option value="">{t(lang, 'agendaNoPatients')}</option>
              ) : (
                state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="field">
            <label>{t(lang, 'agendaWhen')}</label>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'clientNotes')}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(lang, 'agendaNoteHint')}
            />
          </div>
          <button
            type="button"
            className="btn block"
            disabled={!clientId || !when}
            onClick={() => {
              const iso = new Date(when).toISOString()
              onState(addAppointment(state, { clientId, at: iso, note }))
              setNote('')
              setShowForm(false)
              onFlash(t(lang, 'agendaSaved'))
            }}
          >
            {t(lang, 'agendaSave')}
          </button>
        </div>
      ) : null}

      {upcoming.length === 0 ? (
        <div className="muted">{t(lang, 'agendaEmpty')}</div>
      ) : (
        <ul className="clinic-agenda-list">
          {upcoming.map((a) => (
            <li key={a.id} className="clinic-agenda-item">
              <div>
                <strong>{a.clientName}</strong>
                <div className="muted">{formatWhen(a.at, lang)}</div>
                {a.note ? <div className="muted">{a.note}</div> : null}
                {a.remindStages?.length ? (
                  <div className="muted">
                    {t(lang, 'agendaReminded')}: {a.remindStages.join(', ')}
                  </div>
                ) : null}
              </div>
              <div className="btn-row" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    const next = sendRemind(a, 'manual')
                    if (next !== state) onState(next)
                  }}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  className="btn ghost"
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
                    onState(deleteAppointment(state, a.id))
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
