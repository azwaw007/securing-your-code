import { useMemo, useState } from 'react'
import type { Language } from './types'
import { t } from './i18n'
import { formatDa } from './utils/format'
import {
  DELIVERY_CARRIERS,
  carrierHint,
  carrierRegion,
  disconnectCarrier,
  fieldLabel,
  getCarrierConnection,
  loadImportedParcels,
  pricingCarrierLabel,
  syncSampleParcels,
  testCarrierConnection,
  type DeliveryCarrier,
} from './digital/deliveryCarriers'

/** Connexion APIs sociétés de livraison + colis démo */
export function DeliveryCarriersPanel({
  lang,
  onFlash,
  onOutput,
}: {
  lang: Language
  onFlash: (msg: string) => void
  onOutput: (msg: string) => void
}) {
  const [carrierId, setCarrierId] = useState(DELIVERY_CARRIERS[0]?.id ?? 'yalidine')
  const carrier = DELIVERY_CARRIERS.find((c) => c.id === carrierId) ?? DELIVERY_CARRIERS[0]
  const existing = getCarrierConnection(carrierId)
  const [creds, setCreds] = useState<Record<string, string>>(() => ({
    ...(existing?.credentials || {}),
  }))
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)
  const parcels = useMemo(
    () => loadImportedParcels().filter((p) => p.carrierId === carrierId),
    [carrierId, tick],
  )

  function selectCarrier(id: string) {
    setCarrierId(id)
    const c = getCarrierConnection(id)
    setCreds({ ...(c?.credentials || {}) })
  }

  async function onTest() {
    if (!carrier) return
    setBusy(true)
    try {
      const res = await testCarrierConnection(carrier.id, creds, lang)
      onOutput(res.message)
      onFlash(res.ok ? (lang === 'ar' ? 'تم الربط' : 'Connecté') : res.message)
      setTick((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  function onSync() {
    const res = syncSampleParcels(carrierId, lang)
    onOutput(res.message)
    onFlash(res.message)
    if (res.ok) setTick((n) => n + 1)
  }

  function onDisconnect() {
    disconnectCarrier(carrierId)
    setCreds({})
    setTick((n) => n + 1)
    onFlash(lang === 'ar' ? 'تم قطع الاتصال' : 'Déconnecté')
  }

  const status = getCarrierConnection(carrierId)?.status

  return (
    <section className="digital-section">
      <h2>{t(lang, 'digitalShippingTitle')}</h2>
      <p className="muted">{t(lang, 'digitalShippingHint')}</p>
      <p className="digital-tip">{t(lang, 'digitalApiProxyNote')}</p>

      <div className="digital-chip-row">
        {DELIVERY_CARRIERS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${carrierId === c.id ? 'is-on' : ''}`}
            onClick={() => selectCarrier(c.id)}
          >
            {c.icon} {c.name}
            {getCarrierConnection(c.id)?.status === 'ok' ? ' ✓' : ''}
          </button>
        ))}
      </div>

      {carrier ? (
        <CarrierConnectForm
          carrier={carrier}
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

      <h3>{t(lang, 'digitalShippingParcels')}</h3>
      {parcels.length === 0 ? (
        <p className="muted">{t(lang, 'digitalShippingNoParcels')}</p>
      ) : (
        <ul className="digital-sales">
          {parcels.map((p) => (
            <li key={p.id}>
              <strong>{p.tracking}</strong> · {p.to} · {p.wilaya} · {p.status} ·{' '}
              {formatDa(p.feeDa)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CarrierConnectForm({
  carrier,
  lang,
  creds,
  setCreds,
  status,
  busy,
  onTest,
  onSync,
  onDisconnect,
}: {
  carrier: DeliveryCarrier
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
          <h3>
            {carrier.icon} {carrier.name}
          </h3>
          <p className="muted">{carrierRegion(carrier, lang)}</p>
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
      <p className="muted">{carrierHint(carrier, lang)}</p>
      <p className="digital-tip">
        {pricingCarrierLabel(carrier.pricing, lang)}
      </p>
      {carrier.docsUrl ? (
        <a href={carrier.docsUrl} target="_blank" rel="noreferrer" className="btn ghost">
          {t(lang, 'digitalOpenDocs')}
        </a>
      ) : null}
      {carrier.fields.map((f) => (
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
          {t(lang, 'digitalShippingSync')}
        </button>
        <button type="button" className="btn ghost" onClick={onDisconnect}>
          {t(lang, 'digitalDisconnect')}
        </button>
      </div>
    </div>
  )
}
