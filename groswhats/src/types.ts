export type Language = 'fr' | 'ar' | 'en' | 'es' | 'tr' | 'it' | 'de'

export type CommerceMode = 'gros' | 'detail' | 'sante' | 'auto' | 'services'

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
  | 'staff'

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

/** Dépôt / magasin (multi-emplacement) */
export interface ShopLocation {
  id: string
  name: string
  city?: string
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  unit: Unit
  /** Prix pièce (DA) — tarif unitaire */
  priceDa: number
  /** Prix d'achat / coût (DA) par pièce */
  costDa: number
  /** Stock total (somme des dépôts) — compat UI / zakat / alertes */
  stock: number
  /** Stock par dépôt (locationId → qty). Absent = traité via migrate. */
  stockByLocation?: Record<string, number>
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
  /** Salle de sport — UID puce NFC / badge adhérent */
  nfcUid?: string
  /** GPS optionnel */
  lat?: number
  lng?: number
  /**
   * Ajustement manuel du solde (corrigé depuis la fiche client).
   * Solde affiché = reste des factures + balanceAdjustDa
   */
  balanceAdjustDa?: number
  /** Santé — date de naissance YYYY-MM-DD */
  birthDate?: string
  /** Santé — sexe */
  sex?: 'M' | 'F' | 'X'
  /** Santé — groupe sanguin */
  bloodGroup?: string
  /** Santé — allergies (critique) */
  allergies?: string
  /** Santé — antécédents médicaux */
  antecedents?: string
  /**
   * Sport / salle — abonnement & suivi coach
   * (même logique « dossier » que patient / employé).
   */
  /** Début abonnement YYYY-MM-DD */
  membershipStart?: string
  /** Fin abonnement YYYY-MM-DD */
  membershipEnd?: string
  /** Formule (mensuel, trimestriel, séances…) */
  membershipPlan?: string
  /** Objectif (perte de poids, force, compétition…) */
  sportGoal?: string
  /** Programme d’entraînement assigné par le coach */
  trainingProgram?: string
  /** Régime / plan alimentaire */
  dietPlan?: string
  /** Notes de suivi coach (mesures, bilans…) */
  coachNotes?: string
  /** Dentaire / soins — plan de traitement */
  treatmentPlan?: string
  /** Véto — espèce / race */
  petSpecies?: string
  /** Boxe — catégorie poids */
  weightClass?: string
  /** Foot — équipe */
  teamName?: string
  /** Foot — poste */
  playerPosition?: string
  /** Yoga / natation / école — niveau */
  level?: string
  /** Arts martiaux — grade / ceinture */
  beltGrade?: string
  /** Salon — formule couleur */
  colorFormula?: string
  /** Salon / resto / hôtel — préférences */
  preferences?: string
  /** Garage — immat */
  vehiclePlate?: string
  /** Garage — modèle */
  vehicleModel?: string
  /** Garage — prochain entretien */
  nextService?: string
  /** Location — n° permis */
  licenseId?: string
  /** Avocat — réf affaire */
  caseRef?: string
  createdAt: string
}

export type MedicalDocKind =
  | 'ordonnance'
  | 'orientation'
  | 'certificat'
  | 'compte_rendu'

/** Document médical (ordonnance, lettre d’orientation, …) */
export interface MedicalDocument {
  id: string
  clientId: string
  clientName: string
  kind: MedicalDocKind
  title: string
  body: string
  createdAt: string
}

/** Check-in / check-out salle de sport */
export interface GymCheckIn {
  id: string
  clientId: string
  clientName: string
  kind: 'in' | 'out'
  at: string
  source: 'nfc' | 'qr' | 'manual' | 'wedge'
}

/** Rôle employé (commerçant, cabinet, atelier…) */
export type EmployeeRole =
  | 'vendeur'
  | 'caissier'
  | 'livreur'
  | 'manager'
  | 'technicien'
  | 'assistant'
  | 'autre'

/**
 * Dossier employé — même logique que le dossier patient :
 * dates clés (contrat, congés, assurance) + argent (paie, avances, dettes).
 * Utile à tous les métiers : boutique, dépôt, cabinet, garage, resto…
 */
export interface Employee {
  id: string
  name: string
  phone: string
  role: EmployeeRole
  /** Début de contrat YYYY-MM-DD */
  contractStart?: string
  /** Fin de contrat (CDD / fin prévue) */
  contractEnd?: string
  /** Salaire mensuel convenu (DA) */
  salaryDa: number
  /** Début couverture assurance / mutuelle */
  insuranceStart?: string
  /** Fin couverture assurance */
  insuranceEnd?: string
  insuranceNote?: string
  notes: string
  active: boolean
  createdAt: string
}

export type LeaveKind = 'conge' | 'maladie' | 'sans_solde' | 'autre'

export interface EmployeeLeave {
  id: string
  employeeId: string
  kind: LeaveKind
  /** Début congé / absence */
  startDate: string
  /** Fin congé / absence */
  endDate: string
  note: string
  createdAt: string
}

/** Mouvements argent employés : avance, dette, paiement salaire, remboursement */
export type StaffMoneyKind =
  | 'avance'
  | 'dette'
  | 'paiement_salaire'
  | 'remboursement'

export interface StaffLedgerEntry {
  id: string
  employeeId: string
  kind: StaffMoneyKind
  amountDa: number
  note: string
  /** Mois / période ex. 2026-09 */
  periodLabel?: string
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
  /** Date d’échéance (YYYY-MM-DD) si reste dû > 0 */
  dueDate?: string
  /** Note libre (acte cabinet, etc.) */
  note?: string
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
  /** Premier lancement : pays + mode + domaine choisis */
  setupDone: boolean
  countryCode: string
  commerceMode: CommerceMode
  domainId: string
  currency: string
  nextInvoiceNumber: number
  stockAlertsEnabled: boolean
  /** Sons de clic + son caisse */
  uiSoundsEnabled: boolean
  /** Gros boutons + icônes (commerçants qui lisent peu) */
  easyMode: boolean
  /** Couleurs / ambiance (modifiable par l’agent vocal) */
  themePreset: ThemePreset
  /**
   * `metier` = thème dérivé du domaine (défaut).
   * `user` = l’utilisateur a choisi un preset manuel.
   */
  themeSource?: 'metier' | 'user'
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
  /** Multi-magasin / multi-dépôts (AZ POS Pro lean) */
  multiLocationEnabled?: boolean
  /** Magasin actif à la caisse / stock */
  activeLocationId?: string
  /**
   * Santé : partage médecin ↔ réception/caisse (plusieurs téléphones / postes).
   * Le médecin soigne ; la réception encaisse.
   */
  clinicShareEnabled?: boolean
  /** Poste actuel si clinicShareEnabled */
  clinicStation?: ClinicStation
  /** Choix médecin / réception déjà fait */
  clinicStationChosen?: boolean
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

/** Poste cabinet (santé) — médecin vs réception/caisse */
export type ClinicStation = 'doctor' | 'reception'

/** Acte à encaisser — le médecin envoie, la réception encaisse */
export interface ClinicCharge {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  label: string
  amountDa: number
  note: string
  status: 'pending' | 'paid' | 'cancelled'
  createdAt: string
  paidAt?: string
  orderId?: string
}

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
  /** Dépôts / magasins */
  locations: ShopLocation[]
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
  /** Dossier médical — ordonnances, lettres d’orientation, etc. */
  medicalDocuments: MedicalDocument[]
  /** File d’attente caisse (médecin → réception) */
  clinicCharges: ClinicCharge[]
  /** Présences salle de sport (check-in NFC) */
  gymCheckIns: GymCheckIn[]
  /** Équipe / RH lean */
  employees: Employee[]
  employeeLeaves: EmployeeLeave[]
  staffLedger: StaffLedgerEntry[]
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
