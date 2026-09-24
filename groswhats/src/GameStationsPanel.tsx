import { useEffect, useRef, useState } from 'react'
import type { AppState, GameStation, Language, TvControlKind } from './types'
import { t } from './i18n'
import {
  addGameStationTime,
  ensureGameStations,
  expireGameStations,
  freeGameStation,
  setGameStationStandby,
  updateGameStation,
} from './store'
import {
  stationHasTvControl,
  turnTvOff,
  turnTvOn,
} from './utils/tvControl'
import { playBarcodeError, playCash } from './utils/sfx'

const TIME_PRESETS = [15, 30, 60, 120] as const

function formatRemaining(endsAt: string | undefined, now: number): string {
  if (!endsAt) return '—'
  const ms = Math.max(0, new Date(endsAt).getTime() - now)
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function remainingMs(endsAt: string | undefined, now: number): number {
  if (!endsAt) return 0
  return Math.max(0, new Date(endsAt).getTime() - now)
}

export function GameStationsPanel({
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
  const [now, setNow] = useState(() => Date.now())
  const [configId, setConfigId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const expiredHandled = useRef<Set<string>>(new Set())
  const stateRef = useRef(state)
  stateRef.current = state

  // Assure 15 postes
  useEffect(() => {
    const next = ensureGameStations(stateRef.current)
    if (next !== stateRef.current) onState(next)
  }, [onState])

  // Tick 1s + expiration → veille TV
  useEffect(() => {
    const tick = window.setInterval(() => {
      setNow(Date.now())
      const { state: next, expiredIds } = expireGameStations(
        stateRef.current,
        Date.now(),
      )
      if (expiredIds.length === 0) return
      onState(next)
      for (const id of expiredIds) {
        if (expiredHandled.current.has(id)) continue
        expiredHandled.current.add(id)
        const st = next.gameStations.find((g) => g.id === id)
        if (!st) continue
        playBarcodeError()
        onFlash(
          t(lang, 'gameStationExpired').replace('{name}', st.name),
        )
        void turnTvOff(st).then((res) => {
          if (res.ok) {
            onFlash(
              t(lang, 'gameTvOffOk').replace('{name}', st.name),
            )
          } else if (res.reason === 'network') {
            onFlash(
              t(lang, 'gameTvOffFail').replace('{name}', st.name),
            )
          }
        })
      }
    }, 1000)
    return () => window.clearInterval(tick)
  }, [lang, onFlash, onState])

  // Reset handled set when station becomes active again
  useEffect(() => {
    for (const g of state.gameStations ?? []) {
      if (g.status === 'active') expiredHandled.current.delete(g.id)
    }
  }, [state.gameStations])

  const stations = state.gameStations ?? []

  async function startOrAdd(station: GameStation, minutes: number) {
    const wasFree = station.status !== 'active'
    const next = addGameStationTime(
      state,
      station.id,
      minutes,
      labelDraft.trim() || station.clientLabel,
    )
    onState(next)
    playCash()
    onFlash(
      t(lang, 'gameTimeAdded')
        .replace('{name}', station.name)
        .replace('{min}', String(minutes)),
    )
    setLabelDraft('')
    if (wasFree && stationHasTvControl(station)) {
      const updated = next.gameStations.find((g) => g.id === station.id) || station
      const res = await turnTvOn(updated)
      if (res.ok) onFlash(t(lang, 'gameTvOnOk').replace('{name}', station.name))
      else if (res.reason === 'network') {
        onFlash(t(lang, 'gameTvOnFail').replace('{name}', station.name))
      }
    }
  }

  async function toStandby(station: GameStation) {
    onState(setGameStationStandby(state, station.id))
    onFlash(t(lang, 'gameStandbyOk').replace('{name}', station.name))
    if (stationHasTvControl(station)) {
      const res = await turnTvOff(station)
      if (res.ok) onFlash(t(lang, 'gameTvOffOk').replace('{name}', station.name))
      else if (res.reason === 'network') {
        onFlash(t(lang, 'gameTvOffFail').replace('{name}', station.name))
      }
    }
  }

  function liberate(station: GameStation) {
    onState(freeGameStation(state, station.id))
    onFlash(t(lang, 'gameFreeOk').replace('{name}', station.name))
  }

  function saveTvConfig(station: GameStation, patch: {
    tvKind?: TvControlKind
    tvHost?: string
    tvOnUrl?: string
    tvOffUrl?: string
  }) {
    onState(updateGameStation(state, station.id, patch))
    onFlash(t(lang, 'gameTvSaved'))
  }

  const activeCount = stations.filter((g) => g.status === 'active').length
  const standbyCount = stations.filter((g) => g.status === 'standby').length

  return (
    <section className="card game-stations">
      <div className="game-stations-head">
        <div>
          <h2 style={{ margin: 0 }}>{t(lang, 'gameStationsTitle')}</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {t(lang, 'gameStationsHint')}
          </p>
        </div>
        <div className="game-stations-stats" aria-live="polite">
          <span>
            {activeCount} {t(lang, 'gameActive')}
          </span>
          <span>
            {standbyCount} {t(lang, 'gameStandby')}
          </span>
        </div>
      </div>

      <p className="muted game-tv-note">{t(lang, 'gameTvLanNote')}</p>

      <div className="field game-label-field">
        <label>{t(lang, 'gameClientLabel')}</label>
        <input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          placeholder={t(lang, 'gameClientLabelHint')}
        />
      </div>

      {stations.length === 0 ? (
        <div className="empty">{t(lang, 'gameStationsEmpty')}</div>
      ) : (
        <div className="game-grid">
          {stations.map((st) => {
            const rem = remainingMs(st.endsAt, now)
            const warn = st.status === 'active' && rem > 0 && rem <= 5 * 60_000
            const tileClass = [
              'game-tile',
              `is-${st.status}`,
              warn ? 'is-warn' : '',
            ]
              .filter(Boolean)
              .join(' ')
            const configuring = configId === st.id

            return (
              <div key={st.id} className={tileClass}>
                <div className="game-tile-top">
                  <strong>{st.name}</strong>
                  {stationHasTvControl(st) ? (
                    <span className="game-tv-badge" title={st.tvHost || ''}>
                      TV
                    </span>
                  ) : null}
                </div>
                <div className="game-timer" aria-live="polite">
                  {st.status === 'active'
                    ? formatRemaining(st.endsAt, now)
                    : st.status === 'standby'
                      ? t(lang, 'gameStandby')
                      : t(lang, 'gameFree')}
                </div>
                <div className="muted game-tile-meta">
                  {st.clientLabel
                    ? st.clientLabel
                    : st.paidMinutes
                      ? `${st.paidMinutes} min`
                      : 'PS + TV'}
                </div>

                <div className="game-presets">
                  {TIME_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="btn secondary game-preset-btn"
                      onClick={() => void startOrAdd(st, m)}
                    >
                      +{m < 60 ? `${m}m` : `${m / 60}h`}
                    </button>
                  ))}
                </div>

                <div className="btn-row game-tile-actions">
                  {st.status === 'active' ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void toStandby(st)}
                    >
                      {t(lang, 'gameToStandby')}
                    </button>
                  ) : null}
                  {st.status === 'standby' ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => liberate(st)}
                    >
                      {t(lang, 'gameFreeBtn')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      setConfigId(configuring ? null : st.id)
                    }
                  >
                    {t(lang, 'gameTvConfig')}
                  </button>
                </div>

                {configuring ? (
                  <TvConfigForm
                    lang={lang}
                    station={st}
                    onSave={(patch) => {
                      saveTvConfig(st, patch)
                      setConfigId(null)
                    }}
                    onTestOff={() => void turnTvOff(st).then((res) => {
                      onFlash(
                        res.ok
                          ? t(lang, 'gameTvOffOk').replace('{name}', st.name)
                          : t(lang, 'gameTvOffFail').replace('{name}', st.name),
                      )
                    })}
                    onTestOn={() => void turnTvOn(st).then((res) => {
                      onFlash(
                        res.ok
                          ? t(lang, 'gameTvOnOk').replace('{name}', st.name)
                          : t(lang, 'gameTvOnFail').replace('{name}', st.name),
                      )
                    })}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function TvConfigForm({
  lang,
  station,
  onSave,
  onTestOn,
  onTestOff,
}: {
  lang: Language
  station: GameStation
  onSave: (patch: {
    tvKind: TvControlKind
    tvHost: string
    tvOnUrl: string
    tvOffUrl: string
  }) => void
  onTestOn: () => void
  onTestOff: () => void
}) {
  const [tvKind, setTvKind] = useState<TvControlKind>(station.tvKind || 'shelly')
  const [tvHost, setTvHost] = useState(station.tvHost || '')
  const [tvOnUrl, setTvOnUrl] = useState(station.tvOnUrl || '')
  const [tvOffUrl, setTvOffUrl] = useState(station.tvOffUrl || '')

  return (
    <div className="game-tv-form">
      <div className="field">
        <label>{t(lang, 'gameTvKind')}</label>
        <select
          value={tvKind}
          onChange={(e) => setTvKind(e.target.value as TvControlKind)}
        >
          <option value="shelly">Shelly (Wi‑Fi)</option>
          <option value="tasmota">Tasmota / Sonoff</option>
          <option value="custom">{t(lang, 'gameTvCustom')}</option>
        </select>
      </div>
      {tvKind !== 'custom' ? (
        <div className="field">
          <label>{t(lang, 'gameTvHost')}</label>
          <input
            value={tvHost}
            onChange={(e) => setTvHost(e.target.value)}
            placeholder="192.168.1.50"
            inputMode="decimal"
            autoComplete="off"
          />
        </div>
      ) : (
        <>
          <div className="field">
            <label>{t(lang, 'gameTvOnUrl')}</label>
            <input
              value={tvOnUrl}
              onChange={(e) => setTvOnUrl(e.target.value)}
              placeholder="http://192.168.1.50/…"
            />
          </div>
          <div className="field">
            <label>{t(lang, 'gameTvOffUrl')}</label>
            <input
              value={tvOffUrl}
              onChange={(e) => setTvOffUrl(e.target.value)}
              placeholder="http://192.168.1.50/…"
            />
          </div>
        </>
      )}
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="btn"
          onClick={() =>
            onSave({
              tvKind,
              tvHost: tvHost.trim(),
              tvOnUrl: tvOnUrl.trim(),
              tvOffUrl: tvOffUrl.trim(),
            })
          }
        >
          {t(lang, 'save')}
        </button>
        <button type="button" className="btn secondary" onClick={onTestOn}>
          {t(lang, 'gameTvTestOn')}
        </button>
        <button type="button" className="btn secondary" onClick={onTestOff}>
          {t(lang, 'gameTvTestOff')}
        </button>
      </div>
    </div>
  )
}
