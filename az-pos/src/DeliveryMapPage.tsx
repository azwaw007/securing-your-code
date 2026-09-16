import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AppState, Client, Language } from './types'
import { t } from './i18n'
import {
  WILAYAS,
  matchWilayaCode,
  wilayaByCode,
  type Wilaya,
} from './data/wilayas'
import { clientMapsUrl, mapsDirectionsUrl, mapsRouteUrl } from './utils/maps'

function hasGps(c: Client): c is Client & { lat: number; lng: number } {
  return typeof c.lat === 'number' && typeof c.lng === 'number'
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function pinIcon(n: number, active: boolean) {
  return L.divIcon({
    className: 'map-pin-wrap',
    html: `<span class="map-pin${active ? ' active' : ''}">${n}</span>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  })
}

function meIcon() {
  return L.divIcon({
    className: 'map-me-wrap',
    html: `<span class="map-me"><i></i></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export function DeliveryMapPage({
  state,
  lang,
  onOpenClient,
  active = true,
}: {
  state: AppState
  lang: Language
  onOpenClient: (clientId: string) => void
  /** false = page cachée (retour) — garde la carte sans la détruire */
  active?: boolean
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapObj = useRef<L.Map | null>(null)
  const shopsLayer = useRef<L.LayerGroup | null>(null)
  const meMarker = useRef<L.Marker | null>(null)
  const meCircle = useRef<L.Circle | null>(null)
  const watchId = useRef<number | null>(null)

  const defaultCode =
    matchWilayaCode(state.settings.city) ??
    WILAYAS.find((w) =>
      state.clients.some((c) => matchWilayaCode(c.city) === w.code),
    )?.code ??
    '16'

  const [wilayaCode, setWilayaCode] = useState(defaultCode)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [myPos, setMyPos] = useState<{
    lat: number
    lng: number
    accuracy: number
  } | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [followMe, setFollowMe] = useState(true)
  const [gpsOn, setGpsOn] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)

  const wilaya = wilayaByCode(wilayaCode) as Wilaya

  const inZone = useMemo(() => {
    return state.clients.filter((c) => {
      const code = matchWilayaCode(c.city)
      if (code === wilayaCode) return true
      if (hasGps(c) && distanceKm(c, wilaya) <= 70) return true
      return false
    })
  }, [state.clients, wilayaCode, wilaya])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...inZone].sort((a, b) => {
      if (myPos && hasGps(a) && hasGps(b)) {
        return distanceKm(myPos, a) - distanceKm(myPos, b)
      }
      return a.name.localeCompare(b.name, 'fr')
    })
    if (!q) return list
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        c.phone.includes(q),
    )
  }, [inZone, query, myPos])

  const pinned = filtered.filter(hasGps)
  const selected = filtered.find((c) => c.id === selectedId) ?? null

  const wilayasWithClients = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of state.clients) {
      const code = matchWilayaCode(c.city)
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1)
      else if (hasGps(c)) {
        for (const w of WILAYAS) {
          if (distanceKm(c, w) <= 70) {
            counts.set(w.code, (counts.get(w.code) ?? 0) + 1)
            break
          }
        }
      }
    }
    return counts
  }, [state.clients])

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([wilaya.lat, wilaya.lng], wilaya.zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    shopsLayer.current = L.layerGroup().addTo(map)
    mapObj.current = map

    map.on('dragstart', () => setFollowMe(false))

    return () => {
      map.remove()
      mapObj.current = null
      shopsLayer.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Quand on revient sur la carte (bouton retour), recalcule la taille
  useEffect(() => {
    if (!active || !mapObj.current) return
    const timer = window.setTimeout(() => {
      mapObj.current?.invalidateSize()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [active])

  // Live GPS
  useEffect(() => {
    if (!gpsOn) {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      return
    }
    if (!navigator.geolocation) {
      setGpsError(t(lang, 'gpsUnsupported'))
      return
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
          accuracy: pos.coords.accuracy || 30,
        }
        setMyPos(next)
        setGpsError('')
      },
      (err) => {
        setGpsError(
          err.code === 1 ? t(lang, 'gpsDenied') : t(lang, 'gpsUnsupported'),
        )
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    )

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [gpsOn, lang])

  // Draw / update my position
  useEffect(() => {
    const map = mapObj.current
    if (!map || !myPos) return

    if (!meMarker.current) {
      meMarker.current = L.marker([myPos.lat, myPos.lng], {
        icon: meIcon(),
        zIndexOffset: 1000,
      }).addTo(map)
      meCircle.current = L.circle([myPos.lat, myPos.lng], {
        radius: Math.min(myPos.accuracy, 120),
        color: '#2563eb',
        weight: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
      }).addTo(map)
    } else {
      meMarker.current.setLatLng([myPos.lat, myPos.lng])
      meCircle.current?.setLatLng([myPos.lat, myPos.lng])
      meCircle.current?.setRadius(Math.min(myPos.accuracy, 120))
    }

    if (followMe) {
      map.setView([myPos.lat, myPos.lng], Math.max(map.getZoom(), 15), {
        animate: true,
      })
    }
  }, [myPos, followMe])

  // Shop pins
  useEffect(() => {
    const map = mapObj.current
    const layer = shopsLayer.current
    if (!map || !layer) return

    layer.clearLayers()
    const bounds: L.LatLngExpression[] = []

    pinned.forEach((c, i) => {
      const marker = L.marker([c.lat, c.lng], {
        icon: pinIcon(i + 1, c.id === selectedId),
      })
      marker.bindPopup(
        `<strong>${escapeHtml(c.name)}</strong><br/>${escapeHtml(
          c.address || c.city || '',
        )}`,
      )
      marker.on('click', () => {
        setSelectedId(c.id)
        setPanelOpen(true)
      })
      marker.addTo(layer)
      bounds.push([c.lat, c.lng])
    })

    if (!followMe || !myPos) {
      if (bounds.length > 1) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, {
          padding: [48, 48],
          maxZoom: 14,
        })
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15)
      } else {
        map.setView([wilaya.lat, wilaya.lng], wilaya.zoom)
      }
    }

    requestAnimationFrame(() => map.invalidateSize())
  }, [pinned, selectedId, wilaya, followMe, myPos])

  function goToMe() {
    setGpsOn(true)
    setFollowMe(true)
    if (myPos && mapObj.current) {
      mapObj.current.setView([myPos.lat, myPos.lng], 16, { animate: true })
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            lat: +pos.coords.latitude.toFixed(6),
            lng: +pos.coords.longitude.toFixed(6),
            accuracy: pos.coords.accuracy || 30,
          }
          setMyPos(next)
          mapObj.current?.setView([next.lat, next.lng], 16, { animate: true })
        },
        () => setGpsError(t(lang, 'gpsDenied')),
        { enableHighAccuracy: true, timeout: 15000 },
      )
    }
  }

  const navUrl =
    selected && hasGps(selected)
      ? myPos
        ? mapsDirectionsUrl(myPos, selected)
        : clientMapsUrl(selected)
      : null

  const tourUrl = mapsRouteUrl(
    (myPos ? [myPos, ...pinned] : pinned).map((p) => ({
      lat: p.lat,
      lng: p.lng,
    })),
  )

  return (
    <div className="gmaps-app">
      <div ref={mapRef} className="gmaps-canvas" />

      <div className="gmaps-top">
        <div className="gmaps-search card">
          <div className="field" style={{ marginBottom: 8 }}>
            <label>{t(lang, 'selectWilaya')}</label>
            <select
              value={wilayaCode}
              onChange={(e) => {
                setWilayaCode(e.target.value)
                setSelectedId(null)
                setFollowMe(false)
              }}
            >
              {WILAYAS.map((w) => {
                const n = wilayasWithClients.get(w.code) ?? 0
                const label =
                  lang === 'ar'
                    ? `${w.code} — ${w.nameAr}`
                    : `${w.code} — ${w.name}`
                return (
                  <option key={w.code} value={w.code}>
                    {label}
                    {n > 0 ? ` (${n})` : ''}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(lang, 'searchClientHint')}
            />
          </div>
          {gpsError ? <div className="notice warn-text">{gpsError}</div> : null}
        </div>
      </div>

      <div className="gmaps-fab-col">
        <button
          type="button"
          className={`gmaps-fab ${followMe ? 'on' : ''}`}
          onClick={goToMe}
          title={t(lang, 'myLocation')}
        >
          📍
        </button>
        <button
          type="button"
          className="gmaps-fab"
          onClick={() => setPanelOpen((v) => !v)}
          title={t(lang, 'shopList')}
        >
          📋
        </button>
      </div>

      <div className={`gmaps-sheet ${panelOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="gmaps-sheet-handle"
          onClick={() => setPanelOpen((v) => !v)}
          aria-label="panel"
        />
        <div className="gmaps-sheet-head">
          <div>
            <strong>
              {lang === 'ar' ? wilaya.nameAr : wilaya.name} — {pinned.length}{' '}
              {t(lang, 'pinnedShops')}
            </strong>
            <div className="muted">
              {filtered.length} {t(lang, 'clientsInZone')}
              {myPos ? ` · GPS OK (±${Math.round(myPos.accuracy)} m)` : ''}
            </div>
          </div>
          {tourUrl && pinned.length > 0 ? (
            <a className="btn secondary" href={tourUrl} target="_blank" rel="noreferrer">
              🚗 {t(lang, 'openDeliveryRoute')}
            </a>
          ) : null}
        </div>

        {selected && hasGps(selected) ? (
          <div className="gmaps-selected">
            <div>
              <strong>{selected.name}</strong>
              <div className="muted">
                {[selected.address, selected.city].filter(Boolean).join(' · ')}
              </div>
              {myPos ? (
                <div className="muted">
                  {distanceKm(myPos, selected).toFixed(1)} km
                </div>
              ) : null}
            </div>
            <div className="btn-row">
              {navUrl ? (
                <a className="btn" href={navUrl} target="_blank" rel="noreferrer">
                  🧭 {t(lang, 'navigateHere')}
                </a>
              ) : null}
              <button
                type="button"
                className="btn ghost"
                onClick={() => onOpenClient(selected.id)}
              >
                {t(lang, 'openClient')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="gmaps-list">
          {filtered.length === 0 ? (
            <div className="empty">{t(lang, 'noClientsInZone')}</div>
          ) : (
            filtered.map((c) => {
              const gps = hasGps(c)
              const maps = clientMapsUrl(c)
              const idx = gps ? pinned.findIndex((p) => p.id === c.id) + 1 : 0
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`gmaps-row ${selectedId === c.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedId(c.id)
                    setFollowMe(false)
                    if (gps && mapObj.current) {
                      mapObj.current.setView([c.lat, c.lng], 16, {
                        animate: true,
                      })
                    }
                  }}
                >
                  <span className={`map-pin-inline ${gps ? '' : 'ghost'}`}>
                    {gps ? idx : '·'}
                  </span>
                  <span className="gmaps-row-text">
                    <strong>{c.name}</strong>
                    <span className="muted">
                      {[c.address, c.city].filter(Boolean).join(' · ') ||
                        t(lang, 'noLocation')}
                    </span>
                    {myPos && gps ? (
                      <span className="muted">
                        {distanceKm(myPos, c).toFixed(1)} km
                      </span>
                    ) : !gps ? (
                      <span className="muted">{t(lang, 'clientsWithoutGps')}</span>
                    ) : null}
                  </span>
                  {maps ? (
                    <a
                      className="btn secondary"
                      href={
                        myPos && gps
                          ? mapsDirectionsUrl(myPos, c)
                          : maps
                      }
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      GPS
                    </a>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
