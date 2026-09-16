import { QRCodeSVG } from 'qrcode.react'
import type { Client, Language } from './types'
import { t } from './i18n'
import { encodeClientQr } from './utils/clientQr'
import { encodeMemberQr } from './utils/gymNfc'

/** QR imprimable / affichable sur la fiche client */
export function ClientQrCard({
  client,
  lang,
  showMemberQr = false,
}: {
  client: Client
  lang: Language
  showMemberQr?: boolean
}) {
  const value = encodeClientQr(client.id)
  const memberValue = client.nfcUid ? encodeMemberQr(client.nfcUid) : null

  return (
    <div className="client-qr-card">
      <h3>▦ {t(lang, 'clientQrTitle')}</h3>
      <p className="muted">{t(lang, 'clientQrHint')}</p>
      <div className="client-qr-frame">
        <QRCodeSVG
          value={value}
          size={200}
          level="M"
          marginSize={2}
          title={`${client.name} QR`}
        />
      </div>
      <div className="muted client-qr-name">
        <strong>{client.name}</strong>
        {client.phone ? ` · ${client.phone}` : ''}
      </div>
      <div className="muted" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
        {value}
      </div>
      {showMemberQr && memberValue ? (
        <>
          <h3 style={{ marginTop: 16 }}>📡 {t(lang, 'memberQrTitle')}</h3>
          <p className="muted">{t(lang, 'memberQrHint')}</p>
          <div className="client-qr-frame">
            <QRCodeSVG
              value={memberValue}
              size={180}
              level="M"
              marginSize={2}
              title={`${client.name} NFC`}
            />
          </div>
          <div className="muted" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {client.nfcUid} · {memberValue}
          </div>
        </>
      ) : null}
      <button
        type="button"
        className="btn secondary block"
        style={{ marginTop: 10 }}
        onClick={() => window.print()}
      >
        🖨️ {t(lang, 'clientQrPrint')}
      </button>
    </div>
  )
}
