import type {
  Language,
  OptionalToolId,
  PaymentMethod,
  Screen,
  ShopSettings,
} from '../types'

export type { OptionalToolId, PaymentMethod }

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
    card: 'CIB / Carte',
    cheque: 'Chèque',
  }
  const ar: Record<PaymentMethod, string> = {
    cash: 'نقد',
    baridimob: 'بريدي موب',
    ccp: 'CCP',
    card: 'بطاقة',
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
