/**
 * Rails desktop AZ POS — raccourcis personnalisés par métier.
 * Gauche (LTR) : langues FR/EN + actions quotidiennes
 * Droite (RTL) : langue AR + utilitaires / alertes / aide
 * Haut : navigation principale du métier
 */
import type { CommerceMode, Screen } from '../types'
import type { MetierFamily } from './metierPacks'

export type RailActionId =
  | Screen
  | 'search'
  | 'newProduct'
  | 'alerts'

export type RailAction = {
  id: RailActionId
  icon: string
  /** clé i18n */
  labelKey: string
}

export type DesktopRails = {
  top: RailAction[]
  /** Sous FR/EN — actions quotidiennes */
  left: RailAction[]
  /** Sous ع — aide, calendrier, alertes… */
  right: RailAction[]
}

const CATALOG: Record<string, RailAction> = {
  order: { id: 'order', icon: '🛒', labelKey: 'order' },
  products: { id: 'products', icon: '📦', labelKey: 'products' },
  newProduct: { id: 'newProduct', icon: '➕', labelKey: 'newProduct' },
  clients: { id: 'clients', icon: '👥', labelKey: 'clients' },
  caisse: { id: 'caisse', icon: '💵', labelKey: 'caisse' },
  history: { id: 'history', icon: '📅', labelKey: 'history' },
  stock: { id: 'stock', icon: '📊', labelKey: 'stock' },
  expenses: { id: 'expenses', icon: '💸', labelKey: 'expenses' },
  profits: { id: 'profits', icon: '📈', labelKey: 'profitsTitle' },
  settings: { id: 'settings', icon: '⚙️', labelKey: 'settings' },
  calculator: { id: 'calculator', icon: '🧮', labelKey: 'calculator' },
  search: { id: 'search', icon: '🔍', labelKey: 'searchProduct' },
  agent: { id: 'agent', icon: '🆘', labelKey: 'agent' },
  alerts: { id: 'alerts', icon: '🔔', labelKey: 'stockAlertTitle' },
  inventory: { id: 'inventory', icon: '📋', labelKey: 'inventory' },
  expiry: { id: 'expiry', icon: '⏳', labelKey: 'expiry' },
  arrivages: { id: 'arrivages', icon: '📥', labelKey: 'arrivages' },
  delivery: { id: 'delivery', icon: '🚚', labelKey: 'delivery' },
  missions: { id: 'missions', icon: '🗺️', labelKey: 'missions' },
  purchases: { id: 'purchases', icon: '🛍️', labelKey: 'purchases' },
  returns: { id: 'returns', icon: '↩️', labelKey: 'returns' },
  gallery: { id: 'gallery', icon: '🖼️', labelKey: 'gallery' },
  staff: { id: 'staff', icon: '👔', labelKey: 'staff' },
  membership: { id: 'membership', icon: '🏋️', labelKey: 'membership' },
  debtRemind: { id: 'debtRemind', icon: '📲', labelKey: 'debtRemind' },
  supplierDebts: { id: 'supplierDebts', icon: '🏭', labelKey: 'supplierDebts' },
  payments: { id: 'payments', icon: '💳', labelKey: 'payments' },
  exportCompta: { id: 'exportCompta', icon: '📤', labelKey: 'exportCompta' },
  home: { id: 'home', icon: '🏠', labelKey: 'home' },
}

function pick(...ids: string[]): RailAction[] {
  return ids.map((id) => CATALOG[id]).filter(Boolean) as RailAction[]
}

/** Packs par famille — top / left / right */
const BY_FAMILY: Partial<Record<MetierFamily, DesktopRails>> = {
  wholesale: {
    top: pick('order', 'clients', 'products', 'arrivages', 'delivery', 'stock', 'history', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'purchases'),
    right: pick('agent', 'history', 'alerts', 'supplierDebts', 'debtRemind', 'expenses'),
  },
  retail: {
    top: pick('order', 'products', 'clients', 'caisse', 'inventory', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'gallery'),
    right: pick('agent', 'history', 'alerts', 'expiry', 'inventory', 'expenses'),
  },
  grocery: {
    top: pick('order', 'products', 'caisse', 'inventory', 'expiry', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'caisse'),
    right: pick('agent', 'history', 'alerts', 'expiry', 'inventory', 'expenses'),
  },
  bakery: {
    top: pick('order', 'products', 'caisse', 'inventory', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order'),
    right: pick('agent', 'history', 'alerts', 'expiry', 'expenses'),
  },
  butcher: {
    top: pick('order', 'products', 'caisse', 'inventory', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order'),
    right: pick('agent', 'history', 'alerts', 'expiry', 'expenses'),
  },
  restaurant: {
    top: pick('order', 'products', 'clients', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'caisse'),
    right: pick('agent', 'history', 'alerts', 'expenses', 'staff'),
  },
  cafe: {
    top: pick('order', 'products', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  medical: {
    top: pick('clients', 'order', 'history', 'caisse', 'expenses', 'profits', 'exportCompta', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order', 'newProduct'),
    right: pick('agent', 'history', 'alerts', 'expenses', 'exportCompta'),
  },
  dental: {
    top: pick('clients', 'order', 'history', 'caisse', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  lab: {
    top: pick('clients', 'order', 'products', 'history', 'caisse', 'expenses', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order'),
    right: pick('agent', 'history', 'alerts', 'expiry', 'expenses'),
  },
  garage: {
    top: pick('clients', 'order', 'products', 'purchases', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'clients'),
    right: pick('agent', 'history', 'alerts', 'supplierDebts', 'expenses'),
  },
  parts: {
    top: pick('order', 'products', 'clients', 'inventory', 'purchases', 'history', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order'),
    right: pick('agent', 'history', 'alerts', 'supplierDebts', 'inventory'),
  },
  car_rental: {
    top: pick('clients', 'order', 'history', 'caisse', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  legal: {
    top: pick('clients', 'order', 'history', 'expenses', 'exportCompta', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order', 'newProduct'),
    right: pick('agent', 'history', 'alerts', 'exportCompta', 'expenses'),
  },
  accounting: {
    top: pick('clients', 'order', 'exportCompta', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'exportCompta'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  hotel: {
    top: pick('clients', 'order', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order', 'caisse'),
    right: pick('agent', 'history', 'alerts', 'membership', 'expenses'),
  },
  gym: {
    top: pick('clients', 'membership', 'order', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'membership', 'order'),
    right: pick('agent', 'history', 'alerts', 'expenses', 'staff'),
  },
  boxing: {
    top: pick('clients', 'membership', 'order', 'history', 'caisse', 'expenses', 'settings'),
    left: pick('calculator', 'search', 'clients', 'membership'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  football: {
    top: pick('clients', 'membership', 'order', 'history', 'caisse', 'expenses', 'settings'),
    left: pick('calculator', 'search', 'clients', 'membership'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  game_room: {
    top: pick('order', 'caisse', 'products', 'clients', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'order', 'caisse', 'newProduct'),
    right: pick('agent', 'history', 'alerts', 'expenses', 'payments'),
  },
  salon: {
    top: pick('clients', 'order', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order', 'newProduct'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  spa: {
    top: pick('clients', 'order', 'membership', 'caisse', 'history', 'expenses', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order'),
    right: pick('agent', 'history', 'alerts', 'membership', 'expenses'),
  },
  artisan: {
    top: pick('clients', 'order', 'products', 'purchases', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'clients'),
    right: pick('agent', 'history', 'alerts', 'supplierDebts', 'expenses'),
  },
  transport: {
    top: pick('clients', 'order', 'delivery', 'missions', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'delivery', 'order'),
    right: pick('agent', 'history', 'alerts', 'expenses', 'debtRemind'),
  },
  print: {
    top: pick('order', 'products', 'clients', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order'),
    right: pick('agent', 'history', 'alerts', 'inventory', 'expenses'),
  },
  photo: {
    top: pick('clients', 'order', 'gallery', 'history', 'caisse', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order', 'gallery'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  school: {
    top: pick('clients', 'order', 'membership', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order'),
    right: pick('agent', 'history', 'alerts', 'debtRemind', 'expenses'),
  },
  creche: {
    top: pick('clients', 'order', 'membership', 'history', 'expenses', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order'),
    right: pick('agent', 'history', 'alerts', 'debtRemind', 'expenses'),
  },
  events: {
    top: pick('clients', 'order', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order', 'newProduct'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  it_support: {
    top: pick('clients', 'order', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order', 'newProduct'),
    right: pick('agent', 'history', 'alerts', 'expenses'),
  },
  realty: {
    top: pick('clients', 'order', 'history', 'expenses', 'exportCompta', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order'),
    right: pick('agent', 'history', 'alerts', 'exportCompta', 'expenses'),
  },
  security: {
    top: pick('clients', 'order', 'staff', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'search', 'clients', 'order'),
    right: pick('agent', 'history', 'alerts', 'staff', 'expenses'),
  },
}

const MODE_DEFAULT: Record<CommerceMode, DesktopRails> = {
  gros: BY_FAMILY.wholesale!,
  detail: BY_FAMILY.retail!,
  sante: BY_FAMILY.medical!,
  auto: BY_FAMILY.garage!,
  services: {
    top: pick('order', 'clients', 'products', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'clients'),
    right: pick('agent', 'history', 'alerts', 'expenses', 'payments'),
  },
}

const FALLBACK: DesktopRails = MODE_DEFAULT.detail

export function desktopRailsFor(
  family: MetierFamily | undefined,
  mode: CommerceMode | undefined,
): DesktopRails {
  if (family && BY_FAMILY[family]) return BY_FAMILY[family]!
  if (mode && MODE_DEFAULT[mode]) return MODE_DEFAULT[mode]
  return FALLBACK
}

export function isScreenAction(id: RailActionId): id is Screen {
  return (
    id !== 'search' &&
    id !== 'newProduct' &&
    id !== 'alerts'
  )
}
