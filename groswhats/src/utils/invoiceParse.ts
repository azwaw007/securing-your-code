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

export type InvoiceMatchKind = 'stock' | 'new' | 'off' | 'maybe'

export type InvoiceMatchCandidate = {
  productId: string
  name: string
  score: number
}

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
  matchScore?: number
  candidates?: InvoiceMatchCandidate[]
}

/** Seuil auto-lien stock (code ou nom très proche). */
export const STOCK_MATCH_THRESHOLD = 0.68
/** Seuil suggestion « peut-être » (à confirmer). */
export const MAYBE_MATCH_THRESHOLD = 0.48

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d)\s*l(?:itre)?s?\b/gi, '$1l')
    .replace(/(\d)\s*cl\b/gi, '$1cl')
    .replace(/(\d)\s*ml\b/gi, '$1ml')
    .replace(/(\d)\s*kgs?\b/gi, '$1kg')
    .replace(/(\d)\s*g(?:rammes?)?\b/gi, '$1g')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim()
}

function toNum(s: string): number {
  const cleaned = String(s)
    .replace(/\s/g, '')
    .replace(/[^\d.,\-]/g, '')
    .replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

/** Corrige confusions OCR fréquentes dans les codes-barres. */
export function sanitizeBarcodeToken(raw: string): string | undefined {
  const fixed = raw
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8')
    .replace(/\s+/g, '')
  if (!/^\d{8}$|^\d{12,14}$/.test(fixed)) return undefined
  return fixed
}

const EAN_RE = /\b([0-9OoIl|SsBb]{8}|[0-9OoIl|SsBb]{12,14})\b/g
const QTY_PRICE_RE =
  /(?:^|\s)(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i
/** Qté: 12 · Qty 3 · كمية 5 · 12 pcs · 12 u */
const QTY_LABEL_RE =
  /(?:qte|qté|qty|quantite|quantité|كمية|عدد)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i
const QTY_UNIT_RE =
  /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:pcs?|pces?|pieces?|unités?|unites?|u\.?|كرتون|قطعة|علبة)\b/i
const PU_LABEL_RE =
  /(?:p\.?\s*u\.?|prix\s*unit(?:aire)?|unit(?:ary)?\s*price|ثمن)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i
const TOTAL_LINE_RE =
  /(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*(?:da|دج|dzd)?\s*$/i
const MONEY_TAIL_RE =
  /(\d+(?:[.,]\d+)?)\s*(?:da|دج|dzd)\b/gi

const SUPPLIER_HINT =
  /\b(sarl|eurl|spa|ets\.?|etablissement|ste\.?|societe|شركة|مؤسسة|fournisseur|livreur)\b/i

const SKIP_LINE =
  /^(total|sous[- ]?total|tva|timbre|net\s+a\s+payer|montant(\s+ttc)?|page\s+\d|tel\.?|fax|rc\b|nif\b|ai\b|nis\b|date\b|facture\b|bon\s+de|qty|qte|designation|désignation|prix|article|libelle|libellé|رقم|تاريخ)/i

export function extractBarcodes(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of text.matchAll(EAN_RE)) {
    const code = sanitizeBarcodeToken(m[1])
    if (!code || seen.has(code)) continue
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
  for (const line of lines.slice(0, 6)) {
    const t = line.trim()
    if (t.length >= 4 && t.length <= 60 && !/^\d+$/.test(t) && !SKIP_LINE.test(t)) {
      if (/[a-zA-Z\u0600-\u06ff]{3,}/.test(t)) return t
    }
  }
  return undefined
}

/** Colle une ligne « orpheline » (nom seul) avec la suivante (prix / qty). */
export function mergeBrokenOcrLines(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim()
    const next = lines[i + 1]?.trim()
    if (!next) {
      out.push(cur)
      continue
    }
    const curHasMoney =
      QTY_PRICE_RE.test(cur) ||
      TOTAL_LINE_RE.test(cur) ||
      PU_LABEL_RE.test(cur) ||
      MONEY_TAIL_RE.test(cur)
    const curHasCode = extractBarcodes(cur).length > 0
    const nextLooksPrice =
      QTY_PRICE_RE.test(next) ||
      TOTAL_LINE_RE.test(next) ||
      PU_LABEL_RE.test(next) ||
      /^\d+(?:[.,]\d+)?(\s+\d+(?:[.,]\d+)?){1,2}\s*(?:da|دج)?$/i.test(next)
    const curLooksName =
      /[a-zA-Z\u0600-\u06ff]{3,}/.test(cur) &&
      !SKIP_LINE.test(cur) &&
      !curHasMoney &&
      cur.length < 90

    if (curLooksName && nextLooksPrice && (!curHasCode || !curHasMoney)) {
      out.push(`${cur} ${next}`)
      i++
      continue
    }
    out.push(cur)
  }
  return out
}

function stripParsedNoise(line: string, barcode?: string): string {
  let name = line
  if (barcode) {
    name = name.replace(barcode, ' ')
  }
  name = name
    .replace(EAN_RE, ' ')
    .replace(QTY_PRICE_RE, ' ')
    .replace(QTY_LABEL_RE, ' ')
    .replace(QTY_UNIT_RE, ' ')
    .replace(PU_LABEL_RE, ' ')
    .replace(TOTAL_LINE_RE, ' ')
    .replace(MONEY_TAIL_RE, ' ')
    .replace(/\b\d+[.,]\d{2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return name
}

function parseOneLine(raw: string): InvoiceParsedLine | null {
  const line = raw.replace(/\s+/g, ' ').trim()
  if (line.length < 3 || SKIP_LINE.test(line)) return null
  if (
    SUPPLIER_HINT.test(line) &&
    !extractBarcodes(line).length &&
    !QTY_PRICE_RE.test(line) &&
    !TOTAL_LINE_RE.test(line)
  ) {
    return null
  }

  const barcodes = extractBarcodes(line)
  const barcode = barcodes[0]

  let qty = 1
  let unitCostDa = 0
  let lineTotalDa: number | undefined
  let qtyExplicit = false

  const qx = line.match(QTY_PRICE_RE)
  if (qx) {
    qty = toNum(qx[1]) || 1
    unitCostDa = toNum(qx[2]) || 0
    qtyExplicit = true
  } else {
    const ql = line.match(QTY_LABEL_RE) || line.match(QTY_UNIT_RE)
    if (ql) {
      qty = toNum(ql[1]) || 1
      qtyExplicit = true
    }
    const pu = line.match(PU_LABEL_RE)
    if (pu) {
      unitCostDa = toNum(pu[1]) || 0
    }

    const tri = line.match(TOTAL_LINE_RE)
    if (tri && unitCostDa <= 0) {
      const a = toNum(tri[1])
      const b = toNum(tri[2])
      const c = toNum(tri[3])
      if (c > 0 && a > 0 && b > 0) {
        if (Math.abs(a * b - c) <= Math.max(1, c * 0.02)) {
          qty = a
          unitCostDa = b
          lineTotalDa = c
          qtyExplicit = true
        } else if (Math.abs(b * a - c) <= Math.max(1, c * 0.02)) {
          qty = b
          unitCostDa = a
          lineTotalDa = c
          qtyExplicit = true
        } else if (a >= 1 && a <= 500 && b > a) {
          qty = a
          unitCostDa = b
          lineTotalDa = c
          qtyExplicit = true
        } else {
          unitCostDa = b
          lineTotalDa = c
          qty = a >= 1 && a < 1000 ? a : 1
          qtyExplicit = a >= 1 && a < 1000
        }
      }
    } else if (unitCostDa <= 0) {
      const moneys = [...line.matchAll(MONEY_TAIL_RE)].map((m) => toNum(m[1]))
      if (moneys.length === 1 && Number.isFinite(moneys[0])) {
        unitCostDa = moneys[0]
      } else if (moneys.length >= 2) {
        unitCostDa = moneys[moneys.length - 2]
        lineTotalDa = moneys[moneys.length - 1]
        if (
          qtyExplicit &&
          qty > 0 &&
          lineTotalDa > 0 &&
          Math.abs(qty * unitCostDa - lineTotalDa) > Math.max(2, lineTotalDa * 0.05)
        ) {
          unitCostDa = +(lineTotalDa / qty).toFixed(2)
        }
      }
    }
  }

  if (lineTotalDa && lineTotalDa > 0 && qty > 0 && unitCostDa <= 0) {
    unitCostDa = +(lineTotalDa / qty).toFixed(2)
  }

  let name = stripParsedNoise(line, barcode)

  if (!name && barcode) name = barcode
  if (!name) return null
  if (!barcode && unitCostDa <= 0 && !qtyExplicit && name.length < 4) return null
  if (
    !barcode &&
    unitCostDa <= 0 &&
    !qtyExplicit &&
    !line.match(TOTAL_LINE_RE) &&
    name.split(' ').length <= 4
  ) {
    if (!/\d|ml|kg|cl|g\b|l\b|pack|carton|lait|huile|riz|sucre|eau/i.test(name)) {
      return null
    }
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
  const rawLines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const lines = mergeBrokenOcrLines(rawLines)

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
    /(?:(?:facture|فاتورة|fact\.|n[°o]|n°|no\.?|ref\.?|bon)\s*[:\s#]+)([A-Z0-9][\w/-]{2,})/i,
  )

  return {
    supplierName: guessSupplierName(lines, suppliers),
    invoiceRef: refMatch?.[1],
    lines: parsed,
    rawText,
  }
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const row = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) row[j] = j
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return row[b.length]
}

export function nameScore(a: string, b: string): number {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length)
    return 0.78 + 0.17 * ratio
  }

  const wa = na.split(' ').filter((w) => w.length > 1)
  const wb = nb.split(' ').filter((w) => w.length > 1)
  if (!wa.length || !wb.length) return 0

  let hit = 0
  for (const w of wa) {
    if (wb.some((x) => x === w || x.includes(w) || w.includes(x))) hit++
  }
  const jaccard = hit / Math.max(wa.length, wb.length)

  const maxLen = Math.max(na.length, nb.length)
  const lev = 1 - levenshtein(na, nb) / maxLen

  return Math.max(jaccard * 0.85 + lev * 0.15, lev * 0.9, jaccard)
}

function barcodeLooseEqual(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  if (!x || !y) return false
  if (x === y) return true
  // UPC-A ↔ EAN-13 (0 + 12)
  if (x.length === 12 && y.length === 13 && y === `0${x}`) return true
  if (y.length === 12 && x.length === 13 && x === `0${y}`) return true
  // Suffixe 8+ chiffres (étiquettes tronquées OCR)
  if (x.length >= 8 && y.length >= 8) {
    const sx = x.slice(-8)
    const sy = y.slice(-8)
    if (sx === sy) return true
  }
  return false
}

export function matchInvoiceLineToStock(
  line: InvoiceParsedLine,
  products: Product[],
): {
  product?: Product
  score: number
  candidates: InvoiceMatchCandidate[]
} {
  const candidates: InvoiceMatchCandidate[] = []

  if (line.barcode) {
    const byCode = products.find(
      (p) => p.barcode && barcodeLooseEqual(p.barcode, line.barcode!),
    )
    if (byCode) {
      return {
        product: byCode,
        score: 1,
        candidates: [{ productId: byCode.id, name: byCode.name, score: 1 }],
      }
    }
  }

  let best: Product | undefined
  let bestScore = 0
  for (const p of products) {
    const s = nameScore(line.name, p.name)
    if (s >= MAYBE_MATCH_THRESHOLD) {
      candidates.push({ productId: p.id, name: p.name, score: s })
    }
    if (s > bestScore) {
      bestScore = s
      best = p
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const top = candidates.slice(0, 5)

  if (best && bestScore >= STOCK_MATCH_THRESHOLD) {
    return { product: best, score: bestScore, candidates: top }
  }
  return { score: bestScore, candidates: top }
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
  return bestScore >= 0.55 ? best : undefined
}
