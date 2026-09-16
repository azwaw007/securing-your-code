/** Photos / dessins — uniquement si le nom correspond vraiment au dessin. */

import { seedByName } from '../data/catalogs'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

type Rule = { file: string; ok: (n: string) => boolean }

/** Premier match gagne — règles précises, pas de repli « tout alimentaire = huile ». */
const RULES: Rule[] = [
  { file: 'banana.png', ok: (n) => /\bbanane/.test(n) },
  { file: 'sugar.png', ok: (n) => /\bsucre\b/.test(n) && !/bonbon|gateau| complementar/.test(n) },
  { file: 'eggs.png', ok: (n) => /\boeufs?\b/.test(n) },
  {
    file: 'bread.png',
    ok: (n) => /\b(pain|baguette|croissant|khobz|mhadjeb)\b/.test(n),
  },
  {
    file: 'oil.png',
    ok: (n) =>
      /\bhuile\b/.test(n) &&
      !/(5w|moteur|vidange|filtre a huile|olive moteur)/.test(n),
  },
  {
    file: 'coffee.png',
    ok: (n) =>
      (/\bcafe\b/.test(n) || /\bthe\b/.test(n)) &&
      !/glace|energetique|chicha/.test(n),
  },
  {
    file: 'rice.png',
    ok: (n) =>
      /\b(riz|pates|spaghetti|semoule|farine|couscous|lentille|pois chiche|haricot blanc)\b/.test(
        n,
      ),
  },
  {
    file: 'milk.png',
    ok: (n) =>
      !/corporel|hydrat/.test(n) &&
      (/\b(yaourt|fromage|beurre|lait sterilise|lait en poudre|lait 1|lait caille)\b/.test(
        n,
      ) ||
        /^lait\b/.test(n)),
  },
  {
    file: 'water.png',
    ok: (n) =>
      (/\beau minerale\b/.test(n) ||
        /\beau 1/.test(n) ||
        /\beau 0/.test(n) ||
        /\beau 50/.test(n) ||
        /^eau\b/.test(n) ||
        /\b(soda|boisson energetique)\b/.test(n)) &&
      !/javel|cologne|florale|micellaire|de cologne|de javel/.test(n),
  },
  { file: 'tomato.png', ok: (n) => /\btomate\b/.test(n) },
  {
    file: 'chicken.png',
    ok: (n) =>
      /\b(poulet|viande|merguez|kefta|ovine|bovine|escalope|grillade)\b/.test(n),
  },
  {
    file: 'shoes.png',
    ok: (n) =>
      /\b(chaussure|basket|sandale|mocassin|botte|tong|escarpin|running)\b/.test(
        n,
      ),
  },
  {
    file: 'tshirt.png',
    ok: (n) =>
      /\b(t-shirt|tee-shirt|chemise|pantalon|jean|robe|veste|hijab|qamis|gandoura|pyjama|jogging|casquette|ceinture)\b/.test(
        n,
      ) && !/pressing|repassage/.test(n),
  },
  {
    file: 'phone.png',
    ok: (n) =>
      /\b(telephone|smartphone|ecouteur|chargeur|cable usb|coque protection|powerbank|montre connect)\b/.test(
        n,
      ),
  },
  {
    file: 'shampoo.png',
    ok: (n) =>
      /\b(shampoing|gel douche|savon de beaute|deodorant|dentifrice|brosse a dents)\b/.test(
        n,
      ) && !/animal/.test(n),
  },
  {
    file: 'lipstick.png',
    ok: (n) =>
      /\b(rouge a levres|mascara|vernis|parfum|fond de teint|lipstick|eau de cologne)\b/.test(
        n,
      ),
  },
  {
    file: 'detergent.png',
    ok: (n) =>
      /\b(lessive|javel|vaisselle|detergent|sacs? poubelle|eponge|balai|serpille|papier toilette|essuie-tout)\b/.test(
        n,
      ),
  },
  {
    file: 'hammer.png',
    ok: (n) =>
      /\b(marteau|tournevis|pince universelle|metre 5|cadenas|serrure|cheville|vis 4x)\b/.test(
        n,
      ),
  },
  {
    file: 'car.png',
    ok: (n) =>
      (/\b(citadine|berline|4x4|utilitaire|suv|location citadine|location berline)\b/.test(
        n,
      ) ||
        (/^voiture\b/.test(n) && !/telecommande|support/.test(n))) &&
      !/telecommande|support voiture/.test(n),
  },
  {
    file: 'tooth.png',
    ok: (n) =>
      /\b(detartrage|carie|implant|couronne|blanchiment|dentaire|panoramique)\b/.test(
        n,
      ) || /\bdent\b/.test(n),
  },
]

const EMOJI: Array<[RegExp, string]> = [
  [/huile(?! 5w)/i, '🫒'],
  [/lait|yaourt|fromage|beurre/i, '🥛'],
  [/eau|soda|jus/i, '💧'],
  [/sucre/i, '🍬'],
  [/riz|pates|semoule|farine|couscous/i, '🍚'],
  [/cafe|the/i, '☕'],
  [/pain|baguette|croissant/i, '🥖'],
  [/poulet|viande|merguez/i, '🍗'],
  [/tomate|oignon|carotte|orange|pomme|banane/i, '🍅'],
  [/oeuf/i, '🥚'],
  [/chaussure|basket|sandale/i, '👟'],
  [/t-shirt|chemise|pantalon|robe|hijab/i, '👕'],
  [/telephone|smartphone|chargeur/i, '📱'],
  [/shampoing|savon|douche/i, '🧴'],
  [/parfum|mascara|levres/i, '💄'],
  [/lessive|javel|poubelle/i, '🧹'],
  [/marteau|visse|pince/i, '🔨'],
  [/voiture|citadine|berline|pneu/i, '🚗'],
  [/dent|detartrage/i, '🦷'],
  [/poulet|viande/i, '🍗'],
]

export function catalogFileFor(name: string): string | null {
  const n = norm(name)
  const hit = RULES.find((r) => r.ok(n))
  return hit?.file ?? null
}

export function catalogImagePath(name: string, category = 'autre'): string {
  const file = catalogFileFor(name)
  if (file) return `catalog/${file}`
  return productArt(name, emojiFor(name, category), category)
}

export function emojiFor(name: string, category = 'autre'): string {
  const seed = seedByName(name)
  if (seed?.emoji && !seed.emoji.includes(' ')) return seed.emoji
  const n = name
  const hit = EMOJI.find(([re]) => re.test(n))
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

/** Image à l’écran : photo du commerçant, sinon dessin exact, sinon carte avec le nom. */
export function productDisplaySrc(
  name: string,
  category = 'autre',
  stored?: string,
): string {
  if (isUserPhoto(stored)) return productImageSrc(stored)!
  const file = catalogFileFor(name)
  if (file) return productImageSrc(`catalog/${file}`)!
  return productArt(name, emojiFor(name, category), category)
}

export function productImageSrc(src?: string): string | undefined {
  if (!src) return undefined
  if (src.startsWith('data:') || src.startsWith('blob:') || /^https?:/i.test(src)) {
    return src
  }
  const base = import.meta.env.BASE_URL || './'
  return `${base}${src.replace(/^\//, '')}`
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
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="48" fill="url(#g)"/>
  <circle cx="256" cy="200" r="108" fill="rgba(255,255,255,0.2)"/>
  <text x="256" y="222" text-anchor="middle" font-size="112">${emoji}</text>
  <text x="256" y="390" text-anchor="middle" fill="#fff" font-size="26" font-family="Segoe UI, Arial" font-weight="700">${esc(short)}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
