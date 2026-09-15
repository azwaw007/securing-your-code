/**
 * Proxy Meta Graph API — Facebook Page + Instagram feed.
 * Sécurité :
 * - Préfère META_PAGE_TOKEN côté serveur
 * - Token client seulement si META_ALLOW_CLIENT_TOKEN=1
 * - Rate-limit simple par IP
 * - imageUrl https uniquement, message borné
 */

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

const hits = new Map()
function rateLimit(ip, max = 20, windowMs = 60_000) {
  const now = Date.now()
  const row = hits.get(ip) || { n: 0, t: now }
  if (now - row.t > windowMs) {
    row.n = 0
    row.t = now
  }
  row.n += 1
  hits.set(ip, row)
  return row.n <= max
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf) return xf.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function isHttpsUrl(u) {
  try {
    const url = new URL(u)
    return url.protocol === 'https:'
  } catch {
    return false
  }
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

  if (!rateLimit(clientIp(req))) {
    return res.status(429).json({ ok: false, error: 'Trop de requêtes — réessaie plus tard' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const channel = body.channel === 'instagram' ? 'instagram' : 'facebook'
    const message = String(body.message || '').trim().slice(0, 2000)
    const imageUrl = String(body.imageUrl || '').trim()
    const pageId = String(body.pageId || process.env.META_PAGE_ID || '').trim()
    const igUserId = String(body.igUserId || process.env.META_IG_USER_ID || '').trim()

    const envToken = String(process.env.META_PAGE_TOKEN || '').trim()
    const allowClient = process.env.META_ALLOW_CLIENT_TOKEN === '1'
    const bodyToken = String(body.accessToken || '').trim()
    const accessToken = envToken || (allowClient ? bodyToken : '')

    if (!message) return res.status(400).json({ ok: false, error: 'message requis' })
    if (!accessToken) {
      return res.status(400).json({
        ok: false,
        error: envToken
          ? 'Token invalide'
          : 'Configure META_PAGE_TOKEN sur Vercel (ou META_ALLOW_CLIENT_TOKEN=1 en test)',
      })
    }
    if (imageUrl && !isHttpsUrl(imageUrl)) {
      return res.status(400).json({ ok: false, error: 'imageUrl doit être https://' })
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

    if (!igUserId) {
      return res.status(400).json({
        ok: false,
        error: 'igUserId requis pour Instagram',
      })
    }
    if (!imageUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Instagram feed exige imageUrl https publique',
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
      note: 'Feed Instagram uniquement. Stories = copie manuelle.',
    })
  } catch (e) {
    const raw = String(e.message || 'Erreur Meta')
    const safe = raw.replace(/access_token=[^&\s]+/gi, 'access_token=***')
    return res.status(400).json({
      ok: false,
      error: safe,
      code: e.code,
    })
  }
}
