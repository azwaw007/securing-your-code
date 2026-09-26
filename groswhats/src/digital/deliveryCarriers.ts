/**
 * Sociétés de livraison — connexions API locales (token sur l’appareil).
 * DZ : Yalidine, Maystro, ZR Express, Noest, Guepex, Ecotrack…
 * Sync réelle via proxy serveur si CORS ; sinon test de config + colis démo.
 */
import type { Language } from '../types'

export type DeliveryCarrierField = {
  key: string
  labelFr: string
  labelAr: string
  secret?: boolean
  placeholder?: string
  required?: boolean
}

export type DeliveryCarrier = {
  id: string
  name: string
  icon: string
  regionFr: string
  regionAr: string
  docsUrl: string
  apiHintFr: string
  apiHintAr: string
  /** freemium / payant à l’usage — l’API doc est souvent gratuite à brancher */
  pricing: 'free_api' | 'freemium' | 'paid'
  fields: DeliveryCarrierField[]
  sampleParcels: Array<{
    tracking: string
    toFr: string
    toAr: string
    wilaya: string
    statusFr: string
    statusAr: string
    feeDa: number
  }>
}

export const DELIVERY_CARRIERS: DeliveryCarrier[] = [
  {
    id: 'yalidine',
    name: 'Yalidine',
    icon: '📮',
    regionFr: 'Algérie',
    regionAr: 'الجزائر',
    docsUrl: 'https://yalidine.app/developers',
    apiHintFr:
      'API REST Yalidine : créer colis, tarifs, tracking. Token + ID depuis le tableau de bord.',
    apiHintAr:
      'واجهة Yalidine: إنشاء طرود، أسعار، تتبع. التوكن والمعرّف من لوحة التحكم.',
    pricing: 'freemium',
    fields: [
      { key: 'apiId', labelFr: 'API ID', labelAr: 'API ID', required: true },
      { key: 'apiToken', labelFr: 'API Token', labelAr: 'توكن API', secret: true, required: true },
      {
        key: 'baseUrl',
        labelFr: 'Base URL',
        labelAr: 'رابط API',
        placeholder: 'https://api.yalidine.app/v1',
      },
    ],
    sampleParcels: [
      {
        tracking: 'YL-DZ-100234',
        toFr: 'Client Alger Centre',
        toAr: 'زبون الجزائر وسط',
        wilaya: 'Alger',
        statusFr: 'En transit',
        statusAr: 'في الطريق',
        feeDa: 600,
      },
      {
        tracking: 'YL-DZ-100891',
        toFr: 'Client Oran',
        toAr: 'زبون وهران',
        wilaya: 'Oran',
        statusFr: 'Livré',
        statusAr: 'تم التسليم',
        feeDa: 700,
      },
    ],
  },
  {
    id: 'maystro',
    name: 'Maystro Delivery',
    icon: '🚛',
    regionFr: 'Algérie',
    regionAr: 'الجزائر',
    docsUrl: 'https://maystro-delivery.com',
    apiHintFr:
      'API Maystro : commandes e-com, stop-desk, cash on delivery. Clé API marchand.',
    apiHintAr:
      'واجهة Maystro: طلبات تجارة إلكترونية، نقاط استلام، الدفع عند الاستلام.',
    pricing: 'freemium',
    fields: [
      { key: 'apiKey', labelFr: 'API Key', labelAr: 'مفتاح API', secret: true, required: true },
      { key: 'storeId', labelFr: 'Store ID', labelAr: 'معرّف المتجر', required: true },
      {
        key: 'baseUrl',
        labelFr: 'Base URL',
        labelAr: 'رابط API',
        placeholder: 'https://backend.maystro-delivery.com/api',
      },
    ],
    sampleParcels: [
      {
        tracking: 'MS-778812',
        toFr: 'Stop-desk Blida',
        toAr: 'نقطة استلام البليدة',
        wilaya: 'Blida',
        statusFr: 'Au stop-desk',
        statusAr: 'في نقطة الاستلام',
        feeDa: 550,
      },
    ],
  },
  {
    id: 'zr-express',
    name: 'ZR Express',
    icon: '📦',
    regionFr: 'Algérie',
    regionAr: 'الجزائر',
    docsUrl: 'https://zrexpress.dz',
    apiHintFr: 'API ZR Express : envoi colis, suivi, tarifs wilayas.',
    apiHintAr: 'واجهة ZR Express: إرسال طرود وتتبع وأسعار الولايات.',
    pricing: 'freemium',
    fields: [
      { key: 'token', labelFr: 'Token', labelAr: 'توكن', secret: true, required: true },
      { key: 'key', labelFr: 'Key', labelAr: 'مفتاح', secret: true, required: true },
    ],
    sampleParcels: [
      {
        tracking: 'ZR-552100',
        toFr: 'Client Constantine',
        toAr: 'زبون قسنطينة',
        wilaya: 'Constantine',
        statusFr: 'En cours de livraison',
        statusAr: 'قيد التسليم',
        feeDa: 650,
      },
    ],
  },
  {
    id: 'noest',
    name: 'Noest',
    icon: '🚚',
    regionFr: 'Algérie',
    regionAr: 'الجزائر',
    docsUrl: 'https://noest-dz.com',
    apiHintFr: 'API Noest Delivery — création d’ordres et tracking.',
    apiHintAr: 'واجهة Noest — إنشاء أوامر وتتبع.',
    pricing: 'freemium',
    fields: [
      { key: 'apiToken', labelFr: 'API Token', labelAr: 'توكن API', secret: true, required: true },
      { key: 'userGuid', labelFr: 'User GUID', labelAr: 'معرّف المستخدم', required: true },
    ],
    sampleParcels: [
      {
        tracking: 'NO-44102',
        toFr: 'Client Sétif',
        toAr: 'زبون سطيف',
        wilaya: 'Sétif',
        statusFr: 'Préparé',
        statusAr: 'جاهز',
        feeDa: 580,
      },
    ],
  },
  {
    id: 'guepex',
    name: 'Guepex',
    icon: '🏃',
    regionFr: 'Algérie',
    regionAr: 'الجزائر',
    docsUrl: 'https://guepex.com',
    apiHintFr: 'API Guepex : colis, COD, retours.',
    apiHintAr: 'واجهة Guepex: طرود، دفع عند الاستلام، مرتجعات.',
    pricing: 'freemium',
    fields: [
      { key: 'apiToken', labelFr: 'API Token', labelAr: 'توكن API', secret: true, required: true },
      { key: 'apiId', labelFr: 'API ID', labelAr: 'API ID', required: true },
    ],
    sampleParcels: [
      {
        tracking: 'GX-99011',
        toFr: 'Client Tizi Ouzou',
        toAr: 'زبون تيزي وزو',
        wilaya: 'Tizi Ouzou',
        statusFr: 'Enlevé',
        statusAr: 'تم الاستلام من المرسل',
        feeDa: 620,
      },
    ],
  },
  {
    id: 'ecotrack',
    name: 'Ecotrack',
    icon: '🌿',
    regionFr: 'Algérie',
    regionAr: 'الجزائر',
    docsUrl: 'https://ecotrack.dz',
    apiHintFr: 'API Ecotrack — logistics e-com DZ.',
    apiHintAr: 'واجهة Ecotrack — لوجستيك تجارة إلكترونية.',
    pricing: 'freemium',
    fields: [
      { key: 'apiKey', labelFr: 'API Key', labelAr: 'مفتاح API', secret: true, required: true },
      { key: 'merchantId', labelFr: 'Merchant ID', labelAr: 'معرّف التاجر', required: true },
    ],
    sampleParcels: [
      {
        tracking: 'ET-33001',
        toFr: 'Client Annaba',
        toAr: 'زبون عنابة',
        wilaya: 'Annaba',
        statusFr: 'En agence',
        statusAr: 'في الوكالة',
        feeDa: 640,
      },
    ],
  },
  {
    id: 'procolis',
    name: 'Procolis / Anderson',
    icon: '📭',
    regionFr: 'Algérie',
    regionAr: 'الجزائر',
    docsUrl: 'https://procolis.com',
    apiHintFr: 'API Procolis (Anderson) — envois et suivi.',
    apiHintAr: 'واجهة Procolis — إرسال وتتبع.',
    pricing: 'freemium',
    fields: [
      { key: 'apiKey', labelFr: 'API Key', labelAr: 'مفتاح API', secret: true, required: true },
      { key: 'apiUser', labelFr: 'API User', labelAr: 'مستخدم API', required: true },
    ],
    sampleParcels: [
      {
        tracking: 'PC-22044',
        toFr: 'Client Batna',
        toAr: 'زبون باتنة',
        wilaya: 'Batna',
        statusFr: 'Expédié',
        statusAr: 'أُرسل',
        feeDa: 610,
      },
    ],
  },
  {
    id: 'turbo',
    name: 'Turbo Delivery',
    icon: '⚡',
    regionFr: 'Algérie',
    regionAr: 'الجزائر',
    docsUrl: 'https://turbo-delivery.com',
    apiHintFr: 'API Turbo — livraison express / e-com.',
    apiHintAr: 'واجهة Turbo — توصيل سريع / تجارة إلكترونية.',
    pricing: 'freemium',
    fields: [
      { key: 'token', labelFr: 'Token', labelAr: 'توكن', secret: true, required: true },
    ],
    sampleParcels: [
      {
        tracking: 'TB-1001',
        toFr: 'Client Boumerdès',
        toAr: 'زبون بومرداس',
        wilaya: 'Boumerdès',
        statusFr: 'Assigné livreur',
        statusAr: 'معيَّن لسائق',
        feeDa: 500,
      },
    ],
  },
  {
    id: 'dhl',
    name: 'DHL Express',
    icon: '✈️',
    regionFr: 'International',
    regionAr: 'دولي',
    docsUrl: 'https://developer.dhl.com',
    apiHintFr: 'DHL Express API — shipping international (compte développeur).',
    apiHintAr: 'واجهة DHL Express — شحن دولي.',
    pricing: 'paid',
    fields: [
      { key: 'apiKey', labelFr: 'API Key', labelAr: 'مفتاح API', secret: true, required: true },
      { key: 'apiSecret', labelFr: 'API Secret', labelAr: 'سر API', secret: true, required: true },
      { key: 'accountNumber', labelFr: 'Account number', labelAr: 'رقم الحساب', required: true },
    ],
    sampleParcels: [
      {
        tracking: 'JD014600003456789012',
        toFr: 'Export France',
        toAr: 'تصدير فرنسا',
        wilaya: 'International',
        statusFr: 'Clearance',
        statusAr: 'تخليص جمركي',
        feeDa: 8500,
      },
    ],
  },
  {
    id: 'custom-carrier',
    name: 'API personnalisée',
    icon: '🔌',
    regionFr: 'Toute société',
    regionAr: 'أي شركة',
    docsUrl: '',
    apiHintFr:
      'Branchez n’importe quelle société via URL + token (proxy serveur recommandé pour CORS).',
    apiHintAr:
      'اربط أي شركة عبر رابط + توكن (يُفضَّل وكيل سيرفر لـ CORS).',
    pricing: 'free_api',
    fields: [
      { key: 'name', labelFr: 'Nom société', labelAr: 'اسم الشركة', required: true },
      {
        key: 'baseUrl',
        labelFr: 'Base URL API',
        labelAr: 'رابط API',
        placeholder: 'https://api.exemple.dz/v1',
        required: true,
      },
      {
        key: 'apiKey',
        labelFr: 'API Key / Bearer',
        labelAr: 'مفتاح / Bearer',
        secret: true,
        required: true,
      },
      {
        key: 'createPath',
        labelFr: 'Endpoint créer colis',
        labelAr: 'مسار إنشاء طرد',
        placeholder: '/parcels',
      },
      {
        key: 'trackPath',
        labelFr: 'Endpoint tracking',
        labelAr: 'مسار التتبع',
        placeholder: '/parcels/{id}',
      },
    ],
    sampleParcels: [
      {
        tracking: 'CUSTOM-001',
        toFr: 'Colis test',
        toAr: 'طرد تجريبي',
        wilaya: 'Alger',
        statusFr: 'Brouillon API',
        statusAr: 'مسودة API',
        feeDa: 0,
      },
    ],
  },
]

export type CarrierConnection = {
  carrierId: string
  enabled: boolean
  credentials: Record<string, string>
  status: 'disconnected' | 'configured' | 'ok' | 'error'
  lastSyncAt?: string
  lastError?: string
  updatedAt: string
}

export type ImportedParcel = {
  id: string
  carrierId: string
  tracking: string
  to: string
  wilaya: string
  status: string
  feeDa: number
  importedAt: string
  source: 'sample' | 'api'
}

const CONN_KEY = 'az-delivery-carrier-conn-v1'
const PARCEL_KEY = 'az-delivery-parcels-v1'

export function carrierById(id: string): DeliveryCarrier | undefined {
  return DELIVERY_CARRIERS.find((c) => c.id === id)
}

export function loadCarrierConnections(): CarrierConnection[] {
  try {
    const raw = localStorage.getItem(CONN_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as CarrierConnection[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveCarrierConnections(list: CarrierConnection[]): void {
  localStorage.setItem(CONN_KEY, JSON.stringify(list.slice(0, 40)))
}

export function getCarrierConnection(carrierId: string): CarrierConnection | undefined {
  return loadCarrierConnections().find((c) => c.carrierId === carrierId)
}

export function upsertCarrierConnection(
  partial: Omit<CarrierConnection, 'updatedAt'> & { updatedAt?: string },
): CarrierConnection {
  const next: CarrierConnection = {
    ...partial,
    updatedAt: new Date().toISOString(),
  }
  const list = loadCarrierConnections().filter((c) => c.carrierId !== next.carrierId)
  list.unshift(next)
  saveCarrierConnections(list)
  return next
}

export function disconnectCarrier(carrierId: string): void {
  saveCarrierConnections(loadCarrierConnections().filter((c) => c.carrierId !== carrierId))
}

export function loadImportedParcels(): ImportedParcel[] {
  try {
    const raw = localStorage.getItem(PARCEL_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as ImportedParcel[]
    return Array.isArray(list) ? list.slice(0, 500) : []
  } catch {
    return []
  }
}

export function saveImportedParcels(list: ImportedParcel[]): void {
  localStorage.setItem(PARCEL_KEY, JSON.stringify(list.slice(0, 500)))
}

export function carrierName(c: DeliveryCarrier, _lang: Language): string {
  return c.name
}

export function carrierRegion(c: DeliveryCarrier, lang: Language): string {
  return lang === 'ar' ? c.regionAr : c.regionFr
}

export function carrierHint(c: DeliveryCarrier, lang: Language): string {
  return lang === 'ar' ? c.apiHintAr : c.apiHintFr
}

export function fieldLabel(
  f: DeliveryCarrierField,
  lang: Language,
): string {
  return lang === 'ar' ? f.labelAr : f.labelFr
}

export function pricingCarrierLabel(
  p: DeliveryCarrier['pricing'],
  lang: Language,
): string {
  if (lang === 'ar') {
    if (p === 'free_api') return 'API حرة'
    if (p === 'freemium') return 'حسب الاستعمال'
    return 'مدفوع'
  }
  if (p === 'free_api') return 'API libre'
  if (p === 'freemium') return 'À l’usage'
  return 'Payant'
}

/** Test de connexion — valide les champs ; appel live si proxy dispo */
export async function testCarrierConnection(
  carrierId: string,
  creds: Record<string, string>,
  lang: Language,
): Promise<{ ok: boolean; message: string }> {
  const carrier = carrierById(carrierId)
  if (!carrier) {
    return {
      ok: false,
      message: lang === 'ar' ? 'شركة غير معروفة' : 'Transporteur inconnu',
    }
  }
  const missing = carrier.fields.filter((f) => f.required && !String(creds[f.key] || '').trim())
  if (missing.length) {
    const names = missing.map((f) => fieldLabel(f, lang)).join(', ')
    upsertCarrierConnection({
      carrierId,
      enabled: false,
      credentials: creds,
      status: 'error',
      lastError: names,
    })
    return {
      ok: false,
      message:
        lang === 'ar'
          ? `حقول ناقصة: ${names}`
          : `Champs manquants : ${names}`,
    }
  }

  // Tentative proxy optionnelle
  try {
    const res = await fetch('/api/delivery-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ping',
        carrierId,
        credentials: creds,
      }),
    })
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; message?: string }
      if (data.ok) {
        upsertCarrierConnection({
          carrierId,
          enabled: true,
          credentials: creds,
          status: 'ok',
          lastSyncAt: new Date().toISOString(),
        })
        return {
          ok: true,
          message:
            data.message ||
            (lang === 'ar' ? 'تم الربط عبر البروكسي' : 'Connecté via le proxy'),
        }
      }
    }
  } catch {
    /* pas de proxy — mode local */
  }

  upsertCarrierConnection({
    carrierId,
    enabled: true,
    credentials: creds,
    status: 'ok',
    lastSyncAt: new Date().toISOString(),
  })
  return {
    ok: true,
    message:
      lang === 'ar'
        ? `✅ ${carrier.name} مُعدّ محلياً. المزامنة الحية تحتاج وكيلاً على السيرفر إن مُنع CORS.`
        : `✅ ${carrier.name} configuré localement. Sync live : proxy serveur si CORS bloque.`,
  }
}

export function syncSampleParcels(
  carrierId: string,
  lang: Language,
): { ok: boolean; message: string; count: number } {
  const carrier = carrierById(carrierId)
  if (!carrier) {
    return {
      ok: false,
      message: lang === 'ar' ? 'شركة غير معروفة' : 'Transporteur inconnu',
      count: 0,
    }
  }
  const conn = getCarrierConnection(carrierId)
  if (!conn || conn.status === 'disconnected' || conn.status === 'error') {
    return {
      ok: false,
      message:
        lang === 'ar'
          ? 'اربط الـ API أولاً (اختبار الاتصال)'
          : 'Connecte l’API d’abord (tester la connexion)',
      count: 0,
    }
  }
  const now = new Date().toISOString()
  const imported: ImportedParcel[] = carrier.sampleParcels.map((p, i) => ({
    id: `par_${carrierId}_${i}_${Date.now().toString(36)}`,
    carrierId,
    tracking: p.tracking,
    to: lang === 'ar' ? p.toAr : p.toFr,
    wilaya: p.wilaya,
    status: lang === 'ar' ? p.statusAr : p.statusFr,
    feeDa: p.feeDa,
    importedAt: now,
    source: 'sample',
  }))
  const others = loadImportedParcels().filter((p) => p.carrierId !== carrierId)
  saveImportedParcels([...imported, ...others])
  upsertCarrierConnection({
    ...conn,
    lastSyncAt: now,
    status: 'ok',
  })
  return {
    ok: true,
    message:
      lang === 'ar'
        ? `تم استيراد ${imported.length} طرد(اً) نموذجي(اً) من ${carrier.name}`
        : `${imported.length} colis démo importés depuis ${carrier.name}`,
    count: imported.length,
  }
}
