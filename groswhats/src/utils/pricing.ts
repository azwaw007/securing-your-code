import type { CommerceMode, PriceTier, Product, Unit } from '../types'

export function optPrice(n: unknown): number | undefined {
  return typeof n === 'number' && n > 0 ? n : undefined
}

export function optPackSize(n: unknown): number | undefined {
  return typeof n === 'number' && n > 0 ? Math.round(n) : undefined
}

/** Migre ancien packPriceDa → grosPriceDa */
export function normalizeProductPricing<T extends Partial<Product>>(p: T): T {
  const piecesPerPack = optPackSize(p.piecesPerPack)
  let grosPriceDa = optPrice(p.grosPriceDa)
  if (!grosPriceDa) grosPriceDa = optPrice(p.packPriceDa)
  return {
    ...p,
    piecesPerPack,
    demiGrosPriceDa: optPrice(p.demiGrosPriceDa),
    grosPriceDa,
    superGrosPriceDa: optPrice(p.superGrosPriceDa),
    packPriceDa: grosPriceDa,
  }
}

export function tierLabelKey(tier: PriceTier): string {
  return `tier_${tier}`
}

export function priceForTier(p: Product, tier: PriceTier): number | null {
  if (tier === 'piece') return p.priceDa
  if (tier === 'demi_gros') return p.demiGrosPriceDa ?? null
  if (tier === 'gros') return p.grosPriceDa ?? p.packPriceDa ?? null
  if (tier === 'super_gros') return p.superGrosPriceDa ?? null
  return null
}

export function availableTiers(p: Product, mode?: CommerceMode): PriceTier[] {
  if (mode && mode !== 'gros') return ['piece']
  const list: PriceTier[] = ['piece']
  if (priceForTier(p, 'demi_gros') != null) list.push('demi_gros')
  if (priceForTier(p, 'gros') != null && (p.piecesPerPack ?? 0) > 0) {
    list.push('gros')
  }
  if (priceForTier(p, 'super_gros') != null && (p.piecesPerPack ?? 0) > 0) {
    list.push('super_gros')
  }
  return list
}

export function isCartonTier(tier: PriceTier): boolean {
  return tier === 'gros' || tier === 'super_gros'
}

export function sellUnitForTier(tier: PriceTier): Unit {
  return isCartonTier(tier) ? 'carton' : 'piece'
}

/** Unités de stock (pièces) retirées pour une qté vendue à ce tarif */
export function stockUnitsForTier(
  p: Product,
  tier: PriceTier,
  qty: number,
): number {
  if (isCartonTier(tier) && p.piecesPerPack && p.piecesPerPack > 0) {
    return +(qty * p.piecesPerPack).toFixed(3)
  }
  return qty
}

export function maxQtyForTier(p: Product, tier: PriceTier): number {
  if (isCartonTier(tier) && p.piecesPerPack && p.piecesPerPack > 0) {
    return Math.floor(p.stock / p.piecesPerPack)
  }
  return p.stock
}

/** Coût d’achat pour 1 unité vendue (pièce ou carton) */
export function costForTier(p: Product, tier: PriceTier): number {
  const base = p.costDa || 0
  if (isCartonTier(tier) && p.piecesPerPack && p.piecesPerPack > 0) {
    return +(base * p.piecesPerPack).toFixed(2)
  }
  return base
}
