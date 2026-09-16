/**
 * Prospects campagne AZ Soft — import CSV (nom, téléphone, ville, email).
 * Pas de scrape : uniquement listes que tu fournis.
 */

import { SELLER_BRAND, buildSalesPitch } from './campaignPack'

const PROSPECTS_KEY = 'az-pos-prospects-v1'

export interface Prospect {
  id: string
  name: string
  phone: string
  city: string
  email: string
  source: 'csv' | 'paste'
  status: 'new' | 'contacted' | 'replied' | 'skipped'
  createdAt: string
  lastContactAt?: string
  note?: string
}

function uid(): string {
  return `pr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function loadProspects(): Prospect[] {
  try {
    const raw = localStorage.getItem(PROSPECTS_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as Prospect[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveProspects(list: Prospect[]): void {
  localStorage.setItem(PROSPECTS_KEY, JSON.stringify(list))
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '').trim()
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQ = !inQ
      continue
    }
    if (!inQ && (ch === ',' || ch === ';')) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

function headerIndex(headers: string[], aliases: string[]): number {
  const h = headers.map((x) =>
    x
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim(),
  )
  for (const a of aliases) {
    const i = h.findIndex((x) => x === a || x.includes(a))
    if (i >= 0) return i
  }
  return -1
}

export type CsvImportResult = {
  added: number
  skipped: number
  prospects: Prospect[]
  errors: string[]
}

/** Parse CSV texte → prospects (déduplique par téléphone) */
export function parseProspectsCsv(text: string): CsvImportResult {
  const errors: string[] = []
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) {
    return { added: 0, skipped: 0, prospects: [], errors: ['Fichier vide'] }
  }

  let start = 0
  let headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const hasHeader =
    headerIndex(headers, ['name', 'nom', 'magasin', 'societe', 'company']) >= 0 ||
    headerIndex(headers, ['phone', 'tel', 'telephone', 'whatsapp', 'mobile']) >= 0

  let iName = 0
  let iPhone = 1
  let iCity = 2
  let iEmail = 3

  if (hasHeader) {
    start = 1
    iName = headerIndex(headers, ['name', 'nom', 'magasin', 'societe', 'raison', 'company', 'boutique'])
    iPhone = headerIndex(headers, ['phone', 'tel', 'telephone', 'whatsapp', 'mobile', 'gsm', 'numero'])
    iCity = headerIndex(headers, ['city', 'ville', 'wilaya', 'commune'])
    iEmail = headerIndex(headers, ['email', 'mail', 'e-mail', 'courriel'])
    if (iName < 0) iName = 0
    if (iPhone < 0) iPhone = 1
    if (iCity < 0) iCity = 2
    if (iEmail < 0) iEmail = 3
  }

  const existing = loadProspects()
  const byPhone = new Set(existing.map((p) => normalizePhone(p.phone)))
  const created: Prospect[] = []
  let skipped = 0

  for (let li = start; li < lines.length; li++) {
    const cols = splitCsvLine(lines[li])
    const name = (cols[iName] || '').trim()
    const phone = normalizePhone(cols[iPhone] || '')
    const city = (cols[iCity] || '').trim()
    const email = (cols[iEmail] || '').trim()
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      skipped += 1
      errors.push(`Ligne ${li + 1}: téléphone invalide`)
      continue
    }
    if (!name) {
      skipped += 1
      errors.push(`Ligne ${li + 1}: nom manquant`)
      continue
    }
    if (byPhone.has(phone)) {
      skipped += 1
      continue
    }
    byPhone.add(phone)
    created.push({
      id: uid(),
      name,
      phone,
      city,
      email,
      source: 'csv',
      status: 'new',
      createdAt: new Date().toISOString(),
    })
  }

  const prospects = [...created, ...existing]
  saveProspects(prospects)
  return { added: created.length, skipped, prospects, errors: errors.slice(0, 8) }
}

export function addProspect(input: {
  name: string
  phone: string
  city?: string
  email?: string
}): { ok: boolean; reason?: string; prospect?: Prospect } {
  const name = input.name.trim()
  const phone = normalizePhone(input.phone)
  if (!name) return { ok: false, reason: 'nom' }
  if (!phone || phone.replace(/\D/g, '').length < 8) return { ok: false, reason: 'phone' }
  const existing = loadProspects()
  if (existing.some((p) => normalizePhone(p.phone) === phone)) {
    return { ok: false, reason: 'doublon' }
  }
  const prospect: Prospect = {
    id: uid(),
    name,
    phone,
    city: (input.city || '').trim(),
    email: (input.email || '').trim(),
    source: 'paste',
    status: 'new',
    createdAt: new Date().toISOString(),
  }
  saveProspects([prospect, ...existing])
  return { ok: true, prospect }
}

/** Colle : une ligne = Nom,0555123456,Alger,email (email optionnel) */
export function parseProspectsPaste(text: string): CsvImportResult {
  // Réutilise le parser CSV (virgule ou point-virgule)
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) {
    return { added: 0, skipped: 0, prospects: [], errors: ['Texte vide'] }
  }
  const looksHeader = /nom|name|tel|phone|ville/i.test(lines[0])
  const body = looksHeader ? lines : ['name,phone,city,email', ...lines]
  return parseProspectsCsv(body.join('\n'))
}

export function clearProspects(): void {
  saveProspects([])
}

export function updateProspect(
  id: string,
  patch: Partial<Prospect>,
): Prospect[] {
  const next = loadProspects().map((p) => (p.id === id ? { ...p, ...patch } : p))
  saveProspects(next)
  return next
}

export function prospectsStats() {
  const list = loadProspects()
  return {
    total: list.length,
    neu: list.filter((p) => p.status === 'new').length,
    contacted: list.filter((p) => p.status === 'contacted').length,
    withEmail: list.filter((p) => !!p.email).length,
  }
}

export function outreachMessage(
  p: Prospect,
  lang: 'fr' | 'ar' = 'fr',
): string {
  if (lang === 'ar') {
    return `السلام ${p.name} 👋
أنا من ${SELLER_BRAND.boutique}.
نقترح ${SELLER_BRAND.produit} — كاش + مخزون + واتساب للتجار في الجزائر.
إذا عندك عدة محلات: ${SELLER_BRAND.produitPro}.
تجربة مجانية: ${SELLER_BRAND.demoUrl}
رد DÉMO أو PRO.`
  }
  return `Salam ${p.name} 👋
Je suis ${SELLER_BRAND.boutique}.
On propose ${SELLER_BRAND.produit} — caisse + stock + WhatsApp pour commerçants en Algérie${p.city ? ` (${p.city})` : ''}.
Plusieurs magasins → ${SELLER_BRAND.produitPro}.
Essai gratuit : ${SELLER_BRAND.demoUrl}
Réponds DÉMO ou PRO pour un devis.`
}

/** Convertit prospects → format addClientsBulk */
export function prospectsAsClientInputs(list?: Prospect[]) {
  return (list || loadProspects()).map((p) => ({
    name: p.name,
    phone: p.phone,
    city: p.city || '',
    address: '',
    notes: [
      'prospect-campagne',
      p.email ? `email:${p.email}` : '',
      p.source,
    ]
      .filter(Boolean)
      .join(' · '),
  }))
}

export function sampleCsv(): string {
  return [
    'name,phone,city,email',
    'Epicerie Amel,0555123456,Alger,amel@exemple.dz',
    'Depot Oran Gros,0777001122,Oran,',
    'Superette Nour,0566987654,Constantine,nour@exemple.dz',
  ].join('\n')
}

export { buildSalesPitch }
