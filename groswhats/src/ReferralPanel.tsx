import { useMemo, useState } from 'react'
import type { AppState, Language } from './types'
import { t } from './i18n'
import { openWhatsappText } from './utils/whatsapp'
import {
  POINTS_FOR_FREE_YEAR,
  POINTS_PER_CONVERSION,
  canClaimFreeYear,
  claimFreeYear,
  creditReferralConversion,
  ensureReferral,
  inviteWhatsAppMessage,
  progressToFreeYear,
} from './license/referral'
import { getCachedPlanId } from './license/license'

export function ReferralPanel({
  state,
  lang,
  onState,
  onFlash,
  compact,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  compact?: boolean
}) {
  const ensured = useMemo(() => ensureReferral(state), [state])
  const account = ensured.referral!
  const prog = progressToFreeYear(account)

  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [invitePhone, setInvitePhone] = useState('')

  function ensureAndSet(next: AppState) {
    onState(ensureReferral(next))
  }

  function onInvite() {
    const msg = inviteWhatsAppMessage(account, lang, state.settings.shopName)
    if (invitePhone.trim()) {
      openWhatsappText(invitePhone, msg)
    } else {
      void navigator.clipboard?.writeText(msg)
      onFlash(lang === 'ar' ? 'تم نسخ رسالة الدعوة' : 'Message d’invitation copié')
    }
  }

  function onCredit() {
    if (!buyerName.trim()) {
      onFlash(lang === 'ar' ? 'اسم الزبون المحوّل مطلوب' : 'Nom du client converti requis')
      return
    }
    const res = creditReferralConversion(ensured, {
      buyerName,
      buyerPhone,
      planId: getCachedPlanId() === 'trial' ? 'standard' : String(getCachedPlanId()),
      note: 'conversion_payante',
    })
    ensureAndSet(res.state)
    onFlash(lang === 'ar' ? res.messageAr : res.messageFr)
    if (res.ok) {
      setBuyerName('')
      setBuyerPhone('')
    }
  }

  function onClaim() {
    const bonus = state.settings.referralBonusExpiresAt
    const res = claimFreeYear(ensured, bonus)
    ensureAndSet(res.state)
    onFlash(lang === 'ar' ? res.messageAr : res.messageFr)
  }

  function copyCode() {
    void navigator.clipboard?.writeText(account.code)
    onFlash(lang === 'ar' ? 'تم نسخ الرمز' : 'Code copié')
  }

  return (
    <section className={`digital-section referral-panel ${compact ? 'is-compact' : ''}`}>
      {!compact ? <h2>{t(lang, 'referralTitle')}</h2> : null}
      <p className="muted">{t(lang, 'referralHint')}</p>

      <div className="referral-hero card-block">
        <div>
          <span className="muted">{t(lang, 'referralCode')}</span>
          <strong className="referral-code">{account.code}</strong>
          <button type="button" className="btn ghost" onClick={copyCode}>
            {t(lang, 'referralCopy')}
          </button>
        </div>
        <div className="referral-points">
          <strong>{account.points}</strong>
          <span className="muted">
            / {POINTS_FOR_FREE_YEAR} {t(lang, 'referralPts')}
          </span>
        </div>
      </div>

      <div className="referral-bar" aria-hidden>
        <div className="referral-bar-fill" style={{ width: `${prog.pct}%` }} />
      </div>
      <p className="muted">
        {lang === 'ar'
          ? `${POINTS_PER_CONVERSION} نقطة لكل زبون يشتري الرخصة · ${prog.conversionsLeft} تحويلات متبقية لسنة مجانية`
          : `${POINTS_PER_CONVERSION} pts par client qui achète la licence · ${prog.conversionsLeft} conversion(s) pour 1 an gratuit`}
      </p>

      <div className="digital-sell card-block">
        <h3>{t(lang, 'referralInvite')}</h3>
        <label>
          {t(lang, 'digitalPhone')}
          <input
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            placeholder="0555… (optionnel)"
            inputMode="tel"
          />
        </label>
        <button type="button" className="btn primary" onClick={onInvite}>
          {invitePhone.trim()
            ? t(lang, 'referralSendWa')
            : t(lang, 'referralCopyInvite')}
        </button>
      </div>

      <div className="digital-sell card-block">
        <h3>{t(lang, 'referralCreditTitle')}</h3>
        <p className="muted">{t(lang, 'referralCreditHint')}</p>
        <label>
          {t(lang, 'referralBuyer')}
          <input
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder={lang === 'ar' ? 'اسم الصديق' : 'Nom de l’ami'}
          />
        </label>
        <label>
          {t(lang, 'digitalPhone')}
          <input
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            placeholder="0555…"
            inputMode="tel"
          />
        </label>
        <button type="button" className="btn primary" onClick={onCredit}>
          {t(lang, 'referralCreditBtn')} (+{POINTS_PER_CONVERSION})
        </button>
      </div>

      <div className="digital-actions">
        <button
          type="button"
          className="btn accent"
          disabled={!canClaimFreeYear(account)}
          onClick={onClaim}
        >
          {t(lang, 'referralClaimYear')}
        </button>
      </div>
      {state.settings.referralBonusExpiresAt ? (
        <p className="digital-tip">
          {t(lang, 'referralBonusUntil')} {state.settings.referralBonusExpiresAt}
        </p>
      ) : null}

      <h3>{t(lang, 'referralHistory')}</h3>
      {account.conversions.length === 0 ? (
        <p className="muted">{t(lang, 'referralNoConv')}</p>
      ) : (
        <ul className="digital-sales">
          {account.conversions.slice(0, 20).map((c) => (
            <li key={c.id}>
              +{c.points} · {c.buyerName}
              {c.buyerPhone ? ` · ${c.buyerPhone}` : ''} ·{' '}
              {new Date(c.at).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
