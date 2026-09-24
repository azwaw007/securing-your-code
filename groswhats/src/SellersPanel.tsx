import { useState } from 'react'
import type { AppState, Language, PosSeller, PosSellerRole } from './types'
import { t } from './i18n'
import {
  addSeller,
  currentSeller,
  deleteSeller,
  resolveGameTariffs,
  setCurrentSeller,
  updateSettings,
  verifyAdminPin,
} from './store'

export function SellerSwitcherBar({
  state,
  lang,
  onState,
  onFlash,
  onManage,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  onManage?: () => void
}) {
  const sellers = (state.sellers || []).filter((s) => s.active !== false)
  const cur = currentSeller(state)

  function pick(s: PosSeller) {
    if (s.pin) {
      const entered = window.prompt(t(lang, 'sellerPinPrompt').replace('{name}', s.name))
      if (entered === null) return
      if (entered.replace(/\D/g, '') !== s.pin) {
        onFlash(t(lang, 'sellerPinBad'))
        return
      }
    }
    onState(setCurrentSeller(state, s.id))
    onFlash(t(lang, 'sellerSwitched').replace('{name}', s.name))
  }

  if (sellers.length === 0) return null

  return (
    <div className="seller-switcher card">
      <div className="seller-switcher-head">
        <div>
          <strong>{t(lang, 'sellerCurrent')}</strong>
          <div className="muted">
            {cur
              ? `${cur.name}${cur.role === 'admin' ? ' · Admin' : ''}`
              : '—'}
          </div>
        </div>
        {onManage ? (
          <button type="button" className="btn secondary" onClick={onManage}>
            {t(lang, 'sellersManage')}
          </button>
        ) : null}
      </div>
      <div className="seller-chips">
        {sellers.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`seller-chip ${cur?.id === s.id ? 'is-active' : ''} ${
              s.role === 'admin' ? 'is-admin' : ''
            }`}
            onClick={() => pick(s)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SellersPanel({
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
  const [name, setName] = useState('')
  const [role, setRole] = useState<PosSellerRole>('vendeur')
  const [pin, setPin] = useState('')
  const [adminPinDraft, setAdminPinDraft] = useState(state.settings.adminPin || '')
  const [adminConfirm, setAdminConfirm] = useState('')
  const [unlockPin, setUnlockPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)

  const sellers = state.sellers || []

  function unlock() {
    if (!verifyAdminPin(state, unlockPin)) {
      onFlash(t(lang, 'adminPinBad'))
      return
    }
    setUnlocked(true)
    onFlash(t(lang, 'adminPinOk'))
  }

  function saveAdminPin() {
    if (!unlocked) return
    const p = adminPinDraft.trim()
    if (p && !/^\d{4,6}$/.test(p)) {
      onFlash(t(lang, 'adminPinFormat'))
      return
    }
    if (p && p !== adminConfirm.trim()) {
      onFlash(t(lang, 'adminPinMismatch'))
      return
    }
    onState(updateSettings(state, { adminPin: p || undefined }))
    onFlash(t(lang, 'adminPinSaved'))
  }

  function create() {
    if (!unlocked) {
      onFlash(t(lang, 'adminUnlockFirst'))
      return
    }
    if (!name.trim()) return
    onState(addSeller(state, { name, role, pin }))
    setName('')
    setPin('')
    setRole('vendeur')
    onFlash(t(lang, 'sellerAdded'))
  }

  return (
    <div className="sellers-panel">
      <div className="card">
        <h2>{t(lang, 'sellersTitle')}</h2>
        <p className="muted">{t(lang, 'sellersHint')}</p>

        {!unlocked ? (
          <div className="field">
            <label>{t(lang, 'adminPinLabel')}</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
            />
            <button type="button" className="btn block" style={{ marginTop: 8 }} onClick={unlock}>
              {t(lang, 'adminUnlock')}
            </button>
            <p className="muted" style={{ marginTop: 6 }}>
              {t(lang, 'adminPinDefaultHint')}
            </p>
          </div>
        ) : (
          <>
            <div className="field">
              <label>{t(lang, 'adminPinLabel')}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={adminPinDraft}
                onChange={(e) => setAdminPinDraft(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
              />
            </div>
            <div className="field">
              <label>{t(lang, 'adminPinConfirm')}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={adminConfirm}
                onChange={(e) => setAdminConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
              />
            </div>
            <button type="button" className="btn secondary block" onClick={saveAdminPin}>
              {t(lang, 'adminPinSave')}
            </button>

            <hr style={{ margin: '16px 0', border: 0, borderTop: '1px solid var(--line)' }} />

            <div className="grid-2">
              <div className="field">
                <label>{t(lang, 'sellerName')}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <label>{t(lang, 'sellerRole')}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as PosSellerRole)}
                >
                  <option value="vendeur">{t(lang, 'sellerRoleVendeur')}</option>
                  <option value="admin">{t(lang, 'sellerRoleAdmin')}</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>{t(lang, 'sellerPinOptional')}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
              />
            </div>
            <button type="button" className="btn block" onClick={create}>
              {t(lang, 'sellerAdd')}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t(lang, 'sellersList')}</h3>
        {sellers.length === 0 ? (
          <div className="empty">{t(lang, 'sellersEmpty')}</div>
        ) : (
          sellers.map((s) => (
            <div key={s.id} className="list-item">
              <div>
                <strong>{s.name}</strong>
                <div className="muted">
                  {s.role === 'admin'
                    ? t(lang, 'sellerRoleAdmin')
                    : t(lang, 'sellerRoleVendeur')}
                  {s.pin ? ' · PIN' : ''}
                </div>
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    onState(setCurrentSeller(state, s.id))
                    onFlash(t(lang, 'sellerSwitched').replace('{name}', s.name))
                  }}
                >
                  {t(lang, 'sellerUse')}
                </button>
                {unlocked ? (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      if (sellers.length <= 1) {
                        onFlash(t(lang, 'sellerKeepOne'))
                        return
                      }
                      onState(deleteSeller(state, s.id))
                      onFlash(t(lang, 'sellerDeleted'))
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** Bloc réglages tarifs jeux — protégé par PIN admin */
export function GamePriceAdminCard({
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
  const tariffs = resolveGameTariffs(state)
  const [pin, setPin] = useState('')
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(
    tariffs.consoles.map((c) => ({
      id: c.id,
      label: c.label,
      hour: String(c.hourDa),
      match: String(c.matchDa),
    })),
  )
  const [matchMin, setMatchMin] = useState(String(tariffs.matchMinutes))

  function unlock() {
    if (!verifyAdminPin(state, pin)) {
      onFlash(t(lang, 'adminPinBad'))
      return
    }
    setOpen(true)
    onFlash(t(lang, 'adminPinOk'))
  }

  function num(v: string): number | null {
    const n = Number(String(v).replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return null
    return +n.toFixed(2)
  }

  function save() {
    const m = Math.round(Number(matchMin))
    if (!Number.isFinite(m) || m < 1) {
      onFlash(t(lang, 'gamePriceBad'))
      return
    }
    const consoles = []
    for (const r of rows) {
      const hour = num(r.hour)
      const match = num(r.match)
      if (hour === null || match === null) {
        onFlash(t(lang, 'gamePriceBad'))
        return
      }
      consoles.push({
        id: r.id,
        label: r.label,
        hourDa: hour,
        matchDa: match,
      })
    }
    const ps4 = consoles.find((c) => c.id === 'ps4')
    onState(
      updateSettings(state, {
        gameTariffs: { matchMinutes: m, consoles },
        gamePricePerMinuteDa: ps4 ? +(ps4.hourDa / 60).toFixed(2) : undefined,
      }),
    )
    onFlash(t(lang, 'gamePriceSaved'))
  }

  return (
    <div className="card">
      <h2>{t(lang, 'gamePriceTitle')}</h2>
      <p className="muted">{t(lang, 'gamePriceHint')}</p>
      {!open ? (
        <>
          <div className="muted game-admin-preview" style={{ marginBottom: 8 }}>
            {tariffs.consoles.map((c) => (
              <div key={c.id}>
                {c.label} : <strong>{c.hourDa} DA</strong>/h
                {c.matchDa > 0 ? (
                  <>
                    {' '}
                    · <strong>{c.matchDa} DA</strong>/{t(lang, 'gameMatchShort')}
                  </>
                ) : null}
              </div>
            ))}
            <div>
              {t(lang, 'gameMatchDefault')}:{' '}
              <strong>{tariffs.matchMinutes} min</strong>
            </div>
          </div>
          <div className="field">
            <label>{t(lang, 'adminPinLabel')}</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
            />
          </div>
          <button type="button" className="btn block" onClick={unlock}>
            {t(lang, 'adminUnlock')}
          </button>
        </>
      ) : (
        <>
          <div className="game-tariff-edit">
            {rows.map((r, i) => (
              <div key={r.id} className="game-tariff-edit-row">
                <strong>{r.label}</strong>
                <div className="grid-2">
                  <div className="field">
                    <label>{t(lang, 'gameTariffHour')}</label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={r.hour}
                      onChange={(e) => {
                        const v = e.target.value
                        setRows((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, hour: v } : x)),
                        )
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>{t(lang, 'gameTariffMatch')}</label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={r.match}
                      onChange={(e) => {
                        const v = e.target.value
                        setRows((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, match: v } : x)),
                        )
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="field">
            <label>{t(lang, 'gameMatchDefault')}</label>
            <input
              type="number"
              min={1}
              max={180}
              value={matchMin}
              onChange={(e) => setMatchMin(e.target.value)}
            />
          </div>
          <button type="button" className="btn block" onClick={save}>
            {t(lang, 'save')}
          </button>
        </>
      )}
    </div>
  )
}
