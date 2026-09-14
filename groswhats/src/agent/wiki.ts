/** Wikipédia — gratuit, sans clé, CORS ouvert. */

type WikiLang = 'fr' | 'ar' | 'en'

function wikiHost(lang: WikiLang): string {
  return `https://${lang}.wikipedia.org`
}

function cleanQuery(raw: string): string {
  return raw
    .replace(
      /^(c['’]?est quoi|cest quoi|qu['’]est-ce que|quest ce que|dis[- ]moi|explique[- ]moi|explique|what is|what's|whats|who is|quien es|qué es|que es|ما هو|ما هي|ما هما|شنو هو|شنو هي|واش هو|واش هي|شرح|عرّف|عرف)\s+/i,
      '',
    )
    .replace(/[?؟!.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchTitle(query: string, lang: WikiLang): Promise<string | null> {
  const url = `${wikiHost(lang)}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&utf8=1&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    query?: { search?: Array<{ title?: string }> }
  }
  return data.query?.search?.[0]?.title ?? null
}

async function pageExtract(title: string, lang: WikiLang): Promise<string | null> {
  const url = `${wikiHost(lang)}/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as { extract?: string; title?: string }
  const extract = data.extract?.trim()
  if (!extract) return null
  const short = extract.length > 700 ? `${extract.slice(0, 680).trim()}…` : extract
  return `${data.title ?? title}\n\n${short}`
}

export async function wikiAnswer(raw: string, prefer: WikiLang): Promise<string | null> {
  const q = cleanQuery(raw)
  if (q.length < 2) return null
  const order: WikiLang[] =
    prefer === 'ar' ? ['ar', 'fr', 'en'] : prefer === 'en' ? ['en', 'fr', 'ar'] : ['fr', 'en', 'ar']
  for (const lang of order) {
    try {
      const title = await searchTitle(q, lang)
      if (!title) continue
      const text = await pageExtract(title, lang)
      if (text) return text
    } catch {
      /* hors ligne ou bloqué */
    }
  }
  return null
}
