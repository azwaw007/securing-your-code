import type {
  GymDisciplineId,
  GymMembershipPlan,
  GymSettings,
} from '../types'

/** Disciplines proposées — l’admin coche celles de sa salle. */
export const GYM_DISCIPLINE_CATALOG: Array<{
  id: GymDisciplineId
  labelFr: string
  labelAr: string
  icon: string
}> = [
  { id: 'boxe', labelFr: 'Boxe', labelAr: 'ملاكمة', icon: '🥊' },
  { id: 'gym', labelFr: 'Gym', labelAr: 'جيم', icon: '🏋️' },
  { id: 'gym_cardio', labelFr: 'Gym + cardio', labelAr: 'جيم + كارديو', icon: '🏃' },
  { id: 'cardio', labelFr: 'Cardio', labelAr: 'كارديو', icon: '❤️' },
  { id: 'musculation', labelFr: 'Musculation', labelAr: 'كمال أجسام', icon: '💪' },
  {
    id: 'musculation_cardio',
    labelFr: 'Musculation + cardio',
    labelAr: 'كمال أجسام + كارديو',
    icon: '🔥',
  },
  { id: 'football', labelFr: 'Football', labelAr: 'كرة قدم', icon: '⚽' },
  { id: 'yoga', labelFr: 'Yoga / pilates', labelAr: 'يوغا', icon: '🧘' },
  { id: 'crossfit', labelFr: 'CrossFit', labelAr: 'كروس فت', icon: '💥' },
  { id: 'martial', labelFr: 'Arts martiaux', labelAr: 'فنون قتالية', icon: '🥋' },
  { id: 'natation', labelFr: 'Natation', labelAr: 'سباحة', icon: '🏊' },
  { id: 'tennis', labelFr: 'Tennis', labelAr: 'تنس', icon: '🎾' },
  { id: 'danse', labelFr: 'Danse', labelAr: 'رقص', icon: '💃' },
]

export const ALL_GYM_DISCIPLINE_IDS: GymDisciplineId[] =
  GYM_DISCIPLINE_CATALOG.map((d) => d.id)

/** Anciens domaines setup → disciplines par défaut + id unifié. */
export const SPORT_DOMAIN_ALIASES: Record<
  string,
  { domainId: string; disciplines: GymDisciplineId[] }
> = {
  'svc-sport': {
    domainId: 'svc-sport',
    disciplines: ['gym', 'cardio', 'musculation'],
  },
  'svc-boxe': { domainId: 'svc-sport', disciplines: ['boxe'] },
  'svc-football': { domainId: 'svc-sport', disciplines: ['football'] },
  'svc-yoga': { domainId: 'svc-sport', disciplines: ['yoga'] },
  'svc-crossfit': { domainId: 'svc-sport', disciplines: ['crossfit'] },
  'svc-arts-martiaux': { domainId: 'svc-sport', disciplines: ['martial'] },
  'svc-natation': { domainId: 'svc-sport', disciplines: ['natation'] },
  'svc-tennis': { domainId: 'svc-sport', disciplines: ['tennis'] },
  'svc-danse': { domainId: 'svc-sport', disciplines: ['danse'] },
  'svc-musculation': {
    domainId: 'svc-sport',
    disciplines: ['musculation', 'musculation_cardio'],
  },
}

export function isSportDomainId(domainId: string | undefined): boolean {
  if (!domainId) return false
  return domainId === 'svc-sport' || !!SPORT_DOMAIN_ALIASES[domainId]
}

export function disciplineLabel(
  id: GymDisciplineId,
  lang: 'fr' | 'ar',
): string {
  const row = GYM_DISCIPLINE_CATALOG.find((d) => d.id === id)
  if (!row) return id
  return lang === 'ar' ? row.labelAr : row.labelFr
}

function uidPlan(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/** Plans de départ — l’admin ajuste prix / durée. */
export function defaultGymPlans(
  disciplines: GymDisciplineId[],
): GymMembershipPlan[] {
  const primary = disciplines[0] || 'gym'
  const multi =
    disciplines.length > 1 ? disciplines.slice(0, 3) : [primary]
  return [
    {
      id: uidPlan('gpl'),
      name: 'Mensuel',
      disciplineIds: [...multi],
      priceDa: 3000,
      durationDays: 30,
      active: true,
    },
    {
      id: uidPlan('gpl'),
      name: 'Trimestriel',
      disciplineIds: [...multi],
      priceDa: 8000,
      durationDays: 90,
      active: true,
    },
    {
      id: uidPlan('gpl'),
      name: 'Séance passager',
      disciplineIds: [primary],
      priceDa: 300,
      durationDays: 1,
      walkIn: true,
      active: true,
    },
  ]
}

export function defaultGymSettings(
  seedDisciplines?: GymDisciplineId[],
): GymSettings {
  const enabled =
    seedDisciplines && seedDisciplines.length > 0
      ? seedDisciplines.filter((id) => ALL_GYM_DISCIPLINE_IDS.includes(id))
      : (['gym', 'cardio', 'musculation'] as GymDisciplineId[])
  const list = enabled.length ? enabled : (['gym'] as GymDisciplineId[])
  return {
    enabledDisciplines: list,
    plans: defaultGymPlans(list),
    openTicketOnEntry: true,
  }
}

export function migrateGymSettings(
  raw: unknown,
  domainId?: string,
): GymSettings {
  const alias = domainId ? SPORT_DOMAIN_ALIASES[domainId] : undefined
  const fallback = defaultGymSettings(alias?.disciplines)

  if (!raw || typeof raw !== 'object') return fallback
  const g = raw as Partial<GymSettings>

  const enabled = Array.isArray(g.enabledDisciplines)
    ? g.enabledDisciplines.filter((id): id is GymDisciplineId =>
        ALL_GYM_DISCIPLINE_IDS.includes(id as GymDisciplineId),
      )
    : fallback.enabledDisciplines

  const plans: GymMembershipPlan[] = Array.isArray(g.plans)
    ? g.plans
        .filter((p) => p && typeof p.name === 'string' && p.name.trim())
        .map((p) => ({
          id: typeof p.id === 'string' && p.id ? p.id : uidPlan('gpl'),
          name: p.name.trim(),
          disciplineIds: Array.isArray(p.disciplineIds)
            ? p.disciplineIds.filter((id): id is GymDisciplineId =>
                ALL_GYM_DISCIPLINE_IDS.includes(id as GymDisciplineId),
              )
            : [...(enabled.length ? enabled : fallback.enabledDisciplines)],
          priceDa:
            typeof p.priceDa === 'number' && p.priceDa >= 0 ? p.priceDa : 0,
          durationDays:
            typeof p.durationDays === 'number' && p.durationDays > 0
              ? Math.round(p.durationDays)
              : 30,
          walkIn: p.walkIn === true,
          active: p.active !== false,
        }))
        .slice(0, 40)
    : fallback.plans

  return {
    enabledDisciplines: enabled.length ? enabled : fallback.enabledDisciplines,
    plans: plans.length ? plans : fallback.plans,
    openTicketOnEntry: g.openTicketOnEntry !== false,
  }
}

/** Unifie l’id domaine sport vers svc-sport. */
export function resolveSportDomainId(domainId: string): string {
  return SPORT_DOMAIN_ALIASES[domainId]?.domainId || domainId
}

export function membershipStillValid(end?: string, at = new Date()): boolean {
  if (!end) return false
  const day = end.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const today = at.toISOString().slice(0, 10)
  return day >= today
}
