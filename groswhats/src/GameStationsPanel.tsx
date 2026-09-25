import { useEffect, useRef, useState } from 'react'
import type {
  AppState,
  GameStation,
  Language,
  TvControlKind,
} from './types'
import { t } from './i18n'
import {
  addGameStation,
  addGameStationTime,
  billGameSession,
  ensureGameStations,
  expireGameStations,
  freeGameStation,
  gameFreeMaxMinutes,
  grantGameFreeMinutes,
  match4RateDa,
  removeGameStation,
  resolveGameTariffs,
  setGameStationStandby,
  setGameStationCount,
  sellerCanGrantFreeMinutes,
  stationConsole,
  stationMatchMinutes,
  tariffForConsole,
  updateGameStation,
} from './store'
import {
  stationHasTvControl,
  turnTvOff,
  turnTvOn,
} from './utils/tvControl'
import { playBarcodeError, playCash } from './utils/sfx'

const HOUR_PRESETS = [15, 30, 60, 120] as const
const FREE_MIN_PRESETS = [5, 10, 15] as const

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
  const [billCash, setBillCash] = useState(true)
  const [countDraft, setCountDraft] = useState(
    String((state.gameStations ?? []).length || 15),
  )
  const [customMin, setCustomMin] = useState('')
  const expiredHandled = useRef<Set<string>>(new Set())
  const stateRef = useRef(state)
  stateRef.current = state

  const tariffs = resolveGameTariffs(state)

  useEffect(() => {
    const next = ensureGameStations(stateRef.current)
    if (next !== stateRef.current) onState(next)
  }, [onState])

  useEffect(() => {
    setCountDraft(String((state.gameStations ?? []).length || 0))
  }, [state.gameStations])

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
        onFlash(t(lang, 'gameStationExpired').replace('{name}', st.name))
        void turnTvOff(st).then((res) => {
          if (res.ok) onFlash(t(lang, 'gameTvOffOk').replace('{name}', st.name))
          else if (res.reason === 'network') {
            onFlash(t(lang, 'gameTvOffFail').replace('{name}', st.name))
          }
        })
      }
    }, 1000)
    return () => window.clearInterval(tick)
  }, [lang, onFlash, onState])

  useEffect(() => {
    for (const g of state.gameStations ?? []) {
      if (g.status === 'active') expiredHandled.current.delete(g.id)
    }
  }, [state.gameStations])

  const stations = state.gameStations ?? []
  const activeCount = stations.filter((g) => g.status === 'active').length
  const standbyCount = stations.filter((g) => g.status === 'standby').length
  const tvCount = stations.filter((g) => stationHasTvControl(g)).length

  async function applyStart(
    st: GameStation,
    mode: 'hour' | 'match' | 'match4' | 'extra',
    opts: { minutes?: number; matches?: number; matchMinutes?: number },
  ) {
    const wasFree = st.status !== 'active'
    const label = labelDraft.trim() || st.clientLabel
    let nextState = state
    let totalDa = 0
    let minutes = 0

    if (billCash) {
      const res = billGameSession(state, {
        stationId: st.id,
        mode,
        minutes: opts.minutes,
        matches: opts.matches,
        matchMinutes: opts.matchMinutes,
        clientLabel: label,
        billCash: true,
      })
      nextState = res.state
      totalDa = res.totalDa
      minutes = res.minutes
    } else {
      const mins =
        mode === 'match' || mode === 'match4' || mode === 'extra'
          ? (opts.matchMinutes ||
              (mode === 'extra'
                ? tariffs.extraRoundMinutes
                : stationMatchMinutes(state, st))) *
            Math.max(1, opts.matches || 1)
          : Math.max(1, opts.minutes || 60)
      nextState = addGameStationTime(state, st.id, mins, label)
      if ((mode === 'match' || mode === 'match4') && opts.matchMinutes) {
        nextState = updateGameStation(nextState, st.id, {
          matchMinutes: opts.matchMinutes,
        })
      }
      minutes = mins
    }

    onState(nextState)
    playCash()
    onFlash(
      billCash
        ? t(lang, 'gameTimeBilled')
            .replace('{name}', st.name)
            .replace('{min}', String(minutes))
            .replace('{da}', String(totalDa))
        : t(lang, 'gameTimeAdded')
            .replace('{name}', st.name)
            .replace('{min}', String(minutes)),
    )
    setLabelDraft('')
    if (wasFree && stationHasTvControl(st)) {
      const updated = nextState.gameStations.find((g) => g.id === st.id) || st
      const res = await turnTvOn(updated)
      if (res.ok) onFlash(t(lang, 'gameTvOnOk').replace('{name}', st.name))
      else if (res.reason === 'network') {
        onFlash(t(lang, 'gameTvOnFail').replace('{name}', st.name))
      }
    }
  }

  async function applyFree(
    st: GameStation,
    mode: 'hour' | 'match' | 'match4' | 'extra',
    opts: { minutes?: number; matches?: number; matchMinutes?: number },
  ) {
    if (!sellerCanGrantFreeMinutes(state)) {
      onFlash(t(lang, 'gameFreeDenied'))
      return
    }
    const wasFree = st.status !== 'active'
    const label = labelDraft.trim() || st.clientLabel
    const res = grantGameFreeMinutes(state, {
      stationId: st.id,
      mode,
      minutes: opts.minutes,
      matches: opts.matches,
      matchMinutes: opts.matchMinutes,
      clientLabel: label,
    })
    if (!res.ok) {
      if (res.reason === 'denied') onFlash(t(lang, 'gameFreeDenied'))
      else if (res.reason === 'cap') {
        onFlash(
          t(lang, 'gameFreeCapHit').replace(
            '{max}',
            String(gameFreeMaxMinutes(state)),
          ),
        )
      } else onFlash(t(lang, 'gamePriceBad'))
      return
    }
    onState(res.state)
    playCash()
    onFlash(
      t(lang, 'gameFreeGranted')
        .replace('{name}', st.name)
        .replace('{min}', String(res.minutes)),
    )
    setLabelDraft('')
    if (wasFree && stationHasTvControl(st)) {
      const updated = res.state.gameStations.find((g) => g.id === st.id) || st
      const tv = await turnTvOn(updated)
      if (tv.ok) onFlash(t(lang, 'gameTvOnOk').replace('{name}', st.name))
      else if (tv.reason === 'network') {
        onFlash(t(lang, 'gameTvOnFail').replace('{name}', st.name))
      }
    }
  }

  const canFree = sellerCanGrantFreeMinutes(state)
  const freeCap = gameFreeMaxMinutes(state)

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
            {stations.length} {t(lang, 'gamePosts')}
          </span>
          <span>
            {tvCount} {t(lang, 'gameTvPlugs')}
          </span>
          <span>
            {activeCount} {t(lang, 'gameActive')}
          </span>
          <span>
            {standbyCount} {t(lang, 'gameStandby')}
          </span>
        </div>
      </div>

      <div className="game-tariff-strip muted">
        {tariffs.consoles.map((c) => (
          <span key={c.id} className="game-tariff-chip">
            {c.label} {c.hourDa} DA/h
            {c.matchDa > 0
              ? ` · ${c.matchDa} DA/${t(lang, 'gameMatchShort')}`
              : ''}
            {(c.match4Da ?? (c.matchDa > 0 ? c.matchDa * 2 : 0)) > 0
              ? ` · ${c.match4Da ?? c.matchDa * 2} DA/${t(lang, 'gameMatch4Short')}`
              : ''}
            {c.extraRoundDa > 0
              ? ` · ${c.extraRoundDa} DA/${t(lang, 'gameExtraShort')}`
              : ''}
          </span>
        ))}
        <span className="game-tariff-chip">
          {t(lang, 'gameMatchDefault')}: {tariffs.matchMinutes} min
        </span>
        <span className="game-tariff-chip">
          {t(lang, 'gameExtraDefault')}: {tariffs.extraRoundMinutes} min
        </span>
      </div>

      <div className="game-count-row">
        <div className="field" style={{ flex: 1, margin: 0 }}>
          <label>{t(lang, 'gameStationCount')}</label>
          <input
            type="number"
            min={1}
            max={30}
            value={countDraft}
            onChange={(e) => setCountDraft(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const n = Number(countDraft)
            if (!Number.isFinite(n) || n < 1) {
              onFlash(t(lang, 'gameCountBad'))
              return
            }
            onState(setGameStationCount(state, n))
            onFlash(
              t(lang, 'gameCountSaved').replace('{n}', String(Math.round(n))),
            )
          }}
        >
          {t(lang, 'gameApplyCount')}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            onState(addGameStation(state))
            onFlash(t(lang, 'gameStationAdded'))
          }}
        >
          + {t(lang, 'gameAddStation')}
        </button>
      </div>

      <p className="muted game-tv-note">{t(lang, 'gameTvLanNote')}</p>

      <label className="field check-row">
        <input
          type="checkbox"
          checked={billCash}
          onChange={(e) => setBillCash(e.target.checked)}
        />
        <span>{t(lang, 'gameBillCash')}</span>
      </label>

      <div className="field game-label-field">
        <label>{t(lang, 'gameClientLabel')}</label>
        <input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          placeholder={t(lang, 'gameClientLabelHint')}
        />
      </div>

      <div className="game-custom-min">
        <input
          type="number"
          min={1}
          placeholder={t(lang, 'gameCustomMin')}
          value={customMin}
          onChange={(e) => setCustomMin(e.target.value)}
        />
      </div>

      {stations.length === 0 ? (
        <div className="empty">{t(lang, 'gameStationsEmpty')}</div>
      ) : (
        <div className="game-grid">
          {stations.map((st) => (
            <StationTile
              key={st.id}
              st={st}
              now={now}
              lang={lang}
              state={state}
              configuring={configId === st.id}
              customMin={customMin}
              onToggleConfig={() =>
                setConfigId(configId === st.id ? null : st.id)
              }
              onHour={(minutes) => void applyStart(st, 'hour', { minutes })}
              onMatch={() =>
                void applyStart(st, 'match', {
                  matches: 1,
                  matchMinutes: stationMatchMinutes(state, st),
                })
              }
              onMatch4={() =>
                void applyStart(st, 'match4', {
                  matches: 1,
                  matchMinutes: stationMatchMinutes(state, st),
                })
              }
              onExtra={() =>
                void applyStart(st, 'extra', {
                  matches: 1,
                  matchMinutes: tariffs.extraRoundMinutes,
                })
              }
              canFree={canFree}
              freeCap={freeCap}
              onFreeHour={(minutes) => void applyFree(st, 'hour', { minutes })}
              onFreeMatch={() =>
                void applyFree(st, 'match', {
                  matches: 1,
                  matchMinutes: stationMatchMinutes(state, st),
                })
              }
              onFreeMatch4={() =>
                void applyFree(st, 'match4', {
                  matches: 1,
                  matchMinutes: stationMatchMinutes(state, st),
                })
              }
              onFreeExtra={() =>
                void applyFree(st, 'extra', {
                  matches: 1,
                  matchMinutes: tariffs.extraRoundMinutes,
                })
              }
              onStandby={async () => {
                onState(setGameStationStandby(state, st.id))
                onFlash(t(lang, 'gameStandbyOk').replace('{name}', st.name))
                if (stationHasTvControl(st)) {
                  const res = await turnTvOff(st)
                  if (res.ok) {
                    onFlash(t(lang, 'gameTvOffOk').replace('{name}', st.name))
                  } else if (res.reason === 'network') {
                    onFlash(t(lang, 'gameTvOffFail').replace('{name}', st.name))
                  }
                }
              }}
              onFree={() => {
                onState(freeGameStation(state, st.id))
                onFlash(t(lang, 'gameFreeOk').replace('{name}', st.name))
              }}
              onRemove={() => {
                if (st.status === 'active') {
                  onFlash(t(lang, 'gameCantRemoveActive'))
                  return
                }
                onState(removeGameStation(state, st.id))
                onFlash(t(lang, 'gameStationRemoved'))
              }}
              onSaveTv={(patch) => {
                onState(updateGameStation(state, st.id, patch))
                onFlash(t(lang, 'gameTvSaved'))
                setConfigId(null)
              }}
              onTestOn={() =>
                void turnTvOn(st).then((res) => {
                  onFlash(
                    res.ok
                      ? t(lang, 'gameTvOnOk').replace('{name}', st.name)
                      : t(lang, 'gameTvOnFail').replace('{name}', st.name),
                  )
                })
              }
              onTestOff={() =>
                void turnTvOff(st).then((res) => {
                  onFlash(
                    res.ok
                      ? t(lang, 'gameTvOffOk').replace('{name}', st.name)
                      : t(lang, 'gameTvOffFail').replace('{name}', st.name),
                  )
                })
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}

function StationTile({
  st,
  now,
  lang,
  state,
  configuring,
  customMin,
  onToggleConfig,
  onHour,
  onMatch,
  onMatch4,
  onExtra,
  canFree,
  freeCap,
  onFreeHour,
  onFreeMatch,
  onFreeMatch4,
  onFreeExtra,
  onStandby,
  onFree,
  onRemove,
  onSaveTv,
  onTestOn,
  onTestOff,
}: {
  st: GameStation
  now: number
  lang: Language
  state: AppState
  configuring: boolean
  customMin: string
  onToggleConfig: () => void
  onHour: (minutes: number) => void
  onMatch: () => void
  onMatch4: () => void
  onExtra: () => void
  canFree: boolean
  freeCap: number
  onFreeHour: (minutes: number) => void
  onFreeMatch: () => void
  onFreeMatch4: () => void
  onFreeExtra: () => void
  onStandby: () => void | Promise<void>
  onFree: () => void
  onRemove: () => void
  onSaveTv: (patch: {
    tvKind?: TvControlKind
    tvHost?: string
    tvMac?: string
    tvAdbPort?: number
    tvOnUrl?: string
    tvOffUrl?: string
    name?: string
  }) => void
  onTestOn: () => void
  onTestOff: () => void
}) {
  const rem = remainingMs(st.endsAt, now)
  const warn = st.status === 'active' && rem > 0 && rem <= 5 * 60_000
  const kind = stationConsole(st)
  const matchMin = stationMatchMinutes(state, st)
  const tariff = tariffForConsole(state, kind)
  const hourDa = tariff.hourDa
  const matchDa = tariff.matchDa
  const match4Da = match4RateDa(state, kind)
  const extraDa = tariff.extraRoundDa
  const freePresets = FREE_MIN_PRESETS.filter((m) => m <= freeCap)

  const tileClass = [
    'game-tile',
    `is-${st.status}`,
    warn ? 'is-warn' : '',
    `is-${kind}`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={tileClass}>
      <div className="game-tile-top">
        <strong>{st.name}</strong>
        <span className="game-console-badge">{tariff.label}</span>
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
          : `${hourDa} DA/h${
              matchDa > 0
                ? ` · ${matchDa} DA/${t(lang, 'gameMatchShort')} (${matchMin} min)`
                : ''
            }${
              match4Da > 0
                ? ` · ${match4Da} DA/${t(lang, 'gameMatch4Short')}`
                : ''
            }${
              extraDa > 0
                ? ` · ${extraDa} DA/${t(lang, 'gameExtraShort')}`
                : ''
            }`}
        {st.freeMinutes && st.freeMinutes > 0
          ? ` · ${t(lang, 'gameFreeSession').replace('{n}', String(st.freeMinutes))}`
          : ''}
      </div>

      <div className="game-presets">
        {HOUR_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            className="btn secondary game-preset-btn"
            onClick={() => onHour(m)}
          >
            +{m < 60 ? `${m}m` : `${m / 60}h`}
          </button>
        ))}
      </div>
      {customMin ? (
        <button
          type="button"
          className="btn block"
          style={{ marginTop: 4 }}
          onClick={() => {
            const m = Math.round(Number(customMin))
            if (m >= 1) onHour(m)
          }}
        >
          +{customMin} min
        </button>
      ) : null}

      <div className="btn-row game-tile-actions" style={{ marginTop: 8 }}>
        {matchDa > 0 ? (
          <button type="button" className="btn" onClick={onMatch}>
            +{t(lang, 'gameMatchShort')} {matchMin}′ ({matchDa} DA)
          </button>
        ) : null}
        {match4Da > 0 ? (
          <button type="button" className="btn secondary" onClick={onMatch4}>
            +{t(lang, 'gameMatch4Short')} {matchMin}′ ({match4Da} DA)
          </button>
        ) : null}
        {extraDa > 0 ? (
          <button type="button" className="btn secondary" onClick={onExtra}>
            +{t(lang, 'gameExtraShort')} ({extraDa} DA)
          </button>
        ) : null}
      </div>

      {canFree ? (
        <div className="game-free-actions">
          <div className="muted game-free-label">{t(lang, 'gameFreeShort')}</div>
          <div className="game-presets">
            {freePresets.map((m) => (
              <button
                key={`f${m}`}
                type="button"
                className="btn ghost game-free-btn"
                onClick={() => onFreeHour(m)}
              >
                +{m}′
              </button>
            ))}
            {customMin ? (
              <button
                type="button"
                className="btn ghost game-free-btn"
                onClick={() => {
                  const m = Math.round(Number(customMin))
                  if (m >= 1) onFreeHour(m)
                }}
              >
                +{customMin}′
              </button>
            ) : null}
          </div>
          <div className="btn-row game-tile-actions">
            {matchDa > 0 || matchMin > 0 ? (
              <button
                type="button"
                className="btn ghost game-free-btn"
                onClick={onFreeMatch}
              >
                {t(lang, 'gameFreeMatch')}
              </button>
            ) : null}
            {match4Da > 0 ? (
              <button
                type="button"
                className="btn ghost game-free-btn"
                onClick={onFreeMatch4}
              >
                {t(lang, 'gameFreeMatch4')}
              </button>
            ) : null}
            {extraDa > 0 ? (
              <button
                type="button"
                className="btn ghost game-free-btn"
                onClick={onFreeExtra}
              >
                {t(lang, 'gameFreeExtra')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="btn-row game-tile-actions">
        {st.status === 'active' ? (
          <button type="button" className="btn" onClick={() => void onStandby()}>
            {t(lang, 'gameToStandby')}
          </button>
        ) : null}
        {st.status === 'standby' ? (
          <button type="button" className="btn" onClick={onFree}>
            {t(lang, 'gameFreeBtn')}
          </button>
        ) : null}
        <button type="button" className="btn secondary" onClick={onToggleConfig}>
          {t(lang, 'gameTvConfig')}
        </button>
        {st.status !== 'active' ? (
          <button type="button" className="btn ghost" onClick={onRemove}>
            ✕
          </button>
        ) : null}
      </div>

      {configuring ? (
        <TvConfigForm
          lang={lang}
          station={st}
          onSave={onSaveTv}
          onTestOn={onTestOn}
          onTestOff={onTestOff}
        />
      ) : null}
    </div>
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
    tvMac: string
    tvAdbPort?: number
    tvOnUrl: string
    tvOffUrl: string
  }) => void
  onTestOn: () => void
  onTestOff: () => void
}) {
  const [tvKind, setTvKind] = useState<TvControlKind>(
    station.tvKind || 'google_tv',
  )
  const [tvHost, setTvHost] = useState(station.tvHost || '')
  const [tvMac, setTvMac] = useState(station.tvMac || '')
  const [tvAdbPort, setTvAdbPort] = useState(
    String(station.tvAdbPort || 5555),
  )
  const [tvOnUrl, setTvOnUrl] = useState(station.tvOnUrl || '')
  const [tvOffUrl, setTvOffUrl] = useState(station.tvOffUrl || '')

  const needsHost =
    tvKind === 'shelly' ||
    tvKind === 'tasmota' ||
    tvKind === 'smart_tv' ||
    tvKind === 'google_tv'
  const needsUrls = tvKind === 'custom' || tvKind === 'smart_tv'
  const needsMac = tvKind === 'smart_tv' || tvKind === 'google_tv'

  return (
    <div className="game-tv-form">
      <p className="muted" style={{ marginTop: 0, fontSize: '0.8rem' }}>
        {tvKind === 'google_tv'
          ? t(lang, 'gameTvGoogleHint')
          : t(lang, 'gameTvSmartHint')}
      </p>
      <div className="field">
        <label>{t(lang, 'gameTvKind')}</label>
        <select
          value={tvKind}
          onChange={(e) => setTvKind(e.target.value as TvControlKind)}
        >
          <option value="google_tv">{t(lang, 'gameTvGoogle')}</option>
          <option value="smart_tv">{t(lang, 'gameTvSmart')}</option>
          <option value="shelly">Shelly (prise Wi‑Fi)</option>
          <option value="tasmota">Tasmota / Sonoff</option>
          <option value="custom">{t(lang, 'gameTvCustom')}</option>
        </select>
      </div>
      {needsHost ? (
        <div className="field">
          <label>
            {tvKind === 'google_tv'
              ? t(lang, 'gameTvHostGoogle')
              : tvKind === 'smart_tv'
                ? t(lang, 'gameTvHostSmart')
                : t(lang, 'gameTvHost')}
          </label>
          <input
            value={tvHost}
            onChange={(e) => setTvHost(e.target.value)}
            placeholder="192.168.1.50"
            inputMode="decimal"
            autoComplete="off"
          />
        </div>
      ) : null}
      {needsMac ? (
        <div className="field">
          <label>{t(lang, 'gameTvMac')}</label>
          <input
            value={tvMac}
            onChange={(e) => setTvMac(e.target.value)}
            placeholder="AA:BB:CC:DD:EE:FF"
            autoComplete="off"
          />
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>
            {t(lang, 'gameTvMacHint')}
          </p>
        </div>
      ) : null}
      {tvKind === 'google_tv' ? (
        <div className="field">
          <label>{t(lang, 'gameTvAdbPort')}</label>
          <input
            type="number"
            min={1}
            max={65535}
            value={tvAdbPort}
            onChange={(e) => setTvAdbPort(e.target.value)}
            placeholder="5555"
          />
        </div>
      ) : null}
      {needsUrls ? (
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
          {tvKind === 'smart_tv' ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.75rem' }}>
              {t(lang, 'gameTvSmartUrlsHint')}
            </p>
          ) : null}
        </>
      ) : null}
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const port = Math.round(Number(tvAdbPort))
            onSave({
              tvKind,
              tvHost: tvHost.trim(),
              tvMac: tvMac.trim(),
              tvAdbPort:
                tvKind === 'google_tv' && Number.isFinite(port) && port > 0
                  ? port
                  : undefined,
              tvOnUrl: tvOnUrl.trim(),
              tvOffUrl: tvOffUrl.trim(),
            })
          }}
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
