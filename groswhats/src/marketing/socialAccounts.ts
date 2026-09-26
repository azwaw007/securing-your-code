/**
 * Comptes réseaux sociaux — connexion locale (tokens sur l’appareil)
 * pour publier / piloter pubs depuis AZ Digital.
 */
import {
  defaultMetaConfig,
  loadMetaConfig,
  publishMetaPost,
  saveMetaConfig,
  type MetaConfig,
  type MetaPublishResult,
} from './metaPublish'
import { brandFromCampaignState } from './scheduler'
import { buildPosts } from './campaignPack'

const SOCIAL_KEY = 'az-digital-social-v1'

export type SocialNetworkId =
  | 'meta'
  | 'tiktok'
  | 'google'
  | 'whatsapp'

export type SocialAccount = {
  id: SocialNetworkId
  enabled: boolean
  /** Identifiant public (page, compte ads, numéro…) */
  accountId: string
  /** Token / clé API stocké localement */
  accessToken: string
  /** Extra : IG user id, customer id Google, etc. */
  extraId: string
  /** URL image par défaut pour posts */
  defaultImageUrl: string
  /** Lien Ads Manager / Business */
  adsManagerUrl: string
  updatedAt: string
}

export type SocialStore = Record<SocialNetworkId, SocialAccount>

const ADS_URLS: Record<SocialNetworkId, string> = {
  meta: 'https://www.facebook.com/adsmanager',
  tiktok: 'https://ads.tiktok.com/',
  google: 'https://ads.google.com/',
  whatsapp: 'https://business.whatsapp.com/',
}

function emptyAccount(id: SocialNetworkId): SocialAccount {
  return {
    id,
    enabled: false,
    accountId: '',
    accessToken: '',
    extraId: '',
    defaultImageUrl: '',
    adsManagerUrl: ADS_URLS[id],
    updatedAt: new Date().toISOString(),
  }
}

export function defaultSocialStore(): SocialStore {
  const meta = loadMetaConfig()
  return {
    meta: {
      id: 'meta',
      enabled: meta.enabled,
      accountId: meta.pageId,
      accessToken: meta.accessToken,
      extraId: meta.igUserId,
      defaultImageUrl: meta.defaultImageUrl,
      adsManagerUrl: ADS_URLS.meta,
      updatedAt: new Date().toISOString(),
    },
    tiktok: emptyAccount('tiktok'),
    google: emptyAccount('google'),
    whatsapp: emptyAccount('whatsapp'),
  }
}

export function loadSocialStore(): SocialStore {
  try {
    const raw = localStorage.getItem(SOCIAL_KEY)
    const base = defaultSocialStore()
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<SocialStore>
    return {
      meta: { ...base.meta, ...(parsed.meta || {}) },
      tiktok: { ...base.tiktok, ...(parsed.tiktok || {}) },
      google: { ...base.google, ...(parsed.google || {}) },
      whatsapp: { ...base.whatsapp, ...(parsed.whatsapp || {}) },
    }
  } catch {
    return defaultSocialStore()
  }
}

export function saveSocialAccount(
  id: SocialNetworkId,
  patch: Partial<SocialAccount>,
): SocialStore {
  const store = loadSocialStore()
  const nextAcc: SocialAccount = {
    ...store[id],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  }
  const next = { ...store, [id]: nextAcc }
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(next))

  // Miroir Meta → config existante (API publish)
  if (id === 'meta') {
    saveMetaConfig({
      enabled: nextAcc.enabled,
      pageId: nextAcc.accountId,
      igUserId: nextAcc.extraId,
      accessToken: nextAcc.accessToken,
      defaultImageUrl:
        nextAcc.defaultImageUrl || defaultMetaConfig().defaultImageUrl,
    })
  }
  return next
}

export function socialLabel(id: SocialNetworkId, lang: 'fr' | 'ar'): string {
  const fr: Record<SocialNetworkId, string> = {
    meta: 'Facebook & Instagram',
    tiktok: 'TikTok',
    google: 'Google Ads / YouTube',
    whatsapp: 'WhatsApp Business',
  }
  const ar: Record<SocialNetworkId, string> = {
    meta: 'فيسبوك وإنستغرام',
    tiktok: 'تيك توك',
    google: 'إعلانات جوجل / يوتيوب',
    whatsapp: 'واتساب أعمال',
  }
  return lang === 'ar' ? ar[id] : fr[id]
}

export function socialHint(id: SocialNetworkId, lang: 'fr' | 'ar'): string {
  if (lang === 'ar') {
    const m: Record<SocialNetworkId, string> = {
      meta: 'Page ID + رمز الصفحة + IG User ID — النشر من التطبيق عبر API.',
      tiktok: 'احفظ معرف الحساب ورمز الإعلانات. افتح Ads Manager لإنشاء الحملة.',
      google: 'Customer ID + رمز API. افتح Google Ads لإدارة الحملات.',
      whatsapp: 'رقم واتساب الأعمال للرسائل والحالات.',
    }
    return m[id]
  }
  const m: Record<SocialNetworkId, string> = {
    meta: 'Page ID + token page + IG User ID — publication feed depuis l’app (API).',
    tiktok: 'Account ID + Ads token. Ouvre Ads Manager pour créer la campagne.',
    google: 'Customer ID + token API. Ouvre Google Ads pour piloter les campagnes.',
    whatsapp: 'Numéro WhatsApp Business pour messages et statuts.',
  }
  return m[id]
}

export type PublishChannel = 'facebook' | 'instagram' | 'tiktok' | 'google' | 'whatsapp'

export async function publishFromApp(input: {
  channel: PublishChannel
  message?: string
  lang?: 'fr' | 'ar'
}): Promise<{ ok: boolean; reply: string; openUrl?: string }> {
  const lang = input.lang || 'fr'
  const brand = brandFromCampaignState()
  const posts = buildPosts(brand)
  const message =
    (input.message || '').trim() ||
    (lang === 'ar' ? posts[0]?.bodyAr : posts[0]?.bodyFr) ||
    `${brand.produit} — ${brand.demoUrl}`

  const store = loadSocialStore()

  if (input.channel === 'facebook' || input.channel === 'instagram') {
    if (!store.meta.enabled || !store.meta.accessToken) {
      return {
        ok: false,
        reply:
          lang === 'ar'
            ? 'اربط فيسبوك/إنستغرام أولاً (رمز + Page ID) ثم فعّل الحساب.'
            : 'Connecte d’abord Facebook/Instagram (token + Page ID) puis active le compte.',
      }
    }
    const res: MetaPublishResult = await publishMetaPost({
      channel: input.channel,
      message,
      imageUrl: store.meta.defaultImageUrl || undefined,
    })
    if (!res.ok) {
      return {
        ok: false,
        reply:
          (lang === 'ar' ? '❌ فشل النشر: ' : '❌ Publication échouée : ') +
          (res.error || ''),
      }
    }
    return {
      ok: true,
      reply:
        lang === 'ar'
          ? `✅ تم النشر على ${input.channel}${res.id ? ` (${res.id})` : ''}`
          : `✅ Publié sur ${input.channel}${res.id ? ` (${res.id})` : ''}`,
    }
  }

  if (input.channel === 'tiktok') {
    const acc = store.tiktok
    if (!acc.enabled || !acc.accountId) {
      return {
        ok: false,
        reply:
          lang === 'ar'
            ? 'اربط تيك توك أولاً ثم افتح Ads Manager.'
            : 'Connecte TikTok d’abord puis ouvre Ads Manager.',
      }
    }
    return {
      ok: true,
      reply:
        (lang === 'ar'
          ? `📋 مسودة تيك توك جاهزة (انسخ أو افتح Ads Manager):\n\n${message}`
          : `📋 Brouillon TikTok prêt (copie ou ouvre Ads Manager) :\n\n${message}`),
      openUrl: acc.adsManagerUrl || ADS_URLS.tiktok,
    }
  }

  if (input.channel === 'google') {
    const acc = store.google
    if (!acc.enabled || !acc.accountId) {
      return {
        ok: false,
        reply:
          lang === 'ar'
            ? 'اربط Google Ads أولاً (Customer ID).'
            : 'Connecte Google Ads d’abord (Customer ID).',
      }
    }
    return {
      ok: true,
      reply:
        (lang === 'ar'
          ? `📋 نص إعلان جوجل:\n\n${message}\n\nافتح Google Ads لإنشاء الحملة.`
          : `📋 Texte annonce Google :\n\n${message}\n\nOuvre Google Ads pour créer la campagne.`),
      openUrl: acc.adsManagerUrl || ADS_URLS.google,
    }
  }

  // whatsapp
  const wa = store.whatsapp.accountId || store.whatsapp.extraId
  return {
    ok: true,
    reply:
      lang === 'ar'
        ? `📋 حالة / رسالة واتساب:\n\n${message}`
        : `📋 Statut / message WhatsApp :\n\n${message}`,
    openUrl: wa
      ? `https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      : undefined,
  }
}

/** Sync Meta config → store social (au chargement UI) */
export function syncMetaIntoSocial(): SocialStore {
  const meta: MetaConfig = loadMetaConfig()
  return saveSocialAccount('meta', {
    enabled: meta.enabled,
    accountId: meta.pageId,
    accessToken: meta.accessToken,
    extraId: meta.igUserId,
    defaultImageUrl: meta.defaultImageUrl,
  })
}
