/**
 * Proxy Meta Graph API — publication Facebook Page + Instagram feed.
 * Secrets : envoyés par le client (token vendeur) ou META_PAGE_TOKEN serveur (optionnel).
 *
 * Body JSON:
 * {
 *   "channel": "facebook" | "instagram",
 *   "message": "texte du post",
 *   "imageUrl": "https://..." (optionnel, recommandé pour IG),
 *   "pageId": "...",
 *   "igUserId": "...",   // requis pour Instagram
 *   "accessToken": "..." // Page access token
 * }
 */

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

async function fbFetch(path, params) {
  const url = new URL(`https://graph.facebook.com/v21.0/${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  })
  const res = await fetch(url, { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    const msg = data?.error?.message || `HTTP ${res.status}`
    const err = new Error(msg)
    err.code = data?.error?.code
    throw err
  }
  return data
}

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'POST only' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const channel = body.channel === 'instagram' ? 'instagram' : 'facebook'
    const message = String(body.message || '').trim()
    const imageUrl = String(body.imageUrl || '').trim()
    const pageId = String(body.pageId || process.env.META_PAGE_ID || '').trim()
    const igUserId = String(body.igUserId || process.env.META_IG_USER_ID || '').trim()
    const accessToken = String(
      body.accessToken || process.env.META_PAGE_TOKEN || '',
    ).trim()

    if (!message) return res.status(400).json({ ok: false, error: 'message requis' })
    if (!accessToken) {
      return res.status(400).json({
        ok: false,
        error: 'accessToken manquant (Page Access Token Meta)',
      })
    }

    if (channel === 'facebook') {
      if (!pageId) {
        return res.status(400).json({ ok: false, error: 'pageId requis pour Facebook' })
      }
      const data = imageUrl
        ? await fbFetch(`${pageId}/photos`, {
            url: imageUrl,
            caption: message,
            access_token: accessToken,
          })
        : await fbFetch(`${pageId}/feed`, {
            message,
            access_token: accessToken,
          })
      return res.status(200).json({
        ok: true,
        channel: 'facebook',
        id: data.id || data.post_id,
      })
    }

    // Instagram — feed only (stories API limitée / permissions spéciales)
    if (!igUserId) {
      return res.status(400).json({
        ok: false,
        error: 'igUserId requis pour Instagram (compte pro lié à la Page)',
      })
    }
    if (!imageUrl) {
      return res.status(400).json({
        ok: false,
        error:
          'Instagram feed exige une imageUrl publique (https). Pour une story sans API : copie le texte dans l’app.',
      })
    }

    const container = await fbFetch(`${igUserId}/media`, {
      image_url: imageUrl,
      caption: message,
      access_token: accessToken,
    })
    const published = await fbFetch(`${igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: accessToken,
    })
    return res.status(200).json({
      ok: true,
      channel: 'instagram',
      id: published.id,
      note: 'Feed Instagram. Les stories organiques restent en copie manuelle (API restreinte).',
    })
  } catch (e) {
    return res.status(400).json({
      ok: false,
      error: e.message || 'Erreur Meta',
      code: e.code,
    })
  }
}
