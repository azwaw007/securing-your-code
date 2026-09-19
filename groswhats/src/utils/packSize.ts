/** Packs (œufs ×10 / ×15 / ×30…) — stock toujours en pièces. */

import type { PackOption, Product } from '../types'

/**
 * Déduit une taille de pack depuis le nom (migration / seed).
 * Ex. « Œufs x6 », « Pack x12 », « ×30 »
 */
export function inferPackSize(name: string): number | undefined {
  const n = name.normalize('NFD').replace(/\u0300-\u036f/g, '')
  const patterns = [
    /\bpack\s*[x×]\s*(\d{1,3})\b/i,
    /\b[x×]\s*(\d{1,3})\b/i,
    /\b(\d{1,3})\s*(?:oeufs?|pieces?|pces?|unites?)\b/i,
    /\bplateau\s*(\d{1,3})\b/i,
  ]
  for (const re of patterns) {
    const m = n.match(re)
    if (!m) continue
    const size = Number(m[1])
    if (Number.isFinite(size) && size > 1 && size <= 100) return Math.round(size)
  }
  return undefined
}

/** Pièces dans 1 carton (explicite ou déduit du nom) — mode gros. */
export function resolvePackSize(
  name: string,
  explicit?: number | null,
): number | undefined {
  if (typeof explicit === 'number' && explicit > 1) return Math.round(explicit)
  return inferPackSize(name)
}

export function normalizePackOptions(
  raw: unknown,
): PackOption[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const out: PackOption[] = []
  const seen = new Set<number>()
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const size = Number((row as PackOption).size)
    const priceDa = Number((row as PackOption).priceDa)
    if (!(size > 1) || !(priceDa > 0)) continue
    const s = Math.round(size)
    if (seen.has(s)) continue
    seen.add(s)
    out.push({ size: s, priceDa: +priceDa.toFixed(2) })
  }
  out.sort((a, b) => a.size - b.size)
  return out.length ? out : undefined
}

/**
 * Packs proposés à la caisse :
 * - packOptions explicites, ou
 * - un pack dérivé de piecesPerPack + prix carton (compat).
 */
export function sellablePackOptions(
  p: Pick<Product, 'packOptions' | 'piecesPerPack' | 'grosPriceDa' | 'packPriceDa'>,
): PackOption[] {
  const explicit = normalizePackOptions(p.packOptions)
  if (explicit?.length) return explicit
  const size = p.piecesPerPack
  const price = p.grosPriceDa ?? p.packPriceDa
  if (size && size > 1 && price && price > 0) {
    return [{ size, priceDa: price }]
  }
  return []
}

export function packSizeLabel(size: number): string {
  return `×${size}`
}

/** Prix d’un pack de `size` pièces, si proposé. */
export function priceForPackSize(
  p: Pick<Product, 'packOptions' | 'piecesPerPack' | 'grosPriceDa' | 'packPriceDa'>,
  size: number,
): number | null {
  const hit = sellablePackOptions(p).find((o) => o.size === size)
  return hit ? hit.priceDa : null
}
