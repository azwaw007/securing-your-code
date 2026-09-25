import { useEffect, useRef, useState } from 'react'
import type { AppState, Client, GymSession, Language } from './types'
import { t } from './i18n'
import { formatDa } from './utils/format'
import {
  bumpGymSessionProduct,
  displayStock,
  ensureGymSessionHeld,
  gymCheckInByUid,
  gymOccupancyCount,
  gymPresentClientIds,
  gymSessionTicketTotal,
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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [productQuery, setProductQuery] = useState('')
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
    if (res.kind === 'in' && res.sessionId) {
      setActiveSessionId(res.sessionId)
      setProductQuery('')
    }
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
    setActiveSessionId(res.session.id)
    setProductQuery('')
  }

  function openSession(session: GymSession) {
    const next = ensureGymSessionHeld(stateRef.current, session.id)
    onState(next)
    onOpenSession?.(
      (next.gymSessions ?? []).find((s) => s.id === session.id) || session,
    )
  }

  function endTraining(session: GymSession) {
    openSession(session)
  }

  function addProductToSession(sessionId: string, productId: string) {
    const next = bumpGymSessionProduct(
      stateRef.current,
      sessionId,
      productId,
      1,
    )
    onState(next)
    onFlash(t(lang, 'gymConsoAdded'))
  }

  const productsForConso = state.products
    .filter((p) => displayStock(state, p) > 0)
    .filter((p) => {
      const q = productQuery.trim().toLowerCase()
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      )
    })
    .slice(0, 40)

  function heldFor(session: GymSession) {
    return (state.heldSales || []).find((h) => h.id === session.heldSaleId)
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
            const totals = gymSessionTicketTotal(state, s.id)
            const disc = s.disciplineId
              ? disciplineLabel(s.disciplineId, lang === 'ar' ? 'ar' : 'fr')
              : ''
            const expanded = activeSessionId === s.id
            const held = heldFor(s)
            const lines = Object.entries(held?.qtyMap || {}).filter(
              ([, qty]) => qty > 0,
            )
            return (
              <div key={s.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <strong>
                      {s.clientName}
                      {s.kind === 'walk_in' ? ` · ${t(lang, 'gymWalkInShort')}` : ''}
                    </strong>
                    <div className="muted">
                      {disc ? `${disc} · ` : ''}
                      {new Date(s.startedAt).toLocaleTimeString()}
                      {totals.sessionFeeDa > 0
                        ? ` · ${t(lang, 'gymSessionFee')} ${formatDa(totals.sessionFeeDa)}`
                        : ''}
                      {totals.productLines > 0
                        ? ` · ${totals.productLines} ${t(lang, 'gymConsoShort')}`
                        : ''}
                    </div>
                    <div>
                      <strong>
                        {t(lang, 'gymRunningTotal')} : {formatDa(totals.totalDa)}
                      </strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn secondary ${expanded ? '' : ''}`}
                      onClick={() => {
                        const next = ensureGymSessionHeld(stateRef.current, s.id)
                        onState(next)
                        setActiveSessionId(expanded ? null : s.id)
                        setProductQuery('')
                      }}
                    >
                      {expanded ? t(lang, 'gymHideConso') : t(lang, 'gymAddConso')}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => endTraining(s)}
                    >
                      {t(lang, 'gymEndTraining')}
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="gym-session-conso">
                    {(held?.flashLines?.length || 0) > 0 || lines.length > 0 ? (
                      <div className="dossier-list" style={{ marginBottom: 8 }}>
                        {(held?.flashLines || []).map((f) => (
                          <div key={f.id} className="list-item">
                            <div>
                              <strong>{f.name}</strong>
                              <div className="muted">
                                {t(lang, 'gymSessionFee')}
                              </div>
                            </div>
                            <span>{formatDa(f.unitPriceDa * f.qty)}</span>
                          </div>
                        ))}
                        {lines.map(([pid, qty]) => {
                          const p = state.products.find((x) => x.id === pid)
                          if (!p) return null
                          const price = p.priceDa * qty
                          return (
                            <div key={pid} className="list-item">
                              <div>
                                <strong>{p.name}</strong>
                                <div className="muted">
                                  {formatDa(p.priceDa)} × {qty}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn secondary"
                                  onClick={() =>
                                    onState(
                                      bumpGymSessionProduct(
                                        stateRef.current,
                                        s.id,
                                        pid,
                                        -1,
                                      ),
                                    )
                                  }
                                >
                                  −
                                </button>
                                <span>{qty}</span>
                                <button
                                  type="button"
                                  className="btn secondary"
                                  onClick={() => addProductToSession(s.id, pid)}
                                >
                                  +
                                </button>
                                <span>{formatDa(price)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="muted">{t(lang, 'gymConsoEmpty')}</p>
                    )}

                    <div className="field">
                      <label>{t(lang, 'gymPickProduct')}</label>
                      <input
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                        placeholder={t(lang, 'searchProduct')}
                      />
                    </div>
                    <div className="chip-row" style={{ maxHeight: 160, overflow: 'auto' }}>
                      {productsForConso.length === 0 ? (
                        <span className="muted">{t(lang, 'noProductFound')}</span>
                      ) : (
                        productsForConso.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="btn secondary"
                            onClick={() => addProductToSession(s.id, p.id)}
                          >
                            + {p.name}
                            <small style={{ marginInlineStart: 6 }}>
                              {formatDa(p.priceDa)}
                            </small>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn block"
                      style={{ marginTop: 8 }}
                      onClick={() => endTraining(s)}
                    >
                      {t(lang, 'gymEndTraining')} · {formatDa(totals.totalDa)}
                    </button>
                  </div>
                ) : null}
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
