import { useEffect, useState, type ReactNode } from 'react'
import {
  APP_VERSION,
  TRIAL_DAYS,
  activateLicense,
  getAccessStatus,
  seatsLabel,
  type AccessStatus,
} from './license'
import { APP_BRAND } from '../brand'
import { t, tf } from '../i18n'
import { isRtl, parseLanguage } from '../locale/langs'
import type { Language } from '../types'
import { openSupportWhatsapp } from '../utils/whatsapp'

const STORAGE_KEYS = ['az-pos-v1', 'groswhats-v3', 'groswhats-v2', 'groswhats-v1']

/** Langue UI avant chargement de l’app (réglages persistés ou navigateur). */
export function readStoredUiLanguage(): Language {
  try {
    for (const key of STORAGE_KEYS) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as { settings?: { language?: unknown } }
      if (parsed?.settings?.language != null) {
        return parseLanguage(parsed.settings.language, 'fr')
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const nav = navigator.language || ''
    if (nav.toLowerCase().startsWith('ar')) return 'ar'
  } catch {
    /* ignore */
  }
  return 'fr'
}

export function LicenseGate({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => readStoredUiLanguage())
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(nextLang = lang) {
    const s = await getAccessStatus(nextLang)
    setStatus(s)
  }

  useEffect(() => {
    const next = readStoredUiLanguage()
    setLang(next)
    document.documentElement.dir = isRtl(next) ? 'rtl' : 'ltr'
    document.documentElement.lang = next === 'ar' ? 'ar' : next
    void refresh(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, [])

  async function onActivate() {
    setBusy(true)
    setError('')
    const res = await activateLicense(key, lang)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setKey('')
    await refresh(lang)
  }

  const supportLang = lang === 'ar' ? 'ar' : 'fr'

  if (!status) {
    return (
      <div className="app-shell">
        <div className="card">{t(lang, 'licenseLoading')}</div>
      </div>
    )
  }

  if (!status.ok) {
    return (
      <div className="app-shell license-shell">
        <div className="card license-card">
          <div className="brand brand-mark license-brand">
            <img
              src={APP_BRAND.logoWide}
              alt={APP_BRAND.name}
              className="brand-logo brand-logo-wide"
              width={280}
              height={158}
              decoding="async"
            />
          </div>
          <p className="muted">{tf(lang, 'versionLabel', { v: APP_VERSION })}</p>
          <h2>{t(lang, 'licenseActivationRequired')}</h2>
          <div className="notice">{status.message}</div>
          <p>
            {tf(lang, 'licenseTrialInfo', { days: TRIAL_DAYS })}
            <br />
            {t(lang, 'licensePlansHint')}
          </p>
          <div className="field">
            <label>{t(lang, 'licenseKeyLabel')}</label>
            <textarea
              rows={3}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="GDZ1.xxxxx.xxxxx"
            />
          </div>
          {error ? <div className="badge warn">{error}</div> : null}
          <button
            className="btn block"
            disabled={busy || !key.trim()}
            onClick={() => void onActivate()}
          >
            {t(lang, 'licenseActivate')}
          </button>
          <p className="muted" style={{ marginTop: 12 }}>
            {t(lang, 'licenseSupportSav')} {APP_BRAND.supportDisplay}
          </p>
          <button
            type="button"
            className="btn secondary block"
            onClick={() =>
              openSupportWhatsapp({
                language: supportLang,
                version: APP_VERSION,
              })
            }
          >
            💬 {t(lang, 'licenseContactSupport')}
          </button>
          <a
            className="btn ghost block"
            href="/guide.html"
            target="_blank"
            rel="noreferrer"
          >
            {t(lang, 'licenseGuide')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`license-banner ${status.mode === 'trial' ? 'trial' : 'ok'}`}>
        {status.mode === 'trial' ? (
          <span>
            {tf(lang, 'licenseTrialBanner', {
              days: status.daysLeft,
              date: status.trialEndsAt,
            })}
          </span>
        ) : (
          <span>
            {tf(lang, 'licenseOkBanner', {
              plan: status.planLabel,
              customer: status.customer,
              seats: seatsLabel(status.seats, lang),
              date: status.expiresAt,
              days: status.daysLeft,
            })}
          </span>
        )}
        <button
          type="button"
          className="license-support-link"
          onClick={() =>
            openSupportWhatsapp({
              language: supportLang,
              version: APP_VERSION,
            })
          }
        >
          SAV
        </button>
        <a href="/guide.html" target="_blank" rel="noreferrer">
          {t(lang, 'licenseGuideShort')}
        </a>
      </div>
      {children}
    </>
  )
}
