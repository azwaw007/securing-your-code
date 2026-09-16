import type { AppState, CommerceMode, Language } from './types'
import { t } from './i18n'
import { formatDa } from './utils/format'
import {
  annualNetProfitDa,
  openCreditsDa,
  stockValueDa,
  todayOrders,
} from './store'
import { modeLabel } from './data/domains'
import { metierCopy } from './locale/metierPacks'
import { expertAdvice } from './agent/expertise'

/**
 * Expert comptable horizontal — disponible dans CHAQUE métier / section,
 * pas une appli « cabinet comptable » séparée.
 */
export function ExpertComptableCard({
  state,
  lang,
  onOpen,
}: {
  state: AppState
  lang: Language
  onOpen: () => void
}) {
  const mode = state.settings.commerceMode
  const domainId = state.settings.domainId
  const stock = stockValueDa(state)
  const credits = openCreditsDa(state)
  const profit = annualNetProfitDa(state)
  const today = todayOrders(state)
  const todaySales = today.reduce((s, o) => s + o.totalDa, 0)
  const section =
    lang === 'ar'
      ? modeLabel(mode, lang)
      : modeLabel(mode, lang)
  const shopLabel = metierCopy(domainId, mode, lang).homeTitle || section
  const tipLine = sectionTip(mode, lang)

  return (
    <section className="expert-comptable-card" aria-label={t(lang, 'expertComptaTitle')}>
      <div className="expert-comptable-head">
        <h3>📒 {t(lang, 'expertComptaTitle')}</h3>
        <span className="muted expert-comptable-section">
          {lang === 'ar' ? `لقسم «${shopLabel}»` : `pour « ${shopLabel} »`}
        </span>
      </div>
      <p className="muted expert-comptable-hint">{t(lang, 'expertComptaHint')}</p>
      <div className="expert-comptable-stats">
        <div>
          <span className="muted">{t(lang, 'expertComptaStock')}</span>
          <strong>{formatDa(stock)}</strong>
        </div>
        <div>
          <span className="muted">{t(lang, 'expertComptaCredits')}</span>
          <strong>{formatDa(credits)}</strong>
        </div>
        <div>
          <span className="muted">{t(lang, 'todaySales')}</span>
          <strong>{formatDa(todaySales)}</strong>
        </div>
        <div>
          <span className="muted">
            {lang === 'ar' ? `صافي ${profit.year}` : `Net ${profit.year}`}
          </span>
          <strong>{formatDa(profit.netDa)}</strong>
        </div>
      </div>
      <p className="expert-comptable-tip">{tipLine}</p>
      <button type="button" className="btn block" onClick={onOpen}>
        {t(lang, 'expertComptaCta')}
      </button>
      <details className="expert-comptable-details">
        <summary>{t(lang, 'expertComptaMore')}</summary>
        <pre className="expert-comptable-body">
          {expertAdvice(state, 'accounting', lang)}
        </pre>
      </details>
    </section>
  )
}

function sectionTip(mode: CommerceMode, lang: Language): string {
  if (lang === 'ar') {
    switch (mode) {
      case 'gros':
        return '📦 جملة: فرّق سعر الكرتون / نصف الجملة، وراقب الديون الكبيرة.'
      case 'detail':
        return '🛒 تجزئة: سجّل كل مصروف يومي، وراقب نفاد الرف.'
      case 'sante':
        return '🩺 صحة: افصل أتعاب الأعمال عن الصندوق، واحفظ الوصفات.'
      case 'auto':
        return '🚗 سيارات: رقم كل أمر إصلاح / كراء، وهامش القطع واضح.'
      case 'services':
        return '🧰 خدمات: فوترة بالمهمة أو الحصة، ودفعة مقدمة عند الحجز.'
      default:
        return '📒 سجّل المصاريف يومياً وافصل النقد عن الدين.'
    }
  }
  switch (mode) {
    case 'gros':
      return '📦 Gros : sépare pièce / carton / demi-gros, et plafonne les gros crédits.'
    case 'detail':
      return '🛒 Détail : note chaque dépense du jour et surveille les ruptures rayon.'
    case 'sante':
      return '🩺 Santé : sépare honoraires / caisse, et archive ordonnances & actes.'
    case 'auto':
      return '🚗 Auto : un n° par OR / location, marge pièces clairement notée.'
    case 'services':
      return '🧰 Services : facture à la mission ou à la séance, acompte à la résa.'
    default:
      return '📒 Note les dépenses chaque jour et sépare cash / crédit.'
  }
}
