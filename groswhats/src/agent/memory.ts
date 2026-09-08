/** Mémoire locale de l’agent — auto-apprentissage (localStorage). */

const STORAGE_KEY = 'grossiste-dz-agent-memory-v1'
const MAX_INTENTS = 200
const MAX_ALIASES = 150

export type AgentIntentId =
  | 'help'
  | 'nav_order'
  | 'nav_clients'
  | 'nav_products'
  | 'nav_arrivages'
  | 'nav_inbox'
  | 'nav_settings'
  | 'nav_expenses'
  | 'nav_calculator'
  | 'nav_zakat'
  | 'nav_stock'
  | 'nav_home'
  | 'stock_bas'
  | 'valeur_stock'
  | 'credits'
  | 'commandes_jour'
  | 'inbox_pending'
  | 'zakat'
  | 'add_client'
  | 'commande_recue'
  | 'facture'
  | 'depenses'
  | 'benefice'

export interface LearnedIntent {
  phrase: string
  intent: AgentIntentId
  count: number
  lastUsedAt: string
}

export interface LearnedAlias {
  from: string
  to: string
  count: number
}

export interface AgentMemory {
  intents: LearnedIntent[]
  aliases: LearnedAlias[]
}

function emptyMemory(): AgentMemory {
  return { intents: [], aliases: [] }
}

export function loadAgentMemory(): AgentMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyMemory()
    const data = JSON.parse(raw) as Partial<AgentMemory>
    return {
      intents: Array.isArray(data.intents) ? data.intents : [],
      aliases: Array.isArray(data.aliases) ? data.aliases : [],
    }
  } catch {
    return emptyMemory()
  }
}

export function saveAgentMemory(mem: AgentMemory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mem))
  } catch {
    // quota — ignore
  }
}

function softNorm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Renforce ou crée une association phrase → intention */
export function learnIntent(phrase: string, intent: AgentIntentId): AgentMemory {
  const key = softNorm(phrase)
  if (!key || key.length < 2) return loadAgentMemory()
  const mem = loadAgentMemory()
  const existing = mem.intents.find((i) => i.phrase === key && i.intent === intent)
  if (existing) {
    existing.count += 1
    existing.lastUsedAt = new Date().toISOString()
  } else {
    mem.intents.unshift({
      phrase: key,
      intent,
      count: 1,
      lastUsedAt: new Date().toISOString(),
    })
  }
  mem.intents.sort((a, b) => b.count - a.count)
  if (mem.intents.length > MAX_INTENTS) mem.intents.length = MAX_INTENTS
  saveAgentMemory(mem)
  return mem
}

/** Apprend qu’un mot/expression = autre mot (ex: khlass → stock bas) */
export function learnAlias(from: string, to: string): AgentMemory {
  const f = softNorm(from)
  const t = softNorm(to)
  if (!f || !t || f === t || f.length < 2) return loadAgentMemory()
  const mem = loadAgentMemory()
  const existing = mem.aliases.find((a) => a.from === f)
  if (existing) {
    existing.to = t
    existing.count += 1
  } else {
    mem.aliases.unshift({ from: f, to: t, count: 1 })
  }
  if (mem.aliases.length > MAX_ALIASES) mem.aliases.length = MAX_ALIASES
  saveAgentMemory(mem)
  return mem
}

/** Applique les alias appris sur le texte déjà normalisé */
export function applyLearnedAliases(text: string): string {
  const mem = loadAgentMemory()
  let s = text
  const sorted = [...mem.aliases].sort((a, b) => b.from.length - a.from.length)
  for (const a of sorted) {
    if (a.from.length < 2) continue
    const re = new RegExp(`\\b${escapeReg(a.from)}\\b`, 'gi')
    s = s.replace(re, a.to)
  }
  return s
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Cherche une intention apprise pour cette phrase */
export function matchLearnedIntent(text: string): AgentIntentId | null {
  const key = softNorm(text)
  if (!key) return null
  const mem = loadAgentMemory()
  // exact
  const exact = mem.intents.find((i) => i.phrase === key)
  if (exact) return exact.intent
  // contains (phrase apprise dans le message, ou inverse)
  const scored = mem.intents
    .filter((i) => i.phrase.length >= 3 && (key.includes(i.phrase) || i.phrase.includes(key)))
    .sort((a, b) => b.count - a.count || b.phrase.length - a.phrase.length)
  return scored[0]?.intent ?? null
}

export function memoryStats(): { intents: number; aliases: number } {
  const mem = loadAgentMemory()
  return { intents: mem.intents.length, aliases: mem.aliases.length }
}

export function clearAgentMemory(): void {
  saveAgentMemory(emptyMemory())
}

export const TEACHABLE_INTENTS: Array<{ id: AgentIntentId; fr: string; ar: string }> = [
  { id: 'stock_bas', fr: 'Stock bas', ar: 'مخزون ناقص' },
  { id: 'valeur_stock', fr: 'Valeur stock', ar: 'قيمة المخزون' },
  { id: 'credits', fr: 'Crédits / dettes', ar: 'الديون' },
  { id: 'nav_order', fr: 'Commande', ar: 'طلب' },
  { id: 'nav_clients', fr: 'Clients', ar: 'زبائن' },
  { id: 'nav_products', fr: 'Produits', ar: 'منتجات' },
  { id: 'nav_expenses', fr: 'Dépenses', ar: 'مصاريف' },
  { id: 'nav_calculator', fr: 'Calculatrice', ar: 'حاسبة' },
  { id: 'zakat', fr: 'Zakat', ar: 'زكاة' },
  { id: 'facture', fr: 'Facture', ar: 'فاتورة' },
  { id: 'nav_arrivages', fr: 'Arrivages', ar: 'وصول' },
  { id: 'nav_inbox', fr: 'Inbox', ar: 'وارد' },
  { id: 'depenses', fr: 'Voir dépenses', ar: 'عرض المصاريف' },
  { id: 'benefice', fr: 'Bénéfice', ar: 'الربح' },
  { id: 'commandes_jour', fr: 'Commandes du jour', ar: 'طلبات اليوم' },
]
