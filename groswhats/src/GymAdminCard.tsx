import { useMemo, useState } from 'react'
import type { AppState, GymDisciplineId, GymMembershipPlan, Language } from './types'
import { t } from './i18n'
import { formatDa } from './utils/format'
import { updateGymSettings } from './store'
import {
  GYM_DISCIPLINE_CATALOG,
  defaultGymPlans,
  disciplineLabel,
} from './gym/disciplines'

export function GymAdminCard({
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
  const gym = state.settings.gymSettings
  const enabled = gym?.enabledDisciplines ?? []
  const plans = gym?.plans ?? []
  const ar = lang === 'ar'

  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('3000')
  const [planDays, setPlanDays] = useState('30')
  const [planWalkIn, setPlanWalkIn] = useState(false)
  const [planDisciplines, setPlanDisciplines] = useState<GymDisciplineId[]>([])

  const activeCatalog = useMemo(
    () => GYM_DISCIPLINE_CATALOG.filter((d) => enabled.includes(d.id)),
    [enabled],
  )

  function toggleDiscipline(id: GymDisciplineId) {
    const next = enabled.includes(id)
      ? enabled.filter((x) => x !== id)
      : [...enabled, id]
    if (next.length === 0) {
      onFlash(t(lang, 'gymNeedDiscipline'))
      return
    }
    onState(
      updateGymSettings(state, {
        enabledDisciplines: next,
        plans:
          plans.length > 0
            ? plans
            : defaultGymPlans(next),
      }),
    )
  }

  function savePlan() {
    const name = planName.trim()
    const price = Number(String(planPrice).replace(',', '.'))
    const days = Math.max(1, Math.round(Number(planDays) || 1))
    if (!name || !Number.isFinite(price) || price < 0) {
      onFlash(t(lang, 'gymPlanInvalid'))
      return
    }
    const discs =
      planDisciplines.length > 0 ? planDisciplines : [...enabled]
    const plan: GymMembershipPlan = {
      id: `gpl_${Date.now().toString(36)}`,
      name,
      priceDa: price,
      durationDays: days,
      disciplineIds: discs,
      walkIn: planWalkIn,
      active: true,
    }
    onState(updateGymSettings(state, { plans: [plan, ...plans] }))
    setPlanName('')
    setPlanPrice(planWalkIn ? '300' : '3000')
    setPlanDays(planWalkIn ? '1' : '30')
    setPlanDisciplines([])
    onFlash(t(lang, 'gymPlanSaved'))
  }

  function removePlan(id: string) {
    onState(
      updateGymSettings(state, {
        plans: plans.filter((p) => p.id !== id),
      }),
    )
    onFlash(t(lang, 'gymPlanDeleted'))
  }

  return (
    <section className="card gym-admin">
      <h2 style={{ marginTop: 0 }}>⚙️ {t(lang, 'gymAdminTitle')}</h2>
      <p className="muted">{t(lang, 'gymAdminHint')}</p>

      <h3>{t(lang, 'gymDisciplines')}</h3>
      <div className="chip-row" style={{ marginBottom: 12 }}>
        {GYM_DISCIPLINE_CATALOG.map((d) => {
          const on = enabled.includes(d.id)
          return (
            <button
              key={d.id}
              type="button"
              className={`btn ${on ? '' : 'secondary'}`}
              onClick={() => toggleDiscipline(d.id)}
            >
              {d.icon} {ar ? d.labelAr : d.labelFr}
            </button>
          )
        })}
      </div>

      <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={gym?.openTicketOnEntry !== false}
          onChange={(e) =>
            onState(
              updateGymSettings(state, {
                openTicketOnEntry: e.target.checked,
              }),
            )
          }
        />
        <span>{t(lang, 'gymOpenTicketOnEntry')}</span>
      </label>

      <h3 style={{ marginTop: 16 }}>{t(lang, 'gymPlansTitle')}</h3>
      <p className="muted">{t(lang, 'gymPlansHint')}</p>

      <div className="field">
        <label>{t(lang, 'gymPlanName')}</label>
        <input value={planName} onChange={(e) => setPlanName(e.target.value)} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label>{t(lang, 'gymPlanPrice')}</label>
          <input
            inputMode="decimal"
            value={planPrice}
            onChange={(e) => setPlanPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t(lang, 'gymPlanDays')}</label>
          <input
            inputMode="numeric"
            value={planDays}
            onChange={(e) => setPlanDays(e.target.value)}
          />
        </div>
      </div>
      <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={planWalkIn}
          onChange={(e) => {
            setPlanWalkIn(e.target.checked)
            if (e.target.checked) {
              setPlanDays('1')
              if (!planName.trim()) setPlanName(t(lang, 'gymWalkInPlan'))
            }
          }}
        />
        <span>{t(lang, 'gymPlanWalkIn')}</span>
      </label>
      {activeCatalog.length > 0 ? (
        <div className="chip-row" style={{ marginBottom: 8 }}>
          {activeCatalog.map((d) => {
            const on = planDisciplines.includes(d.id)
            return (
              <button
                key={d.id}
                type="button"
                className={`btn secondary ${on ? 'active' : ''}`}
                onClick={() =>
                  setPlanDisciplines((cur) =>
                    on ? cur.filter((x) => x !== d.id) : [...cur, d.id],
                  )
                }
              >
                {ar ? d.labelAr : d.labelFr}
              </button>
            )
          })}
        </div>
      ) : null}
      <button type="button" className="btn block" onClick={savePlan}>
        + {t(lang, 'gymPlanAdd')}
      </button>

      <div className="dossier-list" style={{ marginTop: 12 }}>
        {plans.length === 0 ? (
          <p className="muted">{t(lang, 'gymPlansEmpty')}</p>
        ) : (
          plans.map((p) => (
            <div key={p.id} className="list-item">
              <div>
                <strong>
                  {p.name}
                  {p.walkIn ? ` · ${t(lang, 'gymWalkInShort')}` : ''}
                </strong>
                <div className="muted">
                  {formatDa(p.priceDa)} · {p.durationDays} j
                  {p.disciplineIds.length
                    ? ` · ${p.disciplineIds
                        .map((id) => disciplineLabel(id, ar ? 'ar' : 'fr'))
                        .join(', ')}`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn secondary"
                onClick={() => removePlan(p.id)}
              >
                {t(lang, 'delete')}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
