import { useEffect, useMemo, useState } from 'react'
import type {
  AppState,
  Language,
  Product,
  ProductCategory,
  PurchaseLine,
} from './types'
import { t } from './i18n'
import { formatDa, formatQty } from './utils/format'
import { compressImageFile } from './utils/image'
import { ocrInvoiceImage } from './utils/invoiceOcr'
import {
  findSupplierMatch,
  matchInvoiceLineToStock,
  parseInvoiceText,
  type InvoiceMatchedLine,
} from './utils/invoiceParse'
import { lookupOffProduct } from './utils/offLookup'
import { addProduct, addPurchase, addSupplier, uid } from './store'

type HistFilter = 'supplier' | 'product' | 'aisle'

function lineId(): string {
  return uid('il')
}

function toMatched(
  state: AppState,
  parsed: ReturnType<typeof parseInvoiceText>['lines'][0],
): InvoiceMatchedLine {
  const { product, score } = matchInvoiceLineToStock(parsed, state.products)
  if (product && score >= 0.72) {
    return {
      ...parsed,
      id: lineId(),
      name: product.name,
      barcode: parsed.barcode || product.barcode,
      match: 'stock',
      productId: product.id,
      category: product.category,
      aisleId: product.aisleId,
      imageDataUrl: product.imageDataUrl,
      unitCostDa:
        parsed.unitCostDa > 0 ? parsed.unitCostDa : product.costDa || 0,
      createIfNew: false,
      selected: true,
    }
  }
  return {
    ...parsed,
    id: lineId(),
    match: 'new',
    category: 'alimentaire',
    createIfNew: true,
    selected: true,
  }
}

export function InvoiceScanPanel({
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
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [supplierName, setSupplierName] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [rows, setRows] = useState<InvoiceMatchedLine[]>([])
  const [paidDa, setPaidDa] = useState('')
  const [note, setNote] = useState('')
  const [step, setStep] = useState<'capture' | 'review'>('capture')
  const [offBusy, setOffBusy] = useState(false)

  const total = useMemo(
    () =>
      rows
        .filter((r) => r.selected)
        .reduce((s, r) => s + r.qty * r.unitCostDa, 0),
    [rows],
  )

  useEffect(() => {
    const hit = findSupplierMatch(supplierName, state.suppliers)
    if (hit) setSupplierId(hit.id)
  }, [supplierName, state.suppliers])

  async function runFromImage(file: File) {
    setBusy(true)
    setProgress(0)
    try {
      const thumb = await compressImageFile(file, 900, 0.85)
      setPreview(thumb)
      const text = await ocrInvoiceImage(file, setProgress)
      applyParsedText(text)
    } catch {
      onFlash('invoiceOcrFail')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  function applyParsedText(text: string) {
    setOcrText(text)
    const parsed = parseInvoiceText(text, state.suppliers)
    if (parsed.supplierName) setSupplierName(parsed.supplierName)
    if (parsed.invoiceRef) {
      setNote((n) => n || `Facture ${parsed.invoiceRef}`)
    }
    const matched = parsed.lines.map((l) => toMatched(state, l))
    setRows(matched)
    setStep('review')
    if (matched.length === 0) onFlash('invoiceNoLines')
    else onFlash('invoiceParsed')
  }

  async function enrichNewWithOff() {
    const targets = rows.filter(
      (r) => r.selected && r.match !== 'stock' && r.barcode,
    )
    if (!targets.length) return
    setOffBusy(true)
    try {
      const next = [...rows]
      for (const row of targets) {
        const hit = await lookupOffProduct(row.barcode!)
        if (!hit) continue
        const i = next.findIndex((x) => x.id === row.id)
        if (i < 0) continue
        next[i] = {
          ...next[i],
          name: next[i].name === next[i].barcode ? hit.name : next[i].name || hit.name,
          category: hit.category,
          imageDataUrl: next[i].imageDataUrl || hit.imageDataUrl,
          match: 'off',
          createIfNew: true,
        }
      }
      setRows(next)
      onFlash('invoiceOffDone')
    } finally {
      setOffBusy(false)
    }
  }

  function confirmPurchase() {
    const selected = rows.filter((r) => r.selected && r.qty > 0)
    if (!selected.length) return

    let name = supplierName.trim()
    if (!name && supplierId) {
      name = state.suppliers.find((s) => s.id === supplierId)?.name || ''
    }
    if (!name) {
      onFlash('invoiceNeedSupplier')
      return
    }

    onState((s) => {
      let next = s
      let sid = supplierId
      const existing = findSupplierMatch(name, next.suppliers)
      if (existing) {
        sid = existing.id
        name = existing.name
      } else if (!sid || !next.suppliers.some((x) => x.id === sid)) {
        next = addSupplier(next, { name, phone: '', note: '' })
        sid = next.suppliers[0]?.id || ''
      }

      const purchaseLines: PurchaseLine[] = []
      for (const row of selected) {
        let productId = row.productId
        if (!productId || row.createIfNew) {
          const already = row.barcode
            ? next.products.find(
                (p) =>
                  p.barcode &&
                  p.barcode.trim().toLowerCase() ===
                    row.barcode!.trim().toLowerCase(),
              )
            : undefined
          if (already) {
            productId = already.id
          } else if (row.match === 'stock' && row.productId) {
            productId = row.productId
          } else {
            const draft: Omit<Product, 'id' | 'createdAt'> = {
              name: row.name.trim() || row.barcode || 'Produit',
              category: (row.category || 'alimentaire') as ProductCategory,
              aisleId: row.aisleId,
              unit: 'piece',
              priceDa: row.unitCostDa > 0 ? Math.round(row.unitCostDa * 1.2) : 0,
              costDa: row.unitCostDa || 0,
              stock: 0,
              lowStockAt: 5,
              barcode: row.barcode,
              imageDataUrl: row.imageDataUrl,
            }
            next = addProduct(next, draft)
            productId = next.products[0]?.id
          }
        }
        if (!productId) continue
        const unitCost = row.unitCostDa || 0
        purchaseLines.push({
          productId,
          name: row.name,
          qty: row.qty,
          unitCostDa: unitCost,
          lineTotalDa: +(row.qty * unitCost).toFixed(2),
        })
      }

      if (!purchaseLines.length || !sid) return next

      const paid = Number(String(paidDa || total).replace(',', '.'))
      return addPurchase(next, {
        supplierId: sid,
        supplierName: name,
        lines: purchaseLines,
        paidDa: Number.isFinite(paid) ? paid : total,
        note: note.trim(),
      })
    })

    setRows([])
    setOcrText('')
    setPreview(null)
    setPaidDa('')
    setNote('')
    setStep('capture')
    onFlash('purchaseDone')
  }

  return (
    <div className="card">
      <h2>📷 {t(lang, 'invoiceScanTitle')}</h2>
      <p className="muted">{t(lang, 'invoiceScanHint')}</p>
      <div className="notice" style={{ marginBottom: 10 }}>
        {t(lang, 'invoiceScanDevices')}
      </div>

      {step === 'capture' ? (
        <>
          <div className="btn-row photo-pick-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <label className={`btn secondary photo-file-btn ${busy ? 'disabled' : ''}`}>
              📸 {t(lang, 'invoiceScanCamera')}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void runFromImage(f)
                }}
              />
            </label>
            <label className={`btn secondary photo-file-btn ${busy ? 'disabled' : ''}`}>
              🖼️ {t(lang, 'invoiceScanUpload')}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void runFromImage(f)
                }}
              />
            </label>
          </div>
          {busy ? (
            <div className="muted" style={{ marginTop: 8 }}>
              {t(lang, 'invoiceOcrLoading')} {progress ? `${progress}%` : ''}
            </div>
          ) : null}
          {preview ? (
            <img
              src={preview}
              alt=""
              className="product-thumb"
              style={{ marginTop: 10, maxHeight: 160, objectFit: 'contain' }}
            />
          ) : null}
          <div className="field" style={{ marginTop: 12 }}>
            <label>{t(lang, 'invoicePasteText')}</label>
            <textarea
              rows={5}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder={t(lang, 'invoicePastePlaceholder')}
            />
          </div>
          <button
            type="button"
            className="btn secondary block"
            disabled={!ocrText.trim() || busy}
            onClick={() => applyParsedText(ocrText)}
          >
            🔎 {t(lang, 'invoiceParseText')}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setStep('capture')}
          >
            ← {t(lang, 'invoiceBackCapture')}
          </button>

          <div className="field">
            <label>{t(lang, 'pickSupplier')}</label>
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder={t(lang, 'invoiceSupplierPlaceholder')}
            />
          </div>
          {state.suppliers.length > 0 ? (
            <div className="field">
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  const s = state.suppliers.find((x) => x.id === e.target.value)
                  if (s) setSupplierName(s.name)
                }}
              >
                <option value="">— {t(lang, 'invoiceOrPickSupplier')}</option>
                {state.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="btn-row" style={{ marginBottom: 8, gap: 8 }}>
            <button
              type="button"
              className="btn secondary"
              disabled={offBusy || busy}
              onClick={() => void enrichNewWithOff()}
            >
              {offBusy ? '…' : `🌐 ${t(lang, 'invoiceEnrichOff')}`}
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="empty">{t(lang, 'invoiceNoLines')}</div>
          ) : (
            <ul className="line-preview">
              {rows.map((r) => (
                <li key={r.id} style={{ marginBottom: 10 }}>
                  <label className="check-row" style={{ alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, selected: e.target.checked }
                              : x,
                          ),
                        )
                      }
                    />
                    <span style={{ flex: 1 }}>
                      <strong>{r.name}</strong>
                      <div className="muted">
                        {r.match === 'stock'
                          ? `✅ ${t(lang, 'invoiceMatchStock')}`
                          : r.match === 'off'
                            ? `🌐 ${t(lang, 'invoiceMatchOff')}`
                            : `🆕 ${t(lang, 'invoiceMatchNew')}`}
                        {r.barcode ? ` · ⬛ ${r.barcode}` : ''}
                        {r.aisleId ? ` · ${r.aisleId}` : ''}
                      </div>
                      <div className="grid-2" style={{ marginTop: 4 }}>
                        <input
                          value={String(r.qty)}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      qty:
                                        Number(
                                          e.target.value.replace(',', '.'),
                                        ) || 0,
                                    }
                                  : x,
                              ),
                            )
                          }
                          aria-label={t(lang, 'qty')}
                        />
                        <input
                          value={String(r.unitCostDa || '')}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      unitCostDa:
                                        Number(
                                          e.target.value.replace(',', '.'),
                                        ) || 0,
                                    }
                                  : x,
                              ),
                            )
                          }
                          placeholder={t(lang, 'costDa')}
                          aria-label={t(lang, 'costDa')}
                        />
                      </div>
                      <div className="muted">
                        = {formatDa(r.qty * r.unitCostDa)}
                      </div>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

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
            disabled={!rows.some((r) => r.selected) || busy}
            onClick={confirmPurchase}
          >
            ✅ {t(lang, 'invoiceConfirmPurchase')}
          </button>
        </>
      )}
    </div>
  )
}

export function PurchasesHistoryGrouped({
  state,
  lang,
}: {
  state: AppState
  lang: Language
}) {
  const [mode, setMode] = useState<HistFilter>('supplier')
  const [filterId, setFilterId] = useState('')

  const aisleLabel = (aisleId?: string) => aisleId || t(lang, 'invoiceNoAisle')

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>()
    for (const p of state.purchases) {
      if (mode === 'supplier') {
        const key = p.supplierId || p.supplierName
        const g = map.get(key) || {
          label: p.supplierName,
          total: 0,
          count: 0,
        }
        g.total += p.totalDa
        g.count += 1
        map.set(key, g)
      } else if (mode === 'product') {
        for (const line of p.lines) {
          const g = map.get(line.productId) || {
            label: line.name,
            total: 0,
            count: 0,
          }
          g.total += line.lineTotalDa
          g.count += line.qty
          map.set(line.productId, g)
        }
      } else {
        for (const line of p.lines) {
          const prod = state.products.find((x) => x.id === line.productId)
          const key = prod?.aisleId || '_none'
          const g = map.get(key) || {
            label: aisleLabel(prod?.aisleId),
            total: 0,
            count: 0,
          }
          g.total += line.lineTotalDa
          g.count += 1
          map.set(key, g)
        }
      }
    }
    return [...map.entries()]
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => b.total - a.total)
  }, [state.purchases, state.products, mode, lang])

  const detail = useMemo(() => {
    if (!filterId) return state.purchases.slice(0, 30)
    if (mode === 'supplier') {
      return state.purchases
        .filter((p) => p.supplierId === filterId || p.supplierName === filterId)
        .slice(0, 30)
    }
    if (mode === 'product') {
      return state.purchases
        .filter((p) => p.lines.some((l) => l.productId === filterId))
        .slice(0, 30)
    }
    return state.purchases
      .filter((p) =>
        p.lines.some((l) => {
          const prod = state.products.find((x) => x.id === l.productId)
          const key = prod?.aisleId || '_none'
          return key === filterId
        }),
      )
      .slice(0, 30)
  }, [state.purchases, state.products, filterId, mode])

  return (
    <div className="card">
      <h2>{t(lang, 'purchasesHistory')}</h2>
      <div className="field">
        <label>{t(lang, 'invoiceGroupBy')}</label>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as HistFilter)
            setFilterId('')
          }}
        >
          <option value="supplier">{t(lang, 'invoiceGroupSupplier')}</option>
          <option value="product">{t(lang, 'invoiceGroupProduct')}</option>
          <option value="aisle">{t(lang, 'invoiceGroupAisle')}</option>
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="empty">{t(lang, 'purchasesEmpty')}</div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {groups.slice(0, 20).map((g) => (
            <button
              type="button"
              key={g.id}
              className={`list-item ${filterId === g.id ? 'alert-card' : ''}`}
              style={{
                width: '100%',
                textAlign: 'start',
                cursor: 'pointer',
                border: 'none',
                background: filterId === g.id ? undefined : 'transparent',
              }}
              onClick={() => setFilterId((id) => (id === g.id ? '' : g.id))}
            >
              <div>
                <strong>{g.label}</strong>
                <div className="muted">
                  {mode === 'product'
                    ? `${formatQty(g.count)}`
                    : `${g.count} ${t(lang, mode === 'supplier' ? 'purchases' : 'products')}`}
                </div>
              </div>
              <strong>{formatDa(g.total)}</strong>
            </button>
          ))}
        </div>
      )}

      {detail.map((p) => (
        <div className="list-item" key={p.id}>
          <div>
            <strong>{p.supplierName}</strong>
            <div className="muted">
              {p.lines.length} {t(lang, 'products')} ·{' '}
              {new Date(p.createdAt).toLocaleString(
                lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
              )}
              {p.note ? ` · ${p.note}` : ''}
            </div>
          </div>
          <strong>{formatDa(p.totalDa)}</strong>
        </div>
      ))}
    </div>
  )
}
