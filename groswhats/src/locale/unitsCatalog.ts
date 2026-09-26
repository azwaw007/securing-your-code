/**
 * Catalogue d’unités AZ POS — SI + commerce + métiers.
 * Sources : NIST SI / unit pricing, UN/ECE Rec.20 (commerce), usages POS métier.
 */
import type { Unit } from '../types'
import type { MetierFamily } from './metierPacks'

export type UnitCategory =
  | 'count'
  | 'length'
  | 'area'
  | 'volume'
  | 'mass'
  | 'time'
  | 'energy'
  | 'service'
  | 'medical'
  | 'media'
  | 'other'

export type UnitMeta = {
  id: Unit
  category: UnitCategory
  step: number
  decimal: boolean
}

/** Toutes les unités vendables / stockables */
export const UNIT_CATALOG: UnitMeta[] = [
  { id: 'piece', category: 'count', step: 1, decimal: false },
  { id: 'carton', category: 'count', step: 1, decimal: false },
  { id: 'dozen', category: 'count', step: 1, decimal: false },
  { id: 'pair', category: 'count', step: 1, decimal: false },
  { id: 'set', category: 'count', step: 1, decimal: false },
  { id: 'box', category: 'count', step: 1, decimal: false },
  { id: 'pack', category: 'count', step: 1, decimal: false },
  { id: 'roll', category: 'count', step: 1, decimal: false },
  { id: 'sheet', category: 'count', step: 1, decimal: false },
  { id: 'mm', category: 'length', step: 1, decimal: true },
  { id: 'cm', category: 'length', step: 10, decimal: true },
  { id: 'm', category: 'length', step: 0.5, decimal: true },
  { id: 'km', category: 'length', step: 0.1, decimal: true },
  { id: 'inch', category: 'length', step: 1, decimal: true },
  { id: 'ft', category: 'length', step: 0.5, decimal: true },
  { id: 'yd', category: 'length', step: 0.5, decimal: true },
  { id: 'cm2', category: 'area', step: 10, decimal: true },
  { id: 'm2', category: 'area', step: 0.5, decimal: true },
  { id: 'hectare', category: 'area', step: 0.01, decimal: true },
  { id: 'ml', category: 'volume', step: 10, decimal: true },
  { id: 'cl', category: 'volume', step: 1, decimal: true },
  { id: 'L', category: 'volume', step: 0.5, decimal: true },
  { id: 'm3', category: 'volume', step: 0.5, decimal: true },
  { id: 'gallon', category: 'volume', step: 0.5, decimal: true },
  { id: 'mg', category: 'mass', step: 10, decimal: true },
  { id: 'g', category: 'mass', step: 10, decimal: true },
  { id: 'kg', category: 'mass', step: 0.5, decimal: true },
  { id: 'tonne', category: 'mass', step: 0.1, decimal: true },
  { id: 'sec', category: 'time', step: 1, decimal: false },
  { id: 'min', category: 'time', step: 1, decimal: false },
  { id: 'hour', category: 'time', step: 0.5, decimal: true },
  { id: 'day', category: 'time', step: 1, decimal: false },
  { id: 'week', category: 'time', step: 1, decimal: false },
  { id: 'month', category: 'time', step: 1, decimal: false },
  { id: 'year', category: 'time', step: 1, decimal: false },
  { id: 'kWh', category: 'energy', step: 0.1, decimal: true },
  { id: 'W', category: 'energy', step: 1, decimal: true },
  { id: 'A', category: 'energy', step: 0.1, decimal: true },
  { id: 'V', category: 'energy', step: 1, decimal: true },
  { id: 'bar', category: 'energy', step: 0.1, decimal: true },
  { id: 'celsius', category: 'energy', step: 1, decimal: true },
  { id: 'session', category: 'service', step: 1, decimal: false },
  { id: 'person', category: 'service', step: 1, decimal: false },
  { id: 'seat', category: 'service', step: 1, decimal: false },
  { id: 'night', category: 'service', step: 1, decimal: false },
  { id: 'ticket', category: 'service', step: 1, decimal: false },
  { id: 'license', category: 'service', step: 1, decimal: false },
  { id: 'dose', category: 'medical', step: 1, decimal: false },
  { id: 'tablet', category: 'medical', step: 1, decimal: false },
  { id: 'ampule', category: 'medical', step: 1, decimal: false },
  { id: 'bottle', category: 'medical', step: 1, decimal: false },
  { id: 'page', category: 'media', step: 1, decimal: false },
  { id: 'word', category: 'media', step: 100, decimal: false },
  { id: 'minute_media', category: 'media', step: 1, decimal: false },
  { id: 'gb', category: 'media', step: 1, decimal: true },
  { id: 'consultation', category: 'other', step: 1, decimal: false },
  { id: 'act', category: 'other', step: 1, decimal: false },
]

const byId = new Map(UNIT_CATALOG.map((u) => [u.id, u]))

export function unitMeta(id: Unit): UnitMeta {
  return byId.get(id) || UNIT_CATALOG[0]!
}

/** Unités prioritaires par famille métier */
export const METIER_PREFERRED_UNITS: Record<MetierFamily, Unit[]> = {
  wholesale: ['piece', 'carton', 'kg', 'L', 'pack', 'box'],
  retail: ['piece', 'carton', 'kg', 'g', 'L', 'ml', 'pack'],
  grocery: ['piece', 'kg', 'g', 'L', 'ml', 'carton', 'pack'],
  bakery: ['piece', 'kg', 'g', 'dozen', 'carton'],
  butcher: ['kg', 'g', 'piece', 'carton'],
  restaurant: ['piece', 'L', 'cl', 'kg', 'person', 'session'],
  cafe: ['piece', 'L', 'cl', 'ml', 'kg', 'person'],
  salon: ['session', 'piece', 'ml', 'min', 'hour'],
  pressing: ['piece', 'kg', 'set', 'pair'],
  medical: ['act', 'consultation', 'dose', 'tablet', 'ampule', 'ml', 'mg', 'piece'],
  dental: ['act', 'consultation', 'piece', 'session'],
  lab: ['act', 'ml', 'mg', 'g', 'piece', 'ampule'],
  radio: ['act', 'consultation', 'piece', 'session'],
  vet: ['act', 'consultation', 'dose', 'ml', 'mg', 'kg', 'piece'],
  kine: ['session', 'act', 'min', 'hour', 'consultation'],
  optic: ['piece', 'pair', 'act', 'consultation'],
  garage: ['hour', 'act', 'piece', 'L', 'kg', 'session'],
  car_rental: ['day', 'hour', 'km', 'piece'],
  car_sales: ['piece', 'act'],
  car_wash: ['piece', 'session', 'L'],
  parts: ['piece', 'carton', 'set', 'kg', 'm', 'L'],
  legal: ['consultation', 'act', 'hour', 'page', 'word', 'piece'],
  accounting: ['hour', 'act', 'consultation', 'page', 'piece'],
  notary: ['act', 'consultation', 'page', 'piece'],
  realty: ['m2', 'piece', 'month', 'act', 'consultation'],
  travel: ['ticket', 'person', 'day', 'night', 'piece'],
  hotel: ['night', 'person', 'piece', 'day'],
  school: ['session', 'month', 'hour', 'person', 'piece'],
  gym: ['session', 'month', 'day', 'person', 'piece'],
  boxing: ['session', 'hour', 'month', 'person'],
  football: ['session', 'hour', 'month', 'ticket', 'person'],
  yoga: ['session', 'month', 'hour', 'person'],
  crossfit: ['session', 'month', 'hour', 'person'],
  martial: ['session', 'month', 'hour', 'person'],
  swim: ['session', 'month', 'hour', 'person'],
  tennis: ['session', 'hour', 'person', 'ticket'],
  danse: ['session', 'month', 'hour', 'person'],
  musculation: ['session', 'month', 'day', 'person'],
  creche: ['day', 'month', 'hour', 'person'],
  events: ['ticket', 'person', 'hour', 'day', 'piece'],
  game_room: ['hour', 'min', 'session', 'piece', 'ticket'],
  photo: ['piece', 'session', 'hour', 'gb', 'sheet'],
  print: ['page', 'piece', 'm2', 'sheet', 'roll'],
  artisan: ['m', 'm2', 'm3', 'hour', 'piece', 'kg', 'L'],
  transport: ['km', 'tonne', 'm3', 'hour', 'day', 'piece'],
  it_support: ['hour', 'session', 'license', 'piece', 'gb'],
  security: ['hour', 'month', 'person', 'piece', 'day'],
  spa: ['session', 'min', 'hour', 'person', 'piece'],
  generic_service: ['hour', 'session', 'act', 'piece', 'day'],
  ecommerce: ['piece', 'pack', 'box', 'carton', 'license', 'gb', 'session'],
  crm: ['piece', 'session', 'hour', 'day', 'month', 'person'],
}

export function unitsForMetier(family: MetierFamily | undefined): Unit[] {
  const all = UNIT_CATALOG.map((u) => u.id)
  if (!family) return all
  const pref = (METIER_PREFERRED_UNITS[family] || []).filter((id) => byId.has(id))
  const rest = all.filter((id) => !pref.includes(id))
  return [...pref, ...rest]
}
