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
  ecommerce: {
    top: pick('digital', 'order', 'products', 'clients', 'caisse', 'history', 'expenses', 'profits', 'settings'),
    left: pick('digital', 'newProduct', 'search', 'order', 'gallery'),
    right: pick('agent', 'digital', 'history', 'alerts', 'expenses', 'payments'),
  },
  crm: {
    top: pick('clients', 'order', 'history', 'profits', 'expenses', 'staff', 'settings'),
    left: pick('search', 'clients', 'order', 'debtRemind'),
    right: pick('agent', 'clients', 'history', 'alerts', 'debtRemind', 'creditLimit', 'expenses'),
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
  ecommerce: {
    top: pick('digital', 'order', 'clients', 'products', 'history', 'expenses', 'profits', 'settings'),
    left: pick('digital', 'newProduct', 'search', 'order', 'clients'),
    right: pick('agent', 'digital', 'history', 'alerts', 'expenses', 'payments'),
  },
  crm: {
    top: pick('clients', 'order', 'history', 'profits', 'expenses', 'staff', 'settings'),
    left: pick('search', 'clients', 'order', 'debtRemind'),
    right: pick('agent', 'clients', 'history', 'alerts', 'debtRemind', 'expenses'),
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

/** Explications au survol (FR / AR / EN) — phrase d’action claire */
const HINTS: Record<string, { fr: string; ar: string; en: string }> = {
  order: {
    fr: 'Ouvre l’écran de vente pour scanner, ajouter au panier et encaisser un client.',
    ar: 'يفتح شاشة البيع لمسح المنتجات وإضافتها للسلة وتحصيل الزبون.',
    en: 'Opens sales to scan items, fill the cart and take payment.',
  },
  products: {
    fr: 'Catalogue et stock : prix, quantités, photos et alertes de rupture.',
    ar: 'الكتالوج والمخزون: الأسعار والكميات والصور وتنبيهات النفاد.',
    en: 'Catalog and stock: prices, quantities, photos and low-stock alerts.',
  },
  newProduct: {
    fr: 'Crée un nouveau produit (nom, prix, stock, code-barres) dans le catalogue.',
    ar: 'ينشئ منتجاً جديداً (الاسم، السعر، المخزون، الباركود) في الكتالوج.',
    en: 'Creates a new product (name, price, stock, barcode) in the catalog.',
  },
  clients: {
    fr: 'Fiches clients : contacts, crédits, historique d’achats et WhatsApp.',
    ar: 'بطاقات الزبائن: جهات الاتصال والديون وسجل المشتريات وواتساب.',
    en: 'Customer cards: contacts, credit, purchase history and WhatsApp.',
  },
  caisse: {
    fr: 'Session de caisse : ouverture, encaissements du jour et clôture.',
    ar: 'جلسة الصندوق: الفتح وتحصيلات اليوم والإغلاق.',
    en: 'Cash session: open the till, today’s takings and closing.',
  },
  history: {
    fr: 'Historique des ventes, factures et activité par date.',
    ar: 'سجل المبيعات والفواتير والنشاط حسب التاريخ.',
    en: 'Sales history, invoices and activity by date.',
  },
  stock: {
    fr: 'Valeur du stock, coûts d’achat et marges estimées.',
    ar: 'قيمة المخزون وتكلفة الشراء والهوامش التقديرية.',
    en: 'Stock value, purchase cost and estimated margins.',
  },
  expenses: {
    fr: 'Note tes dépenses (loyer, essence, salaires…) pour le bénéfice net.',
    ar: 'سجّل المصاريف (إيجار، وقود، رواتب…) لصافي الربح.',
    en: 'Log expenses (rent, fuel, wages…) for net profit.',
  },
  profits: {
    fr: 'Tableau des gains : ventes, dépenses et bénéfice sur la période.',
    ar: 'لوحة الأرباح: المبيعات والمصاريف والربح في الفترة.',
    en: 'Earnings board: sales, expenses and profit for the period.',
  },
  settings: {
    fr: 'Réglages : langue, magasin, licence, thème et outils optionnels.',
    ar: 'الإعدادات: اللغة والمحل والرخصة والمظهر والأدوات.',
    en: 'Settings: language, shop, license, theme and optional tools.',
  },
  calculator: {
    fr: 'Calculatrice rapide pour prix, remises et quantités.',
    ar: 'آلة حاسبة سريعة للأسعار والتخفيضات والكميات.',
    en: 'Quick calculator for prices, discounts and quantities.',
  },
  search: {
    fr: 'Recherche globale : produit, client, facture ou code-barres.',
    ar: 'بحث عام: منتج أو زبون أو فاتورة أو باركود.',
    en: 'Global search: product, customer, invoice or barcode.',
  },
  agent: {
    fr: 'Assistant AZ POS : pose une question (vente, stock, réglages…).',
    ar: 'مساعد AZ POS: اطرح سؤالاً (بيع، مخزون، إعدادات…).',
    en: 'AZ POS assistant: ask about sales, stock, settings…',
  },
  digital: {
    fr: 'AZ Digital — vente logicielle, pubs, agents IA',
    ar: 'AZ Digital — بيع برمجيات، إعلانات، وكلاء ذكاء',
    en: 'AZ Digital — software sales, ads, AI agents',
  },
  alerts: {
    fr: 'Produits en stock bas ou en rupture — à commander tout de suite.',
    ar: 'منتجات ناقصة أو نافدة — يجب طلبها فوراً.',
    en: 'Low or out-of-stock items — reorder right away.',
  },
  inventory: {
    fr: 'Inventaire physique : compte le rayon et corrige les écarts de stock.',
    ar: 'جرد فعلي: عدّ الرف وصحّح فروقات المخزون.',
    en: 'Physical inventory: count shelves and fix stock gaps.',
  },
  expiry: {
    fr: 'Suivi DLC / lots : produits bientôt périmés à sortir en priorité.',
    ar: 'متابعة الصلاحية والدفعات: أخرج المنتجات القريبة من الانتهاء أولاً.',
    en: 'Expiry / lots: prioritize items nearing their date.',
  },
  arrivages: {
    fr: 'Enregistre une livraison fournisseur et mets le stock à jour.',
    ar: 'سجّل وصول بضاعة من المورد وحدّث المخزون.',
    en: 'Log a supplier delivery and update stock.',
  },
  delivery: {
    fr: 'Carte des livraisons : clients, itinéraire et statut des tours.',
    ar: 'خريطة التوصيل: الزبائن والمسار وحالة الجولات.',
    en: 'Delivery map: customers, route and tour status.',
  },
  missions: {
    fr: 'Tournées livreurs : stops, encaissements et validation de mission.',
    ar: 'جولات الموزعين: المحطات والتحصيل وتأكيد المهمة.',
    en: 'Driver missions: stops, collections and mission close-out.',
  },
  purchases: {
    fr: 'Bons d’achat et réapprovisionnement auprès des fournisseurs.',
    ar: 'أوامر الشراء وإعادة التموين من الموردين.',
    en: 'Purchase orders and restocking from suppliers.',
  },
  returns: {
    fr: 'Retours client : avoir, remboursement ou remise en stock.',
    ar: 'مرتجعات الزبون: رصيد أو استرداد أو إعادة للمخزون.',
    en: 'Customer returns: credit note, refund or restock.',
  },
  gallery: {
    fr: 'Grandes photos des produits pour choisir vite en caisse.',
    ar: 'صور كبيرة للمنتجات للاختيار السريع في الصندوق.',
    en: 'Large product photos for fast till picking.',
  },
  staff: {
    fr: 'Équipe et RH : employés, congés, avances et présence.',
    ar: 'الفريق والموارد البشرية: الموظفون والإجازات والسلف والحضور.',
    en: 'Staff & HR: employees, leave, advances and attendance.',
  },
  membership: {
    fr: 'Abonnements (gym, club…) : renouvellement et contrôle d’accès.',
    ar: 'الاشتراكات (رياضة، نادي…): التجديد ومراقبة الدخول.',
    en: 'Memberships (gym, club…): renewals and access control.',
  },
  debtRemind: {
    fr: 'Envoie un rappel WhatsApp aux clients en retard de paiement.',
    ar: 'أرسل تذكيراً واتساب للزبائن المتأخرين عن الدفع.',
    en: 'Send a WhatsApp reminder to overdue customers.',
  },
  supplierDebts: {
    fr: 'Dettes fournisseurs : montants dus et paiements à planifier.',
    ar: 'ديون الموردين: المبالغ المستحقة والمدفوعات المخططة.',
    en: 'Supplier debts: amounts owed and payments to plan.',
  },
  payments: {
    fr: 'Modes de paiement DZ : espèce, BaridiMob, CCP, carte, chèque.',
    ar: 'طرق الدفع في الجزائر: نقد، بريدي موب، CCP، بطاقة، شيك.',
    en: 'DZ payment methods: cash, BaridiMob, CCP, card, cheque.',
  },
  exportCompta: {
    fr: 'Exporte ventes et dépenses (CSV) pour ton comptable.',
    ar: 'صدّر المبيعات والمصاريف (CSV) لمحاسبك.',
    en: 'Export sales and expenses (CSV) for your accountant.',
  },
  home: {
    fr: 'Retour à l’accueil : résumé du jour et raccourcis principaux.',
    ar: 'العودة للرئيسية: ملخص اليوم والاختصارات الأساسية.',
    en: 'Back home: today’s summary and main shortcuts.',
  },
  lang_fr: {
    fr: 'Affiche toute l’interface en français.',
    ar: 'يعرض الواجهة بالكامل بالفرنسية.',
    en: 'Shows the whole interface in French.',
  },
  lang_en: {
    fr: 'Affiche toute l’interface en anglais.',
    ar: 'يعرض الواجهة بالكامل بالإنجليزية.',
    en: 'Shows the whole interface in English.',
  },
  lang_ar: {
    fr: 'Affiche toute l’interface en arabe (droite → gauche).',
    ar: 'يعرض الواجهة بالكامل بالعربية (من اليمين لليسار).',
    en: 'Shows the whole interface in Arabic (right-to-left).',
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

