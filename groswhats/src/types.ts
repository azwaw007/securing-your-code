export type Language = 'fr' | 'ar'

export type Unit =
  | 'piece'
  | 'carton'
  | 'kg'
  | 'g'
  | 'm'
  | 'cm'
  | 'ml'
  | 'L'

export type Screen =
  | 'home'
  | 'products'
  | 'clients'
  | 'order'
  | 'stock'
  | 'zakat'
  | 'settings'
  | 'inbox'
  | 'arrivages'
  | 'agent'
  | 'expenses'
  | 'calculator'
  | 'gallery'
  | 'delivery'
  | 'missions'
  | 'history'
  | 'profits'
  | 'caisse'
  | 'returns'
  | 'purchases'

export type ExpenseCategory =
  | 'personnel'
  | 'gasoil'
  | 'transport'
  | 'loyer'
  | 'entretien'
  | 'autre'

export type ProductCategory =
  | 'alimentaire'
  | 'cosmetique'
  | 'consommable'
  | 'quincaillerie'
  | 'textile'
  | 'autre'

export type PriceTier = 'piece' | 'demi_gros' | 'gros' | 'super_gros'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  unit: Unit
  /** Prix pièce (DA) — tarif unitaire */
  priceDa: number
  /** Prix d'achat / coût (DA) par pièce */
  costDa: number
  /** Stock toujours en pièces (unité de base) */
  stock: number
  lowStockAt: number
  /** Nombre de pièces dans 1 carton — ex: 10, 20, 24, 48, 50 */
  piecesPerPack?: number
  /** @deprecated use grosPriceDa */
  packPriceDa?: number
  /** Tarif demi-gros (DA / pièce) */
  demiGrosPriceDa?: number
  /** Tarif gros (DA / carton) */
  grosPriceDa?: number
  /** Tarif super gros (DA / carton) — le plus bas */
  superGrosPriceDa?: number
  imageDataUrl?: string
  /** Code-barres / EAN / code interne */
  barcode?: string
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  phone: string
  note: string
  createdAt: string
}

export interface PurchaseLine {
  productId: string
  name: string
  qty: number
  unitCostDa: number
  lineTotalDa: number
}

export interface Purchase {
  id: string
  supplierId: string
  supplierName: string
  lines: PurchaseLine[]
  totalDa: number
  paidDa: number
  note: string
  createdAt: string
}

export interface CashSession {
  id: string
  openedAt: string
  closedAt?: string
  openingFloatDa: number
  closingCountDa?: number
  expectedCashDa?: number
  varianceDa?: number
  note: string
}

export interface ReturnLine {
  productId: string
  name: string
  unit: Unit
  qty: number
  unitPriceDa: number
  lineTotalDa: number
  priceTier?: PriceTier
}

/** Retour marchandise (avoir cash ou crédit client) */
export interface SaleReturn {
  id: string
  orderId?: string
  clientId?: string
  clientName: string
  lines: ReturnLine[]
  totalDa: number
  refundMode: 'cash' | 'credit'
  note: string
  createdAt: string
}

export interface Client {
  id: string
  name: string
  phone: string
  city: string
  /** Rue / quartier / repère */
  address: string
  /** Note libre (horaires, contact, etc.) */
  notes: string
  /** GPS optionnel */
  lat?: number
  lng?: number
  /**
   * Ajustement manuel du solde (corrigé depuis la fiche client).
   * Solde affiché = reste des factures + balanceAdjustDa
   */
  balanceAdjustDa?: number
  createdAt: string
}

/** Encaissement hors facture du jour (ex: règlement d’une vieille dette) */
export interface CashEntry {
  id: string
  amountDa: number
  clientId?: string
  orderId?: string
  /** Stop de tournée (évite double encaissement) */
  missionStopId?: string
  note: string
  createdAt: string
}

export interface OrderLine {
  productId: string
  name: string
  unit: Unit
  qty: number
  unitPriceDa: number
  /** Coût unitaire au moment de la vente (pour le gain) — par unité vendue */
  unitCostDa: number
  lineTotalDa: number
  /** Tarif appliqué (pièce / demi-gros / gros / super-gros) */
  priceTier?: PriceTier
}

export interface Order {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  lines: OrderLine[]
  totalDa: number
  /** Montant encaissé maintenant → caisse */
  paidDa: number
  /** Reste dû → solde client */
  remainingDa: number
  /** paye si remainingDa ≈ 0, sinon credit (même partiel) */
  payment: 'paye' | 'credit'
  createdAt: string
  whatsappSent: boolean
  invoiceNumber?: string
  invoiceSent?: boolean
}

/** Commande reçue via WhatsApp / téléphone (à traiter) */
export interface IncomingOrder {
  id: string
  clientName: string
  clientPhone: string
  note: string
  status: 'pending' | 'done' | 'rejected'
  createdAt: string
}

/** Thèmes sûrs (CSS variables) — jamais de réécriture de code source. */
export type ThemePreset = 'forest' | 'ocean' | 'sand' | 'night' | 'coral'

export type FontScale = 'normal' | 'large' | 'xlarge'

export type AgentPermissionFlags = {
  navigate: boolean
  readBusiness: boolean
  editSettings: boolean
  organizeUi: boolean
  mutateBusiness: boolean
  openExternal: boolean
  agenticLoop: boolean
}

export interface ShopSettings {
  shopName: string
  phone: string
  city: string
  language: Language
  nextInvoiceNumber: number
  stockAlertsEnabled: boolean
  /** Gros boutons + icônes (commerçants qui lisent peu) */
  easyMode: boolean
  /** Couleurs / ambiance (modifiable par l’agent vocal) */
  themePreset: ThemePreset
  /** Taille du texte */
  fontScale: FontScale
  /** Afficher zakat sur l’accueil */
  showZakat: boolean
  /** Afficher calculatrice */
  showCalculator: boolean
  /** Afficher galerie photos */
  showGallery: boolean
  /** Permissions système agentic (optionnel — défauts complets) */
  agentPermissions?: Partial<AgentPermissionFlags>
}

export interface ZakatRecord {
  yearLabel: string
  calculatedAt: string
  stockValueDa: number
  includeCredits: boolean
  creditsValueDa: number
  baseDa: number
  rate: number
  amountDa: number
  paidAt?: string
}

export interface Expense {
  id: string
  category: ExpenseCategory
  amountDa: number
  note: string
  date: string
  createdAt: string
}

export type TeamRole = 'owner' | 'driver'

export interface Driver {
  id: string
  name: string
  phone: string
  /** PIN 4 chiffres pour connexion livreur */
  pin: string
  active: boolean
  createdAt: string
}

export type MissionStatus = 'draft' | 'assigned' | 'in_progress' | 'done'
export type StopStatus = 'todo' | 'done' | 'skipped'

export interface MissionStop {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  address: string
  city: string
  lat?: number
  lng?: number
  note: string
  status: StopStatus
  sortOrder: number
  /** Montant à encaisser chez le client (DA) — figé à la création de tournée */
  collectDa?: number
  /** Cash réellement pris par le livreur (DA) */
  collectedDa?: number
  /** Versement déjà passé en caisse / solde (idempotent) */
  cashPostedAt?: string
  /** Montant posté en caisse pour ce stop */
  cashPostedDa?: number
}

export interface Mission {
  id: string
  title: string
  date: string
  wilayaCode: string
  driverId: string
  status: MissionStatus
  stops: MissionStop[]
  createdAt: string
  updatedAt: string
}

export interface TeamSettings {
  companyCode: string
  role: TeamRole
  currentDriverId: string | null
  /** Secret simple pour sync cloud (généré côté patron) */
  syncSecret: string
  /** false = un seul téléphone (patron). true = livreurs + missions */
  multiPosteEnabled: boolean
  /** Premier lancement multi-poste : choix Patron / Livreur fait */
  hasChosenRole: boolean
}

export interface AppState {
  settings: ShopSettings
  products: Product[]
  clients: Client[]
  orders: Order[]
  incomingOrders: IncomingOrder[]
  zakatHistory: ZakatRecord[]
  expenses: Expense[]
  cashEntries: CashEntry[]
  drivers: Driver[]
  missions: Mission[]
  team: TeamSettings
  suppliers: Supplier[]
  purchases: Purchase[]
  cashSessions: CashSession[]
  returns: SaleReturn[]
}

export const ALL_UNITS: Unit[] = [
  'piece',
  'carton',
  'kg',
  'g',
  'm',
  'cm',
  'ml',
  'L',
]

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'personnel',
  'gasoil',
  'transport',
  'loyer',
  'entretien',
  'autre',
]
