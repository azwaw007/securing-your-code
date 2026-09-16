/** Payload QR client AZ POS — stable hors ligne. */
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
  // Ancien / collé sans préfixe si ça ressemble à un id app
  if (/^c[_-]/i.test(s) || /^client/i.test(s)) return s
  return null
}

export type HomeScanKind = 'client' | 'product' | 'unknown'

export function classifyHomeScan(
  raw: string,
  clients: Array<{ id: string }>,
  products: Array<{ id: string; barcode?: string; name: string }>,
): {
  kind: HomeScanKind
  clientId?: string
  productId?: string
  code: string
} {
  const code = raw.trim()
  const fromQr = parseClientQr(code)
  if (fromQr) {
    const client = clients.find((c) => c.id === fromQr)
    if (client) return { kind: 'client', clientId: client.id, code }
  }
  const byId = clients.find((c) => c.id === code)
  if (byId) return { kind: 'client', clientId: byId.id, code }

  const q = code.toLowerCase()
  const product = products.find(
    (p) => p.barcode && p.barcode.trim().toLowerCase() === q,
  )
  if (product) return { kind: 'product', productId: product.id, code }

  return { kind: 'unknown', code }
}
