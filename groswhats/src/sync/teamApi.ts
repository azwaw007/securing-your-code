import type { Driver, Mission } from '../types'

export interface TeamCloudPayload {
  companyCode: string
  syncSecret: string
  shopName: string
  drivers: Driver[]
  missions: Mission[]
  updatedAt: string
}

export interface MissionPack {
  v: 1
  companyCode: string
  mission: Mission
  driverName?: string
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function encodeMissionPack(pack: MissionPack): string {
  return `GDZM1.${toBase64Url(JSON.stringify(pack))}`
}

export function decodeMissionPack(text: string): MissionPack | null {
  const raw = text.trim()
  const m = raw.match(/GDZM1\.([A-Za-z0-9_-]+)/)
  if (!m) return null
  try {
    const parsed = JSON.parse(fromBase64Url(m[1])) as MissionPack
    if (parsed?.v !== 1 || !parsed.mission?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function missionWhatsappText(pack: MissionPack, shopName: string): string {
  const stops = [...pack.mission.stops]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s, i) => {
      const cash =
        (s.collectDa || 0) > 0 ? ` · 💵 ${Math.round(s.collectDa || 0)} DA` : ''
      return `${i + 1}. ${s.clientName}${s.address ? ` — ${s.address}` : ''}${s.city ? ` (${s.city})` : ''}${cash}`
    })
    .join('\n')
  const due = pack.mission.stops.reduce(
    (sum, s) => sum + (s.collectDa || 0),
    0,
  )
  return [
    `🚚 Mission Grossiste DZ — ${shopName}`,
    `Code société: ${pack.companyCode}`,
    `Titre: ${pack.mission.title}`,
    `Date: ${pack.mission.date}`,
    pack.driverName ? `Livreur: ${pack.driverName}` : '',
    due > 0 ? `À encaisser (total): ${Math.round(due)} DA` : '',
    '',
    'Plan de tournée:',
    stops || '(aucun stop)',
    '',
    'Code import (colle dans l’app livreur):',
    encodeMissionPack(pack),
  ]
    .filter(Boolean)
    .join('\n')
}

export async function pushTeamCloud(
  payload: TeamCloudPayload,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'push', ...payload }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string }
      return { ok: false, message: err.message || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'offline' }
  }
}

export async function pullTeamCloud(
  companyCode: string,
  syncSecret: string,
  driverId?: string,
): Promise<{ ok: boolean; data?: TeamCloudPayload; message?: string }> {
  try {
    const q = new URLSearchParams({
      companyCode,
      syncSecret,
    })
    if (driverId) q.set('driverId', driverId)
    const res = await fetch(`/api/team?${q.toString()}`)
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string }
      return { ok: false, message: err.message || `HTTP ${res.status}` }
    }
    const data = (await res.json()) as TeamCloudPayload
    return { ok: true, data }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'offline' }
  }
}

export async function joinAsDriver(input: {
  companyCode: string
  syncSecret: string
  pin: string
}): Promise<{
  ok: boolean
  driver?: Driver
  data?: TeamCloudPayload
  message?: string
}> {
  try {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', ...input }),
    })
    const body = (await res.json().catch(() => ({}))) as {
      message?: string
      driver?: Driver
      data?: TeamCloudPayload
    }
    if (!res.ok) return { ok: false, message: body.message || `HTTP ${res.status}` }
    return { ok: true, driver: body.driver, data: body.data }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'offline' }
  }
}

export async function patchMissionStop(input: {
  companyCode: string
  syncSecret: string
  missionId: string
  stopId: string
  status?: 'todo' | 'done' | 'skipped'
  collectedDa?: number
  note?: string
}): Promise<{ ok: boolean; data?: TeamCloudPayload; message?: string }> {
  try {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'patchStop', ...input }),
    })
    const body = (await res.json().catch(() => ({}))) as {
      message?: string
      data?: TeamCloudPayload
    }
    if (!res.ok) return { ok: false, message: body.message || `HTTP ${res.status}` }
    return { ok: true, data: body.data }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'offline' }
  }
}
