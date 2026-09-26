/**
 * Parrainage AZ POS — points pour chaque ami qui achète une licence.
 * 10 pts / conversion payante · 100 pts = 1 an gratuit.
 */
import type { AppState, Language } from '../types'
import { SELLER_BRAND } from '../marketing/campaignPack'
import { getOrCreateDeviceId } from './license'

export const POINTS_PER_CONVERSION = 10
export const POINTS_FOR_FREE_YEAR = 100
/** Jours offerts quand on dépense POINTS_FOR_FREE_YEAR */
export const FREE_YEAR_DAYS = 365

export type ReferralConversion = {
  id: string
  buyerName: string
  buyerPhone?: string
  points: number
  at: string
  planId?: string
  note?: string
}

export type ReferralReward = {
  id: string
  kind: 'free_year'
  pointsSpent: number
  unlockedAt: string
  bonusExpiresAt: string
}

export type ReferralAccount = {
  code: string
  points: number
  conversions: ReferralConversion[]
  rewards: ReferralReward[]
  createdAt: string
}

const BONUS_KEY = 'gdz-referral-bonus-expires'
const REFERRED_KEY = 'gdz-referred-by'

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/** Code court stable : AZ-XXXX */
export function makeReferralCode(seed: string): string {
  let h = 0
  const s = seed || 'az'
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const part = (h % 36 ** 4).toString(36).toUpperCase().padStart(4, '0')
  return `AZ-${part}`
}

export function emptyReferralAccount(shopName?: string): ReferralAccount {
  const device = typeof localStorage !== 'undefined' ? getOrCreateDeviceId() : 'dev'
  const code = makeReferralCode(`${shopName || 'shop'}-${device}`)
  return {
    code,
    points: 0,
    conversions: [],
    rewards: [],
    createdAt: new Date().toISOString(),
  }
}

export function ensureReferral(state: AppState): AppState {
  if (state.referral?.code) return state
  return {
    ...state,
    referral: emptyReferralAccount(state.settings.shopName),
  }
}

export function migrateReferral(raw: unknown): ReferralAccount | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<ReferralAccount>
  if (typeof r.code !== 'string' || !r.code.trim()) return undefined
  return {
    code: r.code.trim().toUpperCase(),
    points: typeof r.points === 'number' && r.points >= 0 ? Math.floor(r.points) : 0,
    conversions: Array.isArray(r.conversions)
      ? r.conversions
          .filter((c) => c && typeof c.buyerName === 'string')
          .map((c) => ({
            id: c.id || uid('rc'),
            buyerName: String(c.buyerName),
            buyerPhone: typeof c.buyerPhone === 'string' ? c.buyerPhone : undefined,
            points:
              typeof c.points === 'number' && c.points > 0
                ? Math.floor(c.points)
                : POINTS_PER_CONVERSION,
            at: c.at || new Date().toISOString(),
            planId: typeof c.planId === 'string' ? c.planId : undefined,
            note: typeof c.note === 'string' ? c.note : undefined,
          }))
          .slice(0, 500)
      : [],
    rewards: Array.isArray(r.rewards)
      ? r.rewards
          .filter((x) => x && x.kind === 'free_year')
          .map((x) => ({
            id: x.id || uid('rw'),
            kind: 'free_year' as const,
            pointsSpent: x.pointsSpent || POINTS_FOR_FREE_YEAR,
            unlockedAt: x.unlockedAt || new Date().toISOString(),
            bonusExpiresAt: x.bonusExpiresAt || '',
          }))
          .slice(0, 50)
      : [],
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  }
}

/** Enregistre qu’on a été parrainé (appareil acheteur) */
export function setReferredByCode(code: string): void {
  const c = code.trim().toUpperCase()
  if (!c) return
  try {
    localStorage.setItem(REFERRED_KEY, c)
  } catch {
    /* ignore */
  }
}

export function getReferredByCode(): string | null {
  try {
    return localStorage.getItem(REFERRED_KEY)
  } catch {
    return null
  }
}

export function getStoredBonusExpiresAt(): string | null {
  try {
    return localStorage.getItem(BONUS_KEY)
  } catch {
    return null
  }
}

export function setStoredBonusExpiresAt(isoDate: string): void {
  try {
    localStorage.setItem(BONUS_KEY, isoDate)
  } catch {
    /* ignore */
  }
}

/**
 * Crédite automatiquement le parrain : +POINTS_PER_CONVERSION
 * quand un ami achète une licence payante.
 */
export function creditReferralConversion(
  state: AppState,
  input: {
    buyerName: string
    buyerPhone?: string
    planId?: string
    note?: string
    /** Si fourni, ne crédite que si ça matche le code local (vendeur multi-codes) */
    referrerCode?: string
  },
): { state: AppState; ok: boolean; messageFr: string; messageAr: string } {
  const base = ensureReferral(state)
  const ref = base.referral!
  const incoming = (input.referrerCode || '').trim().toUpperCase()
  if (incoming && incoming !== ref.code) {
    return {
      state: base,
      ok: false,
      messageFr: `Code parrain différent (${incoming}). Ce magasin est ${ref.code}.`,
      messageAr: `رمز الدعوة مختلف (${incoming}). هذا المحل ${ref.code}.`,
    }
  }
  const conv: ReferralConversion = {
    id: uid('rc'),
    buyerName: (input.buyerName || 'Client').trim(),
    buyerPhone: input.buyerPhone?.trim() || undefined,
    points: POINTS_PER_CONVERSION,
    at: new Date().toISOString(),
    planId: input.planId,
    note: input.note,
  }
  const next: ReferralAccount = {
    ...ref,
    points: ref.points + POINTS_PER_CONVERSION,
    conversions: [conv, ...ref.conversions].slice(0, 500),
  }
  return {
    state: { ...base, referral: next },
    ok: true,
    messageFr: `+${POINTS_PER_CONVERSION} pts — total ${next.points}/${POINTS_FOR_FREE_YEAR} (1 an gratuit)`,
    messageAr: `+${POINTS_PER_CONVERSION} نقطة — المجموع ${next.points}/${POINTS_FOR_FREE_YEAR} (سنة مجانية)`,
  }
}

export function canClaimFreeYear(account: ReferralAccount): boolean {
  return account.points >= POINTS_FOR_FREE_YEAR
}

export function progressToFreeYear(account: ReferralAccount): {
  points: number
  need: number
  conversionsLeft: number
  pct: number
} {
  const need = Math.max(0, POINTS_FOR_FREE_YEAR - account.points)
  return {
    points: account.points,
    need,
    conversionsLeft: Math.ceil(need / POINTS_PER_CONVERSION),
    pct: Math.min(100, Math.round((account.points / POINTS_FOR_FREE_YEAR) * 100)),
  }
}

function addDaysIso(fromIso: string, days: number): string {
  const d = new Date(fromIso + 'T12:00:00')
  if (!Number.isFinite(d.getTime())) {
    const n = new Date()
    n.setDate(n.getDate() + days)
    return n.toISOString().slice(0, 10)
  }
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Débloque 1 an gratuit : -100 pts, prolonge le bonus d’accès.
 */
export function claimFreeYear(
  state: AppState,
  currentLicenseExpiresAt?: string,
): {
  state: AppState
  ok: boolean
  bonusExpiresAt?: string
  messageFr: string
  messageAr: string
} {
  const base = ensureReferral(state)
  const ref = base.referral!
  if (!canClaimFreeYear(ref)) {
    const p = progressToFreeYear(ref)
    return {
      state: base,
      ok: false,
      messageFr: `Il manque ${p.need} pts (${p.conversionsLeft} clients convertis).`,
      messageAr: `ينقصك ${p.need} نقطة (${p.conversionsLeft} زبائن محوّلين).`,
    }
  }
  const today = new Date().toISOString().slice(0, 10)
  const stored = getStoredBonusExpiresAt()
  const bases = [today, currentLicenseExpiresAt, stored, state.settings.referralBonusExpiresAt].filter(
    (x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x),
  )
  const start = bases.sort().at(-1) || today
  const bonusExpiresAt = addDaysIso(start, FREE_YEAR_DAYS)
  const reward: ReferralReward = {
    id: uid('rw'),
    kind: 'free_year',
    pointsSpent: POINTS_FOR_FREE_YEAR,
    unlockedAt: new Date().toISOString(),
    bonusExpiresAt,
  }
  const next: ReferralAccount = {
    ...ref,
    points: ref.points - POINTS_FOR_FREE_YEAR,
    rewards: [reward, ...ref.rewards].slice(0, 50),
  }
  setStoredBonusExpiresAt(bonusExpiresAt)
  return {
    state: {
      ...base,
      referral: next,
      settings: {
        ...base.settings,
        referralBonusExpiresAt: bonusExpiresAt,
      },
    },
    ok: true,
    bonusExpiresAt,
    messageFr: `🎁 1 an gratuit débloqué jusqu’au ${bonusExpiresAt} (−${POINTS_FOR_FREE_YEAR} pts).`,
    messageAr: `🎁 سنة مجانية حتى ${bonusExpiresAt} (−${POINTS_FOR_FREE_YEAR} نقطة).`,
  }
}

export function inviteWhatsAppMessage(
  account: ReferralAccount,
  lang: Language,
  shopName?: string,
): string {
  const shop = shopName || SELLER_BRAND.produit
  const demo = SELLER_BRAND.demoUrl
  if (lang === 'ar') {
    return [
      `سلام! جرّب ${SELLER_BRAND.produit} — صندوق ذكي للجزائر.`,
      `دعوة من ${shop}`,
      `كود الدعوة: ${account.code}`,
      `كل صديق يشتري الرخصة = 10 نقاط لك.`,
      `100 نقطة = سنة مجانية.`,
      `تجربة: ${demo}`,
      `عند التفعيل أدخل كود الدعوة ${account.code}`,
    ].join('\n')
  }
  return [
    `Salam ! Essaie ${SELLER_BRAND.produit} — la caisse simple pour l’Algérie.`,
    `Invitation de ${shop}`,
    `Code parrain : ${account.code}`,
    `Chaque ami qui achète la licence = +10 points pour toi.`,
    `100 points = 1 an d’abonnement gratuit.`,
    `Démo : ${demo}`,
    `À l’activation, entre le code ${account.code}`,
  ].join('\n')
}
