/** Pont hors ligne téléphone ↔ PC (QR / fichier) — sans Internet ni Bluetooth caméra. */

import type { ProductCategory } from '../types'

export type BridgePurchaseLine = {
  name: string
  barcode?: string
  qty: number
  unitCostDa: number
  category?: ProductCategory
  aisleId?: string
  /** Uniquement dans le fichier (trop lourd pour QR) */
  imageDataUrl?: string
}

export type BridgePurchasePack = {
  v: 1
  kind: 'purchase_draft'
  id: string
  createdAt: string
  supplierName: string
  note?: string
  paidDa?: number
  lines: BridgePurchaseLine[]
}

const QR_CHUNK = 700
const PREFIX = 'AZP1'

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

export function isLikelyMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 900px)').matches
  )
}

export function buildPurchasePack(input: {
  supplierName: string
  note?: string
  paidDa?: number
  lines: BridgePurchaseLine[]
  /** false = version QR (sans images) */
  includeImages?: boolean
}): BridgePurchasePack {
  const includeImages = input.includeImages !== false
  return {
    v: 1,
    kind: 'purchase_draft',
    id: `br_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    supplierName: input.supplierName.trim(),
    note: input.note?.trim() || undefined,
    paidDa: input.paidDa,
    lines: input.lines.map((l) => ({
      name: l.name,
      barcode: l.barcode,
      qty: l.qty,
      unitCostDa: l.unitCostDa,
      category: l.category,
      aisleId: l.aisleId,
      imageDataUrl: includeImages ? l.imageDataUrl : undefined,
    })),
  }
}

export function encodePurchasePack(pack: BridgePurchasePack): string {
  return `${PREFIX}.${toBase64Url(JSON.stringify(pack))}`
}

export function decodePurchasePack(text: string): BridgePurchasePack | null {
  const raw = text.trim()
  // Multi-QR assemblé ou mono
  const single = raw.match(new RegExp(`${PREFIX}\\.([A-Za-z0-9_-]+)$`))
  if (single && !raw.includes('/')) {
    try {
      const parsed = JSON.parse(fromBase64Url(single[1])) as BridgePurchasePack
      if (parsed?.v === 1 && parsed.kind === 'purchase_draft' && parsed.lines) {
        return parsed
      }
    } catch {
      /* fall through */
    }
  }
  return assemblePurchaseQrChunks(raw.split(/\s+/).filter(Boolean))
}

/** Découpe pour QR (hors images). */
export function purchasePackToQrChunks(
  pack: BridgePurchasePack,
): string[] {
  const light: BridgePurchasePack = {
    ...pack,
    lines: pack.lines.map(({ imageDataUrl: _img, ...rest }) => rest),
  }
  const body = toBase64Url(JSON.stringify(light))
  if (body.length <= QR_CHUNK) {
    return [`${PREFIX}.${body}`]
  }
  const parts: string[] = []
  const n = Math.ceil(body.length / QR_CHUNK)
  for (let i = 0; i < n; i++) {
    const slice = body.slice(i * QR_CHUNK, (i + 1) * QR_CHUNK)
    parts.push(`${PREFIX}.${pack.id}.${i + 1}/${n}.${slice}`)
  }
  return parts
}

export function parsePurchaseQrChunk(
  text: string,
): { id: string; index: number; total: number; payload: string } | null {
  const raw = text.trim()
  const multi = raw.match(
    new RegExp(`${PREFIX}\\.([\\w-]+)\\.(\\d+)/(\\d+)\\.([A-Za-z0-9_-]+)`),
  )
  if (multi) {
    return {
      id: multi[1],
      index: Number(multi[2]),
      total: Number(multi[3]),
      payload: multi[4],
    }
  }
  const single = raw.match(new RegExp(`${PREFIX}\\.([A-Za-z0-9_-]+)$`))
  if (single) {
    return { id: 'single', index: 1, total: 1, payload: single[1] }
  }
  return null
}

export function assemblePurchaseQrChunks(
  chunks: string[],
): BridgePurchasePack | null {
  const map = new Map<number, string>()
  let id = ''
  let total = 0
  for (const c of chunks) {
    const p = parsePurchaseQrChunk(c)
    if (!p) continue
    if (!id) {
      id = p.id
      total = p.total
    }
    if (p.id !== id || p.total !== total) continue
    map.set(p.index, p.payload)
  }
  if (!total || map.size < total) return null
  const body = Array.from({ length: total }, (_, i) => map.get(i + 1) || '').join(
    '',
  )
  try {
    const parsed = JSON.parse(fromBase64Url(body)) as BridgePurchasePack
    if (parsed?.v === 1 && parsed.kind === 'purchase_draft') return parsed
  } catch {
    return null
  }
  return null
}

export function downloadPurchasePackFile(pack: BridgePurchasePack): void {
  const blob = new Blob([JSON.stringify(pack, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `azpos-achat-${pack.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readPurchasePackFile(
  file: File,
): Promise<BridgePurchasePack | null> {
  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as BridgePurchasePack
    if (parsed?.v === 1 && parsed.kind === 'purchase_draft' && parsed.lines) {
      return parsed
    }
    return decodePurchasePack(text)
  } catch {
    return null
  }
}
