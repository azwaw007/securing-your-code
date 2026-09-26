import { useMemo, useState } from 'react'
import type { AppState, Language, Screen } from './types'
import { t } from './i18n'
import { formatDa } from './utils/format'
import {
  DIGITAL_CATALOG,
  addDigitalSale,
  loadDigitalSales,
  productDesc,
  productName,
  formatPeriod,
  whatsappPitch,
  type DigitalProduct,
} from './digital/catalog'
import {
  ADS_CHANNELS,
  ORGANIC_ACTIONS,
  WINNING_IDEAS,
  actionLabel,
  channelTitle,
  ideaNiche,
  type AdsChannelGuide,
} from './digital/playbooks'
import {
  createMicroAgent,
  loadMicroAgents,
  runMicroAgent,
  saveMicroAgents,
  spawnChildAgent,
  type MicroAgent,
} from './digital/agentStudio'
import {
  runCampaignCommand,
  runMetaPublishCommand,
  type CampaignAgentResult,
} from './agent/campaignManager'
import { openWhatsappText } from './utils/whatsapp'

type TabId = 'shop' | 'ads' | 'organic' | 'research' | 'agents'

export function DigitalCockpitPage({
  state,
  lang,
  onFlash,
  onNavigate,
  onCampaignAction,
}: {
  state: AppState
  lang: Language
  onFlash: (msg: string) => void
  onNavigate: (screen: Screen) => void
  onCampaignAction?: (res: CampaignAgentResult) => void
}) {
  const [tab, setTab] = useState<TabId>('shop')
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [selectedId, setSelectedId] = useState(DIGITAL_CATALOG[0]?.id ?? '')
  const [channelId, setChannelId] = useState(ADS_CHANNELS[0]?.id ?? 'meta')
  const [agentName, setAgentName] = useState('')
  const [agentGoal, setAgentGoal] = useState('')
  const [agents, setAgents] = useState<MicroAgent[]>(() => loadMicroAgents())
  const [salesTick, setSalesTick] = useState(0)

  const sales = useMemo(() => loadDigitalSales(), [salesTick])
  const selected = DIGITAL_CATALOG.find((p) => p.id === selectedId)
  const channel = ADS_CHANNELS.find((c) => c.id === channelId) ?? ADS_CHANNELS[0]

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'shop', label: t(lang, 'digitalTabShop') },
    { id: 'ads', label: t(lang, 'digitalTabAds') },
    { id: 'organic', label: t(lang, 'digitalTabOrganic') },
    { id: 'research', label: t(lang, 'digitalTabResearch') },
    { id: 'agents', label: t(lang, 'digitalTabAgents') },
  ]

  async function runCommand(cmd: string) {
    setBusy(true)
    try {
      const pub = await runMetaPublishCommand(cmd, lang)
      const res = pub ?? runCampaignCommand(state, cmd, lang)
      if (!res) {
        setOutput(lang === 'ar' ? 'أمر غير معروف' : 'Commande inconnue')
        return
      }
      setOutput(res.reply)
      onCampaignAction?.(res)
      onFlash(lang === 'ar' ? 'تم التنفيذ' : 'Exécuté')
    } catch (e) {
      setOutput(String(e))
    } finally {
      setBusy(false)
    }
  }

  function sellProduct(p: DigitalProduct, sendWa: boolean) {
    const sale = addDigitalSale({
      productId: p.id,
      productName: productName(p, lang),
      buyerName: buyerName || (lang === 'ar' ? 'زبون' : 'Client'),
      buyerPhone,
      priceDa: p.priceDa,
      status: sendWa ? 'sent' : 'draft',
      note: p.legalNoteFr,
    })
    setSalesTick((n) => n + 1)
    const pitch = whatsappPitch(p, lang, buyerName || undefined)
    setOutput(pitch)
    if (sendWa && buyerPhone.trim()) {
      openWhatsappText(buyerPhone, pitch)
    }
    onFlash(
      lang === 'ar'
        ? `✅ عرض ${sale.productName}`
        : `✅ Offre ${sale.productName}`,
    )
  }

  function onCreateAgent() {
    if (!agentGoal.trim()) {
      onFlash(lang === 'ar' ? 'اكتب هدفاً' : 'Écris un objectif')
      return
    }
    const a = createMicroAgent({ name: agentName || 'Agent', goal: agentGoal })
    setAgents(loadMicroAgents())
    setAgentName('')
    setAgentGoal('')
    const { report, campaignCommand } = runMicroAgent(a, lang)
    setOutput(report)
    if (campaignCommand) void runCommand(campaignCommand)
    onFlash(lang === 'ar' ? 'تم إنشاء الوكيل' : 'Agent créé')
  }

  function onRunAgent(a: MicroAgent) {
    const { report, campaignCommand } = runMicroAgent(a, lang)
    setOutput(report)
    if (campaignCommand) void runCommand(campaignCommand)
  }

  function onSpawnChild(a: MicroAgent) {
    const focus =
      agentGoal.trim() ||
      (lang === 'ar' ? `${a.goal} — تفصيل` : `${a.goal} — focus`)
    const child = spawnChildAgent(a, focus)
    setAgents(loadMicroAgents())
    setOutput(runMicroAgent(child, lang).report)
    onFlash(lang === 'ar' ? 'وكيل فرعي جاهز' : 'Sous-agent prêt')
  }

  function resetAgents() {
    saveMicroAgents([])
    setAgents(loadMicroAgents())
    onFlash(lang === 'ar' ? 'وكلاء افتراضيون' : 'Agents par défaut')
  }

  void state

  return (
    <div className="page digital-cockpit">
      <header className="page-head">
        <div>
          <h1 className="page-title">{t(lang, 'digitalTitle')}</h1>
          <p className="muted">{t(lang, 'digitalHint')}</p>
        </div>
        <button type="button" className="btn ghost" onClick={() => onNavigate('agent')}>
          {t(lang, 'appAgent')}
        </button>
      </header>

      <p className="digital-legal muted">{t(lang, 'digitalLegal')}</p>

      <div className="digital-tabs" role="tablist">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            className={`digital-tab ${tab === tb.id ? 'is-on' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'shop' ? (
        <section className="digital-section">
          <h2>{t(lang, 'digitalCatalog')}</h2>
          <div className="digital-grid">
            {DIGITAL_CATALOG.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`digital-card ${selectedId === p.id ? 'is-on' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <strong>{productName(p, lang)}</strong>
                <span className="muted">{productDesc(p, lang)}</span>
                <span className="digital-price">
                  {p.priceDa <= 0
                    ? lang === 'ar'
                      ? 'مجاني'
                      : 'Gratuit'
                    : `${formatDa(p.priceDa)} ${formatPeriod(p, lang)}`}
                </span>
                {!p.firstParty ? (
                  <span className="digital-warn">{t(lang, 'digitalAffiliate')}</span>
                ) : null}
              </button>
            ))}
          </div>
          {selected ? (
            <div className="digital-sell card-block">
              {(lang === 'ar' ? selected.legalNoteAr : selected.legalNoteFr) ? (
                <p className="digital-warn">
                  {lang === 'ar' ? selected.legalNoteAr : selected.legalNoteFr}
                </p>
              ) : null}
              <label>
                {t(lang, 'digitalBuyer')}
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder={lang === 'ar' ? 'الاسم' : 'Nom'}
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
              <div className="digital-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => sellProduct(selected, true)}
                >
                  {t(lang, 'digitalSendWa')}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => sellProduct(selected, false)}
                >
                  {t(lang, 'digitalDraft')}
                </button>
                {selected.url ? (
                  <a className="btn ghost" href={selected.url} target="_blank" rel="noreferrer">
                    {t(lang, 'digitalOpenLink')}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          <h3>{t(lang, 'digitalSales')}</h3>
          {sales.length === 0 ? (
            <p className="muted">{t(lang, 'digitalNoSales')}</p>
          ) : (
            <ul className="digital-sales">
              {sales.slice(0, 12).map((s) => (
                <li key={s.id}>
                  <strong>{s.productName}</strong> · {s.buyerName} · {formatDa(s.priceDa)} ·{' '}
                  {s.status}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'ads' && channel ? (
        <section className="digital-section">
          <h2>{t(lang, 'digitalAdsTitle')}</h2>
          <div className="digital-chip-row">
            {ADS_CHANNELS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${channelId === c.id ? 'is-on' : ''}`}
                onClick={() => setChannelId(c.id)}
              >
                {channelTitle(c, lang)}
              </button>
            ))}
          </div>
          <ChannelPanel channel={channel} lang={lang} />
        </section>
      ) : null}

      {tab === 'organic' ? (
        <section className="digital-section">
          <h2>{t(lang, 'digitalOrganicTitle')}</h2>
          <p className="muted">{t(lang, 'digitalOrganicHint')}</p>
          <div className="digital-actions wrap">
            {ORGANIC_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`btn ${a.tone === 'primary' ? 'primary' : a.tone === 'accent' ? 'accent' : ''}`}
                disabled={busy}
                onClick={() => void runCommand(a.command)}
              >
                {actionLabel(a, lang)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'research' ? (
        <section className="digital-section">
          <h2>{t(lang, 'digitalResearchTitle')}</h2>
          <p className="muted">{t(lang, 'digitalResearchHint')}</p>
          <div className="digital-grid">
            {WINNING_IDEAS.map((idea) => (
              <article key={idea.id} className="digital-card static">
                <strong>
                  {ideaNiche(idea, lang)}{' '}
                  <span className="muted">
                    {idea.type === 'digital' ? '💻' : '📦'} {idea.score}/100
                  </span>
                </strong>
                <p>{lang === 'ar' ? idea.whyAr : idea.whyFr}</p>
                <ul>
                  {(lang === 'ar' ? idea.strategyAr : idea.strategyFr).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const a = createMicroAgent({
                      name: ideaNiche(idea, lang),
                      goal: lang === 'ar' ? idea.whyAr : idea.whyFr,
                      kind: 'research',
                    })
                    setAgents(loadMicroAgents())
                    setOutput(runMicroAgent(a, lang).report)
                    setTab('agents')
                  }}
                >
                  {t(lang, 'digitalMakeAgent')}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'agents' ? (
        <section className="digital-section">
          <h2>{t(lang, 'digitalAgentsTitle')}</h2>
          <p className="muted">{t(lang, 'digitalAgentsHint')}</p>
          <div className="digital-sell card-block">
            <label>
              {t(lang, 'digitalAgentName')}
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: وكيل تيك توك' : 'Ex. Agent TikTok'}
              />
            </label>
            <label>
              {t(lang, 'digitalAgentGoal')}
              <input
                value={agentGoal}
                onChange={(e) => setAgentGoal(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'أريد بيع تراخيص AZ POS بالولايات'
                    : 'Je veux vendre des licences AZ POS par wilaya'
                }
              />
            </label>
            <div className="digital-actions">
              <button type="button" className="btn primary" onClick={onCreateAgent}>
                {t(lang, 'digitalCreateAgent')}
              </button>
              <button type="button" className="btn ghost" onClick={resetAgents}>
                {t(lang, 'digitalResetAgents')}
              </button>
            </div>
          </div>
          <div className="digital-grid">
            {agents.map((a) => (
              <article key={a.id} className="digital-card static">
                <strong>{a.name}</strong>
                <span className="muted">
                  {a.kind} · {a.goal}
                </span>
                <div className="digital-actions">
                  <button type="button" className="btn primary" onClick={() => onRunAgent(a)}>
                    {t(lang, 'digitalRunAgent')}
                  </button>
                  <button type="button" className="btn" onClick={() => onSpawnChild(a)}>
                    {t(lang, 'digitalSpawnAgent')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {output ? (
        <section className="digital-output card-block">
          <div className="digital-output-head">
            <h3>{t(lang, 'digitalOutput')}</h3>
            <button type="button" className="btn ghost" onClick={() => setOutput('')}>
              {t(lang, 'cancel')}
            </button>
          </div>
          <pre className="digital-pre">{output}</pre>
        </section>
      ) : null}
    </div>
  )
}

function ChannelPanel({
  channel,
  lang,
}: {
  channel: AdsChannelGuide
  lang: Language
}) {
  const steps = lang === 'ar' ? channel.stepsAr : channel.stepsFr
  return (
    <div className="digital-channel card-block">
      <h3>{channelTitle(channel, lang)}</h3>
      <p>{lang === 'ar' ? channel.summaryAr : channel.summaryFr}</p>
      <ol>
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="digital-tip">
        💡 {lang === 'ar' ? channel.freeTipAr : channel.freeTipFr}
      </p>
    </div>
  )
}
