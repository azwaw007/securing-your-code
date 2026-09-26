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
import { openWhatsappText } from './utils/whatsapp'
import { ReferralPanel } from './ReferralPanel'
import {
  creditReferralConversion,
  ensureReferral,
} from './license/referral'
import {
  disconnectPlatform,
  fieldLabel,
  getConnection,
  loadImportedProducts,
  platformById,
  platformHint,
  platformRegion,
  platformsForMode,
  syncSampleCatalog,
  testConnection,
  whatsappCommercePitch,
  type CommercePlatform,
  type ImportedCommerceProduct,
} from './digital/platforms'

type TabId = 'shop' | 'affiliate' | 'dropship' | 'referral'

export function DigitalCockpitPage({
  state,
  lang,
  onState,
  onFlash,
  onNavigate,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  onNavigate: (screen: Screen) => void
}) {
  const [tab, setTab] = useState<TabId>('shop')
  const [output, setOutput] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [saleReferrer, setSaleReferrer] = useState('')
  const [selectedId, setSelectedId] = useState(DIGITAL_CATALOG[0]?.id ?? '')
  const [salesTick, setSalesTick] = useState(0)
  const [importTick, setImportTick] = useState(0)

  const sales = useMemo(() => loadDigitalSales(), [salesTick])
  const imported = useMemo(() => loadImportedProducts(), [importTick])
  const selected = DIGITAL_CATALOG.find((p) => p.id === selectedId)

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'shop', label: t(lang, 'digitalTabShop') },
    { id: 'referral', label: t(lang, 'digitalTabReferral') },
    { id: 'affiliate', label: t(lang, 'digitalTabAffiliate') },
    { id: 'dropship', label: t(lang, 'digitalTabDropship') },
  ]

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
    if (p.firstParty && p.kind === 'license' && p.priceDa > 0) {
      const ensured = ensureReferral(state)
      const code = saleReferrer.trim().toUpperCase() || ensured.referral?.code
      if (code && code === ensured.referral?.code) {
        const credited = creditReferralConversion(ensured, {
          buyerName: sale.buyerName,
          buyerPhone: sale.buyerPhone,
          planId: p.id,
          note: 'vente_digitale_auto',
          referrerCode: code,
        })
        if (credited.ok) {
          onState(credited.state)
          onFlash(
            (lang === 'ar' ? credited.messageAr : credited.messageFr) +
              (lang === 'ar' ? ' · عرض مرسل' : ' · offre envoyée'),
          )
          return
        }
      }
    }
    onFlash(
      lang === 'ar'
        ? `✅ عرض ${sale.productName}`
        : `✅ Offre ${sale.productName}`,
    )
  }

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
              {selected.firstParty && selected.kind === 'license' ? (
                <label>
                  {t(lang, 'referralCodeOnActivate')}
                  <input
                    value={saleReferrer}
                    onChange={(e) => setSaleReferrer(e.target.value.toUpperCase())}
                    placeholder={ensureReferral(state).referral?.code || 'AZ-XXXX'}
                  />
                </label>
              ) : null}
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

      {tab === 'referral' ? (
        <ReferralPanel
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}

      {tab === 'affiliate' ? (
        <CommerceModePanel
          mode="affiliate"
          lang={lang}
          buyerName={buyerName}
          buyerPhone={buyerPhone}
          setBuyerName={setBuyerName}
          setBuyerPhone={setBuyerPhone}
          imported={imported.filter((p) => p.mode === 'affiliate')}
          onFlash={onFlash}
          onOutput={setOutput}
          onImportChange={() => setImportTick((n) => n + 1)}
        />
      ) : null}

      {tab === 'dropship' ? (
        <CommerceModePanel
          mode="dropship"
          lang={lang}
          buyerName={buyerName}
          buyerPhone={buyerPhone}
          setBuyerName={setBuyerName}
          setBuyerPhone={setBuyerPhone}
          imported={imported.filter((p) => p.mode === 'dropship')}
          onFlash={onFlash}
          onOutput={setOutput}
          onImportChange={() => setImportTick((n) => n + 1)}
        />
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

function CommerceModePanel({
  mode,
  lang,
  buyerName,
  buyerPhone,
  setBuyerName,
  setBuyerPhone,
  imported,
  onFlash,
  onOutput,
  onImportChange,
}: {
  mode: 'affiliate' | 'dropship'
  lang: Language
  buyerName: string
  buyerPhone: string
  setBuyerName: (v: string) => void
  setBuyerPhone: (v: string) => void
  imported: ImportedCommerceProduct[]
  onFlash: (msg: string) => void
  onOutput: (msg: string) => void
  onImportChange: () => void
}) {
  const list = platformsForMode(mode)
  const [platformId, setPlatformId] = useState(list[0]?.id ?? 'taager')
  const platform = platformById(platformId) ?? list[0]
  const existing = getConnection(platformId)
  const [creds, setCreds] = useState<Record<string, string>>(() => ({
    ...(existing?.credentials || {}),
  }))
  const [busy, setBusy] = useState(false)
  const [pickSku, setPickSku] = useState('')

  function selectPlatform(id: string) {
    setPlatformId(id)
    const c = getConnection(id)
    setCreds({ ...(c?.credentials || {}) })
  }

  async function onTest() {
    if (!platform) return
    setBusy(true)
    try {
      const res = await testConnection(platform.id, creds, lang)
      onOutput(res.message)
      onFlash(res.ok ? (lang === 'ar' ? 'تم الربط' : 'Connecté') : res.message)
    } finally {
      setBusy(false)
    }
  }

  function onSync() {
    const res = syncSampleCatalog(platformId, mode, lang)
    onOutput(res.message)
    onFlash(res.message)
    if (res.ok) onImportChange()
  }

  function onDisconnect() {
    disconnectPlatform(platformId)
    setCreds({})
    onImportChange()
    onFlash(lang === 'ar' ? 'تم قطع الاتصال' : 'Déconnecté')
  }

  function pitchProduct(p: ImportedCommerceProduct) {
    const msg = whatsappCommercePitch(p, lang, buyerName || undefined)
    onOutput(msg)
    if (buyerPhone.trim()) openWhatsappText(buyerPhone, msg)
    onFlash(lang === 'ar' ? 'تم إرسال العرض' : 'Offre envoyée')
  }

  const status = getConnection(platformId)?.status

  return (
    <section className="digital-section">
      <h2>
        {mode === 'affiliate'
          ? t(lang, 'digitalAffiliateTitle')
          : t(lang, 'digitalDropshipTitle')}
      </h2>
      <p className="muted">
        {mode === 'affiliate'
          ? t(lang, 'digitalAffiliateHint')
          : t(lang, 'digitalDropshipHint')}
      </p>
      <p className="digital-tip">{t(lang, 'digitalApiProxyNote')}</p>

      <div className="digital-chip-row">
        {list.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip ${platformId === p.id ? 'is-on' : ''}`}
            onClick={() => selectPlatform(p.id)}
          >
            {p.name}
            {getConnection(p.id)?.status === 'ok' ? ' ✓' : ''}
          </button>
        ))}
      </div>

      {platform ? (
        <PlatformConnectForm
          platform={platform}
          lang={lang}
          creds={creds}
          setCreds={setCreds}
          status={status}
          busy={busy}
          onTest={() => void onTest()}
          onSync={onSync}
          onDisconnect={onDisconnect}
        />
      ) : null}

      <h3>{t(lang, 'digitalImported')}</h3>
      {imported.length === 0 ? (
        <p className="muted">{t(lang, 'digitalNoImported')}</p>
      ) : (
        <>
          <div className="digital-sell card-block">
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
          </div>
          <div className="digital-grid">
            {imported.map((p) => (
              <article
                key={p.id}
                className={`digital-card static ${pickSku === p.sku ? 'is-on' : ''}`}
              >
                <strong onClick={() => setPickSku(p.sku)}>{p.title}</strong>
                <span className="muted">
                  {platformById(p.platformId)?.name} · {p.sku}
                </span>
                <span className="digital-price">
                  {mode === 'affiliate'
                    ? `${p.commissionPct ?? '—'}% ${lang === 'ar' ? 'عمولة' : 'comm.'}`
                    : `${formatDa(p.priceDa)} · ${lang === 'ar' ? 'تكلفة' : 'coût'} ${formatDa(p.costDa)}`}
                </span>
                <button type="button" className="btn primary" onClick={() => pitchProduct(p)}>
                  {t(lang, 'digitalSendWa')}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function PlatformConnectForm({
  platform,
  lang,
  creds,
  setCreds,
  status,
  busy,
  onTest,
  onSync,
  onDisconnect,
}: {
  platform: CommercePlatform
  lang: Language
  creds: Record<string, string>
  setCreds: (c: Record<string, string>) => void
  status?: string
  busy: boolean
  onTest: () => void
  onSync: () => void
  onDisconnect: () => void
}) {
  return (
    <div className="digital-sell card-block">
      <div className="digital-platform-head">
        <div>
          <h3>{platform.name}</h3>
          <p className="muted">{platformRegion(platform, lang)}</p>
        </div>
        <span className={`digital-status digital-status-${status || 'disconnected'}`}>
          {status === 'ok'
            ? lang === 'ar'
              ? 'موصول'
              : 'Connecté'
            : status === 'error'
              ? lang === 'ar'
                ? 'خطأ'
                : 'Erreur'
              : lang === 'ar'
                ? 'غير موصول'
                : 'Déconnecté'}
        </span>
      </div>
      <p className="muted">{platformHint(platform, lang)}</p>
      {platform.docsUrl ? (
        <a href={platform.docsUrl} target="_blank" rel="noreferrer" className="btn ghost">
          {t(lang, 'digitalOpenDocs')}
        </a>
      ) : null}
      {platform.fields.map((f) => (
        <label key={f.key}>
          {fieldLabel(f, lang)}
          {f.required ? ' *' : ''}
          <input
            type={f.secret ? 'password' : 'text'}
            autoComplete="off"
            value={creds[f.key] || ''}
            placeholder={f.placeholder}
            onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })}
          />
        </label>
      ))}
      <div className="digital-actions">
        <button type="button" className="btn primary" disabled={busy} onClick={onTest}>
          {t(lang, 'digitalTestApi')}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={onSync}>
          {t(lang, 'digitalSyncCatalog')}
        </button>
        <button type="button" className="btn ghost" onClick={onDisconnect}>
          {t(lang, 'digitalDisconnect')}
        </button>
      </div>
    </div>
  )
}
