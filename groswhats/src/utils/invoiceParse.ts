/** Parse texte de facture fournisseur (OCR / collage) → lignes + fournisseur. */

import type { Product, ProductCategory, Supplier } from '../types'

export type InvoiceParsedLine = {
  raw: string
  name: string
  barcode?: string
  qty: number
  unitCostDa: number
  lineTotalDa?: number
}

export type InvoiceParseResult = {
  supplierName?: string
  invoiceRef?: string
  lines: InvoiceParsedLine[]
  rawText: string
}

export type InvoiceMatchKind = 'stock' | 'new' | 'off'

export type InvoiceMatchedLine = InvoiceParsedLine & {
  id: string
  match: InvoiceMatchKind
  productId?: string
  category: ProductCategory
  aisleId?: string
  imageDataUrl?: string
  /** Créer le produit s’il n’existe pas */
  createIfNew: boolean
  selected: boolean
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim()
}

function toNum(s: string): number {
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

const EAN_RE = /\b(\d{8}|\d{12,14})\b/g
const QTY_PRICE_RE =
  /(?:^|\s)(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i
const TOTAL_LINE_RE =
  /(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*$/

const SUPPLIER_HINT =
  /\b(sarl|eurl|spa|spa\b|ets\.?|etablissement|ste\.?|societe|شركة|مؤسسة|fournisseur|livreur)\b/i

const SKIP_LINE =
  /^(total|sous[- ]?total|tva|timbre|net\s+a\s+payer|montant|page\s+\d|tel\.?|fax|rc\b|nif\b|ai\b|nis\b|date\b|facture\b|bon\s+de|qty|qte|designation|prix|montant)/i

export function extractBarcodes(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of text.matchAll(EAN_RE)) {
    const code = m[1]
    if (seen.has(code)) continue
    seen.add(code)
    out.push(code)
  }
  return out
}

function guessSupplierName(lines: string[], suppliers: Supplier[]): string | undefined {
  for (const s of suppliers) {
    const ns = norm(s.name)
    if (ns.length < 3) continue
    for (const line of lines.slice(0, 12)) {
      if (norm(line).includes(ns)) return s.name
    }
  }
  for (const line of lines.slice(0, 10)) {
    const t = line.trim()
    if (t.length < 4 || t.length > 80) continue
    if (SKIP_LINE.test(t)) continue
    if (SUPPLIER_HINT.test(t)) {
      return t.replace(/\s{2,}/g, ' ').trim()
    }
  }
  // Première ligne « titre » non numérique
  for (const line of lines.slice(0, 6)) {
    const t = line.trim()
    if (t.length >= 4 && t.length <= 60 && !/^\d+$/.test(t) && !SKIP_LINE.test(t)) {
      if (/[a-zA-Z\u0600-\u06ff]{3,}/.test(t)) return t
    }
  }
  return undefined
}

function parseOneLine(raw: string): InvoiceParsedLine | null {
  const line = raw.replace(/\s+/g, ' ').trim()
  if (line.length < 3 || SKIP_LINE.test(line)) return null
  // En-tête société / fournisseur sans code ni prix
  if (
    SUPPLIER_HINT.test(line) &&
    !/\b(\d{8}|\d{12,14})\b/.test(line) &&
    !QTY_PRICE_RE.test(line)
  ) {
    return null
  }

  const barcodes = extractBarcodes(line)
  const barcode = barcodes[0]

  let qty = 1
  let unitCostDa = 0
  let lineTotalDa: number | undefined

  const qx = line.match(QTY_PRICE_RE)
  if (qx) {
    qty = toNum(qx[1]) || 1
    unitCostDa = toNum(qx[2]) || 0
  } else {
    const tri = line.match(TOTAL_LINE_RE)
    if (tri) {
      const a = toNum(tri[1])
      const b = toNum(tri[2])
      const c = toNum(tri[3])
      // Heuristique : qty prix total  OU  prix qty total
      if (c > 0 && a > 0 && b > 0) {
        if (Math.abs(a * b - c) < 1) {
          qty = a
          unitCostDa = b
          lineTotalDa = c
        } else if (Math.abs(b * a - c) < 1) {
          qty = b
          unitCostDa = a
          lineTotalDa = c
        } else {
          unitCostDa = b
          lineTotalDa = c
          qty = a >= 1 && a < 1000 ? a : 1
        }
      }
    }
  }

  let name = line
    .replace(EAN_RE, ' ')
    .replace(QTY_PRICE_RE, ' ')
    .replace(TOTAL_LINE_RE, ' ')
    .replace(/\b\d+[.,]\d{2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!name && barcode) name = barcode
  if (!name) return null
  // Ligne sans code, sans prix, sans qty explicite → bruit OCR
  if (!barcode && unitCostDa <= 0 && !qx && name.length < 4) return null
  if (!barcode && unitCostDa <= 0 && !line.match(TOTAL_LINE_RE) && name.split(' ').length <= 4) {
    // garder seulement si ça ressemble à un article (chiffres dans le nom, ml, kg…)
    if (!/\d|ml|kg|cl|g\b|l\b|pack|carton/i.test(name)) return null
  }

  return {
    raw: line,
    name,
    barcode,
    qty: qty > 0 ? qty : 1,
    unitCostDa: unitCostDa >= 0 ? unitCostDa : 0,
    lineTotalDa,
  }
}

export function parseInvoiceText(
  text: string,
  suppliers: Supplier[] = [],
): InvoiceParseResult {
  const rawText = text.replace(/\r/g, '')
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const parsed: InvoiceParsedLine[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const row = parseOneLine(line)
    if (!row) continue
    const key = `${row.barcode || ''}|${norm(row.name)}|${row.qty}|${row.unitCostDa}`
    if (seen.has(key)) continue
    seen.add(key)
    parsed.push(row)
  }

  // Si aucune ligne structurée : au moins les codes-barres seuls
  if (parsed.length === 0) {
    for (const code of extractBarcodes(rawText)) {
      parsed.push({
        raw: code,
        name: code,
        barcode: code,
        qty: 1,
        unitCostDa: 0,
      })
    }
  }

  const refMatch = rawText.match(
    /(?:facture|fact\.?|n[°o]|ref\.?|bon)\s*[:\s#]*([A-Z0-9][\w/-]{2,})/i,
  )

  return {
    supplierName: guessSupplierName(lines, suppliers),
    invoiceRef: refMatch?.[1],
    lines: parsed,
    rawText,
  }
}

function nameScore(a: string, b: string): number {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const wa = new Set(na.split(' ').filter((w) => w.length > 2))
  const wb = new Set(nb.split(' ').filter((w) => w.length > 2))
  if (!wa.size || !wb.size) return 0
  let hit = 0
  for (const w of wa) if (wb.has(w)) hit++
  return hit / Math.max(wa.size, wb.size)
}

export function matchInvoiceLineToStock(
  line: InvoiceParsedLine,
  products: Product[],
): { product?: Product; score: number } {
  if (line.barcode) {
    const byCode = products.find(
      (p) =>
        p.barcode &&
        p.barcode.trim().toLowerCase() === line.barcode!.trim().toLowerCase(),
    )
    if (byCode) return { product: byCode, score: 1 }
  }
  let best: Product | undefined
  let bestScore = 0
  for (const p of products) {
    const s = nameScore(line.name, p.name)
    if (s > bestScore) {
      bestScore = s
      best = p
    }
  }
  if (best && bestScore >= 0.72) return { product: best, score: bestScore }
  return { score: bestScore }
}

export function findSupplierMatch(
  name: string | undefined,
  suppliers: Supplier[],
): Supplier | undefined {
  if (!name) return undefined
  let best: Supplier | undefined
  let bestScore = 0
  for (const s of suppliers) {
    const sc = nameScore(name, s.name)
    if (sc > bestScore) {
      bestScore = sc
      best = s
    }
  }
  return bestScore >= 0.6 ? best : undefined
}
