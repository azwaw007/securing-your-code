/**
 * Catalogue produits digitaux — logiciels, licences AZ POS, abonnements SaaS légitimes.
 * Les abonnements tiers (Netflix, etc.) ne sont listés que comme modèles « affiliation /
 * revente autorisée » — jamais de comptes piratés ou partagés illégalement.
 */
import type { Language } from '../types'
import { SELLER_BRAND } from '../marketing/campaignPack'

export type DigitalKind =
  | 'software'
  | 'license'
  | 'saas'
  | 'course'
  | 'affiliate'
  | 'template'

export type DigitalProduct = {
  id: string
  kind: DigitalKind
  nameFr: string
  nameAr: string
  descFr: string
  descAr: string
  priceDa: number
  period?: 'once' | 'month' | 'year'
  /** Lien démo / landing */
  url?: string
  tags: string[]
  /** true = produit AZ Soft officiel */
  firstParty: boolean
  /** Avertissement légal si affiliation / tiers */
  legalNoteFr?: string
  legalNoteAr?: string
}

export const DIGITAL_CATALOG: DigitalProduct[] = [
  {
    id: 'azpos-standard',
    kind: 'license',
    nameFr: 'AZ POS Standard',
    nameAr: 'AZ POS عادي',
    descFr: '1 poste · caisse, stock, clients, WhatsApp — 12 mois',
    descAr: 'منصب واحد · صندوق، مخزون، زبائن، واتساب — 12 شهراً',
    priceDa: 12_000,
    period: 'year',
    url: SELLER_BRAND.proUrl,
    tags: ['pos', 'caisse', 'algerie'],
    firstParty: true,
  },
  {
    id: 'azpos-pro3',
    kind: 'license',
    nameFr: 'AZ POS Pro 3 postes',
    nameAr: 'AZ POS Pro 3 مناصب',
    descFr: '3 postes multi-magasin · sync · 12 mois',
    descAr: '3 مناصب متعدد المحلات · مزامنة · 12 شهراً',
    priceDa: 25_000,
    period: 'year',
    url: SELLER_BRAND.proUrl,
    tags: ['pos', 'pro', 'multi'],
    firstParty: true,
  },
  {
    id: 'azpos-pro10',
    kind: 'license',
    nameFr: 'AZ POS Pro 10 postes',
    nameAr: 'AZ POS Pro 10 مناصب',
    priceDa: 70_000,
    period: 'year',
    descFr: '10 postes · réseaux · 12 mois',
    descAr: '10 مناصب · شبكات · 12 شهراً',
    url: SELLER_BRAND.proUrl,
    tags: ['pos', 'pro'],
    firstParty: true,
  },
  {
    id: 'azpos-promax',
    kind: 'license',
    nameFr: 'AZ POS Pro Max',
    nameAr: 'AZ POS Pro Max',
    descFr: 'Postes illimités · 12 mois',
    descAr: 'مناصب غير محدودة · 12 شهراً',
    priceDa: 90_000,
    period: 'year',
    url: SELLER_BRAND.proUrl,
    tags: ['pos', 'pro', 'illimite'],
    firstParty: true,
  },
  {
    id: 'az-digital-suite',
    kind: 'saas',
    nameFr: 'AZ Digital Suite',
    nameAr: 'حزمة AZ Digital',
    descFr: 'Cockpit vente digitale + pubs + agents IA (inclus dans AZ POS)',
    descAr: 'لوحة بيع رقمي + إعلانات + وكلاء ذكاء (مدمج في AZ POS)',
    priceDa: 0,
    period: 'once',
    tags: ['digital', 'ads', 'ia'],
    firstParty: true,
  },
  {
    id: 'pack-landing',
    kind: 'template',
    nameFr: 'Pack landing + WhatsApp',
    nameAr: 'باقة صفحة هبوط + واتساب',
    descFr: 'Modèle boutique en ligne simple (lien + catalogue + CTA)',
    descAr: 'نموذج متجر بسيط (رابط + كتالوج + زر شراء)',
    priceDa: 5_000,
    period: 'once',
    tags: ['web', 'template'],
    firstParty: true,
  },
  {
    id: 'course-ads',
    kind: 'course',
    nameFr: 'Guide pubs Meta / TikTok / Google',
    nameAr: 'دليل إعلانات ميتا / تيك توك / جوجل',
    descFr: 'Check-lists et playbooks intégrés (sans frais API payants)',
    descAr: 'قوائم تحقق وخطط عمل مدمجة (بدون واجهات مدفوعة)',
    priceDa: 0,
    period: 'once',
    tags: ['formation', 'ads'],
    firstParty: true,
  },
  {
    id: 'affiliate-stream',
    kind: 'affiliate',
    nameFr: 'Affiliation streaming (légale)',
    nameAr: 'تسويق بالعمولة للبث (قانوني)',
    descFr: 'Modèle pour vendre via programmes officiels / partenaires autorisés uniquement',
    descAr: 'نموذج للبيع عبر برامج رسمية / شركاء مرخّصين فقط',
    priceDa: 0,
    period: 'month',
    tags: ['affiliation', 'streaming'],
    firstParty: false,
    legalNoteFr:
      'Interdit : comptes piratés, partage de mots de passe, revente Netflix/Spotify non autorisée. Utilise uniquement affiliation / API / contrat revendeur officiel.',
    legalNoteAr:
      'ممنوع: حسابات مقرصنة، مشاركة كلمات السر، إعادة بيع نتفليكس غير مرخّصة. فقط عمولة / API / عقد موزّع رسمي.',
  },
]

export function productName(p: DigitalProduct, lang: Language): string {
  return lang === 'ar' ? p.nameAr : p.nameFr
}

export function productDesc(p: DigitalProduct, lang: Language): string {
  return lang === 'ar' ? p.descAr : p.descFr
}

export function formatPeriod(p: DigitalProduct, lang: Language): string {
  if (!p.period || p.period === 'once') return lang === 'ar' ? 'مرة واحدة' : 'une fois'
  if (p.period === 'month') return lang === 'ar' ? '/ شهر' : '/ mois'
  return lang === 'ar' ? '/ سنة' : '/ an'
}

export type DigitalSale = {
  id: string
  productId: string
  productName: string
  buyerName: string
  buyerPhone: string
  priceDa: number
  status: 'draft' | 'sent' | 'paid'
  createdAt: string
  note?: string
}

const SALES_KEY = 'az-digital-sales-v1'

export function loadDigitalSales(): DigitalSale[] {
  try {
    const raw = localStorage.getItem(SALES_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as DigitalSale[]
    return Array.isArray(list) ? list.slice(0, 500) : []
  } catch {
    return []
  }
}

export function saveDigitalSales(list: DigitalSale[]): void {
  localStorage.setItem(SALES_KEY, JSON.stringify(list.slice(0, 500)))
}

export function addDigitalSale(
  input: Omit<DigitalSale, 'id' | 'createdAt' | 'status'> & {
    status?: DigitalSale['status']
  },
): DigitalSale {
  const sale: DigitalSale = {
    id: `ds_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: input.status || 'draft',
    productId: input.productId,
    productName: input.productName,
    buyerName: input.buyerName.trim(),
    buyerPhone: input.buyerPhone.trim(),
    priceDa: input.priceDa,
    note: input.note?.trim() || undefined,
  }
  const next = [sale, ...loadDigitalSales()]
  saveDigitalSales(next)
  return sale
}

export function whatsappPitch(
  p: DigitalProduct,
  lang: Language,
  buyerName?: string,
): string {
  const name = productName(p, lang)
  const price = `${p.priceDa.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')} DA ${formatPeriod(p, lang)}`
  const hello = buyerName
    ? lang === 'ar'
      ? `السلام ${buyerName}،`
      : `Salam ${buyerName},`
    : lang === 'ar'
      ? 'السلام،'
      : 'Salam,'
  const demo = p.url || SELLER_BRAND.demoUrl
  if (lang === 'ar') {
    return `${hello}\nعرض ${name} — ${price}\n${productDesc(p, lang)}\nتجربة: ${demo}\nمن ${SELLER_BRAND.boutique}`
  }
  return `${hello}\nOffre ${name} — ${price}\n${productDesc(p, lang)}\nDémo : ${demo}\n— ${SELLER_BRAND.boutique}`
}
