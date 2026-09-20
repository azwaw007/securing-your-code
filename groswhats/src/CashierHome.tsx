import { useEffect, useRef, useState } from 'react'
import type { AppState, Language } from './types'
import { t } from './i18n'
import { joinAsDriver } from './sync/teamApi'
import { applyTeamCloudData, syncTeamPull, syncTeamPush } from './sync/shopSync'
import { updateTeam } from './store'

/** Connexion caissier (code magasin + secret + PIN) + sync boutique. */
export function CashierHome({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState | ((s: AppState) => AppState)) => void
  onFlash: (key: string) => void
}) {
  const [companyCode, setCompanyCode] = useState(state.team.companyCode)
  const [syncSecret, setSyncSecret] = useState(state.team.syncSecret)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const silentPull = useRef(false)

  const cashier = (state.cashiers || []).find(
    (c) => c.id === state.team.currentCashierId,
  )

  async function login() {
    setBusy(true)
    const res = await joinAsDriver({
      companyCode: companyCode.trim().toUpperCase(),
      syncSecret: syncSecret.trim(),
      pin,
      role: 'cashier',
    })
    setBusy(false)
    if (!res.ok || !res.cashier || !res.data) {
      onFlash('cashierLoginFail')
      return
    }
    onState((s) => {
      let next = applyTeamCloudData(s, res.data!)
      next = updateTeam(next, {
        companyCode: companyCode.trim().toUpperCase(),
        syncSecret: syncSecret.trim(),
        role: 'cashier',
        hasChosenRole: true,
        currentCashierId: res.cashier!.id,
        currentDriverId: null,
        multiPosteEnabled: true,
      })
      // garder le PIN caissier localement pour reconnexion offline
      const has = (next.cashiers || []).some((c) => c.id === res.cashier!.id)
      if (!has) {
        next = {
          ...next,
          cashiers: [
            {
              ...res.cashier!,
              pin: pin.replace(/\D/g, '').slice(0, 4),
            },
            ...(next.cashiers || []),
          ],
        }
      }
      return next
    })
    setLastSync(new Date().toLocaleTimeString())
    onFlash('cashierLoggedIn')
  }

  async function doPull(silent = false) {
    if (!cashier) return
    if (!silent) setBusy(true)
    const res = await syncTeamPull(state, { cashierId: cashier.id })
    if (!silent) setBusy(false)
    if (!res.ok) {
      if (!silent) onFlash('teamSyncFail')
      return
    }
    onState(() => res.state)
    setLastSync(new Date().toLocaleTimeString())
    if (!silent) onFlash('teamPulled')
  }

  async function doPush() {
    setBusy(true)
    const res = await syncTeamPush(state)
    setBusy(false)
    if (!res.ok) {
      onFlash('teamSyncFail')
      return
    }
    onState(() => res.state)
    setLastSync(new Date().toLocaleTimeString())
    onFlash('teamSynced')
  }

  useEffect(() => {
    if (!cashier) return
    void doPull(true)
    const id = window.setInterval(() => {
      if (silentPull.current) return
      silentPull.current = true
      void doPull(true).finally(() => {
        silentPull.current = false
      })
    }, 45000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashier?.id, state.team.companyCode, state.team.syncSecret])

  if (!cashier) {
    return (
      <div className="page">
        <div className="card">
          <h2>🧾 {t(lang, 'cashierLoginTitle')}</h2>
          <p className="muted">{t(lang, 'cashierLoginHint')}</p>
          <div className="field">
            <label>{t(lang, 'companyCode')}</label>
            <input
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
            />
          </div>
          <div className="field">
            <label>{t(lang, 'syncSecret')}</label>
            <input
              value={syncSecret}
              onChange={(e) => setSyncSecret(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'cashierPin')}</label>
            <input
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              inputMode="numeric"
              maxLength={4}
            />
          </div>
          <button
            type="button"
            className="btn block"
            disabled={
              busy ||
              companyCode.trim().length < 4 ||
              syncSecret.trim().length < 4 ||
              pin.length < 4
            }
            onClick={() => void login()}
          >
            {t(lang, 'cashierLogin')}
          </button>
          <button
            type="button"
            className="btn secondary block"
            style={{ marginTop: 8 }}
            onClick={() =>
              onState((s) =>
                updateTeam(s, {
                  role: 'owner',
                  hasChosenRole: true,
                  currentCashierId: null,
                }),
              )
            }
          >
            {t(lang, 'switchToOwner')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <h2>🧾 {t(lang, 'cashierMode')}</h2>
        <p className="muted">
          {cashier.name}
          {lastSync ? ` · ${t(lang, 'lastSync')}: ${lastSync}` : ''}
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void doPush()}
          >
            ☁️ {t(lang, 'syncPush')}
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() => void doPull(false)}
          >
            ⬇️ {t(lang, 'syncPull')}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              onState((s) =>
                updateTeam(s, {
                  currentCashierId: null,
                }),
              )
            }
          >
            {t(lang, 'cashierLogout')}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          {t(lang, 'cashierModeHint')}
        </p>
      </div>
    </div>
  )
}
