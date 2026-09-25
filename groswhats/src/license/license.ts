/** Clé secrète vendeur — change-la avant de vendre (même valeur dans le générateur). */
export const LICENSE_SECRET = 'GROSSISTE-DZ-SECRET-CHANGE-MOI-2026'

export const TRIAL_DAYS = 14
export const APP_VERSION = '1.2.5'

/** Plans commerciaux AZ POS (postes = PC / téléphone activés). */
export type LicensePlanId = 'standard' | 'pro3' | 'pro10' | 'pro_max'

export type LicensePlanDef = {
  id: LicensePlanId
  /** 0 = postes illimités */
  seats: number
  priceDa: number
  labelFr: string
  labelAr: string
}

export const LICENSE_PLANS: Record<LicensePlanId, LicensePlanDef> = {
  standard: {
    id: 'standard',
    seats: 1,
    priceDa: 12_000,
    labelFr: 'AZ POS — 1 poste',
    labelAr: 'AZ POS — جهاز واحد',
  },
  pro3: {
    id: 'pro3',
    seats: 3,
    priceDa: 25_000,
    labelFr: 'AZ POS Pro — 3 postes',
    labelAr: 'AZ POS Pro — 3 أجهزة',
  },
  pro10: {
    id: 'pro10',
    seats: 10,
    priceDa: 70_000,
    labelFr: 'AZ POS Pro — 10 postes',
    labelAr: 'AZ POS Pro — 10 أجهزة',
  },
  pro_max: {
    id: 'pro_max',
    seats: 0,
    priceDa: 90_000,
    labelFr: 'AZ POS Pro Max — postes illimités',
    labelAr: 'AZ POS Pro Max — أجهزة بلا حد',
  },
}

export function formatPriceDa(n: number): string {
  return `${n.toLocaleString('fr-DZ')} DA / an`
}

export function seatsLabel(seats: number): string {
  if (seats <= 0) return 'postes illimités'
  if (seats === 1) return '1 poste'
  return `${seats} postes`
}

/** Cap magasin / dépôt = nombre de postes (Pro). 0 seats → illimité. */
export function maxLocationsForSeats(seats: number): number {
  if (seats <= 0) return 9999
  return seats
}

export interface LicensePayload {
  /** Nom client / commerce */
  c: string
  /** Date d’expiration ISO (YYYY-MM-DD) */
  e: string
  /**
   * Plan :
   * - standard | pro3 | pro10 | pro_max (nouveaux)
   * - annual (anciennes clés) → traité comme standard 1 poste
   */
  p: LicensePlanId | 'annual' | 'pro'
  /** Postes autorisés (0 = illimité). Absent sur anciennes clés → 1. */
  s?: number
}

export type AccessStatus =
  | {
      ok: true
      mode: 'trial'
      daysLeft: number
      trialEndsAt: string
      seats: number
      planId: LicensePlanId
      maxLocations: number
    }
  | {
      ok: true
      mode: 'licensed'
      customer: string
      expiresAt: string
      daysLeft: number
      seats: number
      planId: LicensePlanId
      maxLocations: number
      planLabel: string
    }
  | {
      ok: false
      reason: 'trial_expired' | 'license_expired' | 'invalid' | 'device_mismatch'
      message: string
    }

const TRIAL_KEY = 'gdz-trial-started'
const LICENSE_KEY = 'gdz-license-key'
const DEVICE_KEY = 'gdz-device-id'
const LICENSE_META_KEY = 'gdz-license-meta'
const LICENSE_BIND_KEY = 'gdz-license-device-bind'

type LicenseMetaCache = {
  planId: LicensePlanId
  seats: number
  customer: string
  expiresAt: string
  boundDeviceId?: string
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function signPayload(payloadJson: string, secret = LICENSE_SECRET): Promise<string> {
  const hex = await sha256Hex(`${payloadJson}::${secret}`)
  return hex.slice(0, 20)
}

export function normalizePlan(payload: LicensePayload): {
  planId: LicensePlanId
  seats: number
} {
  const raw = payload.p
  if (raw === 'pro3' || raw === 'pro10' || raw === 'pro_max' || raw === 'standard') {
    const def = LICENSE_PLANS[raw]
    const seats =
      typeof payload.s === 'number' && payload.s >= 0 ? payload.s : def.seats
    return { planId: raw, seats }
  }
  // Ancienne clé « annual » / « pro » générique → 1 poste standard
  if (raw === 'pro') {
    const seats =
      typeof payload.s === 'number' && payload.s > 0 ? payload.s : 3
    if (seats >= 999 || seats === 0) return { planId: 'pro_max', seats: 0 }
    if (seats >= 10) return { planId: 'pro10', seats: 10 }
    if (seats >= 3) return { planId: 'pro3', seats: 3 }
    return { planId: 'standard', seats: 1 }
  }
  return { planId: 'standard', seats: 1 }
}

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'device-unknown'
  }
}

function writeMetaCache(meta: LicenseMetaCache): void {
  try {
    localStorage.setItem(LICENSE_META_KEY, JSON.stringify(meta))
  } catch {
    /* ignore */
  }
}

/** Limite synchrone pour le store (après vérif async → cache). */
export function getCachedSeatLimit(): number {
  try {
    const key = localStorage.getItem(LICENSE_KEY)
    if (!key) {
      // Essai : on laisse tester jusqu’à 3 postes / dépôts
      return 3
    }
    const raw = localStorage.getItem(LICENSE_META_KEY)
    if (!raw) return 1
    const meta = JSON.parse(raw) as LicenseMetaCache
    if (typeof meta.seats !== 'number') return 1
    return maxLocationsForSeats(meta.seats)
  } catch {
    return 1
  }
}

export function getCachedPlanId(): LicensePlanId | 'trial' {
  try {
    if (!localStorage.getItem(LICENSE_KEY)) return 'trial'
    const raw = localStorage.getItem(LICENSE_META_KEY)
    if (!raw) return 'standard'
    const meta = JSON.parse(raw) as LicenseMetaCache
    return meta.planId || 'standard'
  } catch {
    return 'standard'
  }
}

export function isProPlan(planId: LicensePlanId | 'trial'): boolean {
  return planId === 'pro3' || planId === 'pro10' || planId === 'pro_max'
}

export async function createLicenseKey(
  customer: string,
  expiresAt: string,
  planId: LicensePlanId = 'standard',
  secret = LICENSE_SECRET,
): Promise<string> {
  const def = LICENSE_PLANS[planId] ?? LICENSE_PLANS.standard
  const payload: LicensePayload = {
    c: customer.trim() || 'Client',
    e: expiresAt,
    p: def.id,
    s: def.seats,
  }
  const json = JSON.stringify(payload)
  const body = toBase64Url(new TextEncoder().encode(json))
  const sig = await signPayload(json, secret)
  return `GDZ1.${body}.${sig}`
}

export async function parseAndVerifyLicense(
  key: string,
  secret = LICENSE_SECRET,
): Promise<{ ok: true; payload: LicensePayload } | { ok: false; error: string }> {
  const parts = key.trim().split('.')
  if (parts.length !== 3 || parts[0] !== 'GDZ1') {
    return { ok: false, error: 'Format de licence invalide' }
  }
  try {
    const json = new TextDecoder().decode(fromBase64Url(parts[1]))
    const payload = JSON.parse(json) as LicensePayload
    const expected = await signPayload(json, secret)
    if (expected !== parts[2]) {
      return { ok: false, error: 'Signature invalide (fausse licence)' }
    }
    if (!payload.e || !payload.c) {
      return { ok: false, error: 'Licence incomplète' }
    }
    return { ok: true, payload }
  } catch {
    return { ok: false, error: 'Licence illisible' }
  }
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function ensureTrialStarted(): string {
  let started = localStorage.getItem(TRIAL_KEY)
  if (!started) {
    started = new Date().toISOString()
    localStorage.setItem(TRIAL_KEY, started)
  }
  return started
}

export function getStoredLicenseKey(): string | null {
  return localStorage.getItem(LICENSE_KEY)
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_KEY)
  localStorage.removeItem(LICENSE_META_KEY)
  localStorage.removeItem(LICENSE_BIND_KEY)
}

function bindDeviceIfNeeded(seats: number, deviceId: string): { ok: true } | { ok: false; error: string } {
  // Standard (1 poste) : la clé est liée au premier appareil qui l’active.
  if (seats !== 1) return { ok: true }
  try {
    const bound = localStorage.getItem(LICENSE_BIND_KEY)
    if (!bound) {
      localStorage.setItem(LICENSE_BIND_KEY, deviceId)
      return { ok: true }
    }
    if (bound !== deviceId) {
      return {
        ok: false,
        error:
          'Cette licence AZ POS (1 poste) est déjà liée à un autre appareil. Pour un autre poste, prenez AZ POS Pro.',
      }
    }
    return { ok: true }
  } catch {
    return { ok: true }
  }
}

export async function activateLicense(
  key: string,
): Promise<{ ok: true; payload: LicensePayload } | { ok: false; error: string }> {
  const verified = await parseAndVerifyLicense(key)
  if (!verified.ok) return verified
  const exp = new Date(verified.payload.e + 'T23:59:59')
  if (exp < startOfToday()) {
    return { ok: false, error: 'Cette licence est déjà expirée' }
  }
  const { planId, seats } = normalizePlan(verified.payload)
  const deviceId = getOrCreateDeviceId()
  const bind = bindDeviceIfNeeded(seats, deviceId)
  if (!bind.ok) return bind

  localStorage.setItem(LICENSE_KEY, key.trim())
  writeMetaCache({
    planId,
    seats,
    customer: verified.payload.c,
    expiresAt: verified.payload.e,
    boundDeviceId: seats === 1 ? deviceId : undefined,
  })
  return verified
}

export async function getAccessStatus(): Promise<AccessStatus> {
  const key = getStoredLicenseKey()
  if (key) {
    const verified = await parseAndVerifyLicense(key)
    if (!verified.ok) {
      return { ok: false, reason: 'invalid', message: verified.error }
    }
    const { planId, seats } = normalizePlan(verified.payload)
    const deviceId = getOrCreateDeviceId()
    const bind = bindDeviceIfNeeded(seats, deviceId)
    if (!bind.ok) {
      return { ok: false, reason: 'device_mismatch', message: bind.error }
    }

    const exp = new Date(verified.payload.e + 'T23:59:59')
    const left = daysBetween(startOfToday(), exp)
    if (left < 0) {
      return {
        ok: false,
        reason: 'license_expired',
        message: `Licence expirée le ${verified.payload.e}`,
      }
    }

    writeMetaCache({
      planId,
      seats,
      customer: verified.payload.c,
      expiresAt: verified.payload.e,
      boundDeviceId: seats === 1 ? deviceId : undefined,
    })

    return {
      ok: true,
      mode: 'licensed',
      customer: verified.payload.c,
      expiresAt: verified.payload.e,
      daysLeft: left,
      seats,
      planId,
      maxLocations: maxLocationsForSeats(seats),
      planLabel: LICENSE_PLANS[planId].labelFr,
    }
  }

  const started = ensureTrialStarted()
  const start = new Date(started)
  const end = new Date(start)
  end.setDate(end.getDate() + TRIAL_DAYS)
  const left = daysBetween(startOfToday(), end)
  if (left < 0) {
    return {
      ok: false,
      reason: 'trial_expired',
      message: `Essai de ${TRIAL_DAYS} jours terminé. Activez une licence annuelle.`,
    }
  }
  return {
    ok: true,
    mode: 'trial',
    daysLeft: left,
    trialEndsAt: end.toISOString().slice(0, 10),
    seats: 3,
    planId: 'pro3',
    maxLocations: 3,
  }
}

/** Date + 365 jours (licence annuelle) */
export function annualExpiryFrom(date = new Date()): string {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}
