/**
 * Conversions d’unités (même catégorie) pour calculs POS.
 * Facteurs vers une base SI / commerce par catégorie.
 */
import type { Unit } from '../types'
import { unitMeta, type UnitCategory } from './unitsCatalog'

/** Facteur vers l’unité de base de la catégorie (ex. m, m², L, kg, s) */
const TO_BASE: Partial<Record<Unit, number>> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  inch: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  cm2: 0.0001,
  m2: 1,
  hectare: 10_000,
  ml: 0.001,
  cl: 0.01,
  L: 1,
  m3: 1000,
  gallon: 3.785411784,
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  tonne: 1000,
  sec: 1,
  min: 60,
  hour: 3600,
  day: 86_400,
  week: 604_800,
  month: 2_592_000,
  year: 31_536_000,
  minute_media: 60,
}

const BASE_OF: Partial<Record<UnitCategory, Unit>> = {
  length: 'm',
  area: 'm2',
  volume: 'L',
  mass: 'kg',
  time: 'sec',
  media: 'sec',
}

export function canConvert(from: Unit, to: Unit): boolean {
  if (from === to) return true
  const a = unitMeta(from)
  const b = unitMeta(to)
  if (a.category !== b.category) return false
  return TO_BASE[from] != null && TO_BASE[to] != null
}

/** Convertit une quantité ; null si catégories incompatibles */
export function convertUnit(qty: number, from: Unit, to: Unit): number | null {
  if (!Number.isFinite(qty)) return null
  if (from === to) return qty
  if (!canConvert(from, to)) return null
  const f = TO_BASE[from]!
  const t = TO_BASE[to]!
  return +((qty * f) / t).toFixed(6)
}

export function baseUnitOf(unit: Unit): Unit | undefined {
  return BASE_OF[unitMeta(unit).category]
}

/** Prix unitaire recalculé après conversion de quantité (même ligne de vente) */
export function convertPrice(
  pricePerFrom: number,
  from: Unit,
  to: Unit,
): number | null {
  const q = convertUnit(1, to, from)
  if (q == null) return null
  return +(pricePerFrom * q).toFixed(4)
}
