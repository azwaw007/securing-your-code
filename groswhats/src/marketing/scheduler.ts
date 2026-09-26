/** File d’automatisation locale : posts / stories / relances (sans Meta API). */

import {
  buildPosts,
  buildStoryWeek,
  resolveSellerBrand,
  type PostChannel,
  type SellerBrand,
  type StorySlot,
} from './campaignPack'

const QUEUE_KEY = 'az-pos-campaign-queue-v1'
const STATE_KEY = 'az-pos-campaign-state-v1'

export type QueueItemKind = 'story' | 'post' | 'whatsapp_broadcast' | 'followup'

export interface QueueItem {
  id: string
  kind: QueueItemKind
  title: string
  body: string
  channel?: PostChannel | 'story'
  /** ISO — quand publier / rappeler */
  dueAt: string
  status: 'pending' | 'done' | 'skipped'
  createdAt: string
}

export interface CampaignState {
  boutiqueName: string
  /** Nom de marque / produit digital (choix utilisateur) */
  productName: string
  productProName: string
  demoUrl: string
  prixDetail: string
  prixPro: string
  whatsappPhone: string
  city: string
  startedAt: string
  dayIndex: number
  autoReplyEnabled: boolean
  autoQueueEnabled: boolean
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function defaultCampaignState(): CampaignState {
  return {
    boutiqueName: '',
    productName: '',
    productProName: '',
    demoUrl: '',
    prixDetail: '',
    prixPro: '',
    whatsappPhone: '',
    city: 'Algérie',
    startedAt: new Date().toISOString(),
    dayIndex: 1,
    autoReplyEnabled: true,
    autoQueueEnabled: true,
  }
}

/** Marque effective pour texts campagne / stories / pitches */
export function brandFromCampaignState(
  st?: CampaignState | null,
): SellerBrand {
  const s = st || loadCampaignState()
  return resolveSellerBrand({
    boutique: s.boutiqueName,
    produit: s.productName,
    produitPro: s.productProName,
    demoUrl: s.demoUrl,
    prixDetail: s.prixDetail || undefined,
    prixPro: s.prixPro || undefined,
  })
}

export function loadCampaignState(): CampaignState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return defaultCampaignState()
    return { ...defaultCampaignState(), ...JSON.parse(raw) }
  } catch {
    return defaultCampaignState()
  }
}

export function saveCampaignState(patch: Partial<CampaignState>): CampaignState {
  const next = { ...loadCampaignState(), ...patch }
  localStorage.setItem(STATE_KEY, JSON.stringify(next))
  return next
}

export function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as QueueItem[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveQueue(items: QueueItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
}

function slotHour(slot: StorySlot): number {
  if (slot === 'matin') return 9
  if (slot === 'midi') return 13
  return 20
}

function dueDateFor(dayOffset: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

/** Génère la file 7 jours (stories + posts) — textes selon marque utilisateur */
export function seedWeekQueue(lang: 'fr' | 'ar' = 'fr'): QueueItem[] {
  const brand = brandFromCampaignState()
  const stories = buildStoryWeek(brand)
  const posts = buildPosts(brand)
  const existing = loadQueue().filter((q) => q.status === 'pending')
  const items: QueueItem[] = [...existing]
  const now = new Date().toISOString()

  for (const story of stories) {
    const dayOffset = Math.max(0, story.day - 1)
    items.push({
      id: uid('story'),
      kind: 'story',
      title: `Story J${story.day} · ${story.slot}`,
      body: lang === 'ar' ? story.ar : story.fr,
      channel: 'story',
      dueAt: dueDateFor(dayOffset, slotHour(story.slot)),
      status: 'pending',
      createdAt: now,
    })
  }

  posts.forEach((post, i) => {
    items.push({
      id: uid('post'),
      kind: 'post',
      title: post.titleFr,
      body: lang === 'ar' ? post.bodyAr : post.bodyFr,
      channel: post.channel,
      dueAt: dueDateFor(i, 11),
      status: 'pending',
      createdAt: now,
    })
  })

  saveQueue(items)
  saveCampaignState({ autoQueueEnabled: true, dayIndex: 1, startedAt: now })
  return items
}

export function pendingDue(now = new Date()): QueueItem[] {
  const t = now.getTime()
  return loadQueue()
    .filter((q) => q.status === 'pending' && new Date(q.dueAt).getTime() <= t)
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
}

export function markQueueItem(
  id: string,
  status: 'done' | 'skipped' | 'pending',
): QueueItem[] {
  const next = loadQueue().map((q) => (q.id === id ? { ...q, status } : q))
  saveQueue(next)
  return next
}

export function nextActionsSummary(lang: 'fr' | 'ar' = 'fr'): string {
  const due = pendingDue()
  const upcoming = loadQueue()
    .filter((q) => q.status === 'pending')
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
    .slice(0, 5)

  if (lang === 'ar') {
    const lines = [
      `📣 طابور الحملة: ${due.length} جاهز الآن`,
      ...due.slice(0, 3).map((q) => `• ${q.title}`),
      upcoming.length
        ? `التالي:\n${upcoming.map((q) => `• ${q.title} — ${new Date(q.dueAt).toLocaleString('ar-DZ')}`).join('\n')}`
        : 'لا مهام. اكتب: «lance campagne».',
    ]
    return lines.join('\n')
  }

  const lines = [
    `📣 File campagne : ${due.length} à publier maintenant`,
    ...due.slice(0, 3).map((q) => `• ${q.title}`),
    upcoming.length
      ? `Prochaines:\n${upcoming.map((q) => `• ${q.title} — ${new Date(q.dueAt).toLocaleString('fr-DZ')}`).join('\n')}`
      : 'Aucune tâche. Écris : « lance campagne ».',
  ]
  return lines.join('\n')
}
