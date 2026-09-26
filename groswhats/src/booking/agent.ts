/**
 * Agent de réservation — accepte / refuse / propose des créneaux
 * selon capacité, horaires, conflits et combinaisons d’options.
 */
import type { AppState, Appointment, Language } from '../types'
import type { MetierFamily } from '../locale/metierPacks'
import {
  bookingPackFor,
  type BookingOption,
  type BookingPack,
  type BookingSegment,
} from './packs'

export type BookingRequest = {
  at: Date
  durationMin: number
  optionIds: string[]
  /** Ignorer ce RDV (édition) */
  excludeId?: string
}

export type SlotProposal = {
  at: Date
  durationMin: number
  segment: BookingSegment
  quoteDa: number
  score: number
}

export type BookingVerdict = {
  decision: 'accepted' | 'rejected' | 'proposed'
  reasons: string[]
  reasonsAr: string[]
  segment: BookingSegment
  durationMin: number
  quoteDa: number
  optionIds: string[]
  /** Créneaux alternatifs proches */
  alternatives: SlotProposal[]
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function parseLocalInput(value: string): Date | null {
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

export function segmentForDate(pack: BookingPack, at: Date): BookingSegment {
  const day = at.getDay() // 0 dim
  const hour = at.getHours() + at.getMinutes() / 60
  const weekend = day === 5 || day === 6 // ven–sam (DZ)
  const peak = pack.peakHours
    ? hour >= pack.peakHours.start && hour < pack.peakHours.end
    : false
  if (peak && weekend) return 'peak'
  if (peak) return 'peak'
  if (weekend) return 'weekend'
  if (pack.peakHours && hour < pack.openHour + 2) return 'offpeak'
  return 'weekday'
}

function aptEnd(a: Appointment): number {
  const start = new Date(a.at).getTime()
  const dur = Math.max(15, a.durationMin || 60)
  return start + dur * 60_000
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  bufferMs: number,
): boolean {
  return aStart < bEnd + bufferMs && bStart < aEnd + bufferMs
}

export function plannedInRange(
  state: AppState,
  startMs: number,
  endMs: number,
  bufferMin: number,
  excludeId?: string,
): Appointment[] {
  const bufferMs = bufferMin * 60_000
  return (state.appointments ?? []).filter((a) => {
    if (a.status !== 'planned') return false
    if (excludeId && a.id === excludeId) return false
    const s = new Date(a.at).getTime()
    if (!Number.isFinite(s)) return false
    return overlaps(startMs, endMs, s, aptEnd(a), bufferMs)
  })
}

export function resolveDuration(
  pack: BookingPack,
  baseMin: number,
  optionIds: string[],
): number {
  let extra = 0
  for (const id of optionIds) {
    const o = pack.options.find((x) => x.id === id)
    if (o?.extraMin) extra += o.extraMin
  }
  return Math.max(15, Math.round(baseMin + extra))
}

export function sanitizeOptions(
  pack: BookingPack,
  optionIds: string[],
): { ids: string[]; dropped: string[] } {
  const dropped: string[] = []
  const selected = new Set(optionIds.filter((id) => pack.options.some((o) => o.id === id)))
  for (const id of [...selected]) {
    const o = pack.options.find((x) => x.id === id)
    if (!o?.conflictsWith?.length) continue
    for (const c of o.conflictsWith) {
      if (selected.has(c)) {
        selected.delete(c)
        dropped.push(c)
      }
    }
  }
  return { ids: [...selected], dropped }
}

export function quoteDa(
  pack: BookingPack,
  segment: BookingSegment,
  optionIds: string[],
): number {
  const mult = pack.segmentMult[segment] ?? 1
  let sum = pack.basePriceDa
  for (const id of optionIds) {
    const o = pack.options.find((x) => x.id === id)
    if (o) sum += o.priceDa
  }
  return Math.max(0, Math.round(sum * mult))
}

function withinOpenHours(pack: BookingPack, at: Date, durationMin: number): boolean {
  const startH = at.getHours() + at.getMinutes() / 60
  const end = new Date(at.getTime() + durationMin * 60_000)
  const endH = end.getHours() + end.getMinutes() / 60
  const { openHour, closeHour } = pack
  // Horaires qui chevauchent minuit (salle de fêtes)
  if (closeHour <= openHour) {
    const okStart =
      startH >= openHour || startH < closeHour || (startH >= 0 && startH < closeHour)
    // simplifié : début dans la fenêtre ouverte
    const inWindow =
      startH >= openHour || startH < closeHour
    return inWindow && okStart
  }
  return startH >= openHour && endH <= closeHour && end.getDate() === at.getDate()
}

function isClosedDay(pack: BookingPack, at: Date): boolean {
  return pack.closedWeekdays.includes(at.getDay())
}

function reason(
  fr: string,
  ar: string,
): { fr: string; ar: string } {
  return { fr, ar }
}

/**
 * Évalue une demande de réservation — verdict agentique.
 */
export function evaluateBooking(
  state: AppState,
  family: MetierFamily | undefined,
  req: BookingRequest,
): BookingVerdict {
  const pack = bookingPackFor(family)
  const { ids: optionIds, dropped } = sanitizeOptions(pack, req.optionIds)
  const durationMin = resolveDuration(pack, req.durationMin || pack.defaultDurationMin, optionIds)
  const at = req.at
  const segment = segmentForDate(pack, at)
  const quote = quoteDa(pack, segment, optionIds)
  const reasons: { fr: string; ar: string }[] = []
  const startMs = at.getTime()
  const endMs = startMs + durationMin * 60_000

  if (!Number.isFinite(startMs) || startMs < Date.now() - 5 * 60_000) {
    reasons.push(reason('La date est déjà passée.', 'التاريخ فات بالفعل.'))
  }
  if (isClosedDay(pack, at)) {
    reasons.push(
      reason('Jour de fermeture — choisis un autre jour.', 'يوم عطلة — اختر يوماً آخر.'),
    )
  }
  if (!withinOpenHours(pack, at, durationMin)) {
    reasons.push(
      reason(
        `Hors horaires (${pack.openHour}h–${pack.closeHour}h).`,
        `خارج أوقات العمل (${pack.openHour}–${pack.closeHour}).`,
      ),
    )
  }
  for (const id of dropped) {
    const o = pack.options.find((x) => x.id === id)
    if (o) {
      reasons.push(
        reason(
          `Option « ${o.labelFr} » incompatible — retirée.`,
          `الخيار « ${o.labelAr} » متعارض — تم حذفه.`,
        ),
      )
    }
  }

  const conflicts = plannedInRange(
    state,
    startMs,
    endMs,
    pack.bufferMin,
    req.excludeId,
  )
  const freeSlots = Math.max(0, pack.capacity - conflicts.length)
  if (freeSlots <= 0) {
    reasons.push(
      reason(
        `Complet : ${conflicts.length} réservation(s) sur ce créneau.`,
        `ممتلئ: ${conflicts.length} حجز(حجوزات) في هذا الموعد.`,
      ),
    )
  }

  const blocking = reasons.filter(
    (r) =>
      !r.fr.includes('incompatible') &&
      !r.fr.includes('Option') &&
      !r.ar.includes('متعارض'),
  )
  const hardReject =
    blocking.some((r) => r.fr.includes('passée') || r.fr.includes('fermeture')) ||
    freeSlots <= 0 ||
    blocking.some((r) => r.fr.includes('Hors horaires'))

  const alternatives = suggestNearestSlots(state, family, {
    from: at,
    durationMin: req.durationMin || pack.defaultDurationMin,
    optionIds,
    count: 5,
    excludeId: req.excludeId,
  })

  if (hardReject) {
    return {
      decision: alternatives.length > 0 ? 'proposed' : 'rejected',
      reasons: reasons.map((r) => r.fr),
      reasonsAr: reasons.map((r) => r.ar),
      segment,
      durationMin,
      quoteDa: quote,
      optionIds,
      alternatives,
    }
  }

  if (reasons.length > 0 && alternatives.length > 0 && freeSlots <= 0) {
    return {
      decision: 'proposed',
      reasons: reasons.map((r) => r.fr),
      reasonsAr: reasons.map((r) => r.ar),
      segment,
      durationMin,
      quoteDa: quote,
      optionIds,
      alternatives,
    }
  }

  reasons.push(
    reason(
      `Créneau libre · ${segment} · ~${quote.toLocaleString('fr-DZ')} DA`,
      `موعد متاح · ${segment} · ≈${quote.toLocaleString('ar-DZ')} دج`,
    ),
  )
  return {
    decision: 'accepted',
    reasons: reasons.map((r) => r.fr),
    reasonsAr: reasons.map((r) => r.ar),
    segment,
    durationMin,
    quoteDa: quote,
    optionIds,
    alternatives: alternatives.slice(0, 3),
  }
}

/**
 * Propose les créneaux libres les plus proches.
 */
export function suggestNearestSlots(
  state: AppState,
  family: MetierFamily | undefined,
  opts: {
    from: Date
    durationMin: number
    optionIds: string[]
    count?: number
    excludeId?: string
    horizonDays?: number
  },
): SlotProposal[] {
  const pack = bookingPackFor(family)
  const { ids } = sanitizeOptions(pack, opts.optionIds)
  const durationMin = resolveDuration(pack, opts.durationMin, ids)
  const count = opts.count ?? 5
  const horizon = opts.horizonDays ?? 21
  const out: SlotProposal[] = []
  const stepMin = Math.min(30, Math.max(15, Math.floor(durationMin / 4) || 30))

  const cursor = new Date(opts.from)
  // Commencer au prochain pas rond
  cursor.setSeconds(0, 0)
  const m = cursor.getMinutes()
  cursor.setMinutes(m - (m % stepMin) + stepMin)

  const limit = Date.now() + horizon * 24 * 60 * 60_000
  let guard = 0
  while (out.length < count && cursor.getTime() < limit && guard < 2500) {
    guard += 1
    if (!isClosedDay(pack, cursor) && withinOpenHours(pack, cursor, durationMin)) {
      const startMs = cursor.getTime()
      const endMs = startMs + durationMin * 60_000
      if (startMs >= Date.now() - 60_000) {
        const conflicts = plannedInRange(
          state,
          startMs,
          endMs,
          pack.bufferMin,
          opts.excludeId,
        )
        if (conflicts.length < pack.capacity) {
          const segment = segmentForDate(pack, cursor)
          const distH = Math.abs(startMs - opts.from.getTime()) / 3_600_000
          out.push({
            at: new Date(cursor),
            durationMin,
            segment,
            quoteDa: quoteDa(pack, segment, ids),
            score: Math.round(1000 - distH * 10 - conflicts.length * 50),
          })
        }
      }
    }
    cursor.setMinutes(cursor.getMinutes() + stepMin)
  }

  return out.sort((a, b) => b.score - a.score).slice(0, count)
}

export function verdictReasons(v: BookingVerdict, lang: Language): string[] {
  return lang === 'ar' ? v.reasonsAr : v.reasons
}

export function optionById(pack: BookingPack, id: string): BookingOption | undefined {
  return pack.options.find((o) => o.id === id)
}
