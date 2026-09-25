import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppState,
  Language,
  PriceTier,
  Product,
  PurchaseLine,
  ReturnLine,
} from './types'
import { t } from './i18n'
import { formatDa, formatQty } from './utils/format'
import {
  activeCashSession,
  addPurchase,
  addSupplier,
  closeCashSession,
  createSaleReturn,
  deleteSupplier,
  expectedCashForSession,
  barcodesMatch,
  findProductByBarcode,
  openCashSession,
} from './store'
import { InvoiceScanPanel, PurchasesHistoryGrouped } from './InvoiceScanPanel'
import { HybridReceiveFromPhone } from './HybridBridgePanel'
import { BarcodeCameraModal, isBarcodeCameraSupported } from './BarcodeCamera'

export function BarcodeScanInput({
  lang,
  onScan,
  onEmpty,
  placeholder,
}: {
  lang: Language
  onScan: (code: string) => void
  /** Champ vide + clic Ajouter */
  onEmpty?: () => void
  placeholder?: string
}) {
  const [value, setValue] = useState('')
  const [camOpen, setCamOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function submit(code: string) {
    const c = code.trim()
    if (!c) {
      onEmpty?.()
      inputRef.current?.focus()
      return
    }
    onScan(c)
    setValue('')
  }

  return (
    <>
      <div className="barcode-row">
        <span className="barcode-icon" aria-hidden>
          ⬛
        </span>
        <input
          ref={inputRef}
          className="barcode-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit(value)
            }
          }}
          placeholder={placeholder || t(lang, 'barcodeHint')}
          autoComplete="off"
          inputMode="numeric"
          enterKeyHint="done"
        />
        <button
          type="button"
          className="btn secondary barcode-cam-btn"
          onClick={() => {
            if (!isBarcodeCameraSupported()) {
              window.alert(t(lang, 'barcodeCamUnsupported'))
              return
            }
            setCamOpen(true)
          }}
          title={t(lang, 'barcodeCamTitle')}
          aria-label={t(lang, 'barcodeCamTitle')}
        >
          📷
        </button>
        <button
          type="button"
          className="btn secondary barcode-add-btn"
          onClick={() => submit(value)}
        >
          {t(lang, 'barcodeAdd')}
        </button>
      </div>
      {camOpen ? (
        <BarcodeCameraModal
          lang={lang}
          playSound={false}
          onDetect={(code) => submit(code)}
          onClose={() => setCamOpen(false)}
        />
      ) : null}
    </>
  )
}

export function CashSessionPage({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
}) {
  const open = activeCashSession(state)
  const [floatDa, setFloatDa] = useState('0')
  const [countDa, setCountDa] = useState('')
  const [note, setNote] = useState('')
  const expected = open ? expectedCashForSession(state, open) : 0

  return (
    <div className="page">
      <div className="card">
        <h2>💵 {t(lang, 'caisseTitle')}</h2>
        {open ? (
          <>
            <div className="home-chips">
              <div className="home-chip">
                <span>{t(lang, 'caisseOpenedAt')}</span>
                <strong>
                  {new Date(open.openedAt).toLocaleString(
                    lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                  )}
                </strong>
              </div>
              <div className="home-chip">
                <span>{t(lang, 'caisseFloat')}</span>
                <strong>{formatDa(open.openingFloatDa)}</strong>
              </div>
              <div className="home-chip accent">
                <span>{t(lang, 'caisseExpected')}</span>
                <strong>{formatDa(expected)}</strong>
              </div>
            </div>
            <div className="field">
              <label>{t(lang, 'caisseCount')}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={countDa}
                onChange={(e) => setCountDa(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t(lang, 'note')}</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {countDa !== '' && Number.isFinite(Number(countDa)) ? (
              <div className="notice">
                {t(lang, 'caisseVariance')} :{' '}
                <strong>
                  {formatDa(+(Number(countDa) - expected).toFixed(2))}
                </strong>
              </div>
            ) : null}
            <button
              type="button"
              className="btn block"
              data-sfx-cash
              disabled={countDa === '' || !Number.isFinite(Number(countDa))}
              onClick={() => {
                onState((s) =>
                  closeCashSession(s, Number(countDa), note.trim()),
                )
                setCountDa('')
                setNote('')
                onFlash('caisseClosed')
              }}
            >
              🔒 {t(lang, 'caisseClose')}
            </button>
          </>
        ) : (
          <>
            <div className="field">
              <label>{t(lang, 'caisseFloat')}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={floatDa}
                onChange={(e) => setFloatDa(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t(lang, 'note')}</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn block"
              data-sfx-cash
              onClick={() => {
                const n = Number(String(floatDa).replace(',', '.'))
                if (!Number.isFinite(n) || n < 0) return
                onState((s) => openCashSession(s, n, note.trim()))
                setNote('')
                onFlash('caisseOpened')
              }}
            >
              🔓 {t(lang, 'caisseOpen')}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h2>{t(lang, 'caisseHistory')}</h2>
        {state.cashSessions.length === 0 ? (
          <div className="empty">{t(lang, 'caisseEmpty')}</div>
        ) : (
          state.cashSessions.slice(0, 20).map((s) => (
            <div className="list-item" key={s.id}>
              <div>
                <strong>
                  {s.closedAt
                    ? t(lang, 'caisseClosedTag')
                    : t(lang, 'caisseOpenTag')}
                </strong>
                <div className="muted">
                  {new Date(s.openedAt).toLocaleString(
                    lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                  )}
                  {s.closedAt
                    ? ` → ${new Date(s.closedAt).toLocaleString(
                        lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                      )}`
                    : ''}
                </div>
                {typeof s.varianceDa === 'number' ? (
                  <div className="muted">
                    {t(lang, 'caisseVariance')} : {formatDa(s.varianceDa)}
                  </div>
                ) : null}
              </div>
              <strong>{formatDa(s.openingFloatDa)}</strong>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function ReturnsPage({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
}) {
  const [orderId, setOrderId] = useState('')
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  const [mode, setMode] = useState<'cash' | 'credit'>('cash')
  const [note, setNote] = useState('')

  const order = state.orders.find((o) => o.id === orderId) ?? null

  useEffect(() => {
    setQtyMap({})
  }, [orderId])

  const lines: ReturnLine[] = useMemo(() => {
    if (!order) return []
    return order.lines
      .map((l) => {
        const key = `${l.productId}::${l.priceTier || 'piece'}`
        const qty = qtyMap[key] ?? 0
        if (qty <= 0) return null
        return {
          productId: l.productId,
          name: l.name,
          unit: l.unit,
          qty,
          unitPriceDa: l.unitPriceDa,
          lineTotalDa: +(qty * l.unitPriceDa).toFixed(2),
          priceTier: l.priceTier,
        } satisfies ReturnLine
      })
      .filter(Boolean) as ReturnLine[]
  }, [order, qtyMap])

  const total = lines.reduce((s, l) => s + l.lineTotalDa, 0)

  return (
    <div className="page">
      <div className="card">
        <h2>↩️ {t(lang, 'returnsTitle')}</h2>
        <p className="muted">{t(lang, 'returnsHint')}</p>
        <div className="field">
          <label>{t(lang, 'returnsPickOrder')}</label>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">—</option>
            {state.orders.slice(0, 80).map((o) => (
              <option key={o.id} value={o.id}>
                {o.invoiceNumber ? `N°${o.invoiceNumber} · ` : ''}
                {o.clientName} · {formatDa(o.totalDa)} ·{' '}
                {new Date(o.createdAt).toLocaleDateString(
                  lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                )}
              </option>
            ))}
          </select>
        </div>

        {order ? (
          <>
            <div className="muted" style={{ marginBottom: 8 }}>
              {order.clientName}
              {order.clientPhone ? ` · ${order.clientPhone}` : ''}
            </div>
            {order.lines.map((l) => {
              const key = `${l.productId}::${l.priceTier || 'piece'}`
              const qty = qtyMap[key] ?? 0
              return (
                <div className="list-item" key={key}>
                  <div>
                    <strong>{l.name}</strong>
                    <div className="muted">
                      {formatQty(l.qty)} × {formatDa(l.unitPriceDa)}
                    </div>
                  </div>
                  <div className="qty-row">
                    <button
                      type="button"
                      onClick={() =>
                        setQtyMap((m) => ({
                          ...m,
                          [key]: Math.max(0, (m[key] ?? 0) - 1),
                        }))
                      }
                    >
                      −
                    </button>
                    <strong>{formatQty(qty)}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        setQtyMap((m) => ({
                          ...m,
                          [key]: Math.min(l.qty, (m[key] ?? 0) + 1),
                        }))
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}

            <div className="choice-grid" style={{ marginTop: 12 }}>
              <button
                type="button"
                className={`choice-card ${mode === 'cash' ? 'active' : ''}`}
                onClick={() => setMode('cash')}
              >
                <strong>💵 {t(lang, 'returnsCash')}</strong>
              </button>
              <button
                type="button"
                className={`choice-card ${mode === 'credit' ? 'active' : ''}`}
                disabled={!order.clientId}
                onClick={() => setMode('credit')}
              >
                <strong>✍️ {t(lang, 'returnsCredit')}</strong>
              </button>
            </div>

            <div className="field">
              <label>{t(lang, 'note')}</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <div className="total-big">💰 {formatDa(total)}</div>
            <button
              type="button"
              className="btn block"
              disabled={lines.length === 0}
              onClick={() => {
                onState((s) =>
                  createSaleReturn(s, {
                    orderId: order.id,
                    clientId: order.clientId || undefined,
                    clientName: order.clientName,
                    lines,
                    refundMode: mode,
                    note: note.trim(),
                  }),
                )
                setQtyMap({})
                setNote('')
                onFlash('returnDone')
              }}
            >
              ✅ {t(lang, 'returnsConfirm')}
            </button>
          </>
        ) : null}
      </div>

      <div className="card">
        <h2>{t(lang, 'returnsHistory')}</h2>
        {state.returns.length === 0 ? (
          <div className="empty">{t(lang, 'returnsEmpty')}</div>
        ) : (
          state.returns.slice(0, 30).map((r) => (
            <div className="list-item" key={r.id}>
              <div>
                <strong>{r.clientName}</strong>
                <div className="muted">
                  {r.refundMode === 'cash'
                    ? t(lang, 'returnsCash')
                    : t(lang, 'returnsCredit')}{' '}
                  ·{' '}
                  {new Date(r.createdAt).toLocaleString(
                    lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                  )}
                </div>
              </div>
              <strong>{formatDa(r.totalDa)}</strong>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function PurchasesPage({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
}) {
  const [supName, setSupName] = useState('')
  const [supPhone, setSupPhone] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [lines, setLines] = useState<PurchaseLine[]>([])
  const [paidDa, setPaidDa] = useState('')
  const [note, setNote] = useState('')

  const supplier = state.suppliers.find((s) => s.id === supplierId)
  const total = lines.reduce((s, l) => s + l.lineTotalDa, 0)

  function addLine() {
    const p = state.products.find((x) => x.id === productId)
    const q = Number(String(qty).replace(',', '.'))
    const c = Number(String(unitCost || p?.costDa || 0).replace(',', '.'))
    if (!p || !Number.isFinite(q) || q <= 0) return
    const cost = Number.isFinite(c) && c >= 0 ? c : 0
    setLines((prev) => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        qty: q,
        unitCostDa: cost,
        lineTotalDa: +(q * cost).toFixed(2),
      },
    ])
    setQty('1')
    setUnitCost('')
  }

  return (
    <div className="page">
      <div className="card">
        <h2>🏭 {t(lang, 'purchasesTitle')}</h2>
        <p className="muted">{t(lang, 'purchasesHint')}</p>

        <h3>{t(lang, 'suppliers')}</h3>
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'name')}</label>
            <input value={supName} onChange={(e) => setSupName(e.target.value)} />
          </div>
          <div className="field">
            <label>{t(lang, 'phone')}</label>
            <input
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn secondary block"
          disabled={!supName.trim()}
          onClick={() => {
            onState((s) =>
              addSupplier(s, {
                name: supName.trim(),
                phone: supPhone.trim(),
                note: '',
              }),
            )
            setSupName('')
            setSupPhone('')
            onFlash('supplierAdded')
          }}
        >
          + {t(lang, 'addSupplier')}
        </button>

        {state.suppliers.length > 0 ? (
          <div className="field" style={{ marginTop: 12 }}>
            <label>{t(lang, 'pickSupplier')}</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">—</option>
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.phone ? ` · ${s.phone}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {supplier ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              onState((s) => deleteSupplier(s, supplier.id))
              setSupplierId('')
            }}
          >
            {t(lang, 'delete')} — {supplier.name}
          </button>
        ) : null}
      </div>

      <InvoiceScanPanel
        state={state}
        lang={lang}
        onState={onState}
        onFlash={onFlash}
      />

      <HybridReceiveFromPhone
        state={state}
        lang={lang}
        onState={onState}
        onFlash={onFlash}
      />

      <div className="card">
        <h2>{t(lang, 'newPurchase')}</h2>
        <p className="muted">{t(lang, 'purchaseManualHint')}</p>
        <BarcodeScanInput
          lang={lang}
          placeholder={t(lang, 'purchaseScanHint')}
          onScan={(code) => {
            const p = findProductByBarcode(state, code)
            if (!p) {
              onFlash('barcodeMissing')
              return
            }
            setProductId(p.id)
            setUnitCost(String(p.costDa || ''))
            onFlash('barcodeOk')
          }}
        />
        <div className="field">
          <label>{t(lang, 'product')}</label>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value)
              const p = state.products.find((x) => x.id === e.target.value)
              if (p) setUnitCost(String(p.costDa || ''))
            }}
          >
            <option value="">—</option>
            {state.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatQty(p.stock)})
              </option>
            ))}
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'qty')}</label>
            <input value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="field">
            <label>{t(lang, 'costDa')}</label>
            <input
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn secondary block"
          disabled={!productId}
          onClick={addLine}
        >
          + {t(lang, 'addLine')}
        </button>

        {lines.length > 0 ? (
          <ul className="line-preview" style={{ marginTop: 12 }}>
            {lines.map((l, i) => (
              <li key={`${l.productId}-${i}`}>
                {l.name} × {formatQty(l.qty)} = {formatDa(l.lineTotalDa)}
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginInlineStart: 8 }}
                  onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="field">
          <label>{t(lang, 'amountPaid')}</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={paidDa}
            onChange={(e) => setPaidDa(e.target.value)}
            placeholder={String(total)}
          />
        </div>
        <div className="field">
          <label>{t(lang, 'note')}</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="total-big">💰 {formatDa(total)}</div>
        <button
          type="button"
          className="btn block"
          disabled={lines.length === 0 || !supplier}
          onClick={() => {
            if (!supplier) return
            const paid = Number(String(paidDa || total).replace(',', '.'))
            onState((s) =>
              addPurchase(s, {
                supplierId: supplier.id,
                supplierName: supplier.name,
                lines,
                paidDa: Number.isFinite(paid) ? paid : total,
                note: note.trim(),
              }),
            )
            setLines([])
            setPaidDa('')
            setNote('')
            onFlash('purchaseDone')
          }}
        >
          ✅ {t(lang, 'confirmPurchase')}
        </button>
      </div>

      <PurchasesHistoryGrouped state={state} lang={lang} />
    </div>
  )
}

export function bumpProductFromBarcode(
  products: Product[],
  code: string,
  bump: (p: Product, tier: PriceTier, delta: number) => void,
  stockOf?: (p: Product) => number,
): 'ok' | 'missing' | 'ok-nostock' {
  const q = code.trim()
  if (!q) return 'missing'
  const p = products.find((x) => x.barcode && barcodesMatch(x.barcode, q))
  if (!p) return 'missing'
  const stock = stockOf ? stockOf(p) : p.stock
  bump(p, 'piece', 1)
  return stock > 0 ? 'ok' : 'ok-nostock'
}
