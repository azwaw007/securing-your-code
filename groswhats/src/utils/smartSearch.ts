import type { AppState, Language, Screen } from '../types'
import { formatDa } from './format'

export type SearchHitKind = 'screen' | 'product' | 'client' | 'invoice' | 'keyword'

export interface SearchHit {
  id: string
  kind: SearchHitKind
  label: string
  hint?: string
  screen?: Screen
  productId?: string
  clientId?: string
  orderId?: string
  score: number
}

const SCREEN_KEYWORDS: Array<{
  screen: Screen
  fr: string[]
  ar: string[]
}> = [
  { screen: 'order', fr: ['vendre', 'vente', 'commande', 'caisse', 'facturer', 'encaisser', 'prestation'], ar: ['بيع', 'طلب', 'فوترة', 'تحصيل'] },
  { screen: 'products', fr: ['stock', 'produit', 'catalogue'], ar: ['مخزون', 'منتج'] },
  { screen: 'clients', fr: ['client', 'magasin', 'zaboun'], ar: ['زبون', 'زبائن'] },
  { screen: 'history', fr: ['historique', 'facture', 'vente', 'anciennes', 'actes', 'prestations'], ar: ['سجل', 'فاتورة'] },
  { screen: 'profits', fr: ['gain', 'benefice', 'profit', 'argent'], ar: ['ربح', 'أرباح'] },
  { screen: 'expenses', fr: ['depense', 'gasoil', 'frais'], ar: ['مصاريف'] },
  { screen: 'gallery', fr: ['photo', 'galerie', 'image'], ar: ['صور', 'معرض'] },
  { screen: 'delivery', fr: ['carte', 'gps', 'livraison'], ar: ['خريطة', 'توصيل'] },
  { screen: 'missions', fr: ['livreur', 'tournee', 'mission'], ar: ['سائق', 'جولة'] },
  { screen: 'agent', fr: ['aide', 'agent', '3aweni'], ar: ['مساعدة', 'وكيل'] },
  { screen: 'zakat', fr: ['zakat'], ar: ['زكاة'] },
  { screen: 'settings', fr: ['reglage', 'parametre'], ar: ['إعدادات'] },
  { screen: 'calculator', fr: ['calculatrice', 'calcul'], ar: ['حاسبة'] },
  { screen: 'arrivages', fr: ['arrivage', 'nouveau'], ar: ['وصول'] },
  { screen: 'inbox', fr: ['message', 'inbox', 'recu'], ar: ['وارد'] },
  { screen: 'caisse', fr: ['caisse', 'cloture', 'fond', 'tiroir'], ar: ['صندوق', 'درج'] },
  { screen: 'returns', fr: ['retour', 'avoir', 'remboursement'], ar: ['مرتجع', 'ارجاع'] },
  {
    screen: 'purchases',
    fr: ['achat', 'fournisseur', 'approvisionnement'],
    ar: ['شراء', 'مورد'],
  },
]

function soft(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function scoreMatch(hay: string, needle: string): number {
  const h = soft(hay)
  const n = soft(needle)
  if (!n) return 0
  if (h === n) return 100
  if (h.startsWith(n)) return 80
  if (h.includes(n)) return 50
  // tokens
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length > 1 && parts.every((p) => h.includes(p))) return 40
  return 0
}

/** Suggestions globales (accueil) à partir des données de l’app */
export function searchApp(
  state: AppState,
  query: string,
  lang: Language,
  limit = 12,
): SearchHit[] {
  const q = query.trim()
  if (q.length < 1) return []
  const hits: SearchHit[] = []

  for (const sk of SCREEN_KEYWORDS) {
    const words = lang === 'ar' ? sk.ar : sk.fr
    let best = 0
    for (const w of words) best = Math.max(best, scoreMatch(w, q), scoreMatch(q, w))
    if (best > 0) {
      hits.push({
        id: `screen_${sk.screen}`,
        kind: 'screen',
        label: words[0] ?? sk.screen,
        hint: sk.screen,
        screen: sk.screen,
        score: best + 5,
      })
    }
  }

  for (const p of state.products) {
    const s = Math.max(
      scoreMatch(p.name, q),
      scoreMatch(p.barcode || '', q),
      scoreMatch(String(p.priceDa), q),
      scoreMatch(String(p.stock), q),
    )
    if (s > 0) {
      hits.push({
        id: `p_${p.id}`,
        kind: 'product',
        label: p.name,
        hint: `${formatDa(p.priceDa)} · stock ${p.stock}`,
        screen: 'products',
        productId: p.id,
        score: s,
      })
    }
  }

  for (const c of state.clients) {
    const s = Math.max(
      scoreMatch(c.name, q),
      scoreMatch(c.phone, q),
      scoreMatch(c.city || '', q),
      scoreMatch(c.address || '', q),
    )
    if (s > 0) {
      hits.push({
        id: `c_${c.id}`,
        kind: 'client',
        label: c.name,
        hint: c.phone || c.city || undefined,
        screen: 'clients',
        clientId: c.id,
        score: s,
      })
    }
  }

  for (const o of state.orders.slice(0, 200)) {
    const inv = o.invoiceNumber || ''
    const s = Math.max(
      scoreMatch(o.clientName, q),
      scoreMatch(o.clientPhone || '', q),
      scoreMatch(inv, q),
      scoreMatch(formatDa(o.totalDa), q),
    )
    if (s > 0) {
      hits.push({
        id: `o_${o.id}`,
        kind: 'invoice',
        label: inv ? `N°${inv} · ${o.clientName}` : o.clientName,
        hint: formatDa(o.totalDa),
        screen: 'history',
        orderId: o.id,
        score: s,
      })
    }
  }

  hits.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
  // dedupe by id
  const seen = new Set<string>()
  const out: SearchHit[] = []
  for (const h of hits) {
    if (seen.has(h.id)) continue
    seen.add(h.id)
    out.push(h)
    if (out.length >= limit) break
  }
  return out
}

export function suggestNames(names: string[], query: string, limit = 8): string[] {
  const q = query.trim()
  if (!q) return names.slice(0, limit)
  return names
    .map((n) => ({ n, s: scoreMatch(n, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.n)
}
