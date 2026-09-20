/** Alias facture → produit + historique fournisseur (hors ligne, localStorage via AppState). */

import type { AppState, InvoiceProductAlias, Product, Purchase } from '../types'
import { nameScore, normalizeInvoiceName } from './invoiceParse'

export const DEFAULT_PURCHASE_MARGIN_PCT = 20
/** Seuil alerte doublon (nouveau produit trop proche d’un existant). */
export const DUPLICATE_NAME_THRESHOLD = 0.72

export function purchaseMarginPct(state: AppState): number {
  const m = state.settings.purchaseMarginPct
  if (typeof m === 'number' && Number.isFinite(m) && m >= 0 && m <= 200) return m
  return DEFAULT_PURCHASE_MARGIN_PCT
}

export function suggestSalePriceDa(costDa: number, marginPct: number): number {
  if (!(costDa > 0)) return 0
  return Math.max(0, Math.round(costDa * (1 + marginPct / 100)))
}

export function findAliasProductId(
  invoiceName: string,
  aliases: InvoiceProductAlias[] | undefined,
): string | undefined {
  const key = normalizeInvoiceName(invoiceName)
  if (!key || !aliases?.length) return undefined
  const hit = aliases.find((a) => a.key === key)
  return hit?.productId
}

/** Enregistre / renforce le lien nom facture → produit (après confirmation utilisateur). */
export function rememberInvoiceAlias(
  state: AppState,
  invoiceName: string,
  productId: string,
): AppState {
  const key = normalizeInvoiceName(invoiceName)
  if (!key || !productId) return state
  const now = new Date().toISOString()
  const prev = state.invoiceAliases ?? []
  const existing = prev.find((a) => a.key === key)
  let next: InvoiceProductAlias[]
  if (existing) {
    next = prev.map((a) =>
      a.key === key
        ? { ...a, productId, hits: a.hits + 1, updatedAt: now }
        : a,
    )
  } else {
    next = [
      { key, productId, hits: 1, updatedAt: now },
      ...prev,
    ].slice(0, 500)
  }
  return { ...state, invoiceAliases: next }
}

/**
 * Produits souvent achetés chez ce fournisseur (fréquence décroissante).
 * Boost matching + suggestions UI.
 */
export function supplierFrequentProducts(
  purchases: Purchase[],
  supplierId: string | undefined,
  supplierName: string | undefined,
  limit = 20,
): { productId: string; count: number; name: string }[] {
  if (!supplierId && !supplierName?.trim()) return []
  const counts = new Map<string, { count: number; name: string }>()
  for (const p of purchases) {
    const same =
      (supplierId && p.supplierId === supplierId) ||
      (supplierName &&
        normalizeInvoiceName(p.supplierName) ===
          normalizeInvoiceName(supplierName))
    if (!same) continue
    for (const line of p.lines) {
      const cur = counts.get(line.productId) || { count: 0, name: line.name }
      cur.count += 1
      cur.name = line.name || cur.name
      counts.set(line.productId, cur)
    }
  }
  return [...counts.entries()]
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Boost 0–0.22 selon fréquence fournisseur. */
export function supplierBoostMap(
  frequent: { productId: string; count: number }[],
): Map<string, number> {
  const map = new Map<string, number>()
  if (!frequent.length) return map
  const max = frequent[0].count || 1
  for (const f of frequent) {
    map.set(f.productId, 0.08 + 0.14 * (f.count / max))
  }
  return map
}

export function findDuplicateProduct(
  name: string,
  products: Product[],
  excludeId?: string,
): { product: Product; score: number } | undefined {
  let best: Product | undefined
  let bestScore = 0
  for (const p of products) {
    if (excludeId && p.id === excludeId) continue
    const s = nameScore(name, p.name)
    if (s > bestScore) {
      bestScore = s
      best = p
    }
  }
  if (best && bestScore >= DUPLICATE_NAME_THRESHOLD) {
    return { product: best, score: bestScore }
  }
  return undefined
}
