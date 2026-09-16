import { useState } from 'react'
import type { AppState, Client, Language } from './types'
import { t } from './i18n'
import {
  cancelClinicCharge,
  createOrder,
  markClinicChargePaid,
  pendingClinicCharges,
  sendToReceptionCash,
} from './store'
import { formatDa } from './utils/format'

/** Médecin : envoyer un acte à encaisser par la réception */
export function SendToCashForm({
  state,
  client,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  client: Client
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const [label, setLabel] = useState(
    lang === 'ar' ? 'استشارة' : 'Consultation',
  )
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        className="btn block"
        style={{ marginTop: 10 }}
        onClick={() => setOpen(true)}
      >
        💵 {t(lang, 'clinicSendToCash')}
      </button>
    )
  }

  return (
    <div className="dossier-form" style={{ marginTop: 10 }}>
      <h4>{t(lang, 'clinicSendToCash')}</h4>
      <p className="muted">{t(lang, 'clinicSendToCashHint')}</p>
      <div className="field">
        <label>{t(lang, 'clinicChargeLabel')}</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="field">
        <label>{t(lang, 'clinicChargeAmount')}</label>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </div>
      <div className="field">
        <label>{t(lang, 'clientNotes')}</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="btn-row" style={{ flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn"
          disabled={!amount || Number(amount) <= 0}
          onClick={() => {
            onState(
              sendToReceptionCash(state, {
                clientId: client.id,
                label,
                amountDa: Number(amount),
                note,
              }),
            )
            setOpen(false)
            setAmount('')
            onFlash(t(lang, 'clinicSentToCash'))
          }}
        >
          {t(lang, 'clinicSendBtn')}
        </button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
          {t(lang, 'cancel')}
        </button>
      </div>
    </div>
  )
}

/** Réception / caisse : file d’attente des actes à encaisser */
export function ReceptionCashQueue({
  state,
  lang,
  onState,
  onFlash,
  onFocusClient,
  onGoEncaisser,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  onFocusClient: (id: string) => void
  onGoEncaisser: (clientId: string) => void
}) {
  const pending = pendingClinicCharges(state)

  return (
    <section className="reception-queue card">
      <div className="dossier-head">
        <div>
          <div className="muted">{t(lang, 'clinicReceptionTitle')}</div>
          <strong>
            {pending.length} {t(lang, 'clinicPendingCash')}
          </strong>
        </div>
      </div>
      <p className="muted">{t(lang, 'clinicReceptionHint')}</p>
      {pending.length === 0 ? (
        <div className="muted">{t(lang, 'clinicQueueEmpty')}</div>
      ) : (
        <ul className="clinic-charge-list">
          {pending.map((c) => (
            <li key={c.id} className="clinic-charge-item">
              <div>
                <strong>{c.clientName}</strong>
                <div className="muted">{c.label}</div>
                {c.note ? <div className="muted">{c.note}</div> : null}
                <div>
                  <strong>{formatDa(c.amountDa)}</strong>
                </div>
              </div>
              <div className="btn-row" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const product = state.products[0]
                    if (!product) {
                      onFlash(t(lang, 'clinicNeedActe'))
                      onFocusClient(c.clientId)
                      onGoEncaisser(c.clientId)
                      return
                    }
                    let next = createOrder(state, {
                      clientId: c.clientId,
                      clientName: c.clientName,
                      clientPhone: c.clientPhone,
                      lines: [
                        {
                          productId: product.id,
                          name: c.label || product.name,
                          unit: product.unit,
                          qty: 1,
                          unitPriceDa: c.amountDa,
                          unitCostDa: product.costDa || 0,
                          lineTotalDa: c.amountDa,
                        },
                      ],
                      totalDa: c.amountDa,
                      paidDa: c.amountDa,
                      remainingDa: 0,
                      payment: 'paye',
                      note: c.note || `Caisse · ${c.label}`,
                    })
                    const orderId = next.orders[0]?.id
                    next = markClinicChargePaid(next, c.id, orderId)
                    onState(next)
                    onFlash(t(lang, 'clinicCashedOk'))
                  }}
                >
                  💵 {t(lang, 'clinicCashNow')}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    onFocusClient(c.clientId)
                    onGoEncaisser(c.clientId)
                  }}
                >
                  {t(lang, 'clinicOpenCash')}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => onState(cancelClinicCharge(state, c.id))}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
