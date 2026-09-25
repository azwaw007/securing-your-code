import type {
  Language,
  OptionalToolId,
  PaymentMethod,
  Screen,
  ShopSettings,
} from '../types'
import type { MetierFamily } from '../locale/metierPacks'

export type { OptionalToolId, PaymentMethod }

/** Outils recommandés par famille métier (réglages + accueil) */
export const METIER_RECOMMENDED_TOOLS: Record<MetierFamily, OptionalToolId[]> = {
  wholesale: ['payments', 'debtRemind', 'supplierDebts', 'inventory', 'creditLimit', 'exportCompta', 'fiscal', 'cashierPin'],
  retail: ['payments', 'tpe', 'inventory', 'expiry', 'fiscal', 'cashierPin', 'debtRemind'],
  grocery: ['payments', 'tpe', 'inventory', 'expiry', 'fiscal', 'cashierPin'],
  bakery: ['payments', 'tpe', 'inventory', 'expiry', 'fiscal', 'cashierPin'],
  butcher: ['payments', 'tpe', 'inventory', 'expiry', 'fiscal', 'cashierPin'],
  restaurant: ['payments', 'tpe', 'fiscal', 'cashierPin', 'inventory'],
  cafe: ['payments', 'tpe', 'fiscal', 'cashierPin'],
  salon: ['payments', 'tpe', 'membership', 'fiscal', 'cashierPin'],
  pressing: ['payments', 'tpe', 'fiscal', 'cashierPin'],
  medical: ['payments', 'fiscal', 'exportCompta', 'cashierPin', 'creditLimit'],
  dental: ['payments', 'fiscal', 'exportCompta', 'cashierPin', 'creditLimit'],
  lab: ['payments', 'fiscal', 'exportCompta', 'expiry', 'cashierPin'],
  radio: ['payments', 'fiscal', 'exportCompta', 'cashierPin'],
  vet: ['payments', 'fiscal', 'exportCompta', 'expiry', 'cashierPin'],
  kine: ['payments', 'membership', 'fiscal', 'cashierPin'],
  optic: ['payments', 'tpe', 'fiscal', 'cashierPin', 'creditLimit'],
  garage: ['payments', 'supplierDebts', 'inventory', 'fiscal', 'creditLimit', 'exportCompta'],
  car_rental: ['payments', 'tpe', 'fiscal', 'creditLimit', 'exportCompta'],
  car_sales: ['payments', 'fiscal', 'creditLimit', 'exportCompta', 'debtRemind'],
  car_wash: ['payments', 'tpe', 'fiscal', 'cashierPin'],
  parts: ['payments', 'inventory', 'supplierDebts', 'fiscal', 'creditLimit'],
  legal: ['payments', 'fiscal', 'exportCompta', 'creditLimit'],
  accounting: ['payments', 'fiscal', 'exportCompta'],
  notary: ['payments', 'fiscal', 'exportCompta'],
  realty: ['payments', 'fiscal', 'exportCompta', 'creditLimit'],
  travel: ['payments', 'tpe', 'fiscal', 'exportCompta'],
  hotel: ['payments', 'tpe', 'fiscal', 'membership', 'exportCompta'],
  school: ['payments', 'membership', 'fiscal', 'exportCompta', 'debtRemind'],
  gym: ['payments', 'membership', 'tpe', 'fiscal', 'cashierPin'],
  boxing: ['payments', 'membership', 'fiscal', 'cashierPin'],
  football: ['payments', 'membership', 'fiscal', 'cashierPin'],
  yoga: ['payments', 'membership', 'fiscal', 'cashierPin'],
  crossfit: ['payments', 'membership', 'fiscal', 'cashierPin'],
  martial: ['payments', 'membership', 'fiscal', 'cashierPin'],
  swim: ['payments', 'membership', 'fiscal', 'cashierPin'],
  tennis: ['payments', 'membership', 'fiscal', 'cashierPin'],
  danse: ['payments', 'membership', 'fiscal', 'cashierPin'],
  musculation: ['payments', 'membership', 'fiscal', 'cashierPin'],
  creche: ['payments', 'membership', 'fiscal', 'exportCompta', 'debtRemind'],
  events: ['payments', 'tpe', 'fiscal', 'exportCompta'],
  game_room: ['payments', 'tpe', 'fiscal', 'cashierPin', 'membership'],
  photo: ['payments', 'tpe', 'fiscal', 'exportCompta'],
  print: ['payments', 'tpe', 'inventory', 'fiscal', 'cashierPin'],
  artisan: ['payments', 'supplierDebts', 'inventory', 'fiscal', 'creditLimit', 'exportCompta'],
  transport: ['payments', 'fiscal', 'exportCompta', 'creditLimit', 'debtRemind'],
  it_support: ['payments', 'fiscal', 'exportCompta', 'creditLimit'],
  security: ['payments', 'fiscal', 'exportCompta', 'membership'],
  spa: ['payments', 'membership', 'tpe', 'fiscal', 'cashierPin'],
  generic_service: ['payments', 'fiscal', 'exportCompta', 'cashierPin'],
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'baridimob',
  'ccp',
  'card',
  'cheque',
]

export type OptionalToolDef = {
  id: OptionalToolId
  screen: Screen
  icon: string
  tone: string
  labelFr: string
  labelAr: string
  hintFr: string
  hintAr: string
}

/** Défaut : tout décoché — l’utilisateur active ce dont il a besoin */
export const OPTIONAL_TOOLS: OptionalToolDef[] = [
  {
    id: 'payments',
    screen: 'payments',
    icon: '💳',
    tone: 'teal',
    labelFr: 'Paiements DZ',
    labelAr: 'طرق الدفع',
    hintFr: 'Espèce, BaridiMob, CCP, carte, chèque',
    hintAr: 'نقد، بريدي موب، CCP، بطاقة، شيك',
  },
  {
    id: 'tpe',
    screen: 'tpe',
    icon: '🏦',
    tone: 'navy',
    labelFr: 'Lecteur TPE',
    labelAr: 'قارئ TPE',
    hintFr: 'Paiement carte CIB via ton terminal',
    hintAr: 'دفع بالبطاقة عبر جهاز TPE',
  },
  {
    id: 'debtRemind',
    screen: 'debtRemind',
    icon: '📲',
    tone: 'coral',
    labelFr: 'Relances dettes',
    labelAr: 'تذكير الديون',
    hintFr: 'WhatsApp aux clients en retard',
    hintAr: 'واتساب للزبائن المتأخرين',
  },
  {
    id: 'supplierDebts',
    screen: 'supplierDebts',
    icon: '🏭',
    tone: 'steel',
    labelFr: 'Dettes fournisseurs',
    labelAr: 'ديون الموردين',
    hintFr: 'Ce que tu dois aux fournisseurs',
    hintAr: 'ما عليك للموردين',
  },
  {
    id: 'inventory',
    screen: 'inventory',
    icon: '📋',
    tone: 'blue',
    labelFr: 'Inventaire',
    labelAr: 'جرد',
    hintFr: 'Comptage rayon → écarts stock',
    hintAr: 'عدّ الرف → فروقات المخزون',
  },
  {
    id: 'expiry',
    screen: 'expiry',
    icon: '⏳',
    tone: 'amber',
    labelFr: 'DLC / lots',
    labelAr: 'صلاحية / دفعات',
    hintFr: 'Dates de péremption & n° lot',
    hintAr: 'تواريخ الانتهاء ورقم الدفعة',
  },
  {
    id: 'membership',
    screen: 'membership',
    icon: '🏋️',
    tone: 'lime',
    labelFr: 'Abonnements gym',
    labelAr: 'اشتراكات الرياضة',
    hintFr: 'Rappels renouvellement WhatsApp',
    hintAr: 'تذكير تجديد الاشتراك واتساب',
  },
  {
    id: 'exportCompta',
    screen: 'exportCompta',
    icon: '📤',
    tone: 'emerald',
    labelFr: 'Export compta',
    labelAr: 'تصدير محاسبة',
    hintFr: 'CSV ventes, dépenses, crédits, stock',
    hintAr: 'CSV مبيعات، مصاريف، ديون، مخزون',
  },
  {
    id: 'cashierPin',
    screen: 'cashierPin',
    icon: '🔐',
    tone: 'charcoal',
    labelFr: 'PIN caissier',
    labelAr: 'رمز الصندوق',
    hintFr: 'Code pour ouvrir la caisse',
    hintAr: 'رمز لفتح الصندوق',
  },
  {
    id: 'creditLimit',
    screen: 'creditLimit',
    icon: '🚧',
    tone: 'rose',
    labelFr: 'Plafond crédit',
    labelAr: 'سقف الدين',
    hintFr: 'Limite de dette par client',
    hintAr: 'حدّ الدين لكل زبون',
  },
  {
    id: 'fiscal',
    screen: 'fiscal',
    icon: '🧾',
    tone: 'navy',
    labelFr: 'Ticket fiscal',
    labelAr: 'تذكرة جبائية',
    hintFr: 'NIF, RC, AI sur ticket / facture',
    hintAr: 'NIF و RC و AI على التذكرة',
  },
]

export const OPTIONAL_TOOL_SCREENS: Screen[] = OPTIONAL_TOOLS.map((t) => t.screen)

export function isOptionalToolScreen(screen: Screen): screen is OptionalToolId {
  return OPTIONAL_TOOL_SCREENS.includes(screen)
}

export function isToolEnabled(
  settings: ShopSettings,
  id: OptionalToolId,
): boolean {
  return settings.enabledTools?.[id] === true
}

export function toolLabel(def: OptionalToolDef, lang: Language): string {
  return lang === 'ar' ? def.labelAr : def.labelFr
}

export function toolHint(def: OptionalToolDef, lang: Language): string {
  return lang === 'ar' ? def.hintAr : def.hintFr
}

export function paymentMethodLabel(
  method: PaymentMethod,
  lang: Language,
): string {
  const fr: Record<PaymentMethod, string> = {
    cash: 'Espèce',
    baridimob: 'BaridiMob',
    ccp: 'CCP',
    card: 'TPE / CIB',
    cheque: 'Chèque',
  }
  const ar: Record<PaymentMethod, string> = {
    cash: 'نقد',
    baridimob: 'بريدي موب',
    ccp: 'CCP',
    card: 'TPE / بطاقة',
    cheque: 'شيك',
  }
  return lang === 'ar' ? ar[method] : fr[method]
}

export function paymentMethodEmoji(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    cash: '💵',
    baridimob: '📱',
    ccp: '🏦',
    card: '💳',
    cheque: '✍️',
  }
  return map[method]
}

/** Outils triés : recommandés métier d’abord, puis le reste */
export function toolsForMetier(family: MetierFamily | undefined): OptionalToolDef[] {
  const all = OPTIONAL_TOOLS
  if (!family) return all
  const pref = METIER_RECOMMENDED_TOOLS[family] || []
  const prefSet = new Set(pref)
  const first = pref
    .map((id) => all.find((t) => t.id === id))
    .filter((t): t is OptionalToolDef => !!t)
  const rest = all.filter((t) => !prefSet.has(t.id))
  return [...first, ...rest]
}

const PIN_SESSION_KEY = 'azpos_cashier_unlocked'

export function isCashierUnlocked(): boolean {
  try {
    return sessionStorage.getItem(PIN_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function setCashierUnlocked(ok: boolean): void {
  try {
    if (ok) sessionStorage.setItem(PIN_SESSION_KEY, '1')
    else sessionStorage.removeItem(PIN_SESSION_KEY)
  } catch {
    /* ignore */
  }
}
