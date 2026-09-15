/**
 * Rayons caisse détail — par spécialité boutique (style Easy Management).
 * Les chips de la caisse filtrent sur Product.aisleId, pas seulement ProductCategory.
 */
import { domainById } from '../data/domains'
import type { Language, ProductCategory, ShopSettings } from '../types'
import { metierFamilyFor, type MetierFamily } from './metierPacks'

export type RetailRayon = {
  id: string
  labelFr: string
  labelAr: string
  emoji?: string
  /** Catégorie stock par défaut à la création */
  defaultCategory?: ProductCategory
}

export type RetailRayonOverride = {
  id: string
  enabled: boolean
  labelFr?: string
  labelAr?: string
}

function R(
  id: string,
  labelFr: string,
  labelAr: string,
  emoji?: string,
  defaultCategory?: ProductCategory,
): RetailRayon {
  return { id, labelFr, labelAr, emoji, defaultCategory }
}

const GROCERY: RetailRayon[] = [
  R('epicerie', 'Épicerie', 'بقالة', '🧂', 'alimentaire'),
  R('laitiers', 'Laitiers', 'ألبان', '🥛', 'alimentaire'),
  R('boissons', 'Boissons', 'مشروبات', '🥤', 'alimentaire'),
  R('snacks', 'Snacks', 'سناكات', '🍪', 'alimentaire'),
  R('pain', 'Pain', 'خبز', '🥖', 'alimentaire'),
  R('hygiene', 'Hygiène', 'نظافة', '🧼', 'cosmetique'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const FRUITS: RetailRayon[] = [
  R('legumes', 'Légumes', 'خضر', '🥔', 'alimentaire'),
  R('fruits', 'Fruits', 'فواكه', '🍎', 'alimentaire'),
  R('agrumes', 'Agrumes', 'حوامض', '🍊', 'alimentaire'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const PHONE: RetailRayon[] = [
  R('smartphones', 'Smartphones', 'هواتف', '📱', 'consommable'),
  R('audio', 'Audio', 'صوتيات', '🎧', 'consommable'),
  R('charge', 'Charge & câbles', 'شحن وكابلات', '🔌', 'consommable'),
  R('protection', 'Protection', 'حماية', '🛡️', 'consommable'),
  R('accessoires', 'Accessoires', 'إكسسوارات', '⌚', 'consommable'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const ELECTRO: RetailRayon[] = [
  R('froid', 'Froid', 'تبريد', '🧊', 'consommable'),
  R('lavage', 'Lavage', 'غسيل', '🌀', 'consommable'),
  R('cuisine', 'Cuisine', 'مطبخ', '🔥', 'consommable'),
  R('climat', 'Climatisation', 'تكييف', '❄️', 'consommable'),
  R('tv', 'TV & image', 'تلفزيون', '📺', 'consommable'),
  R('petit', 'Petit électro', 'أجهزة صغيرة', '🫖', 'consommable'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const BAKERY: RetailRayon[] = [
  R('pain', 'Pain', 'خبز', '🥖', 'alimentaire'),
  R('viennoiserie', 'Viennoiserie', 'معجنات', '🥐', 'alimentaire'),
  R('patisserie', 'Pâtisserie', 'حلويات', '🍰', 'alimentaire'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const BUTCHER: RetailRayon[] = [
  R('ovine', 'Ovin', 'لحم غنم', '🥩', 'alimentaire'),
  R('bovine', 'Bovin', 'لحم بقر', '🥩', 'alimentaire'),
  R('volaille', 'Volaille', 'دواجن', '🐔', 'alimentaire'),
  R('charcuterie', 'Charcuterie', 'مصبرات', '🌭', 'alimentaire'),
  R('poisson', 'Poisson', 'سمك', '🐟', 'alimentaire'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const FASHION: RetailRayon[] = [
  R('homme', 'Homme', 'رجال', '👔', 'textile'),
  R('femme', 'Femme', 'نساء', '👗', 'textile'),
  R('enfant', 'Enfant', 'أطفال', '🧒', 'textile'),
  R('accessoires', 'Accessoires', 'إكسسوارات', '👜', 'textile'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const DROGUERIE: RetailRayon[] = [
  R('lessive', 'Lessive', 'غسيل', '🧺', 'consommable'),
  R('menage', 'Ménage', 'تنظيف', '🧽', 'consommable'),
  R('hygiene', 'Hygiène', 'نظافة', '🧻', 'consommable'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const COSMETIQUE: RetailRayon[] = [
  R('visage', 'Visage', 'وجه', '🧴', 'cosmetique'),
  R('corps', 'Corps', 'جسم', '🧼', 'cosmetique'),
  R('cheveux', 'Cheveux', 'شعر', '💇', 'cosmetique'),
  R('maquillage', 'Maquillage', 'مكياج', '💄', 'cosmetique'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const RESTO: RetailRayon[] = [
  R('entrees', 'Entrées', 'مقبلات', '🥗', 'alimentaire'),
  R('plats', 'Plats', 'أطباق', '🍽️', 'alimentaire'),
  R('boissons', 'Boissons', 'مشروبات', '🥤', 'alimentaire'),
  R('desserts', 'Desserts', 'حلويات', '🍮', 'alimentaire'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const CAFE: RetailRayon[] = [
  R('cafe', 'Café', 'قهوة', '☕', 'alimentaire'),
  R('the', 'Thé', 'شاي', '🍵', 'alimentaire'),
  R('boissons', 'Boissons froides', 'مشروبات باردة', '🧃', 'alimentaire'),
  R('patisserie', 'Pâtisserie', 'حلويات', '🥐', 'alimentaire'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const SALON: RetailRayon[] = [
  R('coupe', 'Coupe', 'قص', '✂️', 'autre'),
  R('coloration', 'Coloration', 'صبغة', '🎨', 'cosmetique'),
  R('soins', 'Soins', 'عناية', '💆', 'cosmetique'),
  R('produits', 'Produits', 'منتجات', '🧴', 'cosmetique'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

const GENERIC: RetailRayon[] = [
  R('alimentaire', 'Alimentaire', 'غذائي', '🛒', 'alimentaire'),
  R('cosmetique', 'Cosmétique', 'تجميل', '💅', 'cosmetique'),
  R('consommable', 'Consommable', 'استهلاك', '📦', 'consommable'),
  R('quincaillerie', 'Quincaillerie', 'عتاد', '🪛', 'quincaillerie'),
  R('textile', 'Textile', 'نسيج', '👕', 'textile'),
  R('autre', 'Autre', 'أخرى', '📦', 'autre'),
]

/** Rayons par domaine détail (prioritaire sur la famille). */
const BY_DOMAIN: Record<string, RetailRayon[]> = {
  'detail-alimentation': GROCERY,
  'detail-superette': GROCERY,
  'detail-epicerie': GROCERY,
  'detail-kiosque': GROCERY,
  'detail-fruits': FRUITS,
  'detail-telephone': PHONE,
  'detail-electro': ELECTRO,
  'detail-boulangerie': BAKERY,
  'detail-patisserie': BAKERY,
  'detail-boucherie': BUTCHER,
  'detail-poisson': BUTCHER,
  'detail-pretaporter': FASHION,
  'detail-chaussures': FASHION,
  'detail-droguerie': DROGUERIE,
  'detail-cosmetique': COSMETIQUE,
  'detail-para': COSMETIQUE,
  'detail-restaurant': RESTO,
  'detail-fastfood': RESTO,
  'detail-cafe': CAFE,
  'detail-salon': SALON,
  'detail-esthetique': SALON,
}

const BY_FAMILY: Partial<Record<MetierFamily, RetailRayon[]>> = {
  grocery: GROCERY,
  bakery: BAKERY,
  butcher: BUTCHER,
  restaurant: RESTO,
  cafe: CAFE,
  salon: SALON,
  retail: GENERIC,
}

/** Domaines téléphonie / IMEI à la caisse. */
const IMEI_DOMAINS = new Set(['detail-telephone', 'gros-telephone', 'gros-informatique'])

/** Domaines taille / couleur (textile). */
const VARIANT_DOMAINS = new Set([
  'detail-pretaporter',
  'detail-chaussures',
  'detail-baby',
  'gros-vetements',
  'gros-lingerie',
])

export function retailRayonsFor(domainId: string | undefined): RetailRayon[] {
  if (!domainId) return GENERIC
  if (BY_DOMAIN[domainId]) return BY_DOMAIN[domainId]
  const family = metierFamilyFor(domainId)
  return BY_FAMILY[family] || GENERIC
}

export function showImeiTracking(domainId: string | undefined): boolean {
  return !!domainId && IMEI_DOMAINS.has(domainId)
}

export function showRetailVariants(domainId: string | undefined): boolean {
  return !!domainId && VARIANT_DOMAINS.has(domainId)
}

export function isDetailRetailDomain(domainId: string | undefined): boolean {
  if (!domainId) return false
  const d = domainById(domainId)
  return d?.mode === 'detail'
}

export type ResolvedRetailRayon = RetailRayon & {
  enabled: boolean
  label: string
}

/** Rayons effectifs (défauts + overrides réglages). */
export function resolveRetailRayons(
  domainId: string | undefined,
  settings: Pick<ShopSettings, 'retailRayons'> | undefined,
  lang: Language,
): ResolvedRetailRayon[] {
  const defaults = retailRayonsFor(domainId)
  const overrides = settings?.retailRayons || []
  const byId = new Map(overrides.map((o) => [o.id, o]))
  return defaults.map((r) => {
    const o = byId.get(r.id)
    const labelFr = o?.labelFr?.trim() || r.labelFr
    const labelAr = o?.labelAr?.trim() || r.labelAr
    return {
      ...r,
      labelFr,
      labelAr,
      enabled: o ? o.enabled !== false : true,
      label: lang === 'ar' ? labelAr : labelFr,
    }
  })
}

/** Chips caisse : rayons activés (tous, même vides — style Easy Management). */
export function retailChipRayons(
  domainId: string | undefined,
  settings: Pick<ShopSettings, 'retailRayons'> | undefined,
  lang: Language,
): ResolvedRetailRayon[] {
  return resolveRetailRayons(domainId, settings, lang).filter((r) => r.enabled)
}

export function rayonLabel(
  rayonId: string | undefined,
  domainId: string | undefined,
  lang: Language,
  settings?: Pick<ShopSettings, 'retailRayons'>,
): string {
  if (!rayonId) return ''
  const list = resolveRetailRayons(domainId, settings, lang)
  const found = list.find((r) => r.id === rayonId)
  if (found) return found.label
  return rayonId
}

export function defaultCategoryForAisle(
  domainId: string | undefined,
  aisleId: string | undefined,
): ProductCategory {
  if (!aisleId) return 'autre'
  const r = retailRayonsFor(domainId).find((x) => x.id === aisleId)
  return r?.defaultCategory || 'autre'
}
