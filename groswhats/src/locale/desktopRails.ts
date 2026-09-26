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
  digital: { id: 'digital', icon: '🚀', labelKey: 'appDigital' },
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

/** Catalogue complet pour le réglage admin */
export const ALL_RAIL_ACTIONS: RailAction[] = Object.values(CATALOG)

export type DesktopRailsConfig = {
  top?: string[]
  left?: string[]
  right?: string[]
}

export const RAIL_SLOT_LIMITS = { top: 10, left: 8, right: 8 } as const

function pick(...ids: string[]): RailAction[] {
  return ids.map((id) => CATALOG[id]).filter(Boolean) as RailAction[]
}

export function actionsFromIds(ids: string[] | undefined): RailAction[] {
  if (!ids?.length) return []
  const seen = new Set<string>()
  const out: RailAction[] = []
  for (const id of ids) {
    if (!id || seen.has(id) || !CATALOG[id]) continue
    seen.add(id)
    out.push(CATALOG[id]!)
  }
  return out
}

export function sanitizeRailsConfig(
  raw: DesktopRailsConfig | undefined,
): DesktopRailsConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const clean = (arr: string[] | undefined, max: number) => {
    if (!Array.isArray(arr)) return undefined
    const ids = actionsFromIds(arr.map(String)).map((a) => a.id as string)
    return ids.slice(0, max)
  }
  const top = clean(raw.top, RAIL_SLOT_LIMITS.top)
  const left = clean(raw.left, RAIL_SLOT_LIMITS.left)
  const right = clean(raw.right, RAIL_SLOT_LIMITS.right)
  if (!top && !left && !right) return undefined
  return { top, left, right }
}

/** Packs par famille — top / left / right */
const BY_FAMILY: Partial<Record<MetierFamily, DesktopRails>> = {
  wholesale: {
    top: pick('order', 'clients', 'products', 'arrivages', 'delivery', 'stock', 'history', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'purchases'),
    right: pick('agent', 'digital', 'history', 'alerts', 'supplierDebts', 'debtRemind', 'expenses'),
  },
  retail: {
    top: pick('order', 'products', 'clients', 'caisse', 'inventory', 'history', 'expenses', 'profits', 'settings'),
    left: pick('calculator', 'newProduct', 'search', 'order', 'gallery'),
    right: pick('agent', 'digital', 'history', 'alerts', 'expiry', 'inventory', 'expenses'),
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
  custom?: DesktopRailsConfig | null,
): DesktopRails {
  const base =
    (family && BY_FAMILY[family]) ||
    (mode && MODE_DEFAULT[mode]) ||
    FALLBACK
  const cfg = sanitizeRailsConfig(custom || undefined)
  if (!cfg) return base
  return {
    top: cfg.top?.length ? actionsFromIds(cfg.top) : base.top,
    left: cfg.left?.length ? actionsFromIds(cfg.left) : base.left,
    right: cfg.right?.length ? actionsFromIds(cfg.right) : base.right,
  }
}

export function isScreenAction(id: RailActionId): id is Screen {
  return (
    id !== 'search' &&
    id !== 'newProduct' &&
    id !== 'alerts'
  )
}

/** Explications au survol (FR / AR / EN) */
const HINTS: Record<string, { fr: string; ar: string; en: string }> = {
  order: {
    fr: 'Ouvrir la vente / caisse pour encaisser',
    ar: 'فتح البيع / الصندوق للتحصيل',
    en: 'Open sale / checkout to take payment',
  },
  products: {
    fr: 'Voir et gérer le stock / les produits',
    ar: 'عرض وإدارة المخزون / المنتجات',
    en: 'View and manage stock / products',
  },
  newProduct: {
    fr: 'Ajouter un nouveau produit au catalogue',
    ar: 'إضافة منتج جديد إلى القائمة',
    en: 'Add a new product to the catalog',
  },
  clients: {
    fr: 'Liste des clients, crédits et fiches',
    ar: 'قائمة الزبائن والديون والبطاقات',
    en: 'Customers, credit and profiles',
  },
  caisse: {
    fr: 'Ouvrir / clôturer la session de caisse',
    ar: 'فتح / إغلاق جلسة الصندوق',
    en: 'Open / close the cash drawer session',
  },
  history: {
    fr: 'Historique des ventes et calendrier',
    ar: 'سجل المبيعات والتقويم',
    en: 'Sales history and calendar',
  },
  stock: {
    fr: 'Valeur du stock et marges',
    ar: 'قيمة المخزون والهوامش',
    en: 'Stock value and margins',
  },
  expenses: {
    fr: 'Enregistrer les dépenses du commerce',
    ar: 'تسجيل مصاريف المحل',
    en: 'Record business expenses',
  },
  profits: {
    fr: 'Voir les gains et le bénéfice',
    ar: 'عرض الأرباح والمكسب',
    en: 'View profits and earnings',
  },
  settings: {
    fr: 'Réglages du magasin, langue, outils',
    ar: 'إعدادات المحل واللغة والأدوات',
    en: 'Shop settings, language, tools',
  },
  calculator: {
    fr: 'Calculatrice rapide (prix, quantités…)',
    ar: 'آلة حاسبة سريعة (أسعار، كميات…)',
    en: 'Quick calculator (prices, quantities…)',
  },
  search: {
    fr: 'Rechercher un produit, client ou facture',
    ar: 'البحث عن منتج أو زبون أو فاتورة',
    en: 'Search product, customer or invoice',
  },
  agent: {
    fr: 'Aide AZ POS — questions et conseils',
    ar: 'مساعدة AZ POS — أسئلة ونصائح',
    en: 'AZ POS help — questions and tips',
  },
  digital: {
    fr: 'AZ Digital — vente logicielle, pubs, agents IA',
    ar: 'AZ Digital — بيع برمجيات، إعلانات، وكلاء ذكاء',
    en: 'AZ Digital — software sales, ads, AI agents',
  },
  alerts: {
    fr: 'Alertes stock bas / ruptures',
    ar: 'تنبيهات نفاد أو نقص المخزون',
    en: 'Low stock / out-of-stock alerts',
  },
  inventory: {
    fr: 'Inventaire : compter et corriger le stock',
    ar: 'الجرد: عدّ وتصحيح المخزون',
    en: 'Inventory: count and fix stock',
  },
  expiry: {
    fr: 'Dates de péremption (DLC) et lots',
    ar: 'تواريخ الصلاحية والدفعات',
    en: 'Expiry dates and lot numbers',
  },
  arrivages: {
    fr: 'Enregistrer les arrivages fournisseurs',
    ar: 'تسجيل وصول البضاعة من الموردين',
    en: 'Record supplier arrivals',
  },
  delivery: {
    fr: 'Carte et livraisons',
    ar: 'الخريطة والتوصيل',
    en: 'Map and deliveries',
  },
  missions: {
    fr: 'Tournées livreurs / missions',
    ar: 'جولات الموزعين / المهام',
    en: 'Driver routes / missions',
  },
  purchases: {
    fr: 'Achats et réapprovisionnement',
    ar: 'المشتريات وإعادة التموين',
    en: 'Purchases and restocking',
  },
  returns: {
    fr: 'Retours et avoirs clients',
    ar: 'المرتجعات وأرصدة الزبائن',
    en: 'Returns and credit notes',
  },
  gallery: {
    fr: 'Galerie photos des produits',
    ar: 'معرض صور المنتجات',
    en: 'Product photo gallery',
  },
  staff: {
    fr: 'Équipe, RH et présence',
    ar: 'الفريق والموارد البشرية',
    en: 'Staff, HR and attendance',
  },
  membership: {
    fr: 'Abonnements (gym, club…)',
    ar: 'الاشتراكات (رياضة، نادي…)',
    en: 'Memberships (gym, club…)',
  },
  debtRemind: {
    fr: 'Relancer les clients en retard (WhatsApp)',
    ar: 'تذكير الزبائن المتأخرين (واتساب)',
    en: 'Remind overdue customers (WhatsApp)',
  },
  supplierDebts: {
    fr: 'Dettes envers les fournisseurs',
    ar: 'الديون للموردين',
    en: 'Money owed to suppliers',
  },
  payments: {
    fr: 'Modes de paiement (espèce, BaridiMob…)',
    ar: 'طرق الدفع (نقد، بريدي موب…)',
    en: 'Payment methods (cash, BaridiMob…)',
  },
  exportCompta: {
    fr: 'Exporter les données pour la compta',
    ar: 'تصدير البيانات للمحاسبة',
    en: 'Export data for accounting',
  },
  home: {
    fr: 'Retour à l’accueil',
    ar: 'العودة للرئيسية',
    en: 'Back to home',
  },
  lang_fr: {
    fr: 'Passer l’interface en français',
    ar: 'تحويل الواجهة إلى الفرنسية',
    en: 'Switch interface to French',
  },
  lang_en: {
    fr: 'Passer l’interface en anglais',
    ar: 'تحويل الواجهة إلى الإنجليزية',
    en: 'Switch interface to English',
  },
  lang_ar: {
    fr: 'Passer l’interface en arabe',
    ar: 'تحويل الواجهة إلى العربية',
    en: 'Switch interface to Arabic',
  },
}

export function railHint(
  lang: 'fr' | 'ar' | 'en' | string,
  id: string,
): string {
  const row = HINTS[id]
  if (!row) return ''
  if (lang === 'ar') return row.ar
  if (lang === 'en') return row.en
  return row.fr
}

