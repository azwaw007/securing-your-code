/** Photos / dessins — uniquement si le nom correspond vraiment au dessin. */

import { seedByName } from '../data/catalogs'
import type { ProductCategory } from '../types'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

type RuleKind = 'food' | 'dental' | 'retail' | 'auto' | 'tools'

type Rule = {
  file: string
  kind: RuleKind
  ok: (n: string) => boolean
}

/** Premier match gagne — scoped par catégorie pour éviter dentiste ↔ superette. */
const RULES: Rule[] = [
  { file: 'banana.png', kind: 'food', ok: (n) => /\bbanane/.test(n) },
  {
    file: 'sugar.png',
    kind: 'food',
    ok: (n) => /\bsucre\b/.test(n) && !/bonbon|gateau|complement/.test(n),
  },
  { file: 'eggs.png', kind: 'food', ok: (n) => /\boeufs?\b/.test(n) },
  {
    file: 'bread.png',
    kind: 'food',
    ok: (n) => /\b(pain|baguette|croissant|khobz|mhadjeb)\b/.test(n),
  },
  {
    file: 'oil.png',
    kind: 'food',
    ok: (n) =>
      /\bhuile\b/.test(n) &&
      !/(5w|moteur|vidange|filtre a huile|olive moteur)/.test(n),
  },
  {
    file: 'coffee.png',
    kind: 'food',
    ok: (n) =>
      (/\bcafe\b/.test(n) || /\bthe\b/.test(n)) &&
      !/glace|energetique|chicha/.test(n),
  },
  {
    file: 'rice.png',
    kind: 'food',
    ok: (n) =>
      /\b(riz|pates|spaghetti|semoule|farine|couscous|lentille|pois chiche|haricot blanc)\b/.test(
        n,
      ),
  },
  {
    file: 'milk.png',
    kind: 'food',
    ok: (n) =>
      !/corporel|hydrat/.test(n) &&
      (/\b(yaourt|fromage|beurre|lait sterilise|lait en poudre|lait 1|lait caille)\b/.test(
        n,
      ) ||
        /^lait\b/.test(n)),
  },
  {
    file: 'water.png',
    kind: 'food',
    ok: (n) =>
      /\b(eau minerale|eau 1|eau 0|soda|jus d|jus orange|jus cocktail)\b/.test(n) ||
      /^eau\b/.test(n),
  },
  { file: 'tomato.png', kind: 'food', ok: (n) => /\btomate\b/.test(n) },
  {
    file: 'chicken.png',
    kind: 'food',
    ok: (n) => /\b(poulet|viande|merguez|kefta|ovine|bovine)\b/.test(n),
  },
  {
    file: 'shoes.png',
    kind: 'retail',
    ok: (n) =>
      /\b(basket|sandale|mocassin|escarpin|botte|tong|chaussure)\b/.test(n),
  },
  {
    file: 'tshirt.png',
    kind: 'retail',
    ok: (n) =>
      /\b(t-shirt|chemise|pantalon|robe|hijab|qamis|jogging|pyjama)\b/.test(n),
  },
  {
    file: 'phone.png',
    kind: 'retail',
    ok: (n) => /\b(telephone|smartphone|iphone|samsung|chargeur|ecouteurs)\b/.test(n),
  },
  {
    file: 'shampoo.png',
    kind: 'retail',
    ok: (n) =>
      /\b(shampoing|gel douche|savon|deodorant|creme hydrat|lait corporel)\b/.test(
        n,
      ),
  },
  {
    file: 'lipstick.png',
    kind: 'retail',
    ok: (n) => /\b(rouge a levres|mascara|fond de teint|vernis|parfum)\b/.test(n),
  },
  {
    file: 'detergent.png',
    kind: 'retail',
    ok: (n) =>
      /\b(lessive|javel|vaisselle|detergent|sacs? poubelle|eponge|balai|serpille|papier toilette|essuie-tout)\b/.test(
        n,
      ),
  },
  {
    file: 'hammer.png',
    kind: 'tools',
    ok: (n) =>
      /\b(marteau|tournevis|pince universelle|metre 5|cadenas|serrure|cheville|vis 4x)\b/.test(
        n,
      ),
  },
  {
    file: 'car.png',
    kind: 'auto',
    ok: (n) =>
      (/\b(citadine|berline|4x4|utilitaire|suv|location citadine|location berline)\b/.test(
        n,
      ) ||
        (/^voiture\b/.test(n) && !/telecommande|support/.test(n))) &&
      !/telecommande|support voiture/.test(n),
  },
  {
    file: 'tooth.png',
    kind: 'dental',
    ok: (n) =>
      /\b(detartrage|carie|implant|couronne|blanchiment|dentaire|panoramique|extraction|abces)\b/.test(
        n,
      ) ||
      // dentifrice / brosse : cosmétique / para seulement (pas un acte cabinet)
      /\b(dentifrice|brosse a dents|bain de bouche)\b/.test(n),
  },
]

function ruleAllowedForCategory(kind: RuleKind, category: string): boolean {
  if (kind === 'food') return category === 'alimentaire'
  if (kind === 'dental') {
    // Actes santé (autre) + hygiène bucco (cosmetique/consommable) — jamais sur l’alimentaire
    return (
      category === 'autre' ||
      category === 'cosmetique' ||
      category === 'consommable'
    )
  }
  if (kind === 'retail') {
    return (
      category === 'textile' ||
      category === 'cosmetique' ||
      category === 'consommable' ||
      category === 'quincaillerie' ||
      category === 'autre'
    )
  }
  if (kind === 'auto') return category === 'autre' || category === 'quincaillerie'
  if (kind === 'tools') return category === 'quincaillerie' || category === 'autre'
  return true
}

const EMOJI: Array<[RegExp, string, ProductCategory | 'any']> = [
  [/huile(?! 5w)/i, '🫒', 'alimentaire'],
  [/lait|yaourt|fromage|beurre/i, '🥛', 'alimentaire'],
  [/eau|soda|jus/i, '💧', 'alimentaire'],
  [/sucre/i, '🍬', 'alimentaire'],
  [/riz|pates|semoule|farine|couscous/i, '🍚', 'alimentaire'],
  [/cafe|the/i, '☕', 'alimentaire'],
  [/pain|baguette|croissant/i, '🥖', 'alimentaire'],
  [/poulet|viande|merguez/i, '🍗', 'alimentaire'],
  [/tomate|oignon|carotte|orange|pomme|banane/i, '🍅', 'alimentaire'],
  [/oeuf/i, '🥚', 'alimentaire'],
  [/chaussure|basket|sandale/i, '👟', 'textile'],
  [/t-shirt|chemise|pantalon|robe|hijab/i, '👕', 'textile'],
  [/telephone|smartphone|chargeur/i, '📱', 'autre'],
  [/shampoing|savon|douche/i, '🧴', 'cosmetique'],
  [/parfum|mascara|levres/i, '💄', 'cosmetique'],
  [/lessive|javel|poubelle/i, '🧹', 'consommable'],
  [/marteau|visse|pince/i, '🔨', 'quincaillerie'],
  [/voiture|citadine|berline|pneu/i, '🚗', 'autre'],
  [/dent|detartrage|carie|implant|couronne|blanchiment|extraction/i, '🦷', 'autre'],
]

export function catalogFileFor(
  name: string,
  category: string = 'autre',
): string | null {
  const n = norm(name)
  const hit = RULES.find(
    (r) => r.ok(n) && ruleAllowedForCategory(r.kind, category),
  )
  return hit?.file ?? null
}

/** Image seed : emoji du catalogue métier, pas de photo alimentaire pour un acte. */
export function catalogImagePath(
  name: string,
  category = 'autre',
  emoji?: string,
  catalogId?: string,
): string {
  const file = catalogFileFor(name, category)
  if (file) return `catalog/${file}`
  const em =
    emoji && !emoji.includes(' ')
      ? emoji
      : emojiFor(name, category, catalogId)
  return productArt(name, em, category)
}

export function emojiFor(
  name: string,
  category = 'autre',
  catalogId?: string,
): string {
  const seed = seedByName(name, catalogId)
  if (seed?.emoji && !seed.emoji.includes(' ')) return seed.emoji
  const hit = EMOJI.find(
    ([re, , cat]) => re.test(name) && (cat === 'any' || cat === category),
  )
  if (hit) return hit[1]
  const byCat: Record<string, string> = {
    alimentaire: '🛒',
    cosmetique: '🧴',
    consommable: '📦',
    quincaillerie: '🔧',
    textile: '👕',
    autre: '🏷️',
  }
  return byCat[category] ?? '🏷️'
}

function isUserPhoto(src?: string): boolean {
  if (!src) return false
  if (src.startsWith('blob:') || /^https?:/i.test(src)) return true
  if (src.startsWith('data:image/svg')) return false
  return src.startsWith('data:')
}

/** Image déjà résolue au seed (catalog/… ou SVG métier) — ne pas recalculer. */
function isTrustedStoredArt(src?: string): boolean {
  if (!src) return false
  if (isUserPhoto(src)) return true
  if (src.startsWith('catalog/')) return true
  if (src.startsWith('data:image')) return true
  return false
}

/** Image à l’écran : photo du commerçant, sinon art seed, sinon dessin recalculé. */
export function productDisplaySrc(
  name: string,
  category = 'autre',
  stored?: string,
): string {
  if (isTrustedStoredArt(stored)) return productImageSrc(stored)!
  const file = catalogFileFor(name, category)
  if (file) return productImageSrc(`catalog/${file}`)!
  return productArt(name, emojiFor(name, category), category)
}

export function productImageSrc(src?: string): string | undefined {
  if (!src) return undefined
  if (src.startsWith('data:') || src.startsWith('blob:') || /^https?:/i.test(src)) {
    return src
  }
  // Refuse path traversal / absolute FS paths from backups or tampered state
  const cleaned = src.replace(/\\/g, '/').replace(/^\/+/, '')
  if (
    cleaned.includes('..') ||
    cleaned.startsWith('file:') ||
    /^[a-zA-Z]:/.test(cleaned)
  ) {
    return undefined
  }
  if (!(cleaned.startsWith('catalog/') || cleaned.startsWith('icons/'))) {
    // Only allow known static asset prefixes
    if (!cleaned.match(/^[a-z0-9_./-]+$/i)) return undefined
  }
  const base = import.meta.env.BASE_URL || './'
  return `${base}${cleaned}`
}

const PALETTES: Record<string, [string, string]> = {
  alimentaire: ['#f59e0b', '#b45309'],
  cosmetique: ['#ec4899', '#9d174d'],
  consommable: ['#38bdf8', '#0369a1'],
  quincaillerie: ['#78716c', '#44403c'],
  textile: ['#8b5cf6', '#5b21b6'],
  autre: ['#0f6b4c', '#14532d'],
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Dessin avec le nom du produit — plus de photo « huile » pour un autre article. */
export function productArt(name: string, emoji: string, category = 'autre'): string {
  const [a, b] = PALETTES[category] ?? PALETTES.autre
  const short = name.length > 28 ? `${name.slice(0, 26)}…` : name
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="48" fill="url(#g)"/>
  <text x="256" y="220" text-anchor="middle" font-size="140">${esc(emoji)}</text>
  <text x="256" y="380" text-anchor="middle" font-size="36" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${esc(short)}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
