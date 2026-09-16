/** Payload QR client AZ POS — stable hors ligne. */
import {
  normalizeNfcUid,
  parseMemberQr,
} from './gymNfc'

export const CLIENT_QR_PREFIX = 'AZPOS:C:'

export function encodeClientQr(clientId: string): string {
  return `${CLIENT_QR_PREFIX}${clientId}`
}

/** Extrait l’id client depuis un QR AZ POS (ou null). */
export function parseClientQr(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const m = s.match(/^AZPOS:C:(.+)$/i)
  if (m?.[1]) return m[1].trim()
  if (/^c[_-]/i.test(s) || /^client/i.test(s)) return s
  return null
}

export type HomeScanKind = 'client' | 'product' | 'member' | 'unknown'

export function classifyHomeScan(
  raw: string,
  clients: Array<{ id: string; nfcUid?: string }>,
  products: Array<{ id: string; barcode?: string; name: string }>,
): {
  kind: HomeScanKind
  clientId?: string
  productId?: string
  nfcUid?: string
  code: string
} {
  const code = raw.trim()
  const memberUid = parseMemberQr(code)
  if (memberUid) {
    const byMember = clients.find(
      (c) => c.nfcUid && normalizeNfcUid(c.nfcUid) === memberUid,
    )
    if (byMember) return { kind: 'member', clientId: byMember.id, nfcUid: memberUid, code }
    return { kind: 'member', nfcUid: memberUid, code }
  }
  const fromQr = parseClientQr(code)
  if (fromQr) {
    const client = clients.find((c) => c.id === fromQr)
    if (client) return { kind: 'client', clientId: client.id, code }
  }
  const byId = clients.find((c) => c.id === code)
  if (byId) return { kind: 'client', clientId: byId.id, code }

  const uid = normalizeNfcUid(code)
  if (uid.length >= 4) {
    const byNfc = clients.find((c) => c.nfcUid && normalizeNfcUid(c.nfcUid) === uid)
    if (byNfc) return { kind: 'member', clientId: byNfc.id, nfcUid: uid, code }
  }

  const q = code.toLowerCase()
  const product = products.find(
    (p) => p.barcode && p.barcode.trim().toLowerCase() === q,
  )
  if (product) return { kind: 'product', productId: product.id, code }

  return { kind: 'unknown', code }
}
