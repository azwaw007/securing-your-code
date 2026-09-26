import { useMemo, useState } from 'react'
import type { Language, Screen } from './types'
import { t } from './i18n'
import {
  CRM_TOOLS,
  CRM_TOOL_KINDS,
  crmPricingLabel,
  crmToolHint,
  crmToolName,
  type CrmTool,
  type CrmToolKind,
} from './crm/crmTools'

/** Grille d’icônes CRM — modules app + outils gratuits (métier CRM seulement) */
export function CrmToolsHub({
  lang,
  onNavigate,
  onFlash,
  compact,
}: {
  lang: Language
  onNavigate: (screen: Screen, label?: string) => void
  onFlash?: (msg: string) => void
  compact?: boolean
}) {
  const [kind, setKind] = useState<CrmToolKind | 'all'>('all')
  const loc = lang === 'ar' ? 'ar' : 'fr'

  const list = useMemo(() => {
    if (kind === 'all') return CRM_TOOLS
    return CRM_TOOLS.filter((x) => x.kind === kind)
  }, [kind])

  function openTool(tool: CrmTool) {
    if (tool.screen) {
      onNavigate(tool.screen, crmToolName(tool, loc))
      return
    }
    if (tool.url) {
      window.open(tool.url, '_blank', 'noopener,noreferrer')
      onFlash?.(
        lang === 'ar' ? `فتح ${tool.nameAr}` : `Ouverture ${tool.nameFr}`,
      )
    }
  }

  return (
    <section className={`ecom-tools-hub crm-tools-hub ${compact ? 'is-compact' : ''}`}>
      {!compact ? (
        <>
          <h2>{t(lang, 'crmToolsTitle')}</h2>
          <p className="muted">{t(lang, 'crmToolsHint')}</p>
        </>
      ) : (
        <div className="ecom-tools-head">
          <h3>{t(lang, 'crmToolsTitle')}</h3>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onNavigate('clients', t(lang, 'appClients'))}
          >
            {t(lang, 'crmToolsOpenClients')}
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
        {CRM_TOOL_KINDS.map((k) => (
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
            title={crmToolHint(tool, loc)}
            onClick={() => openTool(tool)}
          >
            <span className="ecom-tool-emoji" aria-hidden>
              {tool.icon}
            </span>
            <span className="ecom-tool-name">{crmToolName(tool, loc)}</span>
            <span className="ecom-tool-badge">
              {crmPricingLabel(tool.pricing, loc)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
