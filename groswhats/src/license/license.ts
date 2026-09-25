/** Clé secrète vendeur — change-la avant de vendre (même valeur dans le générateur). */
export const LICENSE_SECRET = 'GROSSISTE-DZ-SECRET-CHANGE-MOI-2026'

export const TRIAL_DAYS = 14
export const APP_VERSION = '1.2.2'

export type LicensePlan = 'trial' | 'annual'

export interface LicensePayload {
  /** Nom client / commerce */
  c: string
  /** Date d’expiration ISO (YYYY-MM-DD) */
  e: string
  /** Plan */
  p: 'annual'
}

export type AccessStatus =
  | {
      ok: true
      mode: 'trial'
      daysLeft: number
      trialEndsAt: string
    }
  | {
      ok: true
      mode: 'licensed'
      customer: string
      expiresAt: string
      daysLeft: number
    }
  | {
      ok: false
      reason: 'trial_expired' | 'license_expired' | 'invalid'
      message: string
    }

const TRIAL_KEY = 'gdz-trial-started'
const LICENSE_KEY = 'gdz-license-key'

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

export async function createLicenseKey(
  customer: string,
  expiresAt: string,
  secret = LICENSE_SECRET,
): Promise<string> {
  const payload: LicensePayload = {
    c: customer.trim() || 'Client',
    e: expiresAt,
    p: 'annual',
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
}

export async function activateLicense(key: string): Promise<{ ok: true; payload: LicensePayload } | { ok: false; error: string }> {
  const verified = await parseAndVerifyLicense(key)
  if (!verified.ok) return verified
  const exp = new Date(verified.payload.e + 'T23:59:59')
  if (exp < startOfToday()) {
    return { ok: false, error: 'Cette licence est déjà expirée' }
  }
  localStorage.setItem(LICENSE_KEY, key.trim())
  return verified
}

export async function getAccessStatus(): Promise<AccessStatus> {
  const key = getStoredLicenseKey()
  if (key) {
    const verified = await parseAndVerifyLicense(key)
    if (!verified.ok) {
      return { ok: false, reason: 'invalid', message: verified.error }
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
    return {
      ok: true,
      mode: 'licensed',
      customer: verified.payload.c,
      expiresAt: verified.payload.e,
      daysLeft: left,
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
  }
}

/** Date + 365 jours (licence annuelle) */
export function annualExpiryFrom(date = new Date()): string {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}
