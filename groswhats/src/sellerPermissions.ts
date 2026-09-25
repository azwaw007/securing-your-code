import type { AppState, PosSeller, Screen } from './types'

/** Droits cochables par l’admin pour chaque vendeur */
export type SellerPermId =
  | 'sell'
  | 'viewStock'
  | 'editStock'
  | 'viewClients'
  | 'editClients'
  | 'viewHistory'
  | 'viewCaisse'
  | 'viewProfits'
  | 'viewExpenses'
  | 'manageExpenses'
  | 'viewPurchases'
  | 'managePurchases'
  | 'viewReturns'
  | 'doReturns'
  | 'settings'
  | 'manageSellers'
  | 'viewStaff'
  | 'viewZakat'
  | 'viewMissions'
  | 'exportData'
  | 'gameFreeMinutes'
  | 'gameAdmin'

export type SellerPermissions = Record<SellerPermId, boolean>

/** Défaut vendeur : vente + voir stock (sans modifier) + clients — pas de gains ni réglages */
export const DEFAULT_VENDEUR_PERMISSIONS: SellerPermissions = {
  sell: true,
  viewStock: true,
  editStock: false,
  viewClients: true,
  editClients: true,
  viewHistory: true,
  viewCaisse: false,
  viewProfits: false,
  viewExpenses: false,
  manageExpenses: false,
  viewPurchases: false,
  managePurchases: false,
  viewReturns: true,
  doReturns: true,
  settings: false,
  manageSellers: false,
  viewStaff: false,
  viewZakat: false,
  viewMissions: false,
  exportData: false,
  gameFreeMinutes: false,
  gameAdmin: false,
}

/** Liste UI admin (ordre d’affichage) */
export const SELLER_PERM_OPTIONS: Array<{
  id: SellerPermId
  labelKey: string
  /** Toujours utile à la vente — coché par défaut */
  salesCore?: boolean
}> = [
  { id: 'sell', labelKey: 'permSell', salesCore: true },
  { id: 'viewStock', labelKey: 'permViewStock', salesCore: true },
  { id: 'editStock', labelKey: 'permEditStock' },
  { id: 'viewClients', labelKey: 'permViewClients', salesCore: true },
  { id: 'editClients', labelKey: 'permEditClients', salesCore: true },
  { id: 'viewHistory', labelKey: 'permViewHistory', salesCore: true },
  { id: 'viewReturns', labelKey: 'permViewReturns', salesCore: true },
  { id: 'doReturns', labelKey: 'permDoReturns', salesCore: true },
  { id: 'viewCaisse', labelKey: 'permViewCaisse' },
  { id: 'viewProfits', labelKey: 'permViewProfits' },
  { id: 'viewExpenses', labelKey: 'permViewExpenses' },
  { id: 'manageExpenses', labelKey: 'permManageExpenses' },
  { id: 'viewPurchases', labelKey: 'permViewPurchases' },
  { id: 'managePurchases', labelKey: 'permManagePurchases' },
  { id: 'settings', labelKey: 'permSettings' },
  { id: 'manageSellers', labelKey: 'permManageSellers' },
  { id: 'viewStaff', labelKey: 'permViewStaff' },
  { id: 'viewZakat', labelKey: 'permViewZakat' },
  { id: 'viewMissions', labelKey: 'permViewMissions' },
  { id: 'exportData', labelKey: 'permExportData' },
  { id: 'gameFreeMinutes', labelKey: 'permGameFreeMinutes' },
  { id: 'gameAdmin', labelKey: 'permGameAdmin' },
]

const SCREEN_PERM: Partial<Record<Screen, SellerPermId>> = {
  order: 'sell',
  products: 'viewStock',
  stock: 'viewStock',
  gallery: 'viewStock',
  clients: 'viewClients',
  history: 'viewHistory',
  caisse: 'viewCaisse',
  profits: 'viewProfits',
  expenses: 'viewExpenses',
  purchases: 'viewPurchases',
  returns: 'viewReturns',
  settings: 'settings',
  sellers: 'manageSellers',
  staff: 'viewStaff',
  zakat: 'viewZakat',
  missions: 'viewMissions',
  delivery: 'sell',
  inbox: 'viewPurchases',
  arrivages: 'viewPurchases',
  exportCompta: 'exportData',
  inventory: 'editStock',
  supplierDebts: 'viewPurchases',
  fiscal: 'exportData',
  creditLimit: 'settings',
  cashierPin: 'settings',
  payments: 'sell',
  debtRemind: 'viewClients',
  expiry: 'viewStock',
  membership: 'sell',
  tpe: 'sell',
  agent: 'exportData',
  calculator: 'sell',
}

function sellerFromState(state: AppState): PosSeller | undefined {
  const id = state.settings.currentSellerId
  const list = (state.sellers || []).filter((s) => s.active !== false)
  if (id) {
    const found = list.find((s) => s.id === id)
    if (found) return found
  }
  return list.find((s) => s.role === 'admin') || list[0]
}

export function isAdminSeller(seller: PosSeller | undefined): boolean {
  return seller?.role === 'admin'
}

export function resolveSellerPermissions(
  seller: PosSeller | undefined,
): SellerPermissions {
  if (!seller || seller.role === 'admin') {
    const all = { ...DEFAULT_VENDEUR_PERMISSIONS }
    for (const k of Object.keys(all) as SellerPermId[]) all[k] = true
    return all
  }
  const base = { ...DEFAULT_VENDEUR_PERMISSIONS }
  const raw = seller.permissions
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(base) as SellerPermId[]) {
      if (typeof raw[k] === 'boolean') base[k] = raw[k] === true
    }
  }
  // Legacy flag minutes gratuites
  if (seller.canGrantFreeMinutes === true) base.gameFreeMinutes = true
  return base
}

export function sellerCan(state: AppState, perm: SellerPermId): boolean {
  const seller = sellerFromState(state)
  if (isAdminSeller(seller)) return true
  return resolveSellerPermissions(seller)[perm] === true
}

export function sellerCanAccessScreen(
  state: AppState,
  screen: Screen,
): boolean {
  if (screen === 'home') return true
  const seller = sellerFromState(state)
  if (isAdminSeller(seller)) return true
  const need = SCREEN_PERM[screen]
  if (!need) return false
  return resolveSellerPermissions(seller)[need] === true
}

export function migrateSellerPermissions(
  seller: PosSeller,
): SellerPermissions | undefined {
  if (seller.role === 'admin') return undefined
  const base = { ...DEFAULT_VENDEUR_PERMISSIONS }
  if (seller.permissions && typeof seller.permissions === 'object') {
    for (const k of Object.keys(base) as SellerPermId[]) {
      const v = seller.permissions[k]
      if (typeof v === 'boolean') base[k] = v
    }
  }
  if (seller.canGrantFreeMinutes === true) base.gameFreeMinutes = true
  return base
}
