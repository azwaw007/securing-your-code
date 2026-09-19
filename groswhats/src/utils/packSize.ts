/** Taille de pack (œufs x6, yaourt x8…) — 1 quantité vendue = 1 pack. */

import type { Product } from '../types'

/**
 * Déduit la taille du pack depuis le nom.
 * Ex. « Œufs x6 », « Yaourt nature x8 », « Pack x12 », « ×6 »
 */
export function inferPackSize(name: string): number | undefined {
  const n = name.normalize('NFD').replace(/\u0300-\u036f/g, '')
  const patterns = [
    /\bpack\s*[x×]\s*(\d{1,3})\b/i,
    /\b[x×]\s*(\d{1,3})\b/i,
    /\b(\d{1,3})\s*(?:oeufs?|pieces?|pces?|unites?)\b/i,
  ]
  for (const re of patterns) {
    const m = n.match(re)
    if (!m) continue
    const size = Number(m[1])
    if (Number.isFinite(size) && size > 1 && size <= 100) return Math.round(size)
  }
  return undefined
}

/** Pièces dans 1 pack / carton (explicite ou déduit du nom). */
export function resolvePackSize(
  name: string,
  explicit?: number | null,
): number | undefined {
  if (typeof explicit === 'number' && explicit > 1) return Math.round(explicit)
  return inferPackSize(name)
}

/** Vrai si le produit se vend au pack (1 qty = 1 pack, pas l’unité interne). */
export function isRetailPack(p: Pick<Product, 'unit' | 'piecesPerPack'>): boolean {
  return p.unit === 'piece' && !!p.piecesPerPack && p.piecesPerPack > 1
}

/** Libellé court « Pack ×6 » */
export function packSizeLabel(p: Pick<Product, 'piecesPerPack' | 'unit'>): string | null {
  if (!p.piecesPerPack || p.piecesPerPack <= 1) return null
  if (p.unit === 'carton') return null
  return `×${p.piecesPerPack}`
}
