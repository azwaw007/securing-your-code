import { useMemo, useState } from 'react'
import type { Language } from './types'
import { t } from './i18n'
import { formatDa } from './utils/format'
import { COUNTRIES } from './data/countries'
import { WILAYAS } from './data/wilayas'
import { isRtl } from './locale/langs'
import {
  paymentsForCountry,
  paymentLabel,
  type CountryPaymentId,
} from './digital/countryPayments'
import {
  addLead,
  buildWhatsappOrderMessage,
  defaultLandingConfig,
  exportLandingHtml,
  loadLandingConfig,
  loadLeads,
  saveLandingConfig,
  updateLeadStatus,
  type LeadLandingConfig,
  type LandingLead,
} from './digital/leadLanding'
import { openWhatsappText } from './utils/whatsapp'

export function LeadLandingPanel({
  lang,
  countryCode,
  shopName,
  shopPhone,
  onFlash,
  onOutput,
}: {
  lang: Language
  countryCode: string
  shopName: string
  shopPhone: string
  onFlash: (msg: string) => void
  onOutput: (msg: string) => void
}) {
  const [cfg, setCfg] = useState<LeadLandingConfig>(() => {
    const loaded = loadLandingConfig()
    return {
      ...loaded,
      countryCode: loaded.countryCode || countryCode || 'DZ',
      brandName: loaded.brandName || shopName || loaded.brandName,
      whatsapp: loaded.whatsapp || shopPhone.replace(/\D/g, '') || '',
    }
  })
  const [leadsTick, setLeadsTick] = useState(0)
  const leads = useMemo(() => loadLeads(), [leadsTick])
  const loc = lang === 'ar' ? 'ar' : 'fr'

  // Preview form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [wilayaCode, setWilayaCode] = useState('')
  const [address, setAddress] = useState('')
  const [qty, setQty] = useState(1)
  const [paymentId, setPaymentId] = useState<string>('cod')
  const [note, setNote] = useState('')

  const countryPays = paymentsForCountry(cfg.countryCode)
  const enabledPays = countryPays.filter(
    (p) =>
      cfg.enabledPayments.includes(p.id) &&
      (cfg.codEnabled || p.id !== 'cod'),
  )

  function patchCfg(partial: Partial<LeadLandingConfig>) {
    const next = saveLandingConfig(partial)
    setCfg(next)
  }

  function onCountryChange(code: string) {
    const pays = paymentsForCountry(code)
    patchCfg({
      countryCode: code,
      useWilayas: code === 'DZ',
      enabledPayments: pays.map((p) => p.id) as CountryPaymentId[],
      currency:
        COUNTRIES.find((c) => c.code === code)?.currency || cfg.currency,
    })
    setPaymentId(pays[0]?.id || 'cod')
  }

  function togglePayment(id: CountryPaymentId) {
    const set = new Set(cfg.enabledPayments)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    const list = [...set] as CountryPaymentId[]
    if (list.length === 0) return
    patchCfg({ enabledPayments: list })
  }

  function submitLead(sendWa: boolean) {
    if (!name.trim() || !phone.trim()) {
      onFlash(lang === 'ar' ? 'الاسم والهاتف مطلوبان' : 'Nom et téléphone requis')
      return
    }
    const w = WILAYAS.find((x) => x.code === wilayaCode)
    const wilayaLabel = w
      ? isRtl(lang)
        ? w.nameAr
        : w.name
      : wilayaCode
    const pay = enabledPays.find((p) => p.id === paymentId) || enabledPays[0]
    if (!pay) {
      onFlash(lang === 'ar' ? 'اختر طريقة دفع' : 'Choisis un paiement')
      return
    }
    const lead = addLead({
      name,
      phone,
      wilaya: wilayaLabel,
      wilayaCode: wilayaCode || '',
      address,
      qty,
      paymentId: pay.id,
      paymentLabel: paymentLabel(pay, loc),
      productName: cfg.productName,
      priceDa: cfg.priceDa * qty,
      note,
      source: 'preview',
    })
    setLeadsTick((n) => n + 1)
    const msg = buildWhatsappOrderMessage(lead, loc)
    onOutput(msg)
    if (sendWa && cfg.whatsapp) {
      openWhatsappText(cfg.whatsapp, msg)
    }
    onFlash(lang === 'ar' ? 'تم تسجيل الطلب' : 'Lead enregistré')
    setName('')
    setPhone('')
    setNote('')
  }

  function downloadHtml() {
    const html = exportLandingHtml(cfg, loc)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `landing-${cfg.brandName.replace(/\s+/g, '-').toLowerCase() || 'boutique'}.html`
    a.click()
    URL.revokeObjectURL(url)
    onFlash(lang === 'ar' ? 'تم تنزيل صفحة الهبوط' : 'Landing HTML téléchargée')
  }

  return (
    <section className="digital-section">
      <h2>{t(lang, 'digitalLandingTitle')}</h2>
      <p className="muted">{t(lang, 'digitalLandingHint')}</p>

      <div className="digital-sell card-block">
        <h3>{t(lang, 'digitalLandingConfig')}</h3>
        <label>
          {t(lang, 'digitalBrandBoutique')}
          <input
            value={cfg.brandName}
            onChange={(e) => patchCfg({ brandName: e.target.value })}
          />
        </label>
        <label>
          {t(lang, 'digitalLandingProduct')}
          <input
            value={cfg.productName}
            onChange={(e) => patchCfg({ productName: e.target.value })}
          />
        </label>
        <label>
          {t(lang, 'digitalLandingPrice')}
          <input
            type="number"
            min={0}
            value={cfg.priceDa}
            onChange={(e) => patchCfg({ priceDa: Number(e.target.value) || 0 })}
          />
        </label>
        <label>
          {lang === 'ar' ? 'العنوان' : 'Titre'}
          <input
            value={lang === 'ar' ? cfg.titleAr : cfg.titleFr}
            onChange={(e) =>
              patchCfg(
                lang === 'ar'
                  ? { titleAr: e.target.value }
                  : { titleFr: e.target.value },
              )
            }
          />
        </label>
        <label>
          {lang === 'ar' ? 'الوصف' : 'Sous-titre'}
          <input
            value={lang === 'ar' ? cfg.subtitleAr : cfg.subtitleFr}
            onChange={(e) =>
              patchCfg(
                lang === 'ar'
                  ? { subtitleAr: e.target.value }
                  : { subtitleFr: e.target.value },
              )
            }
          />
        </label>
        <label>
          {t(lang, 'digitalLandingCountry')}
          <select
            value={cfg.countryCode}
            onChange={(e) => onCountryChange(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {lang === 'ar' ? c.nameAr : c.nameFr} ({c.currency})
              </option>
            ))}
          </select>
        </label>
        <label>
          WhatsApp {lang === 'ar' ? 'البائع' : 'vendeur'}
          <input
            value={cfg.whatsapp}
            onChange={(e) => patchCfg({ whatsapp: e.target.value })}
            placeholder="213555…"
            inputMode="tel"
          />
        </label>
        <label className="digital-check">
          <input
            type="checkbox"
            checked={cfg.codEnabled}
            onChange={(e) => patchCfg({ codEnabled: e.target.checked })}
          />{' '}
          {t(lang, 'digitalLandingCod')}
        </label>
        <label className="digital-check">
          <input
            type="checkbox"
            checked={cfg.useWilayas}
            onChange={(e) => patchCfg({ useWilayas: e.target.checked })}
            disabled={cfg.countryCode !== 'DZ'}
          />{' '}
          {t(lang, 'digitalLandingWilayas')}
        </label>

        <h3>{t(lang, 'digitalLandingPayments')}</h3>
        <p className="muted">{t(lang, 'digitalLandingPaymentsHint')}</p>
        <div className="digital-chip-row">
          {countryPays.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chip ${cfg.enabledPayments.includes(p.id) && (cfg.codEnabled || p.id !== 'cod') ? 'is-on' : ''}`}
              onClick={() => {
                if (p.id === 'cod') {
                  patchCfg({ codEnabled: !cfg.codEnabled })
                  if (!cfg.codEnabled && !cfg.enabledPayments.includes('cod')) {
                    togglePayment('cod')
                  }
                  return
                }
                togglePayment(p.id)
              }}
            >
              {p.icon} {paymentLabel(p, loc)}
            </button>
          ))}
        </div>

        <div className="digital-actions wrap">
          <button type="button" className="btn primary" onClick={downloadHtml}>
            {t(lang, 'digitalLandingExport')}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              const reset = defaultLandingConfig({
                countryCode: cfg.countryCode,
                brandName: shopName,
                whatsapp: shopPhone.replace(/\D/g, ''),
              })
              saveLandingConfig(reset)
              setCfg(reset)
              onFlash(lang === 'ar' ? 'تمت إعادة الضبط' : 'Réinitialisé')
            }}
          >
            {t(lang, 'digitalResetAgents')}
          </button>
        </div>
      </div>

      <div className="digital-sell card-block">
        <h3>{t(lang, 'digitalLandingPreview')}</h3>
        <p className="digital-tip">
          {cfg.brandName} · {cfg.productName} · {formatDa(cfg.priceDa)}{' '}
          {cfg.currency}
        </p>
        <label>
          {t(lang, 'digitalBuyer')}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {t(lang, 'digitalPhone')}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
        </label>
        {cfg.useWilayas ? (
          <label>
            {t(lang, 'wilaya')} (69)
            <select
              value={wilayaCode}
              onChange={(e) => setWilayaCode(e.target.value)}
            >
              <option value="">{t(lang, 'wilayaPick')}</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} · {isRtl(lang) ? w.nameAr : w.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            {lang === 'ar' ? 'المدينة' : 'Ville'}
            <input
              value={wilayaCode}
              onChange={(e) => setWilayaCode(e.target.value)}
            />
          </label>
        )}
        <label>
          {lang === 'ar' ? 'العنوان' : 'Adresse'}
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          {lang === 'ar' ? 'الكمية' : 'Quantité'}
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label>
          {t(lang, 'digitalLandingPayMethod')}
          <select
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
          >
            {enabledPays.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {paymentLabel(p, loc)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {lang === 'ar' ? 'ملاحظة' : 'Note'}
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="digital-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => submitLead(true)}
          >
            {t(lang, 'digitalLandingSubmitWa')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => submitLead(false)}
          >
            {t(lang, 'digitalDraft')}
          </button>
        </div>
      </div>

      <h3>{t(lang, 'digitalLandingLeads')}</h3>
      {leads.length === 0 ? (
        <p className="muted">{t(lang, 'digitalLandingNoLeads')}</p>
      ) : (
        <ul className="digital-sales">
          {leads.slice(0, 20).map((l) => (
            <LeadRow
              key={l.id}
              lead={l}
              lang={lang}
              onStatus={(s) => {
                updateLeadStatus(l.id, s)
                setLeadsTick((n) => n + 1)
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function LeadRow({
  lead,
  lang,
  onStatus,
}: {
  lead: LandingLead
  lang: Language
  onStatus: (s: LandingLead['status']) => void
}) {
  return (
    <li>
      <strong>{lead.name}</strong> · {lead.phone} · {lead.wilaya} ·{' '}
      {lead.paymentLabel} · ×{lead.qty} · {formatDa(lead.priceDa)} ·{' '}
      <select
        value={lead.status}
        onChange={(e) => onStatus(e.target.value as LandingLead['status'])}
      >
        <option value="new">{lang === 'ar' ? 'جديد' : 'Nouveau'}</option>
        <option value="contacted">{lang === 'ar' ? 'تم الاتصال' : 'Contacté'}</option>
        <option value="confirmed">{lang === 'ar' ? 'مؤكد' : 'Confirmé'}</option>
        <option value="cancelled">{lang === 'ar' ? 'ملغى' : 'Annulé'}</option>
      </select>
    </li>
  )
}
