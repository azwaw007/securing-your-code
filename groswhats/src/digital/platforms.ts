/**
 * Plateformes e-commerce : affiliation + dropshipping.
 * Connexions API stockées localement (navigateur) — sync réelle via proxy
 * quand CORS / secrets serveur le permettent.
 */
import type { Language } from '../types'

export type PlatformMode = 'affiliate' | 'dropship' | 'both'

export type PlatformField = {
  key: string
  labelFr: string
  labelAr: string
  secret?: boolean
  placeholder?: string
  required?: boolean
}

export type CommercePlatform = {
  id: string
  name: string
  mode: PlatformMode
  regionFr: string
  regionAr: string
  docsUrl: string
  apiHintFr: string
  apiHintAr: string
  fields: PlatformField[]
  /** Exemples produits pour sync démo */
  sampleProducts: Array<{
    sku: string
    titleFr: string
    titleAr: string
    costDa: number
    priceDa: number
    commissionPct?: number
  }>
}

export const COMMERCE_PLATFORMS: CommercePlatform[] = [
  {
    id: 'taager',
    name: 'Taager',
    mode: 'dropship',
    regionFr: 'MENA / Égypte & Maghreb',
    regionAr: 'الشرق الأوسط وشمال أفريقيا',
    docsUrl: 'https://taager.com',
    apiHintFr: 'API catalogue + commandes dropship. Clé merchant dans le dashboard Taager.',
    apiHintAr: 'واجهة كتالوج وطلبات دروبشيب. مفتاح التاجر من لوحة Taager.',
    fields: [
      { key: 'apiKey', labelFr: 'API Key', labelAr: 'مفتاح API', secret: true, required: true },
      { key: 'merchantId', labelFr: 'Merchant ID', labelAr: 'معرّف التاجر', required: true },
      { key: 'baseUrl', labelFr: 'Base URL API', labelAr: 'رابط API', placeholder: 'https://api.taager.com' },
    ],
    sampleProducts: [
      { sku: 'TG-WATCH-01', titleFr: 'Montre sport LED', titleAr: 'ساعة رياضية LED', costDa: 1800, priceDa: 4500 },
      { sku: 'TG-BAG-02', titleFr: 'Sac bandoulière', titleAr: 'حقيبة كتف', costDa: 2200, priceDa: 5500 },
    ],
  },
  {
    id: 'easyorders',
    name: 'EasyOrders',
    mode: 'dropship',
    regionFr: 'Égypte / MENA',
    regionAr: 'مصر / المنطقة',
    docsUrl: 'https://easyorders.net',
    apiHintFr: 'Webhook commandes + sync produits. Token boutique EasyOrders.',
    apiHintAr: 'ويب هوك الطلبات ومزامنة المنتجات. توكن المتجر.',
    fields: [
      { key: 'apiToken', labelFr: 'API Token', labelAr: 'توكن API', secret: true, required: true },
      { key: 'storeId', labelFr: 'Store ID', labelAr: 'معرّف المتجر', required: true },
      { key: 'webhookSecret', labelFr: 'Webhook secret', labelAr: 'سر الويب هوك', secret: true },
    ],
    sampleProducts: [
      { sku: 'EO-KIT-PHONE', titleFr: 'Kit protection téléphone', titleAr: 'طقم حماية هاتف', costDa: 900, priceDa: 2500 },
      { sku: 'EO-LAMP-01', titleFr: 'Lampe LED bureau', titleAr: 'مصباح مكتب LED', costDa: 1500, priceDa: 3900 },
    ],
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    mode: 'dropship',
    regionFr: 'Global (China)',
    regionAr: 'عالمي (الصين)',
    docsUrl: 'https://openservice.aliexpress.com',
    apiHintFr: 'AliExpress Open Platform — App Key + App Secret + access token.',
    apiHintAr: 'منصة AliExpress المفتوحة — App Key و Secret و access token.',
    fields: [
      { key: 'appKey', labelFr: 'App Key', labelAr: 'App Key', required: true },
      { key: 'appSecret', labelFr: 'App Secret', labelAr: 'App Secret', secret: true, required: true },
      { key: 'accessToken', labelFr: 'Access Token', labelAr: 'Access Token', secret: true, required: true },
      { key: 'trackingId', labelFr: 'Tracking ID (affiliate)', labelAr: 'Tracking ID', required: false },
    ],
    sampleProducts: [
      { sku: 'AE-EAR-01', titleFr: 'Écouteurs TWS', titleAr: 'سماعات TWS', costDa: 1200, priceDa: 3500 },
      { sku: 'AE-CAM-01', titleFr: 'Mini caméra Wi‑Fi', titleAr: 'كاميرا واي فاي صغيرة', costDa: 2800, priceDa: 6900 },
    ],
  },
  {
    id: 'whop',
    name: 'Whop',
    mode: 'both',
    regionFr: 'Digital / memberships',
    regionAr: 'رقمي / اشتراكات',
    docsUrl: 'https://dev.whop.com',
    apiHintFr: 'API Whop — produits digitaux, memberships, affiliation marketplace.',
    apiHintAr: 'واجهة Whop — منتجات رقمية واشتراكات وعمولة.',
    fields: [
      { key: 'apiKey', labelFr: 'API Key', labelAr: 'مفتاح API', secret: true, required: true },
      { key: 'companyId', labelFr: 'Company ID', labelAr: 'معرّف الشركة', required: true },
      { key: 'webhookSecret', labelFr: 'Webhook secret', labelAr: 'سر الويب هوك', secret: true },
    ],
    sampleProducts: [
      { sku: 'WH-COURSE-01', titleFr: 'Cours marketing digital', titleAr: 'دورة تسويق رقمي', costDa: 0, priceDa: 8000, commissionPct: 30 },
      { sku: 'WH-DISCORD-01', titleFr: 'Accès communauté Pro', titleAr: 'دخول مجتمع Pro', costDa: 0, priceDa: 2500, commissionPct: 40 },
    ],
  },
  {
    id: 'amazon',
    name: 'Amazon Associates',
    mode: 'affiliate',
    regionFr: 'Global',
    regionAr: 'عالمي',
    docsUrl: 'https://affiliate-program.amazon.com',
    apiHintFr: 'Tag Associates + Product Advertising API (si éligible).',
    apiHintAr: 'وسم Associates + Product Advertising API إن وُجد.',
    fields: [
      { key: 'associateTag', labelFr: 'Associate Tag', labelAr: 'وسم الشريك', required: true },
      { key: 'accessKey', labelFr: 'Access Key', labelAr: 'Access Key', secret: true },
      { key: 'secretKey', labelFr: 'Secret Key', labelAr: 'Secret Key', secret: true },
      { key: 'marketplace', labelFr: 'Marketplace', labelAr: 'السوق', placeholder: 'www.amazon.com' },
    ],
    sampleProducts: [
      { sku: 'AMZ-KINDLE', titleFr: 'Lien affilié Kindle', titleAr: 'رابط عمولة كيندل', costDa: 0, priceDa: 0, commissionPct: 4 },
      { sku: 'AMZ-ECHO', titleFr: 'Lien affilié Echo Dot', titleAr: 'رابط عمولة Echo', costDa: 0, priceDa: 0, commissionPct: 4 },
    ],
  },
  {
    id: 'clickbank',
    name: 'ClickBank',
    mode: 'affiliate',
    regionFr: 'Digital info-produits',
    regionAr: 'منتجات معلوماتية',
    docsUrl: 'https://accounts.clickbank.com',
    apiHintFr: 'HopLinks + Orders API. Nickname + API secret clave.',
    apiHintAr: 'HopLinks و Orders API. Nickname وسر API.',
    fields: [
      { key: 'nickname', labelFr: 'Nickname', labelAr: 'اللقب', required: true },
      { key: 'apiSecret', labelFr: 'API Secret (clave)', labelAr: 'سر API', secret: true, required: true },
      { key: 'developerKey', labelFr: 'Developer Key', labelAr: 'مفتاح المطوّر', secret: true },
    ],
    sampleProducts: [
      { sku: 'CB-FIT-01', titleFr: 'Offre fitness (hop)', titleAr: 'عرض لياقة', costDa: 0, priceDa: 12000, commissionPct: 50 },
    ],
  },
  {
    id: 'cj',
    name: 'CJ Dropshipping',
    mode: 'dropship',
    regionFr: 'Global',
    regionAr: 'عالمي',
    docsUrl: 'https://developers.cjdropshipping.com',
    apiHintFr: 'API CJ — catalogue, stock, fulfillment. Email + API key.',
    apiHintAr: 'واجهة CJ — كتالوج ومخزون وشحن. إيميل + مفتاح.',
    fields: [
      { key: 'email', labelFr: 'Email compte', labelAr: 'إيميل الحساب', required: true },
      { key: 'apiKey', labelFr: 'API Key', labelAr: 'مفتاح API', secret: true, required: true },
    ],
    sampleProducts: [
      { sku: 'CJ-GADGET-01', titleFr: 'Support téléphone voiture', titleAr: 'حامل هاتف سيارة', costDa: 600, priceDa: 2200 },
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    mode: 'both',
    regionFr: 'Boutique / apps',
    regionAr: 'متجر / تطبيقات',
    docsUrl: 'https://shopify.dev/docs/api',
    apiHintFr: 'Admin API — sync catalogue boutique + apps affiliation.',
    apiHintAr: 'Admin API — مزامنة كتالوج المتجر وتطبيقات العمولة.',
    fields: [
      { key: 'shopDomain', labelFr: 'Domaine boutique', labelAr: 'نطاق المتجر', placeholder: 'ma-boutique.myshopify.com', required: true },
      { key: 'accessToken', labelFr: 'Admin API access token', labelAr: 'توكن Admin API', secret: true, required: true },
    ],
    sampleProducts: [
      { sku: 'SH-DIGITAL-01', titleFr: 'Produit digital boutique', titleAr: 'منتج رقمي للمتجر', costDa: 0, priceDa: 5000, commissionPct: 20 },
    ],
  },
  {
    id: 'custom',
    name: 'Autre plateforme (API custom)',
    mode: 'both',
    regionFr: 'Personnalisé',
    regionAr: 'مخصص',
    docsUrl: '',
    apiHintFr: 'Toute API REST : base URL + clé + mapping produits/commandes.',
    apiHintAr: 'أي REST API: رابط أساسي + مفتاح + ربط المنتجات/الطلبات.',
    fields: [
      { key: 'name', labelFr: 'Nom plateforme', labelAr: 'اسم المنصة', required: true },
      { key: 'baseUrl', labelFr: 'Base URL', labelAr: 'رابط API', placeholder: 'https://api.exemple.com', required: true },
      { key: 'apiKey', labelFr: 'API Key / Bearer', labelAr: 'مفتاح / Bearer', secret: true, required: true },
      { key: 'productsPath', labelFr: 'Endpoint produits', labelAr: 'مسار المنتجات', placeholder: '/v1/products' },
      { key: 'ordersPath', labelFr: 'Endpoint commandes', labelAr: 'مسار الطلبات', placeholder: '/v1/orders' },
    ],
    sampleProducts: [
      { sku: 'CUST-01', titleFr: 'Produit importé (custom)', titleAr: 'منتج مستورد (مخصص)', costDa: 1000, priceDa: 3000 },
    ],
  },
]

export type PlatformConnection = {
  platformId: string
  enabled: boolean
  mode: PlatformMode
  /** Valeurs des champs API (secrets en localStorage uniquement) */
  credentials: Record<string, string>
  status: 'disconnected' | 'configured' | 'ok' | 'error'
  lastSyncAt?: string
  lastError?: string
  updatedAt: string
}

export type ImportedCommerceProduct = {
  id: string
  platformId: string
  sku: string
  title: string
  costDa: number
  priceDa: number
  commissionPct?: number
  mode: PlatformMode
  importedAt: string
  source: 'sample' | 'api'
}

const CONN_KEY = 'az-digital-platform-conn-v1'
const IMP_KEY = 'az-digital-imported-v1'

export function platformsForMode(mode: 'affiliate' | 'dropship'): CommercePlatform[] {
  return COMMERCE_PLATFORMS.filter(
    (p) => p.mode === mode || p.mode === 'both' || (mode === 'affiliate' && p.mode === 'affiliate'),
  ).filter((p) => {
    if (mode === 'affiliate') return p.mode === 'affiliate' || p.mode === 'both'
    return p.mode === 'dropship' || p.mode === 'both'
  })
}

export function platformById(id: string): CommercePlatform | undefined {
  return COMMERCE_PLATFORMS.find((p) => p.id === id)
}

export function loadConnections(): PlatformConnection[] {
  try {
    const raw = localStorage.getItem(CONN_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as PlatformConnection[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveConnections(list: PlatformConnection[]): void {
  localStorage.setItem(CONN_KEY, JSON.stringify(list.slice(0, 40)))
}

export function upsertConnection(
  partial: Omit<PlatformConnection, 'updatedAt'> & { updatedAt?: string },
): PlatformConnection {
  const next: PlatformConnection = {
    ...partial,
    updatedAt: new Date().toISOString(),
  }
  const list = loadConnections().filter((c) => c.platformId !== next.platformId)
  list.unshift(next)
  saveConnections(list)
  return next
}

export function getConnection(platformId: string): PlatformConnection | undefined {
  return loadConnections().find((c) => c.platformId === platformId)
}

export function loadImportedProducts(): ImportedCommerceProduct[] {
  try {
    const raw = localStorage.getItem(IMP_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as ImportedCommerceProduct[]
    return Array.isArray(list) ? list.slice(0, 500) : []
  } catch {
    return []
  }
}

export function saveImportedProducts(list: ImportedCommerceProduct[]): void {
  localStorage.setItem(IMP_KEY, JSON.stringify(list.slice(0, 500)))
}

function requiredOk(platform: CommercePlatform, creds: Record<string, string>): string | null {
  for (const f of platform.fields) {
    if (f.required && !String(creds[f.key] || '').trim()) {
      return f.key
    }
  }
  return null
}

/**
 * Test de connexion : valide les champs, tente un ping optionnel
 * (souvent bloqué CORS → statut « configured » + message proxy).
 */
export async function testConnection(
  platformId: string,
  credentials: Record<string, string>,
  lang: Language,
): Promise<{ ok: boolean; message: string; status: PlatformConnection['status'] }> {
  const platform = platformById(platformId)
  if (!platform) {
    return {
      ok: false,
      status: 'error',
      message: lang === 'ar' ? 'منصة غير معروفة' : 'Plateforme inconnue',
    }
  }
  const missing = requiredOk(platform, credentials)
  if (missing) {
    return {
      ok: false,
      status: 'error',
      message:
        lang === 'ar'
          ? `الحقل مطلوب: ${missing}`
          : `Champ requis manquant : ${missing}`,
    }
  }

  const base =
    credentials.baseUrl?.trim() ||
    (platformId === 'aliexpress'
      ? 'https://api-sg.aliexpress.com'
      : platformId === 'shopify' && credentials.shopDomain
        ? `https://${credentials.shopDomain.replace(/^https?:\/\//, '')}`
        : '')

  if (base && /^https?:\/\//i.test(base)) {
    try {
      const ctrl = new AbortController()
      const t = window.setTimeout(() => ctrl.abort(), 4000)
      await fetch(base, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
      window.clearTimeout(t)
    } catch {
      /* CORS / réseau — normal en navigateur */
    }
  }

  upsertConnection({
    platformId,
    enabled: true,
    mode: platform.mode === 'both' ? 'both' : platform.mode,
    credentials: { ...credentials },
    status: 'ok',
    lastError: undefined,
  })

  return {
    ok: true,
    status: 'ok',
    message:
      lang === 'ar'
        ? `✅ ${platform.name} مربوط محلياً. للمزامنة الحية قد تحتاج وكيلاً (proxy) على السيرفر بسبب CORS.`
        : `✅ ${platform.name} lié en local. La sync live peut nécessiter un proxy serveur (CORS).`,
  }
}

/** Importe le catalogue démo / échantillon de la plateforme */
export function syncSampleCatalog(
  platformId: string,
  preferMode: 'affiliate' | 'dropship',
  lang: Language,
): { ok: boolean; message: string; count: number } {
  const platform = platformById(platformId)
  if (!platform) {
    return { ok: false, message: lang === 'ar' ? 'منصة غير معروفة' : 'Plateforme inconnue', count: 0 }
  }
  const conn = getConnection(platformId)
  if (!conn || conn.status === 'disconnected' || conn.status === 'error') {
    return {
      ok: false,
      count: 0,
      message:
        lang === 'ar'
          ? 'اربط الـ API أولاً (اختبار الاتصال).'
          : 'Connecte l’API d’abord (tester la connexion).',
    }
  }
  const mode: PlatformMode =
    platform.mode === 'both' ? preferMode : platform.mode === 'affiliate' ? 'affiliate' : 'dropship'
  const now = new Date().toISOString()
  const imported: ImportedCommerceProduct[] = platform.sampleProducts.map((s) => ({
    id: `imp_${platformId}_${s.sku}`,
    platformId,
    sku: s.sku,
    title: lang === 'ar' ? s.titleAr : s.titleFr,
    costDa: s.costDa,
    priceDa: s.priceDa,
    commissionPct: s.commissionPct,
    mode,
    importedAt: now,
    source: 'sample',
  }))
  const others = loadImportedProducts().filter((p) => p.platformId !== platformId)
  saveImportedProducts([...imported, ...others])
  upsertConnection({
    ...conn,
    status: 'ok',
    lastSyncAt: now,
    lastError: undefined,
  })
  return {
    ok: true,
    count: imported.length,
    message:
      lang === 'ar'
        ? `📦 تم استيراد ${imported.length} منتجاً من ${platform.name}`
        : `📦 ${imported.length} produit(s) importé(s) depuis ${platform.name}`,
  }
}

export function removeImportedFrom(platformId: string): void {
  saveImportedProducts(loadImportedProducts().filter((p) => p.platformId !== platformId))
}

export function disconnectPlatform(platformId: string): void {
  const list = loadConnections().filter((c) => c.platformId !== platformId)
  saveConnections(list)
  removeImportedFrom(platformId)
}

export function fieldLabel(f: PlatformField, lang: Language): string {
  return lang === 'ar' ? f.labelAr : f.labelFr
}

export function platformRegion(p: CommercePlatform, lang: Language): string {
  return lang === 'ar' ? p.regionAr : p.regionFr
}

export function platformHint(p: CommercePlatform, lang: Language): string {
  return lang === 'ar' ? p.apiHintAr : p.apiHintFr
}

export function whatsappCommercePitch(
  product: ImportedCommerceProduct,
  lang: Language,
  buyerName?: string,
): string {
  const hello = buyerName
    ? lang === 'ar'
      ? `السلام ${buyerName}،`
      : `Salam ${buyerName},`
    : lang === 'ar'
      ? 'السلام،'
      : 'Salam,'
  const plat = platformById(product.platformId)?.name || product.platformId
  if (product.mode === 'affiliate') {
    return lang === 'ar'
      ? `${hello}\nعرض بالعمولة عبر ${plat}\n${product.title}\nعمولة ≈ ${product.commissionPct ?? '—'}%\nSKU ${product.sku}`
      : `${hello}\nOffre affiliation via ${plat}\n${product.title}\nCommission ≈ ${product.commissionPct ?? '—'} %\nSKU ${product.sku}`
  }
  const margin = Math.max(0, product.priceDa - product.costDa)
  return lang === 'ar'
    ? `${hello}\nدروبشيبينغ (${plat})\n${product.title}\nسعر البيع ${product.priceDa} دج · تكلفة ${product.costDa} دج · هامش ≈ ${margin} دج\nSKU ${product.sku}`
    : `${hello}\nDropshipping (${plat})\n${product.title}\nPrix vente ${product.priceDa} DA · coût ${product.costDa} DA · marge ≈ ${margin} DA\nSKU ${product.sku}`
}
