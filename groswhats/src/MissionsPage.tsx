import { useEffect, useMemo, useState } from 'react'
import type { AppState, Driver, Language, Mission, MissionStop } from './types'
import { t } from './i18n'
import { WILAYAS, matchWilayaCode, wilayaByCode } from './data/wilayas'
import { openWhatsappText } from './utils/whatsapp'
import {
  missionWhatsappText,
  pushTeamCloud,
  type MissionPack,
} from './sync/teamApi'
import { formatDa } from './utils/format'
import {
  addDriver,
  createMission,
  deleteDriver,
  deleteMission,
  ensureCompanyCode,
  missionCollectTotal,
  reorderMissionStops,
  updateDriver,
  updateMission,
  updateMissionStop,
  updateTeam,
} from './store'
import { DriverHome } from './DriverHome'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function sortedStops(m: Mission): MissionStop[] {
  return [...m.stops].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function MissionsPage({
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
  const ready = ensureCompanyCode(state)
  useEffect(() => {
    if (
      ready.team.companyCode !== state.team.companyCode ||
      ready.team.syncSecret !== state.team.syncSecret
    ) {
      onState(ready)
    }
  }, [ready, state.team.companyCode, state.team.syncSecret, onState])

  if (state.team.role === 'driver') {
    return (
      <DriverHome
        state={state}
        lang={lang}
        onState={onState}
        onFlash={onFlash}
      />
    )
  }

  return (
    <OwnerMissionsView
      state={state}
      lang={lang}
      onState={onState}
      onFlash={onFlash}
    />
  )
}

function OwnerMissionsView({
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
  const [tab, setTab] = useState<'missions' | 'drivers' | 'team'>('missions')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('1234')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayIso())
  const [wilayaCode, setWilayaCode] = useState(
    matchWilayaCode(state.settings.city) || '16',
  )
  const [driverId, setDriverId] = useState(state.drivers[0]?.id || '')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const clientsInZone = useMemo(() => {
    return state.clients.filter((c) => {
      const code = matchWilayaCode(c.city)
      return !code || code === wilayaCode
    })
  }, [state.clients, wilayaCode])

  async function syncPush(override?: AppState) {
    setBusy(true)
    const s = ensureCompanyCode(override ?? state)
    const res = await pushTeamCloud({
      companyCode: s.team.companyCode,
      syncSecret: s.team.syncSecret,
      shopName: s.settings.shopName,
      drivers: s.drivers,
      missions: s.missions,
      updatedAt: new Date().toISOString(),
    })
    setBusy(false)
    onFlash(res.ok ? 'teamSynced' : 'teamSyncFail')
    return res.ok
  }

  function shareMission(m: Mission) {
    const driver = state.drivers.find((d) => d.id === m.driverId)
    const pack: MissionPack = {
      v: 1,
      companyCode: state.team.companyCode,
      mission: m,
      driverName: driver?.name,
    }
    const text = missionWhatsappText(pack, state.settings.shopName)
    openWhatsappText(driver?.phone || '', text)
    onFlash('missionShared')
  }

  async function sendTour(m: Mission) {
    const ok = await syncPush()
    shareMission(m)
    if (ok) onFlash('tourSent')
  }

  return (
    <div className="page">
      <div className="card">
        <h2>🚚 {t(lang, 'missions')}</h2>
        <p className="muted">{t(lang, 'missionsHint')}</p>
        <div className="btn-row">
          <button
            type="button"
            className={`btn ${tab === 'missions' ? '' : 'secondary'}`}
            onClick={() => setTab('missions')}
          >
            {t(lang, 'tours')}
          </button>
          <button
            type="button"
            className={`btn ${tab === 'drivers' ? '' : 'secondary'}`}
            onClick={() => setTab('drivers')}
          >
            {t(lang, 'drivers')}
          </button>
          <button
            type="button"
            className={`btn ${tab === 'team' ? '' : 'secondary'}`}
            onClick={() => setTab('team')}
          >
            {t(lang, 'teamSetup')}
          </button>
        </div>
      </div>

      {tab === 'team' ? (
        <div className="card">
          <h3>{t(lang, 'teamSetup')}</h3>
          <div className="notice">
            <div>
              <strong>{t(lang, 'companyCode')} :</strong>{' '}
              {state.team.companyCode}
            </div>
            <div>
              <strong>{t(lang, 'syncSecret')} :</strong> {state.team.syncSecret}
            </div>
          </div>
          <p className="muted">{t(lang, 'teamSetupHint')}</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => void syncPush()}
            >
              ☁️ {t(lang, 'syncPush')}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() =>
                onState((s) =>
                  updateTeam(s, {
                    role: 'driver',
                    hasChosenRole: true,
                    currentDriverId: null,
                  }),
                )
              }
            >
              {t(lang, 'switchToDriver')}
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'drivers' ? (
        <>
          <div className="card">
            <h3>{t(lang, 'addDriver')}</h3>
            <div className="field">
              <label>{t(lang, 'driverName')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>{t(lang, 'phone')}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label>{t(lang, 'driverPin')}</label>
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
              disabled={!name.trim() || pin.length < 4}
              onClick={() => {
                let next: AppState | null = null
                onState((s) => {
                  next = addDriver(s, {
                    name: name.trim(),
                    phone: phone.trim(),
                    pin,
                  })
                  return next
                })
                setName('')
                setPhone('')
                setPin('1234')
                onFlash('driverAdded')
                if (next) void syncPush(next)
              }}
            >
              {t(lang, 'addDriver')}
            </button>
          </div>
          <div className="card">
            <h3>
              {t(lang, 'drivers')} ({state.drivers.length})
            </h3>
            {state.drivers.length === 0 ? (
              <div className="empty">{t(lang, 'noDrivers')}</div>
            ) : (
              state.drivers.map((d) => (
                <div className="list-item" key={d.id}>
                  <div>
                    <strong>{d.name}</strong>
                    <div className="muted">
                      {d.phone || '—'} · PIN {d.pin}
                      {!d.active ? ` · ${t(lang, 'inactive')}` : ''}
                    </div>
                  </div>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() =>
                        onState((s) =>
                          updateDriver(s, d.id, { active: !d.active }),
                        )
                      }
                    >
                      {d.active ? t(lang, 'deactivate') : t(lang, 'activate')}
                    </button>
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => {
                        onState((s) => deleteDriver(s, d.id))
                        onFlash('driverDeleted')
                      }}
                    >
                      {t(lang, 'delete')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}

      {tab === 'missions' ? (
        <>
          <div className="card">
            <h3>{t(lang, 'newTour')}</h3>
            <div className="field">
              <label>{t(lang, 'tourTitle')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t(lang, 'tourTitleHint')}
              />
            </div>
            <div className="field">
              <label>{t(lang, 'date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t(lang, 'selectWilaya')}</label>
              <select
                value={wilayaCode}
                onChange={(e) => {
                  setWilayaCode(e.target.value)
                  setSelectedClients([])
                }}
              >
                {WILAYAS.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} — {lang === 'ar' ? w.nameAr : w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t(lang, 'assignDriver')}</label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              >
                <option value="">{t(lang, 'noDriverYet')}</option>
                {state.drivers
                  .filter((d) => d.active)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>
                {t(lang, 'pickClients')} ({selectedClients.length})
              </label>
              <div className="client-pick-list">
                {clientsInZone.length === 0 ? (
                  <div className="muted">{t(lang, 'noClientsInZone')}</div>
                ) : (
                  clientsInZone.map((c) => {
                    const on = selectedClients.includes(c.id)
                    return (
                      <label key={c.id} className="check-row">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setSelectedClients((prev) =>
                              on
                                ? prev.filter((id) => id !== c.id)
                                : [...prev, c.id],
                            )
                          }
                        />
                        <span>
                          <strong>{c.name}</strong>
                          <div className="muted">
                            {[c.address, c.city].filter(Boolean).join(' · ') ||
                              t(lang, 'noLocation')}
                          </div>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
            {selectedClients.length > 1 ? (
              <div className="field">
                <label>{t(lang, 'stopOrder')}</label>
                <div className="stop-order-list">
                  {selectedClients.map((id, idx) => {
                    const c = state.clients.find((x) => x.id === id)
                    if (!c) return null
                    return (
                      <div className="list-item" key={id}>
                        <span>
                          {idx + 1}. {c.name}
                        </span>
                        <div className="btn-row">
                          <button
                            type="button"
                            className="btn ghost"
                            disabled={idx === 0}
                            onClick={() =>
                              setSelectedClients((prev) => {
                                const next = [...prev]
                                ;[next[idx - 1], next[idx]] = [
                                  next[idx],
                                  next[idx - 1],
                                ]
                                return next
                              })
                            }
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            disabled={idx === selectedClients.length - 1}
                            onClick={() =>
                              setSelectedClients((prev) => {
                                const next = [...prev]
                                ;[next[idx], next[idx + 1]] = [
                                  next[idx + 1],
                                  next[idx],
                                ]
                                return next
                              })
                            }
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="btn block"
              disabled={selectedClients.length === 0 || busy}
              onClick={() => {
                let next: AppState | null = null
                onState((s) => {
                  next = createMission(s, {
                    title:
                      title.trim() ||
                      `${t(lang, 'tour')} ${
                        wilayaByCode(wilayaCode)?.name || wilayaCode
                      }`,
                    date,
                    wilayaCode,
                    driverId,
                    clientIds: selectedClients,
                  })
                  return next
                })
                setTitle('')
                setSelectedClients([])
                onFlash('missionCreated')
                if (next) void syncPush(next)
              }}
            >
              {t(lang, 'createTour')}
            </button>
          </div>

          <div className="card">
            <h3>
              {t(lang, 'tours')} ({state.missions.length})
            </h3>
            {state.missions.length === 0 ? (
              <div className="empty">{t(lang, 'noMissions')}</div>
            ) : (
              state.missions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  driver={state.drivers.find((d) => d.id === m.driverId)}
                  lang={lang}
                  drivers={state.drivers}
                  onAssign={(id) => {
                    let next: AppState | null = null
                    onState((s) => {
                      next = updateMission(s, m.id, {
                        driverId: id,
                        status: id ? 'assigned' : 'draft',
                      })
                      return next
                    })
                    if (next) void syncPush(next)
                  }}
                  onReorder={(stopIds) => {
                    let next: AppState | null = null
                    onState((s) => {
                      next = reorderMissionStops(s, m.id, stopIds)
                      return next
                    })
                    if (next) void syncPush(next)
                  }}
                  onSend={() => void sendTour(m)}
                  onShare={() => shareMission(m)}
                  onCollectChange={(stopId, collectDa) => {
                    onState((s) =>
                      updateMissionStop(s, m.id, stopId, { collectDa }),
                    )
                  }}
                  onDelete={() => {
                    onState((s) => deleteMission(s, m.id))
                    onFlash('missionDeleted')
                  }}
                />
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function MissionCard({
  mission,
  driver,
  lang,
  drivers,
  onAssign,
  onReorder,
  onSend,
  onShare,
  onCollectChange,
  onDelete,
}: {
  mission: Mission
  driver?: Driver
  lang: Language
  drivers: Driver[]
  onAssign: (driverId: string) => void
  onReorder: (stopIds: string[]) => void
  onSend: () => void
  onShare: () => void
  onCollectChange: (stopId: string, collectDa: number) => void
  onDelete: () => void
}) {
  const w = wilayaByCode(mission.wilayaCode)
  const stops = sortedStops(mission)
  const left = stops.filter((s) => s.status === 'todo').length
  const cash = missionCollectTotal(mission)

  function moveStop(index: number, dir: -1 | 1) {
    const ids = stops.map((s) => s.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    onReorder(ids)
  }

  return (
    <div className="order-block">
      <div className="list-item">
        <div>
          <strong>{mission.title}</strong>
          <div className="muted">
            {mission.date} ·{' '}
            {w ? (lang === 'ar' ? w.nameAr : w.name) : mission.wilayaCode} ·{' '}
            {t(lang, `mission_${mission.status}`)} · {left}/{stops.length}{' '}
            {t(lang, 'stopsLeft')}
          </div>
          <div className="muted">
            {driver ? driver.name : t(lang, 'noDriverYet')}
          </div>
          {cash.dueDa > 0 ? (
            <div className="cash-line">
              💵 {t(lang, 'toCollectToday')} : {formatDa(cash.dueDa)}
            </div>
          ) : null}
        </div>
      </div>
      <ol className="stop-plan">
        {stops.map((s, i) => (
          <li key={s.id}>
            <div className="stop-plan-row">
              <span>
                <strong>
                  {i + 1}. {s.clientName}
                </strong>
                <span className="muted">
                  {' '}
                  —{' '}
                  {[s.address, s.city].filter(Boolean).join(', ') ||
                    t(lang, 'noLocation')}
                  {s.status !== 'todo'
                    ? ` [${t(lang, `stop_${s.status}`)}]`
                    : ''}
                </span>
                <div className="field" style={{ marginTop: 4, maxWidth: 160 }}>
                  <label>💵 {t(lang, 'collectHere')}</label>
                  <input
                    inputMode="decimal"
                    value={String(s.collectDa || 0)}
                    onChange={(e) => {
                      const n = Number(
                        e.target.value.replace(',', '.').replace(/[^\d.]/g, ''),
                      )
                      onCollectChange(
                        s.id,
                        Number.isFinite(n) && n >= 0 ? +n.toFixed(2) : 0,
                      )
                    }}
                  />
                </div>
              </span>
              <span className="btn-row">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={i === 0}
                  onClick={() => moveStop(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={i === stops.length - 1}
                  onClick={() => moveStop(i, 1)}
                >
                  ↓
                </button>
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="field">
        <label>{t(lang, 'assignDriver')}</label>
        <select
          value={mission.driverId}
          onChange={(e) => onAssign(e.target.value)}
        >
          <option value="">{t(lang, 'noDriverYet')}</option>
          {drivers
            .filter((d) => d.active)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </div>
      <div className="btn-row">
        <button type="button" className="btn" onClick={onSend}>
          ☁️📲 {t(lang, 'sendTour')}
        </button>
        <button type="button" className="btn secondary" onClick={onShare}>
          📲 {t(lang, 'shareMissionWa')}
        </button>
        <button type="button" className="btn danger" onClick={onDelete}>
          {t(lang, 'delete')}
        </button>
      </div>
    </div>
  )
}
