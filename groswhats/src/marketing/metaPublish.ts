/** Client Meta — config locale + appel /api/meta-publish */

const META_CFG_KEY = 'az-pos-meta-cfg-v1'

export type MetaConfig = {
  enabled: boolean
  pageId: string
  igUserId: string
  /** Page access token — stocké localement sur l’appareil vendeur */
  accessToken: string
  /** Image publique par défaut pour IG (URL https) */
  defaultImageUrl: string
}

export function defaultMetaConfig(): MetaConfig {
  return {
    enabled: false,
    pageId: '',
    igUserId: '',
    accessToken: '',
    defaultImageUrl: '',
  }
}

export function loadMetaConfig(): MetaConfig {
  try {
    const raw = localStorage.getItem(META_CFG_KEY)
    if (!raw) return defaultMetaConfig()
    return { ...defaultMetaConfig(), ...JSON.parse(raw) }
  } catch {
    return defaultMetaConfig()
  }
}

export function saveMetaConfig(patch: Partial<MetaConfig>): MetaConfig {
  const next = { ...loadMetaConfig(), ...patch }
  localStorage.setItem(META_CFG_KEY, JSON.stringify(next))
  return next
}

export type MetaPublishResult = {
  ok: boolean
  channel?: 'facebook' | 'instagram'
  id?: string
  error?: string
  note?: string
}

export async function publishMetaPost(input: {
  channel: 'facebook' | 'instagram'
  message: string
  imageUrl?: string
}): Promise<MetaPublishResult> {
  const cfg = loadMetaConfig()
  if (!cfg.enabled) {
    return { ok: false, error: 'Meta désactivé — configure d’abord (pageId + token).' }
  }
  if (!cfg.accessToken) {
    return { ok: false, error: 'Token Meta manquant' }
  }

  const endpoint = '/api/meta-publish'
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: input.channel,
        message: input.message,
        imageUrl: input.imageUrl || cfg.defaultImageUrl,
        pageId: cfg.pageId,
        igUserId: cfg.igUserId,
        accessToken: cfg.accessToken,
      }),
    })
    const data = (await res.json()) as MetaPublishResult & { error?: string }
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` }
    }
    return data
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Réseau / API indisponible',
    }
  }
}

export function metaSetupHint(lang: 'fr' | 'ar' = 'fr'): string {
  if (lang === 'ar') {
    return [
      '🔗 إعداد Meta (فيسبوك / إنستغرام):',
      '1) حساب Business + صفحة فيسبوك + إنستغرام احترافي مربوط',
      '2) تطبيق على developers.facebook.com',
      '3) Page Access Token + Page ID + IG User ID',
      '4) في الوكيل: meta page PAGE_ID',
      '5) meta token TOKEN',
      '6) meta ig IG_USER_ID',
      '7) meta on ثم publie facebook / publie instagram',
      '⚠️ الستوري: انسخ يدوياً (API مقيدة). الفيد يعمل عبر API.',
    ].join('\n')
  }
  return [
    '🔗 Setup Meta (Facebook / Instagram) :',
    '1) Compte Business + Page Facebook + Instagram pro lié',
    '2) App sur developers.facebook.com',
    '3) Page Access Token + Page ID + IG User ID',
    '4) Dans l’agent : meta page PAGE_ID',
    '5) meta token TOKEN',
    '6) meta ig IG_USER_ID',
    '7) meta on puis publie facebook / publie instagram',
    '⚠️ Stories : copie manuelle (API restreinte). Le feed passe par l’API.',
  ].join('\n')
}
