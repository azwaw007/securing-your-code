/** Migration depuis un ancien logiciel — CSV produits / clients. */

import type { AppState, Product, ProductCategory, Unit } from '../types'
import { ALL_UNITS } from '../types'
import {
  addClient,
  addProduct,
  setClientDisplayedBalance,
  updateClient,
  updateProduct,
} from '../store'

export type MigrationKind = 'products' | 'clients'

export type MigrationResult = {
  added: number
  updated: number
  skipped: number
  errors: string[]
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQ = !inQ
      continue
    }
    if (!inQ && (ch === ',' || ch === ';')) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '')
    .trim()
}

function headerIndex(headers: string[], aliases: string[]): number {
  const h = headers.map(normHeader)
  const aliasesN = aliases.map(normHeader)
  for (const a of aliasesN) {
    const i = h.findIndex((x) => x === a || x.includes(a))
    if (i >= 0) return i
  }
  return -1
}

function parseNum(raw: string | undefined): number | undefined {
  if (raw == null) return undefined
  const cleaned = String(raw)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  if (!cleaned) return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '').trim()
}

function phoneDigits(raw: string): string {
  return normalizePhone(raw).replace(/\D/g, '')
}

function parseUnit(raw: string | undefined): Unit {
  const u = (raw || 'piece').trim().toLowerCase()
  if ((ALL_UNITS as string[]).includes(u)) return u as Unit
  const map: Record<string, Unit> = {
    piece: 'piece',
    pieces: 'piece',
    pc: 'piece',
    pce: 'piece',
    unite: 'piece',
    carton: 'carton',
    pack: 'carton',
    kg: 'kg',
    g: 'g',
    m: 'm',
    cm: 'cm',
    ml: 'ml',
    l: 'L',
    litre: 'L',
    liters: 'L',
  }
  return map[u] || 'piece'
}

function parseCategory(raw: string | undefined): ProductCategory {
  const c = (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (c.includes('cosmet')) return 'cosmetique'
  if (c.includes('consomm') || c.includes('menage')) return 'consommable'
  if (c.includes('quinca') || c.includes('outil')) return 'quincaillerie'
  if (c.includes('textil') || c.includes('vetement')) return 'textile'
  if (c.includes('aliment') || c.includes('epicer') || c.includes('food')) {
    return 'alimentaire'
  }
  if (c) return 'autre'
  return 'alimentaire'
}

function parseRows(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return null
  const headers = splitCsvLine(lines[0])
  const rows = lines.slice(1).map(splitCsvLine)
  return { headers, rows }
}

export const SAMPLE_PRODUCTS_CSV = `nom;barcode;prix;achat;stock;unite;categorie;pack10;pack15;pack30
Œufs;3057640385115;22;16;500;piece;alimentaire;200;290;560
Huile 1 L;613000000001;320;260;40;piece;alimentaire;;;
Sucre 1 kg;;200;170;80;kg;alimentaire;;;
`

export const SAMPLE_CLIENTS_CSV = `nom;telephone;ville;solde;adresse;notes
Client Test;0555123456;Alger;1500;Bab Ezzouar;Ancien logiciel
Boulangerie Ali;0770123456;Oran;0;;
`

export function downloadSampleCsv(kind: MigrationKind): void {
  const body = kind === 'products' ? SAMPLE_PRODUCTS_CSV : SAMPLE_CLIENTS_CSV
  const name =
    kind === 'products'
      ? 'azpos-modele-produits.csv'
      : 'azpos-modele-clients.csv'
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function findProduct(
  state: AppState,
  name: string,
  barcode: string,
): Product | undefined {
  const bc = barcode.trim()
  if (bc) {
    const byBc = state.products.find(
      (p) => (p.barcode || '').trim().toLowerCase() === bc.toLowerCase(),
    )
    if (byBc) return byBc
  }
  const n = name.trim().toLowerCase()
  return state.products.find((p) => p.name.trim().toLowerCase() === n)
}

/** Importe un CSV produits (ajoute ou met à jour). Stock = nombre de pièces. */
export function importProductsCsv(
  state: AppState,
  text: string,
): { state: AppState; result: MigrationResult } {
  const parsed = parseRows(text)
  const result: MigrationResult = {
    added: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }
  if (!parsed) {
    result.errors.push('empty')
    return { state, result }
  }

  const { headers, rows } = parsed
  const iName = headerIndex(headers, [
    'nom',
    'name',
    'produit',
    'product',
    'article',
    'designation',
  ])
  const iBarcode = headerIndex(headers, [
    'barcode',
    'codebarres',
    'codebarre',
    'ean',
    'gtin',
    'code',
    'ref',
    'sku',
  ])
  const iPrice = headerIndex(headers, [
    'prix',
    'price',
    'prixvente',
    'vente',
    'pv',
    'tarif',
  ])
  const iCost = headerIndex(headers, [
    'achat',
    'cost',
    'prixachat',
    'pa',
    'cout',
    'costda',
  ])
  const iStock = headerIndex(headers, [
    'stock',
    'qte',
    'qty',
    'quantite',
    'quantity',
    'reste',
  ])
  const iUnit = headerIndex(headers, ['unite', 'unit', 'u'])
  const iCat = headerIndex(headers, ['categorie', 'category', 'cat', 'rayon'])
  const iPack10 = headerIndex(headers, ['pack10', 'prixpack10', 'x10'])
  const iPack15 = headerIndex(headers, ['pack15', 'prixpack15', 'x15'])
  const iPack30 = headerIndex(headers, ['pack30', 'prixpack30', 'x30'])

  if (iName < 0) {
    result.errors.push('needName')
    return { state, result }
  }

  let next = state
  for (let li = 0; li < rows.length; li++) {
    const cols = rows[li]
    const name = (cols[iName] || '').trim()
    if (!name) {
      result.skipped += 1
      continue
    }
    const barcode = iBarcode >= 0 ? (cols[iBarcode] || '').trim() : ''
    const price = iPrice >= 0 ? parseNum(cols[iPrice]) : undefined
    const cost = iCost >= 0 ? parseNum(cols[iCost]) : undefined
    const stock = iStock >= 0 ? parseNum(cols[iStock]) : undefined
    const unit = parseUnit(iUnit >= 0 ? cols[iUnit] : undefined)
    const category = parseCategory(iCat >= 0 ? cols[iCat] : undefined)

    const packOptions: { size: number; priceDa: number }[] = []
    const p10 = iPack10 >= 0 ? parseNum(cols[iPack10]) : undefined
    const p15 = iPack15 >= 0 ? parseNum(cols[iPack15]) : undefined
    const p30 = iPack30 >= 0 ? parseNum(cols[iPack30]) : undefined
    if (p10 && p10 > 0) packOptions.push({ size: 10, priceDa: p10 })
    if (p15 && p15 > 0) packOptions.push({ size: 15, priceDa: p15 })
    if (p30 && p30 > 0) packOptions.push({ size: 30, priceDa: p30 })

    const existing = findProduct(next, name, barcode)
    if (existing) {
      next = updateProduct(next, existing.id, {
        name,
        barcode: barcode || existing.barcode,
        priceDa: price != null && price >= 0 ? price : existing.priceDa,
        costDa: cost != null && cost >= 0 ? cost : existing.costDa,
        stock: stock != null && stock >= 0 ? stock : existing.stock,
        unit,
        category,
        packOptions: packOptions.length ? packOptions : existing.packOptions,
      })
      result.updated += 1
    } else {
      if (price == null || price < 0) {
        result.skipped += 1
        result.errors.push(`row:${li + 2}:needPrice`)
        continue
      }
      next = addProduct(next, {
        name,
        category,
        unit,
        priceDa: price,
        costDa: cost != null && cost >= 0 ? cost : 0,
        stock: stock != null && stock >= 0 ? stock : 0,
        lowStockAt: unit === 'piece' ? 5 : 2,
        barcode: barcode || undefined,
        packOptions: packOptions.length ? packOptions : undefined,
      })
      result.added += 1
    }
  }

  result.errors = result.errors.slice(0, 8)
  return { state: next, result }
}

/** Importe un CSV clients (ajoute ou met à jour + solde). */
export function importClientsCsv(
  state: AppState,
  text: string,
): { state: AppState; result: MigrationResult } {
  const parsed = parseRows(text)
  const result: MigrationResult = {
    added: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }
  if (!parsed) {
    result.errors.push('empty')
    return { state, result }
  }

  const { headers, rows } = parsed
  const iName = headerIndex(headers, [
    'nom',
    'name',
    'client',
    'customer',
    'raison',
  ])
  const iPhone = headerIndex(headers, [
    'telephone',
    'phone',
    'tel',
    'mobile',
    'whatsapp',
    'gsm',
    'numero',
  ])
  const iCity = headerIndex(headers, ['ville', 'city', 'wilaya', 'commune'])
  const iBalance = headerIndex(headers, [
    'solde',
    'balance',
    'credit',
    'dette',
    'reste',
    'due',
  ])
  const iAddress = headerIndex(headers, [
    'adresse',
    'address',
    'rue',
    'quartier',
  ])
  const iNotes = headerIndex(headers, ['notes', 'note', 'remarque', 'comment'])

  if (iName < 0 || iPhone < 0) {
    result.errors.push('needNamePhone')
    return { state, result }
  }

  let next = state
  for (let li = 0; li < rows.length; li++) {
    const cols = rows[li]
    const name = (cols[iName] || '').trim()
    const phone = normalizePhone(cols[iPhone] || '')
    const digits = phoneDigits(phone)
    if (!name || digits.length < 8) {
      result.skipped += 1
      continue
    }
    const city =
      iCity >= 0
        ? (cols[iCity] || '').trim() || next.settings.city
        : next.settings.city
    const address = iAddress >= 0 ? (cols[iAddress] || '').trim() : ''
    const notes = iNotes >= 0 ? (cols[iNotes] || '').trim() : ''
    const balance = iBalance >= 0 ? parseNum(cols[iBalance]) : undefined

    const existing = next.clients.find((c) => phoneDigits(c.phone) === digits)
    if (existing) {
      next = updateClient(next, existing.id, {
        name,
        phone,
        city,
        address: address || existing.address,
        notes: notes || existing.notes,
      })
      if (balance != null && balance >= 0) {
        next = setClientDisplayedBalance(next, existing.id, balance)
      }
      result.updated += 1
    } else {
      const before = next.clients.length
      next = addClient(next, {
        name,
        phone,
        city,
        address,
        notes,
        balanceAdjustDa:
          balance != null && balance >= 0 ? +balance.toFixed(2) : undefined,
      })
      if (next.clients.length > before) result.added += 1
      else result.skipped += 1
    }
  }

  return { state: next, result }
}

export function importMigrationCsv(
  state: AppState,
  kind: MigrationKind,
  text: string,
): { state: AppState; result: MigrationResult } {
  return kind === 'products'
    ? importProductsCsv(state, text)
    : importClientsCsv(state, text)
}
