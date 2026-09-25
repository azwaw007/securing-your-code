import type { AppState, Language } from './types'
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

/**
 * Expert comptable — métriques métier (sans texte d’aide).
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
  const shopLabel = metierCopy(domainId, mode, lang).homeTitle || modeLabel(mode, lang)

  return (
    <section className="expert-comptable-card" aria-label={t(lang, 'expertComptaTitle')}>
      <div className="expert-comptable-head">
        <h3>📒 {shopLabel}</h3>
      </div>
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
      <button
        type="button"
        className="btn block"
        onClick={onOpen}
        aria-label={t(lang, 'expertComptaCta')}
      >
        📒
      </button>
    </section>
  )
}
