/** Check-in salle de sport — puce NFC / QR membre */

export const MEMBER_QR_PREFIX = 'AZPOS:M:'

/** Normalise UID lu par lecteur NFC (wedge HID ou Web NFC). */
export function normalizeNfcUid(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s:.-]+/g, '')
    .replace(/^AZPOS:M:/i, '')
}

export function encodeMemberQr(nfcUid: string): string {
  return `${MEMBER_QR_PREFIX}${normalizeNfcUid(nfcUid)}`
}

export function parseMemberQr(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const m = s.match(/^AZPOS:M:(.+)$/i)
  if (m?.[1]) return normalizeNfcUid(m[1])
  return null
}

export function isGymDomain(domainId: string | undefined): boolean {
  return (domainId || '') === 'svc-sport'
}

export type NdefReaderLike = {
  scan: (opts?: { signal?: AbortSignal }) => Promise<void>
  addEventListener: (
    type: 'reading' | 'readingerror',
    listener: (ev: { serialNumber?: string }) => void,
  ) => void
  removeEventListener: (
    type: 'reading' | 'readingerror',
    listener: (ev: { serialNumber?: string }) => void,
  ) => void
}

/** Web NFC (Chrome Android HTTPS) — sinon lecteur USB en mode clavier. */
export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window
}

export async function startWebNfcListen(
  onUid: (uid: string) => void,
  onError: (message: string) => void,
): Promise<{ stop: () => void } | null> {
  if (!isWebNfcSupported()) return null
  const Ctor = (window as unknown as { NDEFReader: new () => NdefReaderLike }).NDEFReader
  const reader = new Ctor()
  const ac = new AbortController()
  const onReading = (ev: { serialNumber?: string }) => {
    const uid = normalizeNfcUid(String(ev.serialNumber || ''))
    if (uid) onUid(uid)
  }
  reader.addEventListener('reading', onReading)
  try {
    await reader.scan({ signal: ac.signal })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    onError(msg)
    return null
  }
  return {
    stop: () => {
      try {
        ac.abort()
      } catch {
        /* ignore */
      }
      try {
        reader.removeEventListener('reading', onReading)
      } catch {
        /* ignore */
      }
    },
  }
}
