import { useMemo, useState } from 'react'
import type { AppState, Language, Order, OrderLine } from './types'
import { t } from './i18n'
import { formatDa, formatQty } from './utils/format'
import { reviseOrder } from './store'

/** Édition facture : recalcule stock + montant encaissé (caisse / crédit). */
export function OrderRevisePanel({
  lang,
  order,
  onState,
  onFlash,
  onClose,
}: {
  lang: Language
  order: Order
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
  onClose: () => void
}) {
  const [lines, setLines] = useState<OrderLine[]>(() =>
    order.lines.map((l) => ({ ...l })),
  )
  const [paidDa, setPaidDa] = useState(String(order.paidDa ?? 0))
  const [totalOverride, setTotalOverride] = useState('')
  const [note, setNote] = useState(order.note || '')

  const subtotal = useMemo(
    () => +lines.reduce((s, l) => s + l.lineTotalDa, 0).toFixed(2),
    [lines],
  )
  const overrideN = Number(String(totalOverride).replace(',', '.'))
  const hasOverride =
    totalOverride.trim() !== '' && Number.isFinite(overrideN) && overrideN >= 0
  const total = hasOverride ? +overrideN.toFixed(2) : subtotal
  const paidN = Number(String(paidDa).replace(',', '.'))
  const paidOk = Number.isFinite(paidN) && paidN >= 0

  function patchLine(index: number, patch: Partial<OrderLine>) {
    setLines((prev) =>
      prev
        .map((l, i) => {
          if (i !== index) return l
          const next = { ...l, ...patch }
          const qty = Math.max(0, Number(next.qty) || 0)
          const unitPriceDa = Math.max(0, Number(next.unitPriceDa) || 0)
          return {
            ...next,
            qty,
            unitPriceDa,
            lineTotalDa: +(qty * unitPriceDa).toFixed(2),
          }
        })
        .filter((l) => l.qty > 0),
    )
  }

  function save() {
    if (!lines.length || !paidOk) {
      onFlash('orderReviseInvalid')
      return
    }
    const paid = Math.min(total, Math.max(0, paidN))
    onState((s) =>
      reviseOrder(s, order.id, {
        lines,
        totalDa: total,
        paidDa: paid,
        note: note.trim(),
        discountDa: hasOverride
          ? Math.max(0, +(subtotal - total).toFixed(2))
          : undefined,
      }),
    )
    onFlash('orderRevised')
    onClose()
  }

  return (
    <div className="card">
      <button type="button" className="btn ghost" onClick={onClose}>
        ← {t(lang, 'cancel')}
      </button>
      <h2>✏️ {t(lang, 'orderReviseTitle')}</h2>
      <p className="muted">{t(lang, 'orderReviseHint')}</p>
      <div className="notice" style={{ marginBottom: 10 }}>
        {t(lang, 'orderReviseSync')}
      </div>
      <div className="muted" style={{ marginBottom: 8 }}>
        {order.clientName}
        {order.invoiceNumber ? ` · N°${order.invoiceNumber}` : ''}
      </div>

      <ul className="line-preview cart-edit-lines">
        {lines.map((l, i) => (
          <li key={`${l.productId}-${l.priceTier || i}-${i}`}>
            <strong>
              {l.flash ? '✨ ' : ''}
              {l.name}
            </strong>
            <div className="grid-2" style={{ gap: 6, marginTop: 4 }}>
              <label className="muted" style={{ fontSize: '0.8rem' }}>
                {t(lang, 'qty')}
                <input
                  inputMode="decimal"
                  value={String(l.qty)}
                  onChange={(e) =>
                    patchLine(i, {
                      qty: Number(String(e.target.value).replace(',', '.')),
                    })
                  }
                />
              </label>
              <label className="muted" style={{ fontSize: '0.8rem' }}>
                {t(lang, 'unitPriceEdit')}
                <input
                  inputMode="decimal"
                  value={String(l.unitPriceDa)}
                  onChange={(e) =>
                    patchLine(i, {
                      unitPriceDa: Number(
                        String(e.target.value).replace(',', '.'),
                      ),
                    })
                  }
                />
              </label>
            </div>
            <div className="cart-line-total" style={{ marginTop: 2 }}>
              <span className="muted">
                = {formatDa(l.lineTotalDa)} · {formatQty(l.qty)}
              </span>
              <button
                type="button"
                className="btn ghost cart-line-add"
                title={t(lang, 'addCartLineQty')}
                aria-label={t(lang, 'addCartLineQty')}
                onClick={() => patchLine(i, { qty: l.qty + 1 })}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="field">
        <label>{t(lang, 'totalOverrideLabel')}</label>
        <input
          inputMode="decimal"
          value={totalOverride}
          onChange={(e) => setTotalOverride(e.target.value)}
          placeholder={String(subtotal)}
        />
      </div>
      <div className="field">
        <label>{t(lang, 'amountPaid')}</label>
        <input
          inputMode="decimal"
          value={paidDa}
          onChange={(e) => setPaidDa(e.target.value)}
        />
        <div className="muted" style={{ marginTop: 4 }}>
          {t(lang, 'orderRevisePaidHint')}
        </div>
      </div>
      <div className="field">
        <label>{t(lang, 'note')}</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="total-big">💰 {formatDa(total)}</div>
      <div className="muted" style={{ marginBottom: 8 }}>
        {t(lang, 'subtotal')} {formatDa(subtotal)}
        {order.revisedAt
          ? ` · ${t(lang, 'orderRevisedAt')} ${new Date(order.revisedAt).toLocaleString(
              lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
            )}`
          : ''}
      </div>

      <button
        type="button"
        className="btn block"
        disabled={!lines.length || !paidOk}
        onClick={save}
      >
        ✅ {t(lang, 'orderReviseSave')}
      </button>
      <p className="muted" style={{ marginTop: 8 }}>
        {t(lang, 'orderReviseSaveHint')}
      </p>
    </div>
  )
}
