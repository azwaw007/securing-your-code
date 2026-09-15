import { useEffect, useRef, useState } from 'react'
import type { AppState, Client, Language } from './types'
import { t } from './i18n'
import {
  gymCheckInByUid,
  gymOccupancyCount,
  gymPresentClientIds,
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

export function GymCheckinPanel({
  state,
  lang,
  onState,
  onFlash,
  onBindUnknown,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  /** Ouvre fiche client pour lier une puce inconnue */
  onBindUnknown?: (uid: string) => void
}) {
  const [listening, setListening] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [lastMsg, setLastMsg] = useState('')
  const [manual, setManual] = useState('')
  const wedgeRef = useRef<HTMLInputElement>(null)
  const nfcStopRef = useRef<{ stop: () => void } | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const presentIds = gymPresentClientIds(state)
  const count = gymOccupancyCount(state)
  const present = presentIds
    .map((id) => state.clients.find((c) => c.id === id))
    .filter(Boolean) as Client[]

  function applyUid(raw: string, source: 'nfc' | 'wedge' | 'qr' | 'manual') {
    const uid = normalizeNfcUid(raw)
    if (!uid) return
    const res = gymCheckInByUid(stateRef.current, uid, source)
    if ('error' in res) {
      playBarcodeError()
      if (res.error === 'unknown_chip') {
        setLastMsg(t(lang, 'gymUnknownChip'))
        onFlash(t(lang, 'gymUnknownChip'))
        onBindUnknown?.(uid)
      }
      return
    }
    playCash()
    onState(res.state)
    const msg =
      res.kind === 'in'
        ? t(lang, 'gymCheckInOk').replace('{name}', res.client.name)
        : t(lang, 'gymCheckOutOk').replace('{name}', res.client.name)
    setLastMsg(msg)
    onFlash(msg)
  }

  function applyClientId(clientId: string, source: 'qr' | 'manual') {
    const res = toggleGymCheckIn(stateRef.current, clientId, source)
    if (!res) {
      playBarcodeError()
      return
    }
    playCash()
    onState(res.state)
    const msg =
      res.kind === 'in'
        ? t(lang, 'gymCheckInOk').replace('{name}', res.client.name)
        : t(lang, 'gymCheckOutOk').replace('{name}', res.client.name)
    setLastMsg(msg)
    onFlash(msg)
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

      {present.length > 0 ? (
        <div className="gym-present-list">
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
