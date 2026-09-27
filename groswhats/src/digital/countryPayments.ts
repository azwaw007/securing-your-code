/**
 * Méthodes de paiement adaptées par pays — inclut COD (paiement à la livraison).
 */
export type CountryPaymentId =
  | 'cod'
  | 'cash'
  | 'card'
  | 'baridimob'
  | 'ccp'
  | 'chargily'
  | 'cheque'
  | 'orange_money'
  | 'wave'
  | 'moov_money'
  | 'mtn_momo'
  | 'flouci'
  | 'd17'
  | 'cih'
  | 'cmi'
  | 'paypal'
  | 'stripe'
  | 'transfer'
  | 'apple_pay'
  | 'google_pay'
  | 'mada'
  | 'stc_pay'

export type CountryPaymentMethod = {
  id: CountryPaymentId
  icon: string
  labelFr: string
  labelAr: string
  /** Paiement à la livraison */
  cod?: boolean
}

const M: Record<CountryPaymentId, CountryPaymentMethod> = {
  cod: {
    id: 'cod',
    icon: '📦',
    labelFr: 'Paiement à la livraison (COD)',
    labelAr: 'الدفع عند الاستلام (COD)',
    cod: true,
  },
  cash: {
    id: 'cash',
    icon: '💵',
    labelFr: 'Espèces',
    labelAr: 'نقداً',
  },
  card: {
    id: 'card',
    icon: '💳',
    labelFr: 'Carte bancaire',
    labelAr: 'بطاقة بنكية',
  },
  baridimob: {
    id: 'baridimob',
    icon: '📱',
    labelFr: 'BaridiMob',
    labelAr: 'بريدي موب',
  },
  ccp: {
    id: 'ccp',
    icon: '🏦',
    labelFr: 'CCP / Virement postal',
    labelAr: 'CCP / تحويل بريدي',
  },
  chargily: {
    id: 'chargily',
    icon: '🇩🇿',
    labelFr: 'Chargily (EDAHABIA / CIB)',
    labelAr: 'شارجيلي (ذهبية / CIB)',
  },
  cheque: {
    id: 'cheque',
    icon: '✍️',
    labelFr: 'Chèque',
    labelAr: 'شيك',
  },
  orange_money: {
    id: 'orange_money',
    icon: '🟠',
    labelFr: 'Orange Money',
    labelAr: 'أورنج موني',
  },
  wave: {
    id: 'wave',
    icon: '🌊',
    labelFr: 'Wave',
    labelAr: 'ويف',
  },
  moov_money: {
    id: 'moov_money',
    icon: '🔵',
    labelFr: 'Moov Money',
    labelAr: 'موف موني',
  },
  mtn_momo: {
    id: 'mtn_momo',
    icon: '🟡',
    labelFr: 'MTN MoMo',
    labelAr: 'MTN مو مو',
  },
  flouci: {
    id: 'flouci',
    icon: '🇹🇳',
    labelFr: 'Flouci',
    labelAr: 'فلوسي',
  },
  d17: {
    id: 'd17',
    icon: '📲',
    labelFr: 'D17',
    labelAr: 'D17',
  },
  cih: {
    id: 'cih',
    icon: '🇲🇦',
    labelFr: 'CIH / paiement mobile',
    labelAr: 'CIH / دفع جوّال',
  },
  cmi: {
    id: 'cmi',
    icon: '💳',
    labelFr: 'CMI (carte Maroc)',
    labelAr: 'CMI (بطاقة المغرب)',
  },
  paypal: {
    id: 'paypal',
    icon: '🅿️',
    labelFr: 'PayPal',
    labelAr: 'باي بال',
  },
  stripe: {
    id: 'stripe',
    icon: '💳',
    labelFr: 'Carte (Stripe)',
    labelAr: 'بطاقة (سترايب)',
  },
  transfer: {
    id: 'transfer',
    icon: '🏦',
    labelFr: 'Virement bancaire',
    labelAr: 'تحويل بنكي',
  },
  apple_pay: {
    id: 'apple_pay',
    icon: '',
    labelFr: 'Apple Pay',
    labelAr: 'Apple Pay',
  },
  google_pay: {
    id: 'google_pay',
    icon: 'G',
    labelFr: 'Google Pay',
    labelAr: 'Google Pay',
  },
  mada: {
    id: 'mada',
    icon: '🇸🇦',
    labelFr: 'Mada',
    labelAr: 'مدى',
  },
  stc_pay: {
    id: 'stc_pay',
    icon: '📱',
    labelFr: 'STC Pay',
    labelAr: 'STC Pay',
  },
}

/** Méthodes proposées par code pays ISO */
const BY_COUNTRY: Record<string, CountryPaymentId[]> = {
  DZ: ['cod', 'cash', 'baridimob', 'ccp', 'chargily', 'card', 'cheque'],
  TN: ['cod', 'cash', 'flouci', 'd17', 'card', 'transfer'],
  MA: ['cod', 'cash', 'cih', 'cmi', 'card', 'transfer'],
  LY: ['cod', 'cash', 'transfer', 'card'],
  MR: ['cod', 'cash', 'transfer'],
  EG: ['cod', 'cash', 'card', 'transfer', 'paypal'],
  SN: ['cod', 'cash', 'orange_money', 'wave', 'card'],
  CI: ['cod', 'cash', 'orange_money', 'wave', 'moov_money', 'mtn_momo', 'card'],
  CM: ['cod', 'cash', 'orange_money', 'mtn_momo', 'card'],
  ML: ['cod', 'cash', 'orange_money', 'moov_money', 'wave'],
  BF: ['cod', 'cash', 'orange_money', 'moov_money'],
  NE: ['cod', 'cash', 'orange_money', 'moov_money'],
  GN: ['cod', 'cash', 'orange_money', 'mtn_momo'],
  FR: ['card', 'paypal', 'stripe', 'transfer', 'apple_pay', 'google_pay'],
  BE: ['card', 'paypal', 'stripe', 'transfer', 'apple_pay'],
  CH: ['card', 'paypal', 'stripe', 'transfer'],
  ES: ['card', 'paypal', 'stripe', 'transfer', 'cod'],
  IT: ['card', 'paypal', 'stripe', 'transfer', 'cod'],
  DE: ['card', 'paypal', 'stripe', 'transfer'],
  GB: ['card', 'paypal', 'stripe', 'transfer', 'apple_pay', 'google_pay'],
  SA: ['mada', 'stc_pay', 'card', 'apple_pay', 'cod', 'transfer'],
  AE: ['card', 'apple_pay', 'google_pay', 'cod', 'transfer'],
  QA: ['card', 'cod', 'transfer'],
  KW: ['card', 'cod', 'transfer'],
  BH: ['card', 'cod', 'transfer'],
  OM: ['card', 'cod', 'transfer'],
  JO: ['cod', 'card', 'transfer'],
  LB: ['cod', 'cash', 'card', 'transfer'],
  TR: ['cod', 'card', 'transfer'],
  US: ['card', 'paypal', 'stripe', 'apple_pay', 'google_pay'],
  CA: ['card', 'paypal', 'stripe', 'apple_pay', 'transfer'],
}

const FALLBACK: CountryPaymentId[] = ['cod', 'cash', 'card', 'transfer', 'paypal']

export function paymentsForCountry(countryCode: string): CountryPaymentMethod[] {
  const ids = BY_COUNTRY[countryCode.toUpperCase()] || FALLBACK
  return ids.map((id) => M[id]).filter(Boolean)
}

export function paymentLabel(
  method: CountryPaymentMethod,
  lang: 'fr' | 'ar',
): string {
  return lang === 'ar' ? method.labelAr : method.labelFr
}

export function isCodPayment(id: string): boolean {
  return id === 'cod' || M[id as CountryPaymentId]?.cod === true
}

export function allCountryPaymentMethods(): CountryPaymentMethod[] {
  return Object.values(M)
}
