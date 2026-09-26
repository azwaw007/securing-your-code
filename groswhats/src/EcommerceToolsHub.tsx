import { useMemo, useState } from 'react'
import type { Language, Screen } from './types'
import { t } from './i18n'
import {
  ECOMMERCE_TOOLS,
  ECOMMERCE_TOOL_KINDS,
  pricingLabel,
  toolHint,
  toolName,
  type EcommerceTool,
  type EcommerceToolKind,
} from './digital/ecommerceTools'

/** Grille d’icônes — outils e-commerce gratuits / freemium / open source */
export function EcommerceToolsHub({
  lang,
  onNavigate,
  onFlash,
  compact,
}: {
  lang: Language
  onNavigate: (screen: Screen) => void
  onFlash?: (msg: string) => void
  /** Version accueil (moins de texte) */
  compact?: boolean
}) {
  const [kind, setKind] = useState<EcommerceToolKind | 'all'>('all')
  const loc = lang === 'ar' ? 'ar' : 'fr'

  const list = useMemo(() => {
    if (kind === 'all') return ECOMMERCE_TOOLS
    return ECOMMERCE_TOOLS.filter((x) => x.kind === kind)
  }, [kind])

  function openTool(tool: EcommerceTool) {
    if (tool.internal === 'digital') {
      onNavigate('digital')
      return
    }
    if (tool.internal === 'ads' || tool.internal === 'organic' || tool.internal === 'social') {
      onNavigate('digital')
      onFlash?.(
        lang === 'ar'
          ? 'افتح تبويب الإعلانات / الشبكات في AZ Digital'
          : 'Ouvre l’onglet Pubs / réseaux dans AZ Digital',
      )
      return
    }
    if (tool.internal === 'affiliate' || tool.internal === 'dropship') {
      onNavigate('digital')
      onFlash?.(
        lang === 'ar'
          ? tool.internal === 'affiliate'
            ? 'افتح تبويب العمولة'
            : 'افتح تبويب الدروبشيبينغ'
          : tool.internal === 'affiliate'
            ? 'Ouvre l’onglet Affilié'
            : 'Ouvre l’onglet Dropshipping',
      )
      return
    }
    if (tool.url) {
      window.open(tool.url, '_blank', 'noopener,noreferrer')
      onFlash?.(
        lang === 'ar'
          ? `فتح ${tool.nameAr}`
          : `Ouverture ${tool.nameFr}`,
      )
    }
  }

  return (
    <section className={`ecom-tools-hub ${compact ? 'is-compact' : ''}`}>
      {!compact ? (
        <>
          <h2>{t(lang, 'ecomToolsTitle')}</h2>
          <p className="muted">{t(lang, 'ecomToolsHint')}</p>
        </>
      ) : (
        <div className="ecom-tools-head">
          <h3>{t(lang, 'ecomToolsTitle')}</h3>
          <button type="button" className="btn ghost" onClick={() => onNavigate('digital')}>
            {t(lang, 'ecomToolsOpenDigital')}
          </button>
        </div>
      )}

      <div className="digital-chip-row ecom-kind-row" role="tablist">
        <button
          type="button"
          role="tab"
          className={`chip ${kind === 'all' ? 'is-on' : ''}`}
          onClick={() => setKind('all')}
        >
          {lang === 'ar' ? 'الكل' : 'Tous'}
        </button>
        {ECOMMERCE_TOOL_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            className={`chip ${kind === k.id ? 'is-on' : ''}`}
            onClick={() => setKind(k.id)}
          >
            {lang === 'ar' ? k.labelAr : k.labelFr}
          </button>
        ))}
      </div>

      <div className="ecom-tools-grid" role="list">
        {list.map((tool) => (
          <button
            key={tool.id}
            type="button"
            role="listitem"
            className="ecom-tool-icon"
            title={toolHint(tool, loc)}
            onClick={() => openTool(tool)}
          >
            <span className="ecom-tool-emoji" aria-hidden>
              {tool.icon}
            </span>
            <span className="ecom-tool-name">{toolName(tool, loc)}</span>
            <span className="ecom-tool-badge">
              {pricingLabel(tool.pricing, loc)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
