import { useMemo, useState } from 'react'
import type { CommerceMode, Language } from './types'
import { COUNTRIES } from './data/countries'
import {
  COMMERCE_MODES,
  domainsForMode,
  domainName,
  modeHint,
  modeLabel,
} from './data/domains'
import { t } from './i18n'
import { DzPhoneInput } from './DzFields'
import { LanguagePicker } from './locale/LanguagePicker'
import { countryByCode } from './data/countries'
import { defaultLang, isRtl, LANG_SHORT } from './locale/langs'
import type { ShopSetupInput } from './store'
import { domainById } from './data/domains'

export function SetupWizard({
  lang,
  existingProducts,
  onDone,
  onCancel,
  initial,
  startStep = 0,
}: {
  lang: Language
  existingProducts: number
  onDone: (input: ShopSetupInput) => void
  onCancel?: () => void
  startStep?: number
  initial?: {
    countryCode?: string
    commerceMode?: CommerceMode
    domainId?: string
    shopName?: string
    phone?: string
  }
}) {
  const [step, setStep] = useState(startStep)
  const [q, setQ] = useState('')
  const [countryCode, setCountryCode] = useState(initial?.countryCode || 'DZ')
  const [mode, setMode] = useState<CommerceMode>(initial?.commerceMode || 'gros')
  const [domainId, setDomainId] = useState(initial?.domainId || 'gros-alimentaire')
  const [shopName, setShopName] = useState(initial?.shopName || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [language, setLanguage] = useState<Language>(lang)
  const [replaceCatalog, setReplaceCatalog] = useState(true)
  const initialDomain = initial?.domainId

  const countries = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = n
      ? COUNTRIES.filter(
          (c) =>
            c.nameFr.toLowerCase().includes(n) ||
            c.nameAr.includes(n) ||
            c.code.toLowerCase() === n,
        )
      : [...COUNTRIES].sort((a, b) => Number(!!b.popular) - Number(!!a.popular))
    return list
  }, [q])

  const domains = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = domainsForMode(mode)
    if (!n) return list
    return list.filter(
      (d) =>
        d.nameFr.toLowerCase().includes(n) ||
        d.nameAr.includes(n),
    )
  }, [mode, q])

  const domainChanged =
    !!initialDomain && initialDomain !== domainId && existingProducts > 0
  const mustReplace = existingProducts === 0 || domainChanged || replaceCatalog

  function pickDomain(id: string) {
    setDomainId(id)
    if (existingProducts > 0 && id !== initialDomain) setReplaceCatalog(true)
  }

  function nextFromCountry() {
    setQ('')
    setStep(1)
  }

  function nextFromMode(id: CommerceMode) {
    setMode(id)
    const first = domainsForMode(id)[0]
    if (first) {
      setDomainId(first.id)
      if (existingProducts > 0 && first.id !== initialDomain) setReplaceCatalog(true)
    }
    setQ('')
    setStep(2)
  }

  return (
    <div className="page setup-wizard">
      <div className="card">
        <div className="muted">AZ POS · {step + 1}/4</div>
        {step === 0 ? (
          <>
            <h2>{t(language, 'setupCountry')}</h2>
            <p className="muted">{t(language, 'setupCountryHint')}</p>
            <input
              className="setup-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(language, 'setupSearch')}
            />
            <div className="setup-grid">
              {countries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`choice-card ${countryCode === c.code ? 'active' : ''}`}
                  onClick={() => {
                    setCountryCode(c.code)
                    setLanguage(defaultLang(c.code))
                  }}
                >
                  <strong>{isRtl(language) ? c.nameAr : c.nameFr}</strong>
                  <span className="muted">
                    {c.currency} · {c.langs.map((l) => LANG_SHORT[l]).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
            <button className="btn block" onClick={nextFromCountry}>
              {t(language, 'setupNext')}
            </button>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2>{t(language, 'setupMode')}</h2>
            <p className="muted">{t(language, 'setupModeHint')}</p>
            <div className="setup-grid">
              {COMMERCE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`choice-card ${mode === m.id ? 'active' : ''}`}
                  onClick={() => nextFromMode(m.id)}
                >
                  <span className="choice-emoji">{m.icon}</span>
                  <strong>{modeLabel(m.id, language)}</strong>
                  <span className="muted">{modeHint(m.id, language)}</span>
                </button>
              ))}
            </div>
            <button className="btn ghost block" onClick={() => setStep(0)}>
              {t(language, 'back')}
            </button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2>{t(language, 'setupDomain')}</h2>
            <p className="muted">{t(language, 'setupDomainHint')}</p>
            <input
              className="setup-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(language, 'setupSearch')}
            />
            <div className="setup-grid">
              {domains.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`choice-card ${domainId === d.id ? 'active' : ''}`}
                  onClick={() => pickDomain(d.id)}
                >
                  <span className="choice-emoji">{d.icon}</span>
                  <strong>{domainName(d, language)}</strong>
                </button>
              ))}
            </div>
            <button className="btn block" onClick={() => { setQ(''); setStep(3) }}>
              {t(language, 'setupNext')}
            </button>
            <button className="btn ghost block" onClick={() => setStep(1)}>
              {t(language, 'back')}
            </button>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2>{t(language, 'setupShop')}</h2>
            <div className="field">
              <label>{t(language, 'shopName')}</label>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={domainName(domainById(domainId), language)}
              />
            </div>
            <div className="field">
              <label>{t(language, 'phone')}</label>
              <DzPhoneInput
                value={phone}
                onChange={setPhone}
                countryCode={countryCode}
                placeholder={countryByCode(countryCode).phoneHint}
              />
            </div>
            <div className="field">
              <label>{t(language, 'language')}</label>
              <LanguagePicker
                lang={language}
                value={language}
                countryCode={countryCode}
                onChange={setLanguage}
              />
            </div>
            {existingProducts > 0 ? (
              <>
                {domainChanged ? (
                  <p className="notice">{t(language, 'setupDomainChangeHint')}</p>
                ) : null}
                <label className="field check-row">
                  <input
                    type="checkbox"
                    checked={mustReplace}
                    disabled={domainChanged}
                    onChange={(e) => setReplaceCatalog(e.target.checked)}
                  />
                  <span>{t(language, 'setupReplace')}</span>
                </label>
              </>
            ) : (
              <p className="muted">{t(language, 'setupCatalogHint')}</p>
            )}
            <button
              className="btn block"
              onClick={() =>
                onDone({
                  countryCode,
                  commerceMode: mode,
                  domainId,
                  shopName,
                  phone,
                  language,
                  replaceCatalog: mustReplace,
                })
              }
            >
              {t(language, 'setupStart')}
            </button>
            <button className="btn ghost block" onClick={() => setStep(2)}>
              {t(language, 'back')}
            </button>
            {onCancel ? (
              <button className="btn ghost block" onClick={onCancel}>
                {t(language, 'setupCancel')}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
