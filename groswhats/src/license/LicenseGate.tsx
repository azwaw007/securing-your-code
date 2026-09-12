import { useEffect, useState, type ReactNode } from 'react'
import {
  APP_VERSION,
  TRIAL_DAYS,
  activateLicense,
  getAccessStatus,
  type AccessStatus,
} from './license'

export function LicenseGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const s = await getAccessStatus()
    setStatus(s)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function onActivate() {
    setBusy(true)
    setError('')
    const res = await activateLicense(key)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setKey('')
    await refresh()
  }

  if (!status) {
    return (
      <div className="app-shell">
        <div className="card">Chargement licence…</div>
      </div>
    )
  }

  if (!status.ok) {
    return (
      <div className="app-shell license-shell">
        <div className="card license-card">
          <div className="brand">
            AZ <span>POS</span>
          </div>
          <p className="muted">Version {APP_VERSION}</p>
          <h2>Activation requise</h2>
          <div className="notice">{status.message}</div>
          <p>
            Essai gratuit : <strong>{TRIAL_DAYS} jours</strong>.  
            Ensuite : licence annuelle.
          </p>
          <div className="field">
            <label>Clé de licence</label>
            <textarea
              rows={3}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="GDZ1.xxxxx.xxxxx"
            />
          </div>
          {error ? <div className="badge warn">{error}</div> : null}
          <button className="btn block" disabled={busy || !key.trim()} onClick={() => void onActivate()}>
            Activer la licence
          </button>
          <p className="muted" style={{ marginTop: 12 }}>
            Contact vendeur WhatsApp pour obtenir une licence.
          </p>
          <a className="btn secondary block" href="/guide.html" target="_blank" rel="noreferrer">
            Guide d’utilisation
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
            Essai AZ POS — <strong>{status.daysLeft} j</strong> restants (fin{' '}
            {status.trialEndsAt})
          </span>
        ) : (
          <span>
            Licence active — {status.customer} — expire le {status.expiresAt} (
            {status.daysLeft} j)
          </span>
        )}
        <a href="/guide.html" target="_blank" rel="noreferrer">
          Guide
        </a>
      </div>
      {children}
    </>
  )
}
