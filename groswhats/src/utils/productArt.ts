/** Photos / dessins originaux — web, Android et PC (chemin relatif = base ./) */

const FILES: Array<[RegExp, string]> = [
  [/huile|olive/i, 'oil.png'],
  [/lait|yaourt|fromage|beurre|cr[eè]me/i, 'milk.png'],
  [/eau|soda|jus|boisson|sirop|narguil[eé]|chicha/i, 'water.png'],
  [/chaussure|basket|sandale|mocassin|botte|tong|running|escarpin/i, 'shoes.png'],
  [/t[eé]l[eé]phone|smartphone|écouteur|chargeur|c[aâ]ble|coque|powerbank|montre connect/i, 'phone.png'],
  [/shampoing|douche|savon|d[eé]odorant|dentifrice|brosse [aà] dents|coton|lingette/i, 'shampoo.png'],
  [/tomate|poivron|carotte|oignon|pomme de terre|courgette|citron|orange|pomme(?! de)|raisin|datte/i, 'tomato.png'],
  [/banane/i, 'banana.png'],
  [/pain|baguette|croissant|khobz|mhadjeb|pizza|sandwich/i, 'bread.png'],
  [/t-shirt|tee-shirt|chemise|pantalon|jean|robe|veste|hijab|qamis|gandoura|pyjama|jogging|casquette|ceinture|ensemble|lingerie|sous-v/i, 'tshirt.png'],
  [/poulet|viande|merguez|kefta|ovine|bovine|foie|escalope|grillade|couscous|chakhchoukha/i, 'chicken.png'],
  [/marteau|visse|cheville|tournevis|pince|m[eè]tre|cadenas|serrure|ampoule|prise|robinet|tuyau|ciment|brique|carrelage/i, 'hammer.png'],
  [/voiture|citadine|berline|4x4|utilitaire|location|showroom|garage|vidange|pneu|batterie/i, 'car.png'],
  [/sucre/i, 'sugar.png'],
  [/lessive|javel|vaisselle|d[eé]tergent|poubelle|[eé]ponge|balai|serpill|papier toilette|essuie/i, 'detergent.png'],
  [/[oœ]ufs?/i, 'eggs.png'],
  [/caf[eé]|th[eé]/i, 'coffee.png'],
  [/riz|p[aâ]tes|semoule|farine|couscous|lentille|pois|haricot/i, 'rice.png'],
  [/rouge [aà] l[eè]vres|mascara|vernis|parfum|cologne|fond de teint|lipstick/i, 'lipstick.png'],
  [/dent|d[eé]tartrage|carie|implant|couronne|blanchiment|panoramique|consultation dent/i, 'tooth.png'],
]

const BY_CATEGORY: Record<string, string> = {
  alimentaire: 'oil.png',
  cosmetique: 'shampoo.png',
  consommable: 'detergent.png',
  quincaillerie: 'hammer.png',
  textile: 'tshirt.png',
  autre: 'phone.png',
}

export function catalogFileFor(name: string, category = 'autre'): string {
  const hit = FILES.find(([re]) => re.test(name))
  return hit?.[1] ?? BY_CATEGORY[category] ?? 'oil.png'
}

/** Chemin stocké (sans / initial) — marche web + Android + Electron */
export function catalogImagePath(name: string, category = 'autre'): string {
  return `catalog/${catalogFileFor(name, category)}`
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

/** Dessin de secours si le PNG n’est pas là */
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
  <circle cx="256" cy="210" r="110" fill="rgba(255,255,255,0.18)"/>
  <text x="256" y="230" text-anchor="middle" font-size="120">${emoji}</text>
  <text x="256" y="400" text-anchor="middle" fill="#fff" font-size="28" font-family="Segoe UI, Arial" font-weight="700">${esc(short)}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
