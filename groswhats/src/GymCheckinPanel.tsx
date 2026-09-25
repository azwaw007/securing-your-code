import { useEffect, useRef, useState } from 'react'
import type { AppState, Client, GymSession, Language } from './types'
import { t } from './i18n'
import { formatDa } from './utils/format'
import {
  gymCheckInByUid,
  gymOccupancyCount,
  gymPresentClientIds,
  markGymSessionBilling,
  openGymSessions,
  startWalkInGymSession,
  toggleGymCheckIn,
} from './store'
import {
  isWebNfcSupported,
  normalizeNfcUid,
  startWebNfcListen,
} from './utils/gymNfc'
import { playBarcodeError, playCash } from './utils/sfx'
import { isBarcodeCameraSupported, BarcodeCameraModal } from './BarcodeCamera'
import { classifyHomeScan } from './utils/clientQr'
import { disciplineLabel } from './gym/disciplines'
import { GymAdminCard } from './GymAdminCard'
import { sellerCan } from './sellerPermissions'

export function GymCheckinPanel({
  state,
  lang,
  onState,
  onFlash,
  onBindUnknown,
  onOpenSession,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  /** Ouvre fiche client pour lier une puce inconnue */
  onBindUnknown?: (uid: string) => void
  /** Ouvre la caisse sur le ticket de session */
  onOpenSession?: (session: GymSession) => void
}) {
  const [listening, setListening] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [lastMsg, setLastMsg] = useState('')
  const [manual, setManual] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const wedgeRef = useRef<HTMLInputElement>(null)
  const nfcStopRef = useRef<{ stop: () => void } | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const presentIds = gymPresentClientIds(state)
  const count = gymOccupancyCount(state)
  const present = presentIds
    .map((id) => state.clients.find((c) => c.id === id))
    .filter(Boolean) as Client[]
  const sessions = openGymSessions(state)
  const canAdmin = sellerCan(state, 'settings')

  function handleCheckResult(
    res:
      | {
          state: AppState
          kind: 'in' | 'out'
          client: Client
          sessionId?: string
          membershipExpired?: boolean
        }
      | { error: 'session_open'; session: GymSession; client: Client }
      | { error: string }
      | null,
  ) {
    if (!res) {
      playBarcodeError()
      return
    }
    if ('error' in res) {
      playBarcodeError()
      if (res.error === 'session_open' && 'session' in res && res.session) {
        onFlash(t(lang, 'gymSessionMustPay'))
        onOpenSession?.(res.session)
        return
      }
      if (res.error === 'unknown_chip') {
        setLastMsg(t(lang, 'gymUnknownChip'))
        onFlash(t(lang, 'gymUnknownChip'))
      }
      return
    }
    playCash()
    onState(res.state)
    let msg =
      res.kind === 'in'
        ? t(lang, 'gymCheckInOk').replace('{name}', res.client.name)
        : t(lang, 'gymCheckOutOk').replace('{name}', res.client.name)
    if (res.membershipExpired) {
      msg += ` · ${t(lang, 'gymMembershipExpired')}`
    }
    setLastMsg(msg)
    onFlash(msg)
  }

  function applyUid(raw: string, source: 'nfc' | 'wedge' | 'qr' | 'manual') {
    const uid = normalizeNfcUid(raw)
    if (!uid) return
    const res = gymCheckInByUid(stateRef.current, uid, source)
    if ('error' in res && res.error === 'unknown_chip') {
      playBarcodeError()
      setLastMsg(t(lang, 'gymUnknownChip'))
      onFlash(t(lang, 'gymUnknownChip'))
      onBindUnknown?.(uid)
      return
    }
    handleCheckResult(res)
  }

  function applyClientId(clientId: string, source: 'qr' | 'manual') {
    handleCheckResult(toggleGymCheckIn(stateRef.current, clientId, source))
  }

  function addWalkIn() {
    const name = window.prompt(t(lang, 'gymWalkInName'), t(lang, 'gymWalkInDefault'))
    if (name === null) return
    const res = startWalkInGymSession(stateRef.current, {
      name: name.trim() || t(lang, 'gymWalkInDefault'),
    })
    if ('error' in res) {
      playBarcodeError()
      onFlash(t(lang, 'gymSessionFailed'))
      return
    }
    playCash()
    onState(res.state)
    onFlash(t(lang, 'gymWalkInStarted').replace('{name}', res.session.clientName))
    onOpenSession?.(res.session)
  }

  function openSession(session: GymSession) {
    onState(markGymSessionBilling(stateRef.current, session.id))
    onOpenSession?.(session)
  }

  useEffect(() => {
    if (!listening) {
      nfcStopRef.current?.stop()
      nfcStopRef.current = null
      return
    }
    wedgeRef.current?.focus()
    let cancelled = false
    ;(async () => {
      if (!isWebNfcSupported()) return
      const handle = await startWebNfcListen(
        (uid) => {
          if (!cancelled) applyUid(uid, 'nfc')
        },
        (err) => {
          if (!cancelled) {
            setLastMsg(err)
            onFlash(err)
          }
        },
      )
      if (cancelled) {
        handle?.stop()
        return
      }
      nfcStopRef.current = handle
    })()
    return () => {
      cancelled = true
      nfcStopRef.current?.stop()
      nfcStopRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus listening toggle only
  }, [listening])

  function sessionTotal(session: GymSession): number {
    const held = (state.heldSales || []).find((h) => h.id === session.heldSaleId)
    if (!held) return 0
    let sum = 0
    for (const [pid, qty] of Object.entries(held.qtyMap || {})) {
      const p = state.products.find((x) => x.id === pid)
      if (!p || qty <= 0) continue
      const tier = held.tierMap?.[pid] || 'piece'
      const price =
        held.priceOverrides?.[`${pid}::${tier}`] ??
        (tier === 'gros' || tier === 'super_gros'
          ? p.grosPriceDa || p.priceDa
          : tier === 'demi_gros'
            ? p.demiGrosPriceDa || p.priceDa
            : p.priceDa)
      sum += price * qty
    }
    for (const f of held.flashLines || []) sum += f.unitPriceDa * f.qty
    if (typeof held.totalOverrideDa === 'number') return held.totalOverrideDa
    const disc = held.discountPercent || 0
    return Math.round(sum * (1 - disc / 100))
  }

  return (
    <section className="gym-checkin card">
      <div className="list-item" style={{ borderBottom: 'none', paddingTop: 0 }}>
        <div>
          <h2 style={{ margin: 0 }}>🏋️ {t(lang, 'gymFloorTitle')}</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {t(lang, 'gymFloorHint')}
          </p>
        </div>
        {canAdmin ? (
          <button
            type="button"
            className="btn secondary"
            onClick={() => setShowAdmin((v) => !v)}
          >
            {showAdmin ? t(lang, 'hideMoreApps') : t(lang, 'gymAdminTitle')}
          </button>
        ) : null}
      </div>

      {showAdmin && canAdmin ? (
        <GymAdminCard
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}

      <div className="gym-occupancy">
        <div className="muted">{t(lang, 'gymInside')}</div>
        <div className="gym-count" aria-live="polite">
          {count}
        </div>
        <div className="muted">{t(lang, 'gymPeople')}</div>
      </div>

      <button
        type="button"
        className={`scan-cta gym-nfc-cta ${listening ? 'active' : ''}`}
        onClick={() => setListening((v) => !v)}
      >
        <span className="sell-cta-emoji">📡</span>
        <span>
          <strong>{listening ? t(lang, 'gymNfcListening') : t(lang, 'gymNfcStart')}</strong>
          <small>
            {isWebNfcSupported() ? t(lang, 'gymNfcHintWeb') : t(lang, 'gymNfcHintWedge')}
          </small>
        </span>
      </button>

      {listening ? (
        <div className="field gym-wedge">
          <label>{t(lang, 'gymWedgeLabel')}</label>
          <input
            ref={wedgeRef}
            value={manual}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="UID…"
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const v = manual
                setManual('')
                applyUid(v, 'wedge')
              }
            }}
            onBlur={() => {
              if (listening) setTimeout(() => wedgeRef.current?.focus(), 50)
            }}
          />
        </div>
      ) : null}

      <div className="btn-row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn"
          onClick={addWalkIn}
        >
          🚶 {t(lang, 'gymWalkInBtn')}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            if (!isBarcodeCameraSupported()) {
              window.alert(t(lang, 'barcodeCamUnsupported'))
              return
            }
            setScanOpen(true)
          }}
        >
          📷 {t(lang, 'gymScanQr')}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            const raw = window.prompt(t(lang, 'gymManualUid'))
            if (raw) applyUid(raw, 'manual')
          }}
        >
          {t(lang, 'gymManualBtn')}
        </button>
      </div>

      {lastMsg ? <div className="gym-flash">{lastMsg}</div> : null}

      <h3 style={{ marginTop: 12 }}>{t(lang, 'gymSessionsTitle')}</h3>
      <p className="muted">{t(lang, 'gymSessionsHint')}</p>
      {sessions.length === 0 ? (
        <div className="muted">{t(lang, 'gymSessionsEmpty')}</div>
      ) : (
        <div className="dossier-list">
          {sessions.map((s) => {
            const total = sessionTotal(s)
            const disc = s.disciplineId
              ? disciplineLabel(s.disciplineId, lang === 'ar' ? 'ar' : 'fr')
              : ''
            return (
              <div key={s.id} className="list-item">
                <div>
                  <strong>
                    {s.clientName}
                    {s.kind === 'walk_in' ? ` · ${t(lang, 'gymWalkInShort')}` : ''}
                  </strong>
                  <div className="muted">
                    {disc ? `${disc} · ` : ''}
                    {new Date(s.startedAt).toLocaleTimeString()}
                    {total > 0 ? ` · ${formatDa(total)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => openSession(s)}
                  >
                    {t(lang, 'gymAddConso')}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openSession(s)}
                  >
                    {t(lang, 'gymCashOut')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {present.length > 0 ? (
        <div className="gym-present-list" style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            {t(lang, 'gymPresentList')}
          </div>
          {present.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              onClick={() => applyClientId(c.id, 'manual')}
              title={t(lang, 'gymTapToExit')}
            >
              {c.name}
              {c.nfcUid ? ` · ${c.nfcUid.slice(0, 8)}` : ''}
            </button>
          ))}
        </div>
      ) : (
        <div className="muted">{t(lang, 'gymEmpty')}</div>
      )}

      {scanOpen ? (
        <BarcodeCameraModal
          lang={lang}
          title={t(lang, 'gymScanQr')}
          hint={t(lang, 'gymScanQrHint')}
          onClose={() => setScanOpen(false)}
          onDetect={(code) => {
            setScanOpen(false)
            const hit = classifyHomeScan(
              code,
              stateRef.current.clients,
              stateRef.current.products,
            )
            if (hit.kind === 'member' && hit.clientId) {
              applyClientId(hit.clientId, 'qr')
              return
            }
            if (hit.kind === 'member' && hit.nfcUid) {
              applyUid(hit.nfcUid, 'qr')
              return
            }
            if (hit.kind === 'client' && hit.clientId) {
              applyClientId(hit.clientId, 'qr')
              return
            }
            playBarcodeError()
            onFlash(t(lang, 'gymUnknownChip'))
          }}
        />
      ) : null}
    </section>
  )
}
