import { useState } from 'react'
import type { AppState, Client, Language } from './types'
import { t } from './i18n'
import { updateClient } from './store'
import { encodeMemberQr } from './utils/gymNfc'
import { openWhatsappText } from './utils/whatsapp'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const end = new Date(iso + 'T12:00:00')
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  return Math.round((end.getTime() - now.getTime()) / 86400000)
}

/**
 * Dossier adhérent / sportif — programme, objectifs, régime, abonnement.
 * Inspiré Liberfit / Gymkee / Resawod : fiche membre = suivi coach + dates contrat.
 */
export function AthleteDossierPanel({
  state,
  client,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  client: Client
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const [edit, setEdit] = useState(false)
  const [membershipStart, setMembershipStart] = useState(
    client.membershipStart ?? todayIso(),
  )
  const [membershipEnd, setMembershipEnd] = useState(client.membershipEnd ?? '')
  const [membershipPlan, setMembershipPlan] = useState(client.membershipPlan ?? '')
  const [membershipPlanId, setMembershipPlanId] = useState(
    client.membershipPlanId ?? '',
  )
  const [sportGoal, setSportGoal] = useState(client.sportGoal ?? '')
  const [trainingProgram, setTrainingProgram] = useState(client.trainingProgram ?? '')
  const [dietPlan, setDietPlan] = useState(client.dietPlan ?? '')
  const [coachNotes, setCoachNotes] = useState(client.coachNotes ?? '')
  const [nfcUid, setNfcUid] = useState(client.nfcUid ?? '')

  const gymPlans = (state.settings.gymSettings?.plans ?? []).filter(
    (p) => p.active !== false && !p.walkIn,
  )

  const left = daysUntil(client.membershipEnd)
  const expired = left != null && left < 0
  const soon = left != null && left >= 0 && left <= 7
  const hasDossier =
    client.membershipStart ||
    client.membershipEnd ||
    client.sportGoal ||
    client.trainingProgram ||
    client.dietPlan

  function applyPlan(planId: string) {
    setMembershipPlanId(planId)
    const plan = gymPlans.find((p) => p.id === planId)
    if (!plan) return
    setMembershipPlan(plan.name)
    const start = membershipStart || todayIso()
    setMembershipStart(start)
    const end = new Date(start + 'T12:00:00')
    end.setDate(end.getDate() + Math.max(1, plan.durationDays))
    setMembershipEnd(end.toISOString().slice(0, 10))
  }

  function save() {
    onState(
      updateClient(state, client.id, {
        membershipStart: membershipStart || undefined,
        membershipEnd: membershipEnd || undefined,
        membershipPlan: membershipPlan.trim() || undefined,
        membershipPlanId: membershipPlanId || undefined,
        membershipDisciplineIds: membershipPlanId
          ? gymPlans.find((p) => p.id === membershipPlanId)?.disciplineIds
          : undefined,
        sportGoal: sportGoal.trim() || undefined,
        trainingProgram: trainingProgram.trim() || undefined,
        dietPlan: dietPlan.trim() || undefined,
        coachNotes: coachNotes.trim() || undefined,
        nfcUid: nfcUid.trim() || undefined,
      }),
    )
    setEdit(false)
    onFlash(t(lang, 'athleteSaved'))
  }

  function shareSummary() {
    if (!client.phone) {
      onFlash(t(lang, 'noWhatsappQuick'))
      return
    }
    const lines = [
      lang === 'ar' ? `مرحبا ${client.name}` : `Salam ${client.name}`,
      '',
      lang === 'ar' ? '📋 ملفك الرياضي:' : '📋 Ton dossier sport :',
      client.membershipPlan
        ? `${lang === 'ar' ? 'الباقة' : 'Formule'} : ${client.membershipPlan}`
        : '',
      client.membershipStart || client.membershipEnd
        ? `${lang === 'ar' ? 'الاشتراك' : 'Abonnement'} : ${client.membershipStart || '…'} → ${client.membershipEnd || '…'}`
        : '',
      client.sportGoal
        ? `${lang === 'ar' ? 'الهدف' : 'Objectif'} : ${client.sportGoal}`
        : '',
      client.trainingProgram
        ? `${lang === 'ar' ? 'البرنامج' : 'Programme'} :\n${client.trainingProgram}`
        : '',
      client.dietPlan
        ? `${lang === 'ar' ? 'النظام الغذائي' : 'Régime'} :\n${client.dietPlan}`
        : '',
    ].filter(Boolean)
    openWhatsappText(client.phone, lines.join('\n'))
    onFlash(t(lang, 'medWhatsappSent'))
  }

  return (
    <section className="dossier-patient athlete-dossier">
      <div className="dossier-head">
        <h3>🏋️ {t(lang, 'athleteTitle')}</h3>
        {!edit ? (
          <button type="button" className="btn ghost" onClick={() => setEdit(true)}>
            ✏️ {t(lang, 'athleteEdit')}
          </button>
        ) : null}
      </div>
      <p className="muted">{t(lang, 'athleteHint')}</p>

      {expired ? (
        <div className="dossier-allergy" role="status">
          ⚠️ {t(lang, 'athleteExpired')}
        </div>
      ) : soon ? (
        <div className="dossier-allergy athlete-soon" role="status">
          ⏳ {t(lang, 'athleteExpiring').replace('{n}', String(left))}
        </div>
      ) : null}

      {edit ? (
        <div className="dossier-form">
          <div className="grid-2">
            <div className="field">
              <label>{t(lang, 'athleteSubStart')}</label>
              <input
                type="date"
                value={membershipStart}
                onChange={(e) => setMembershipStart(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t(lang, 'athleteSubEnd')}</label>
              <input
                type="date"
                value={membershipEnd}
                onChange={(e) => setMembershipEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label>{t(lang, 'athletePlan')}</label>
            {gymPlans.length > 0 ? (
              <select
                value={membershipPlanId}
                onChange={(e) => applyPlan(e.target.value)}
              >
                <option value="">—</option>
                {gymPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.priceDa} DA / {p.durationDays} j)
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={membershipPlan}
                onChange={(e) => setMembershipPlan(e.target.value)}
                placeholder={t(lang, 'athletePlanHint')}
              />
            )}
          </div>
          {gymPlans.length > 0 && !membershipPlanId ? (
            <div className="field">
              <label>{t(lang, 'athletePlanHint')}</label>
              <input
                value={membershipPlan}
                onChange={(e) => setMembershipPlan(e.target.value)}
              />
            </div>
          ) : null}
          <div className="field">
            <label>{t(lang, 'athleteGoal')}</label>
            <input
              value={sportGoal}
              onChange={(e) => setSportGoal(e.target.value)}
              placeholder={t(lang, 'athleteGoalHint')}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'athleteProgram')}</label>
            <textarea
              rows={4}
              value={trainingProgram}
              onChange={(e) => setTrainingProgram(e.target.value)}
              placeholder={t(lang, 'athleteProgramHint')}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'athleteDiet')}</label>
            <textarea
              rows={4}
              value={dietPlan}
              onChange={(e) => setDietPlan(e.target.value)}
              placeholder={t(lang, 'athleteDietHint')}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'athleteCoachNotes')}</label>
            <textarea
              rows={2}
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder={t(lang, 'athleteCoachNotesHint')}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'athleteNfc')}</label>
            <input
              value={nfcUid}
              onChange={(e) => setNfcUid(e.target.value)}
              placeholder="A1B2C3D4…"
            />
            <div className="muted">{t(lang, 'athleteNfcHint')}</div>
          </div>
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={save}>
              {t(lang, 'save')}
            </button>
            <button type="button" className="btn ghost" onClick={() => setEdit(false)}>
              {t(lang, 'cancel')}
            </button>
          </div>
        </div>
      ) : !hasDossier ? (
        <p className="muted">{t(lang, 'athleteEmpty')}</p>
      ) : (
        <div className="dossier-profile muted">
          <div>
            <strong>{t(lang, 'athletePlan')} :</strong>{' '}
            {client.membershipPlan || '—'}
          </div>
          <div>
            <strong>{t(lang, 'athleteSub')} :</strong>{' '}
            {client.membershipStart || '…'} → {client.membershipEnd || '…'}
            {left != null && !expired ? (
              <span className="badge" style={{ marginInlineStart: 6 }}>
                {left}j
              </span>
            ) : null}
          </div>
          <div>
            <strong>{t(lang, 'athleteGoal')} :</strong> {client.sportGoal || '—'}
          </div>
          {client.trainingProgram ? (
            <div style={{ marginTop: 8 }}>
              <strong>{t(lang, 'athleteProgram')}</strong>
              <pre className="dossier-body">{client.trainingProgram}</pre>
            </div>
          ) : null}
          {client.dietPlan ? (
            <div style={{ marginTop: 8 }}>
              <strong>{t(lang, 'athleteDiet')}</strong>
              <pre className="dossier-body">{client.dietPlan}</pre>
            </div>
          ) : null}
          {client.coachNotes ? (
            <div style={{ marginTop: 8 }}>
              <strong>{t(lang, 'athleteCoachNotes')}</strong>
              <div>{client.coachNotes}</div>
            </div>
          ) : null}
          {client.nfcUid ? (
            <div style={{ marginTop: 8 }}>
              <strong>NFC :</strong> {client.nfcUid}
              <div className="muted">QR : {encodeMemberQr(client.nfcUid)}</div>
            </div>
          ) : null}
          <div className="btn-row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn secondary" onClick={shareSummary}>
              WhatsApp
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
