export type Language = 'fr' | 'ar' | 'en' | 'es' | 'tr' | 'it' | 'de'

export type CommerceMode = 'gros' | 'detail' | 'sante' | 'auto' | 'services' | 'ecommerce'

export type Unit =
  | 'piece'
  | 'carton'
  | 'dozen'
  | 'pair'
  | 'set'
  | 'box'
  | 'pack'
  | 'roll'
  | 'sheet'
  | 'mm'
  | 'cm'
  | 'm'
  | 'km'
  | 'inch'
  | 'ft'
  | 'yd'
  | 'cm2'
  | 'm2'
  | 'hectare'
  | 'ml'
  | 'cl'
  | 'L'
  | 'm3'
  | 'gallon'
  | 'mg'
  | 'g'
  | 'kg'
  | 'tonne'
  | 'sec'
  | 'min'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'kWh'
  | 'W'
  | 'A'
  | 'V'
  | 'bar'
  | 'celsius'
  | 'session'
  | 'person'
  | 'seat'
  | 'night'
  | 'ticket'
  | 'license'
  | 'dose'
  | 'tablet'
  | 'ampule'
  | 'bottle'
  | 'page'
  | 'word'
  | 'minute_media'
  | 'gb'
  | 'consultation'
  | 'act'

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
  /** Outils optionnels (Réglages → icônes accueil) */
  | 'payments'
  | 'debtRemind'
  | 'supplierDebts'
  | 'inventory'
  | 'expiry'
  | 'membership'
  | 'exportCompta'
  | 'cashierPin'
  | 'creditLimit'
  | 'fiscal'
  | 'tpe'
  | 'sellers'
  | 'production'
  | 'digital'

/** Mode d’encaissement DZ (outil optionnel « Paiements DZ ») */
export type PaymentMethod = 'cash' | 'baridimob' | 'ccp' | 'card' | 'cheque'

/** Outils cochables dans Réglages → affichés sur l’accueil */
export type OptionalToolId =
  | 'payments'
  | 'debtRemind'
  | 'supplierDebts'
  | 'inventory'
  | 'expiry'
  | 'membership'
  | 'exportCompta'
  | 'cashierPin'
  | 'creditLimit'
  | 'fiscal'
  | 'tpe'

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

/** Pack à la vente (taille en pièces + prix du pack) */
export interface PackOption {
  size: number
  priceDa: number
}

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
  /**
   * Rayon caisse détail (spécialité boutique).
   * Ex. smartphones, laitiers, pain — distinct de ProductCategory.
   */
  aisleId?: string
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
  /** Nombre de pièces dans 1 carton (mode gros) — ex: 24, 48 */
  piecesPerPack?: number
  /**
   * Packs vendables en boutique (ex. œufs ×10 / ×15 / ×30).
   * Le stock reste toujours en pièces ; 1 qté pack = `size` pièces.
   */
  packOptions?: PackOption[]
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
  /** IMEI / N° série (téléphonie, électro) */
  imei?: string
  /** Taille / pointure (prêt-à-porter, chaussures) */
  size?: string
  /** Couleur / variante */
  color?: string
  /** Réf. constructeur / OEM (pièces auto, quincaillerie, électro) */
  oemRef?: string
  /** Favori caisse (accès rapide) */
  favorite?: boolean
  /** DLC / date de péremption YYYY-MM-DD (outil optionnel) */
  expiryDate?: string
  /** N° de lot */
  lotNumber?: string
  createdAt: string
  /** Dernière mutation stock / fiche (sync multi-poste LWW) */
  updatedAt?: string
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
  /** Échéance paiement fournisseur YYYY-MM-DD */
  dueDate?: string
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

export type AppointmentRemindStage = '24h' | '2h'

/** RDV médecin / clinique — rappels WhatsApp auto */
export interface Appointment {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  /** Date-heure ISO du rendez-vous */
  at: string
  note: string
  status: 'planned' | 'done' | 'cancelled'
  /** Stages de rappel déjà envoyés */
  remindStages: AppointmentRemindStage[]
  remindedAt?: string
  createdAt: string
  /** Durée réservée (minutes) — agenda agentique */
  durationMin?: number
  /** Options / combinaison métier (dj, cuisine, matériel…) */
  optionIds?: string[]
  /** Segment tarifaire : weekday | weekend | peak | offpeak */
  segment?: string
  /** Devis estimé (DA) au moment de la réservation */
  quoteDa?: number
  /** Décision agent : accepted | rejected | proposed */
  agentDecision?: 'accepted' | 'rejected' | 'proposed'
  /** Motif court (refus / proposition) */
  agentReason?: string
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
  /** Plafond de crédit (DA) — outil optionnel */
  creditLimitDa?: number
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
  /** Id du plan admin (GymMembershipPlan) si salle unifiée */
  membershipPlanId?: string
  /** Disciplines autorisées pour cet adhérent */
  membershipDisciplineIds?: GymDisciplineId[]
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
  /** Salle des fêtes / événement — date YYYY-MM-DD */
  eventDate?: string
  /** Salle des fêtes — lieu / salle */
  eventVenue?: string
  /** Voyage — destination */
  destination?: string
  /** Voyage — dates (texte libre) */
  travelDates?: string
  /** Photo — type de séance */
  shootType?: string
  /** Impression — specs */
  printSpec?: string
  /** Artisan / IT — adresse chantier */
  siteAddress?: string
  /** Artisan / IT / sécurité — équipements */
  equipment?: string
  /** Transport — trajets habituels */
  routes?: string
  createdAt: string
  /** Dernière mutation fiche (sync multi-poste) */
  updatedAt?: string
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

/** Disciplines d’une salle de sport (admin coche celles présentes). */
export type GymDisciplineId =
  | 'boxe'
  | 'gym'
  | 'gym_cardio'
  | 'cardio'
  | 'musculation'
  | 'musculation_cardio'
  | 'football'
  | 'yoga'
  | 'crossfit'
  | 'martial'
  | 'natation'
  | 'tennis'
  | 'danse'

/** Formule d’abonnement — tarifs réglables par l’admin. */
export interface GymMembershipPlan {
  id: string
  name: string
  /** Disciplines couvertes (vide = toutes les disciplines actives). */
  disciplineIds: GymDisciplineId[]
  priceDa: number
  /** Durée en jours (1 = séance / journée). */
  durationDays: number
  /** Séance passager / entrée sans abonnement longue durée. */
  walkIn?: boolean
  active?: boolean
}

/** Réglages salle de sport (disciplines + tarifs). */
export interface GymSettings {
  enabledDisciplines: GymDisciplineId[]
  plans: GymMembershipPlan[]
  /** À l’entrée : ouvrir un ticket caisse pour la conso de la séance. */
  openTicketOnEntry: boolean
}

/**
 * Session en salle : ticket caisse ouvert (HeldSale) jusqu’à encaissement.
 * Membres NFC / QR ou passagers.
 */
export interface GymSession {
  id: string
  clientId: string
  clientName: string
  kind: 'member' | 'walk_in'
  disciplineId?: GymDisciplineId
  membershipPlanId?: string
  heldSaleId: string
  startedAt: string
  status: 'open' | 'billing'
  nfcUid?: string
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
  /** Taille du pack vendu (ex. 10, 15, 30 œufs) — stock retiré = qty × packSize */
  packSize?: number
  /** IMEI saisi à la caisse (téléphonie) */
  imei?: string
  /** Remise % sur la ligne (0–100) */
  discountPercent?: number
  /** Vente flash : pas de fiche stock / pas de déstockage */
  flash?: boolean
}

/** Table de salle (resto) */
export interface FloorTable {
  id: string
  name: string
  seats: number
  status: 'free' | 'busy' | 'bill'
  /** HeldSale id when occupied */
  heldSaleId?: string
  note?: string
}

/** Poste PlayStation / console (salle de jeux) */
export type GameStationStatus = 'free' | 'active' | 'standby'

/** Prise / TV Wi‑Fi sur le réseau local */
export type TvControlKind =
  | 'google_tv'
  | 'smart_tv'
  | 'shelly'
  | 'tasmota'
  | 'custom'

export type GameConsoleKind =
  | 'xbox_one'
  | 'ps4'
  | 'ps4_pro'
  | 'ps5'
  | 'xbox_360'
  | 'xbox_series_s'

/** Une ligne de tarif console (heure + match + match 4J + شوط إضافي) */
export interface GameConsoleTariff {
  id: GameConsoleKind
  label: string
  hourDa: number
  /** 0 = pas de tarif match (ex. Xbox 360) */
  matchDa: number
  /**
   * Match 4 joueurs — par défaut le double du match normal.
   * Si absent / 0 alors que matchDa > 0 → traité comme matchDa × 2.
   */
  match4Da?: number
  /** Prolongation = les 2 manches de temps additionnel — 0 = pas proposé */
  extraRoundDa: number
}

/** Tarifs salle de jeux (réglages admin) */
export interface GameTariffs {
  /** Durée d’un match par défaut (minutes) */
  matchMinutes: number
  /** Durée totale prolongation (2 manches) en minutes */
  extraRoundMinutes: number
  /** Grille consoles */
  consoles: GameConsoleTariff[]
  /** @deprecated migration — préférer consoles[] */
  ps4HourDa?: number
  ps5HourDa?: number
  ps4MatchDa?: number
  ps5MatchDa?: number
}

export interface GameStation {
  id: string
  /** Affichage : Poste 1, Poste 2… */
  name: string
  number: number
  status: GameStationStatus
  /** PS4, PS5, Xbox… sur ce poste */
  consoleKind?: GameConsoleKind
  /**
   * Durée match (minutes) pour ce poste — sinon tarif global matchMinutes.
   * Ajustable directement sur la fenêtre du poste.
   */
  matchMinutes?: number
  /** Fin de session (ISO) — console active jusqu’à cette heure */
  endsAt?: string
  /** Début de session (ISO) */
  startedAt?: string
  /** Minutes payées / ajoutées sur la session courante */
  paidMinutes?: number
  /** Minutes gratuites ajoutées sur la session courante */
  freeMinutes?: number
  /** Nom joueur / ticket (optionnel) */
  clientLabel?: string
  note?: string
  /**
   * Lignes en attente d’encaissement (jeux + produits consommés).
   * Total = somme des lignes — encaissé via le bouton « Encaisser ».
   */
  tabLines?: GameStationTabLine[]
  /**
   * Contrôle TV sur le réseau local (même Wi‑Fi).
   * - google_tv : Google TV / Android TV (ADB réseau + Wake-on-LAN)
   * - smart_tv : IP + MAC / URLs
   * - shelly / tasmota : prise Wi‑Fi
   * - custom : URLs HTTP libres
   */
  tvKind?: TvControlKind
  /** Adresse IP ou hostname local (ex. 192.168.1.50) */
  tvHost?: string
  /** MAC de la Smart TV (Wake-on-LAN pour allumer) — ex. AA:BB:CC:DD:EE:FF */
  tvMac?: string
  /** Port ADB Google TV (défaut 5555) */
  tvAdbPort?: number
  /** URL HTTP complète ON (smart_tv / custom) */
  tvOnUrl?: string
  /** URL HTTP complète OFF (smart_tv / custom) */
  tvOffUrl?: string
}

/** Ligne d’addition sur un poste (jeux ou produit consommé) */
export interface GameStationTabLine {
  id: string
  kind: 'game' | 'product'
  /** Produit catalogue (kind product) — flash_* pour jeux */
  productId: string
  name: string
  qty: number
  unitPriceDa: number
  unit: Unit
  /** true = hors stock (ligne jeu / flash) */
  flash?: boolean
}

export type RepairStatus = 'devis' | 'or' | 'done' | 'cancelled'

/** Ordre de réparation (garage, atelier, électro…) */
export interface RepairOrder {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  /** véhicule / appareil / objet */
  title: string
  status: RepairStatus
  estimateDa: number
  note: string
  createdAt: string
  updatedAt: string
}

/** Ticket mis en attente (park) — caisse détail */
export interface FlashSaleLine {
  id: string
  name: string
  qty: number
  unitPriceDa: number
  unit: Unit
}

export interface HeldSale {
  id: string
  label: string
  clientId: string
  qtyMap: Record<string, number>
  tierMap: Record<string, PriceTier>
  imeiMap?: Record<string, string>
  discountPercent?: number
  /** Prix unitaires forcés en caisse (`productId::tier` → DA) */
  priceOverrides?: Record<string, number>
  /** Lignes vente flash (hors catalogue / hors stock) */
  flashLines?: FlashSaleLine[]
  /** Total encaissé forcé (DA), si saisi */
  totalOverrideDa?: number
  createdAt: string
}

export interface Order {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  /** Magasin / dépôt de la vente (multi-emplacement) */
  locationId?: string
  lines: OrderLine[]
  totalDa: number
  /** Sous-total avant remise ticket */
  subtotalDa?: number
  /** Remise % sur le ticket (0–100) */
  discountPercent?: number
  /** Montant remisé (DA) */
  discountDa?: number
  /** Montant encaissé maintenant → caisse */
  paidDa: number
  /** Reste dû → solde client */
  remainingDa: number
  /** paye si remainingDa ≈ 0, sinon credit (même partiel) */
  payment: 'paye' | 'credit'
  /** Mode d’encaissement DZ (espèce, BaridiMob…) — outil optionnel */
  paymentMethod?: PaymentMethod
  /** Vendeur qui a encaissé (attribution) */
  sellerId?: string
  sellerName?: string
  /** Date d’échéance (YYYY-MM-DD) si reste dû > 0 */
  dueDate?: string
  /** Note libre (acte cabinet, etc.) */
  note?: string
  /** Dernière correction (stock + caisse resynchronisés) */
  revisedAt?: string
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
  /**
   * Outils optionnels cochés dans Réglages → icônes sur l’accueil.
   * Absent / false = masqué (défaut).
   */
  enabledTools?: Partial<Record<OptionalToolId, boolean>>
  /**
   * Raccourcis desktop (rails) réglables par l’admin.
   * Absent = pack métier par défaut.
   */
  desktopRails?: {
    top?: string[]
    left?: string[]
    right?: string[]
  }
  /** PIN caissier (4–6 chiffres) — outil cashierPin */
  cashierPin?: string
  /** PIN admin (4–6 chiffres) — protège prix/minute jeux, gestion vendeurs, etc.
   * Défaut suggéré à la création : 1234
   */
  adminPin?: string
  /** @deprecated préférer gameTariffs — gardé pour migration */
  gamePricePerMinuteDa?: number
  /** Tarifs PS4 / PS5 — heure et match */
  gameTariffs?: GameTariffs
  /** Salle de sport unifiée — disciplines + abonnements */
  gymSettings?: GymSettings
  /**
   * Plafond minutes gratuites (mode heure) par ajout — défaut 30.
   * Match / prolongation = 1 unité gratuite (durée tarif).
   */
  gameFreeMaxMinutes?: number
  /** Vendeur / admin actuellement connecté sur cet appareil */
  currentSellerId?: string
  /** Identité fiscale magasin (outil fiscal) */
  fiscalNif?: string
  fiscalRc?: string
  fiscalAi?: string
  /** Permissions système agentic (optionnel — défauts complets) */
  agentPermissions?: Partial<AgentPermissionFlags>
  /**
   * Fin d’accès offerte par parrainage (YYYY-MM-DD) —
   * cumulable avec la licence payante.
   */
  referralBonusExpiresAt?: string
  /** Code parrain saisi à l’activation (ami qui a invité) */
  referredByCode?: string
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
  /** Santé / RDV : rappels WhatsApp auto (défaut true) */
  appointmentAutoRemind?: boolean
  /**
   * Paramétrage rayons caisse détail (activer / renommer).
   * Absent = tous les rayons du métier sont actifs avec libellés par défaut.
   */
  retailRayons?: Array<{
    id: string
    enabled: boolean
    labelFr?: string
    labelAr?: string
  }>
  /** Marge % par défaut à l’achat (prix vente suggéré = coût × (1+marge/100)) */
  purchaseMarginPct?: number
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

export type TeamRole = 'owner' | 'driver' | 'cashier'

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

/** Caissier multi-poste (2ᵉ téléphone caisse) */
export interface Cashier {
  id: string
  name: string
  phone: string
  /** PIN 4 chiffres pour connexion caissier */
  pin: string
  active: boolean
  createdAt: string
}

/**
 * Vendeur / admin sur le même appareil (tous métiers AZ POS).
 * Ex. Admin, Vendeur 1, Vendeur 2… — crée autant que tu veux.
 */
export type PosSellerRole = 'admin' | 'vendeur'

export interface PosSeller {
  id: string
  name: string
  role: PosSellerRole
  /** PIN optionnel pour basculer vers ce profil */
  pin: string
  active: boolean
  createdAt: string
  /**
   * Autorisé par l’admin à ajouter des minutes gratuites
   * (heure / match / prolongation) sur les postes.
   * @deprecated Préférer `permissions.gameFreeMinutes`
   */
  canGrantFreeMinutes?: boolean
  /**
   * Droits cochés par l’admin (vendeur uniquement).
   * Absent / admin = tous les droits.
   */
  permissions?: Partial<
    Record<
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
      | 'gameAdmin',
      boolean
    >
  >
}

/** Journal des minutes gratuites salle de jeux */
export interface GameFreeMinuteEntry {
  id: string
  stationId: string
  stationName: string
  consoleKind: GameConsoleKind
  /** heure | match | match 4 joueurs | prolongation */
  mode: 'hour' | 'match' | 'match4' | 'extra'
  minutes: number
  sellerId?: string
  sellerName?: string
  clientLabel?: string
  createdAt: string
  note?: string
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
  /** Caissier connecté sur ce téléphone */
  currentCashierId: string | null
  /** Secret simple pour sync cloud (généré côté patron) */
  syncSecret: string
  /** false = un seul téléphone (patron). true = livreurs + caissiers + sync boutique */
  multiPosteEnabled: boolean
  /** Premier lancement multi-poste : choix Patron / Livreur / Caissier fait */
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
  cashiers: Cashier[]
  /** Vendeurs / admin (tous métiers) */
  sellers: PosSeller[]
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
  /** Sessions ouvertes (ticket conso jusqu’à encaissement) */
  gymSessions: GymSession[]
  /** Équipe / RH lean */
  employees: Employee[]
  employeeLeaves: EmployeeLeave[]
  staffLedger: StaffLedgerEntry[]
  /** Tickets caisse mis en attente */
  heldSales: HeldSale[]
  /** Agenda RDV (santé / salon / clubs…) */
  appointments: Appointment[]
  /** Tables de salle (resto) */
  tables: FloorTable[]
  /** Postes PlayStation (salle de jeux) */
  gameStations: GameStation[]
  /** Journal minutes gratuites (salle de jeux) */
  gameFreeMinutes: GameFreeMinuteEntry[]
  /** Ordres de réparation (garage, atelier…) */
  repairOrders: RepairOrder[]
  /** Mémoire scan facture : nom OCR → produit (corrections utilisateur) */
  invoiceAliases: InvoiceProductAlias[]
  /** Recettes de production (MP → produit fini) */
  recipes: Recipe[]
  /** Historique des fabrications */
  productionRuns: ProductionRun[]
  /** Parrainage AZ POS — points / conversions / récompenses */
  referral?: import('./license/referral').ReferralAccount
}

/** Lien mémorisé entre un libellé facture et un produit stock. */
export interface InvoiceProductAlias {
  /** Nom normalisé (voir normalizeInvoiceName) */
  key: string
  productId: string
  hits: number
  updatedAt: string
}

/** Ingrédient : qty de matière première pour 1 unité de produit fini */
export interface RecipeIngredient {
  productId: string
  qtyPerUnit: number
}

/** Recette de fabrication */
export interface Recipe {
  id: string
  name: string
  /** Produit fini (stock +) */
  outputProductId: string
  ingredients: RecipeIngredient[]
  note?: string
  createdAt: string
  updatedAt?: string
}

/** Une fabrication enregistrée */
export interface ProductionRun {
  id: string
  recipeId: string
  recipeName: string
  outputProductId: string
  outputName: string
  qtyProduced: number
  consumed: {
    productId: string
    name: string
    qty: number
  }[]
  /** Coût unitaire estimé (somme MP) au moment de la prod */
  unitCostDa?: number
  locationId: string
  createdAt: string
}

export const ALL_UNITS: Unit[] = [
  'piece',
  'carton',
  'dozen',
  'pair',
  'set',
  'box',
  'pack',
  'roll',
  'sheet',
  'mm',
  'cm',
  'm',
  'km',
  'inch',
  'ft',
  'yd',
  'cm2',
  'm2',
  'hectare',
  'ml',
  'cl',
  'L',
  'm3',
  'gallon',
  'mg',
  'g',
  'kg',
  'tonne',
  'sec',
  'min',
  'hour',
  'day',
  'week',
  'month',
  'year',
  'kWh',
  'W',
  'A',
  'V',
  'bar',
  'celsius',
  'session',
  'person',
  'seat',
  'night',
  'ticket',
  'license',
  'dose',
  'tablet',
  'ampule',
  'bottle',
  'page',
  'word',
  'minute_media',
  'gb',
  'consultation',
  'act',
]

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'personnel',
  'gasoil',
  'transport',
  'loyer',
  'entretien',
  'autre',
]
