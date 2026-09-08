import { useEffect, useRef, useState } from 'react'
import type { AppState, Language, Mission, MissionStop } from './types'
import { t } from './i18n'
import { wilayaByCode } from './data/wilayas'
import { mapsDirectionsUrl, clientMapsUrl } from './utils/maps'
import { openWhatsappText } from './utils/whatsapp'
import { formatDa } from './utils/format'
import {
  decodeMissionPack,
  joinAsDriver,
  patchMissionStop,
  pullTeamCloud,
} from './sync/teamApi'
import {
  mergeCloudDrivers,
  mergeCloudMissions,
  missionCollectTotal,
  missionsForDriverToday,
  updateMissionStop,
  updateTeam,
} from './store'

function sortedStops(m: Mission): MissionStop[] {
  return [...m.stops].sort((a, b) => a.sortOrder - b.sortOrder)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function phoneTelHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  return `tel:+${digits.startsWith('0') ? `213${digits.slice(1)}` : digits}`
}

/** Écran livreur : missions du jour + GPS + cash à encaisser (pas stock / prix d’achat). */
export function DriverHome({
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
  const [importText, setImportText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const silentPull = useRef(false)

  const driver = state.drivers.find((d) => d.id === state.team.currentDriverId)
  const mine = driver ? missionsForDriverToday(state, driver.id) : []
  const selected = mine.find((m) => m.id === selectedId) ?? mine[0] ?? null
  const today = todayIso()

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setMyPos({
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
        }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 3000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  async function doPull(silent = false) {
    if (!driver) return
    if (!silent) setBusy(true)
    silentPull.current = silent
    const res = await pullTeamCloud(
      state.team.companyCode,
      state.team.syncSecret,
      driver.id,
    )
    if (!silent) setBusy(false)
    if (!res.ok || !res.data) {
      if (!silent) onFlash('teamSyncFail')
      return
    }
    onState((s) => {
      let next = mergeCloudDrivers(s, res.data!.drivers)
      next = mergeCloudMissions(next, res.data!.missions)
      return next
    })
    setLastSync(new Date().toLocaleTimeString())
    if (!silent) onFlash('teamSynced')
  }

  useEffect(() => {
    if (!driver) return
    void doPull(true)
    const id = window.setInterval(() => void doPull(true), 45000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id, state.team.companyCode, state.team.syncSecret])

  async function login() {
    setBusy(true)
    const res = await joinAsDriver({
      companyCode: companyCode.trim().toUpperCase(),
      syncSecret: syncSecret.trim(),
      pin,
    })
    setBusy(false)
    if (!res.ok || !res.driver || !res.data) {
      const local = state.drivers.find(
        (d) => d.active && d.pin === pin.replace(/\D/g, '').slice(0, 4),
      )
      if (local) {
        onState((s) =>
          updateTeam(s, {
            role: 'driver',
            hasChosenRole: true,
            currentDriverId: local.id,
            companyCode: companyCode.trim().toUpperCase() || s.team.companyCode,
            syncSecret: syncSecret.trim() || s.team.syncSecret,
          }),
        )
        onFlash('driverLoggedIn')
        return
      }
      onFlash('driverLoginFail')
      return
    }
    onState((s) => {
      let next = updateTeam(s, {
        role: 'driver',
        hasChosenRole: true,
        currentDriverId: res.driver!.id,
        companyCode: res.data!.companyCode,
        syncSecret: res.data!.syncSecret,
      })
      next = mergeCloudDrivers(next, res.data!.drivers)
      next = mergeCloudMissions(next, res.data!.missions)
      return next
    })
    onFlash('driverLoggedIn')
  }

  function importPack() {
    const pack = decodeMissionPack(importText)
    if (!pack) {
      onFlash('missionImportFail')
      return
    }
    onState((s) => mergeCloudMissions(s, [pack.mission]))
    setImportText('')
    setSelectedId(pack.mission.id)
    onFlash('missionImported')
  }

  async function updateStop(
    missionId: string,
    stopId: string,
    patch: Partial<MissionStop>,
  ) {
    onState((s) => updateMissionStop(s, missionId, stopId, patch))
    const cloud = await patchMissionStop({
      companyCode: state.team.companyCode,
      syncSecret: state.team.syncSecret,
      missionId,
      stopId,
      status: patch.status,
      collectedDa: patch.collectedDa,
      note: patch.note,
    })
    if (cloud.ok && cloud.data) {
      onState((s) => {
        let next = mergeCloudDrivers(s, cloud.data!.drivers)
        next = mergeCloudMissions(next, cloud.data!.missions)
        return next
      })
    }
  }

  if (!driver) {
    return (
      <div className="page">
        <div className="card">
          <h2>🚚 {t(lang, 'driverLogin')}</h2>
          <p className="muted">{t(lang, 'driverLoginHint')}</p>
          <div className="field">
            <label>{t(lang, 'companyCode')}</label>
            <input
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
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
            disabled={busy || pin.length < 4}
            onClick={() => void login()}
          >
            {t(lang, 'loginDriver')}
          </button>
          <button
            type="button"
            className="btn ghost block"
            style={{ marginTop: 8 }}
            onClick={() =>
              onState((s) =>
                updateTeam(s, {
                  role: 'owner',
                  hasChosenRole: true,
                  currentDriverId: null,
                }),
              )
            }
          >
            {t(lang, 'switchToOwner')}
          </button>
        </div>

        <div className="card">
          <h3>{t(lang, 'importMission')}</h3>
          <p className="muted">{t(lang, 'importMissionHint')}</p>
          <textarea
            rows={4}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="GDZM1...."
          />
          <button
            type="button"
            className="btn secondary block"
            style={{ marginTop: 8 }}
            disabled={!importText.trim()}
            onClick={importPack}
          >
            {t(lang, 'importMission')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <h2>
          🚚 {driver.name} — {t(lang, 'myMissions')}
        </h2>
        <p className="muted">{t(lang, 'driverAppHint')}</p>
        {lastSync ? (
          <div className="muted">
            {t(lang, 'lastSync')} : {lastSync}
          </div>
        ) : null}
        <div className="btn-row">
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() => void doPull(false)}
          >
            ☁️ {t(lang, 'syncPull')}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              onState((s) =>
                updateTeam(s, {
                  role: 'owner',
                  hasChosenRole: true,
                  currentDriverId: null,
                }),
              )
            }
          >
            {t(lang, 'switchToOwner')}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>{t(lang, 'importMission')}</h3>
        <textarea
          rows={2}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="GDZM1...."
        />
        <button
          type="button"
          className="btn secondary block"
          style={{ marginTop: 8 }}
          disabled={!importText.trim()}
          onClick={importPack}
        >
          {t(lang, 'importMission')}
        </button>
      </div>

      {mine.length === 0 ? (
        <div className="card empty">{t(lang, 'noMissionsDriver')}</div>
      ) : (
        <>
          <div className="card">
            <label>{t(lang, 'selectMission')}</label>
            <select
              value={selected?.id || ''}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {mine.map((m) => {
                const left = m.stops.filter((s) => s.status === 'todo').length
                const tag =
                  m.date === today
                    ? t(lang, 'todayTag')
                    : m.date < today
                      ? t(lang, 'lateTag')
                      : m.date
                return (
                  <option key={m.id} value={m.id}>
                    [{tag}] {m.title} ({left})
                  </option>
                )
              })}
            </select>
          </div>

          {selected ? (
            <DriverMissionDetail
              mission={selected}
              lang={lang}
              myPos={myPos}
              shopName={state.settings.shopName}
              onUpdateStop={(stopId, patch) =>
                void updateStop(selected.id, stopId, patch)
              }
            />
          ) : null}
        </>
      )}
    </div>
  )
}

function DriverMissionDetail({
  mission,
  lang,
  myPos,
  shopName,
  onUpdateStop,
}: {
  mission: Mission
  lang: Language
  myPos: { lat: number; lng: number } | null
  shopName: string
  onUpdateStop: (stopId: string, patch: Partial<MissionStop>) => void
}) {
  const stops = sortedStops(mission)
  const w = wilayaByCode(mission.wilayaCode)
  const totals = missionCollectTotal(mission)
  const routePoints = stops
    .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
    .map((s) => ({ lat: s.lat!, lng: s.lng! }))
  const nextTodo = stops.find((s) => s.status === 'todo')

  return (
    <div className="card">
      <h3>{mission.title}</h3>
      <div className="muted">
        {mission.date} ·{' '}
        {w ? (lang === 'ar' ? w.nameAr : w.name) : mission.wilayaCode} ·{' '}
        {t(lang, `mission_${mission.status}`)}
      </div>

      {totals.dueDa > 0 ? (
        <div className="notice cash-banner">
          <strong>
            💵 {t(lang, 'toCollectToday')} : {formatDa(totals.dueDa)}
          </strong>
          {totals.takenDa > 0 ? (
            <div className="muted">
              {t(lang, 'alreadyCollected')} : {formatDa(totals.takenDa)}
            </div>
          ) : null}
        </div>
      ) : null}

      {nextTodo ? (
        <a
          className="btn block"
          style={{ marginTop: 10 }}
          href={
            ((typeof nextTodo.lat === 'number' && typeof nextTodo.lng === 'number'
              ? myPos
                ? mapsDirectionsUrl(myPos, {
                    lat: nextTodo.lat,
                    lng: nextTodo.lng,
                  })
                : clientMapsUrl({
                    name: nextTodo.clientName,
                    address: nextTodo.address,
                    city: nextTodo.city,
                    lat: nextTodo.lat,
                    lng: nextTodo.lng,
                  })
              : clientMapsUrl({
                  name: nextTodo.clientName,
                  address: nextTodo.address,
                  city: nextTodo.city,
                })) ?? '#') || '#'
          }
          target="_blank"
          rel="noreferrer"
        >
          🧭 {t(lang, 'goNextStop')} — {nextTodo.clientName}
        </a>
      ) : null}

      {routePoints.length > 1 ? (
        <a
          className="btn secondary block"
          style={{ marginTop: 8 }}
          href={
            myPos
              ? `https://www.google.com/maps/dir/${myPos.lat},${myPos.lng}/${routePoints
                  .map((p) => `${p.lat},${p.lng}`)
                  .join('/')}`
              : `https://www.google.com/maps/dir/${routePoints
                  .map((p) => `${p.lat},${p.lng}`)
                  .join('/')}`
          }
          target="_blank"
          rel="noreferrer"
        >
          🗺️ {t(lang, 'openTourRoute')}
        </a>
      ) : null}

      <div className="driver-stops">
        {stops.map((s, i) => {
          const nav =
            (typeof s.lat === 'number' && typeof s.lng === 'number'
              ? myPos
                ? mapsDirectionsUrl(myPos, { lat: s.lat, lng: s.lng })
                : clientMapsUrl({
                    name: s.clientName,
                    address: s.address,
                    city: s.city,
                    lat: s.lat,
                    lng: s.lng,
                  })
              : clientMapsUrl({
                  name: s.clientName,
                  address: s.address,
                  city: s.city,
                })) ?? undefined
          const tel = phoneTelHref(s.clientPhone)
          const due = s.collectDa || 0
          return (
            <div
              key={s.id}
              className={`driver-stop ${s.status !== 'todo' ? s.status : ''} ${
                nextTodo?.id === s.id ? 'next' : ''
              }`}
            >
              <div className="map-pin-inline">{i + 1}</div>
              <div className="driver-stop-body">
                <strong>{s.clientName}</strong>
                <div className="muted">
                  {[s.address, s.city].filter(Boolean).join(' · ') ||
                    t(lang, 'noLocation')}
                </div>
                {s.clientPhone ? (
                  <div className="muted">{s.clientPhone}</div>
                ) : null}
                {due > 0 ? (
                  <div className="cash-line">
                    💵 {t(lang, 'collectHere')} : <strong>{formatDa(due)}</strong>
                  </div>
                ) : (
                  <div className="muted">{t(lang, 'nothingToCollect')}</div>
                )}
                {s.collectedDa && s.collectedDa > 0 ? (
                  <div className="muted">
                    ✅ {t(lang, 'takenCash')} : {formatDa(s.collectedDa)}
                  </div>
                ) : null}

                <div className="btn-row" style={{ marginTop: 8 }}>
                  {nav ? (
                    <a
                      className="btn"
                      href={nav}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🧭 {t(lang, 'navigateHere')}
                    </a>
                  ) : null}
                  {tel ? (
                    <a className="btn secondary" href={tel}>
                      📞 {t(lang, 'callClient')}
                    </a>
                  ) : null}
                  {s.clientPhone ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() =>
                        openWhatsappText(
                          s.clientPhone,
                          lang === 'ar'
                            ? `السلام عليكم ${s.clientName}، أنا سائق التوصيل من ${shopName}. وصلت قريب.`
                            : `Salam ${s.clientName}, je suis le livreur de ${shopName}. J’arrive bientôt.`,
                        )
                      }
                    >
                      📲 WhatsApp
                    </button>
                  ) : null}
                </div>

                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      onUpdateStop(s.id, {
                        status: 'done',
                        collectedDa: due > 0 ? due : s.collectedDa || 0,
                      })
                    }
                  >
                    ✅ {t(lang, 'markDelivered')}
                    {due > 0 ? ` + ${formatDa(due)}` : ''}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() =>
                      onUpdateStop(s.id, { status: 'skipped', collectedDa: 0 })
                    }
                  >
                    {t(lang, 'markSkipped')}
                  </button>
                  {s.status !== 'todo' ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() =>
                        onUpdateStop(s.id, { status: 'todo', collectedDa: 0 })
                      }
                    >
                      {t(lang, 'markTodo')}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
