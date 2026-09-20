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
import { isOnline, ocrInvoiceImage } from './utils/invoiceOcr'
import {
  findSupplierMatch,
  matchInvoiceLineToStock,
  MAYBE_MATCH_THRESHOLD,
  STOCK_MATCH_THRESHOLD,
  parseInvoiceText,
  type InvoiceMatchedLine,
  type InvoiceParsedLine,
} from './utils/invoiceParse'
import {
  findAliasProductId,
  findDuplicateProduct,
  purchaseMarginPct,
  rememberInvoiceAlias,
  suggestSalePriceDa,
  supplierBoostMap,
  supplierFrequentProducts,
} from './utils/invoiceMemory'
import { isPdfFile, renderPdfPagesToImages } from './utils/invoicePdf'
import { lookupOffProduct } from './utils/offLookup'
import { addProduct, addPurchase, addSupplier, updateSettings, uid } from './store'
import { HybridSendToPc } from './HybridBridgePanel'
import { isLikelyMobileDevice } from './utils/deviceBridge'

type HistFilter = 'supplier' | 'product' | 'aisle'

type CapturePage = {
  id: string
  thumb: string
  /** Image Blob ou File prêt pour OCR */
  blob: Blob
  label: string
}

function lineId(): string {
  return uid('il')
}

function pageId(): string {
  return uid('ip')
}

function toMatched(
  state: AppState,
  parsed: InvoiceParsedLine,
  opts?: {
    supplierId?: string
    supplierName?: string
  },
): InvoiceMatchedLine {
  const margin = purchaseMarginPct(state)
  const saleDefault = suggestSalePriceDa(parsed.unitCostDa, margin)
  const frequent = supplierFrequentProducts(
    state.purchases,
    opts?.supplierId,
    opts?.supplierName,
  )
  const boosts = supplierBoostMap(frequent)
  const aliasId = findAliasProductId(parsed.name, state.invoiceAliases)
  const { product, score, candidates, fromAlias, fromSupplierHistory } =
    matchInvoiceLineToStock(parsed, state.products, {
      aliasProductId: aliasId,
      supplierBoosts: boosts,
    })

  if (product && score >= STOCK_MATCH_THRESHOLD) {
    return {
      ...parsed,
      id: lineId(),
      name: fromAlias ? parsed.name : product.name,
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
      matchScore: score,
      candidates,
      salePriceDa: product.priceDa,
      fromAlias,
      fromSupplierHistory,
    }
  }
  if (candidates.length && score >= MAYBE_MATCH_THRESHOLD) {
    const top = candidates[0]
    const maybe = state.products.find((p) => p.id === top.productId)
    return {
      ...parsed,
      id: lineId(),
      match: 'maybe',
      productId: top.productId,
      category: maybe?.category || 'alimentaire',
      aisleId: maybe?.aisleId,
      imageDataUrl: maybe?.imageDataUrl,
      createIfNew: true,
      selected: true,
      matchScore: score,
      candidates,
      salePriceDa: saleDefault,
      fromSupplierHistory,
    }
  }

  const dup = findDuplicateProduct(parsed.name, state.products)
  return {
    ...parsed,
    id: lineId(),
    match: 'new',
    category: 'alimentaire',
    createIfNew: true,
    selected: true,
    matchScore: score,
    candidates: candidates.length
      ? candidates
      : dup
        ? [{ productId: dup.product.id, name: dup.product.name, score: dup.score }]
        : [],
    salePriceDa: saleDefault,
    duplicateOfId: dup?.product.id,
    duplicateOfName: dup?.product.name,
    fromSupplierHistory,
  }
}

function patchRow(
  rows: InvoiceMatchedLine[],
  id: string,
  patch: Partial<InvoiceMatchedLine>,
): InvoiceMatchedLine[] {
  return rows.map((x) => (x.id === id ? { ...x, ...patch } : x))
}

function linkRowToProduct(
  state: AppState,
  row: InvoiceMatchedLine,
  productId: string,
): InvoiceMatchedLine {
  if (!productId) {
    const margin = purchaseMarginPct(state)
    const dup = findDuplicateProduct(row.name, state.products)
    return {
      ...row,
      match: 'new',
      productId: undefined,
      createIfNew: true,
      aisleId: undefined,
      category: 'alimentaire',
      salePriceDa:
        row.salePriceDa && row.salePriceDa > 0
          ? row.salePriceDa
          : suggestSalePriceDa(row.unitCostDa, margin),
      duplicateOfId: dup?.product.id,
      duplicateOfName: dup?.product.name,
      fromAlias: false,
    }
  }
  const p = state.products.find((x) => x.id === productId)
  if (!p) return row
  return {
    ...row,
    barcode: row.barcode || p.barcode,
    match: 'stock',
    productId: p.id,
    category: p.category,
    aisleId: p.aisleId,
    imageDataUrl: row.imageDataUrl || p.imageDataUrl,
    unitCostDa: row.unitCostDa > 0 ? row.unitCostDa : p.costDa || 0,
    createIfNew: false,
    matchScore: 1,
    salePriceDa: p.priceDa,
    duplicateOfId: undefined,
    duplicateOfName: undefined,
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
  const [pages, setPages] = useState<CapturePage[]>([])
  const [ocrText, setOcrText] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [supplierName, setSupplierName] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [rows, setRows] = useState<InvoiceMatchedLine[]>([])
  const [paidDa, setPaidDa] = useState('')
  const [note, setNote] = useState('')
  const [step, setStep] = useState<'capture' | 'review' | 'send'>('capture')
  const [offBusy, setOffBusy] = useState(false)
  const [marginPct, setMarginPct] = useState(() =>
    String(purchaseMarginPct(state)),
  )
  const mobile = isLikelyMobileDevice()
  const [online, setOnline] = useState(isOnline())

  useEffect(() => {
    const sync = () => setOnline(isOnline())
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  const total = useMemo(
    () =>
      rows
        .filter((r) => r.selected)
        .reduce((s, r) => s + r.qty * r.unitCostDa, 0),
    [rows],
  )

  const supplierHints = useMemo(
    () =>
      supplierFrequentProducts(
        state.purchases,
        supplierId || undefined,
        supplierName || undefined,
        8,
      ),
    [state.purchases, supplierId, supplierName],
  )

  useEffect(() => {
    const hit = findSupplierMatch(supplierName, state.suppliers)
    if (hit) setSupplierId(hit.id)
  }, [supplierName, state.suppliers])

  async function addImagePage(file: File) {
    const thumb = await compressImageFile(file, 900, 0.85)
    setPages((prev) => [
      ...prev,
      {
        id: pageId(),
        thumb,
        blob: file,
        label: file.name || `Page ${prev.length + 1}`,
      },
    ])
  }

  async function addPdfPages(file: File) {
    const blobs = await renderPdfPagesToImages(file, (pct) =>
      setProgress(Math.round(pct * 0.4)),
    )
    const next: CapturePage[] = []
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i]
      const asFile = new File([blob], `${file.name}-p${i + 1}.png`, {
        type: 'image/png',
      })
      const thumb = await compressImageFile(asFile, 900, 0.85)
      next.push({
        id: pageId(),
        thumb,
        blob,
        label: `${file.name} · p.${i + 1}`,
      })
    }
    setPages((prev) => [...prev, ...next])
  }

  async function addCaptureFiles(fileList: FileList | File[]) {
    const files = [...fileList]
    setBusy(true)
    setProgress(0)
    try {
      for (const f of files) {
        if (isPdfFile(f)) await addPdfPages(f)
        else await addImagePage(f)
      }
      onFlash('invoicePagesAdded')
    } catch {
      onFlash('invoiceOcrFail')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  async function runOcrOnPages() {
    if (!pages.length) return
    setBusy(true)
    setProgress(0)
    try {
      const texts: string[] = []
      for (let i = 0; i < pages.length; i++) {
        const base = (i / pages.length) * 100
        const text = await ocrInvoiceImage(pages[i].blob, (pct) =>
          setProgress(Math.round(base + pct / pages.length)),
        )
        if (text) texts.push(text)
      }
      const joined = texts.join('\n\n')
      if (!joined.trim()) {
        onFlash('invoiceOcrFail')
        return
      }
      applyParsedText(joined)
    } catch {
      onFlash('invoiceOcrFail')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  /** Compat : une seule image → page + OCR immédiat */
  async function runFromImage(file: File) {
    setBusy(true)
    setProgress(0)
    try {
      if (isPdfFile(file)) {
        await addPdfPages(file)
        setBusy(false)
        setProgress(0)
        return
      }
      const thumb = await compressImageFile(file, 900, 0.85)
      const page: CapturePage = {
        id: pageId(),
        thumb,
        blob: file,
        label: file.name || '1',
      }
      setPages([page])
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
    const sid =
      findSupplierMatch(parsed.supplierName || supplierName, state.suppliers)
        ?.id || supplierId
    const matched = parsed.lines.map((l) =>
      toMatched(state, l, {
        supplierId: sid,
        supplierName: parsed.supplierName || supplierName,
      }),
    )
    setRows(matched)
    setStep('review')
    if (matched.length === 0) onFlash('invoiceNoLines')
    else onFlash('invoiceParsed')
  }

  function reMatchWithSupplier(nextSupplierId: string, nextName: string) {
    setRows((prev) =>
      prev.map((row) => {
        const parsed: InvoiceParsedLine = {
          raw: row.raw,
          name: row.name,
          barcode: row.barcode,
          qty: row.qty,
          unitCostDa: row.unitCostDa,
          lineTotalDa: row.lineTotalDa,
        }
        const m = toMatched(state, parsed, {
          supplierId: nextSupplierId || undefined,
          supplierName: nextName,
        })
        return {
          ...m,
          id: row.id,
          selected: row.selected,
          salePriceDa: row.salePriceDa ?? m.salePriceDa,
        }
      }),
    )
  }

  async function enrichNewWithOff() {
    const targets = rows.filter(
      (r) => r.selected && r.match !== 'stock' && r.barcode,
    )
    if (!targets.length) return
    setOffBusy(true)
    try {
      const next = [...rows]
      let hits = 0
      for (const row of targets) {
        const hit = await lookupOffProduct(row.barcode!)
        if (!hit) continue
        hits++
        const i = next.findIndex((x) => x.id === row.id)
        if (i < 0) continue
        const nameIsCode =
          !next[i].name ||
          next[i].name === next[i].barcode ||
          next[i].name === row.barcode
        next[i] = {
          ...next[i],
          name: nameIsCode ? hit.name : next[i].name || hit.name,
          category: hit.category,
          imageDataUrl: next[i].imageDataUrl || hit.imageDataUrl,
          match: 'off',
          createIfNew: true,
        }
      }
      setRows(next)
      onFlash(hits > 0 ? 'invoiceOffDone' : 'invoiceOffMiss')
    } finally {
      setOffBusy(false)
    }
  }

  function applyMarginToNewRows() {
    const pct = Number(String(marginPct).replace(',', '.'))
    const safe = Number.isFinite(pct) ? Math.max(0, Math.min(200, pct)) : 20
    onState((s) => updateSettings(s, { purchaseMarginPct: safe }))
    setRows((prev) =>
      prev.map((r) =>
        r.match === 'stock' && !r.createIfNew
          ? r
          : {
              ...r,
              salePriceDa: suggestSalePriceDa(r.unitCostDa, safe),
            },
      ),
    )
    onFlash('invoiceMarginApplied')
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
        const linkExisting =
          row.match === 'stock' ||
          (row.match === 'maybe' && row.productId && !row.createIfNew)
        const invoiceLabel = row.raw || row.name

        if (linkExisting && productId) {
          next = rememberInvoiceAlias(next, invoiceLabel, productId)
          next = rememberInvoiceAlias(next, row.name, productId)
        } else if (!productId || row.createIfNew) {
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
            next = rememberInvoiceAlias(next, invoiceLabel, productId)
            next = rememberInvoiceAlias(next, row.name, productId)
          } else if (row.match === 'stock' && row.productId) {
            productId = row.productId
          } else if (
            row.match === 'maybe' &&
            row.productId &&
            !row.createIfNew
          ) {
            productId = row.productId
            next = rememberInvoiceAlias(next, invoiceLabel, productId)
          } else {
            const sale =
              row.salePriceDa && row.salePriceDa > 0
                ? row.salePriceDa
                : suggestSalePriceDa(
                    row.unitCostDa,
                    purchaseMarginPct(next),
                  )
            const draft: Omit<Product, 'id' | 'createdAt'> = {
              name: row.name.trim() || row.barcode || 'Produit',
              category: (row.category || 'alimentaire') as ProductCategory,
              aisleId: row.aisleId,
              unit: 'piece',
              priceDa: sale,
              costDa: row.unitCostDa || 0,
              stock: 0,
              lowStockAt: 5,
              barcode: row.barcode,
              imageDataUrl: row.imageDataUrl,
            }
            next = addProduct(next, draft)
            productId = next.products[0]?.id
            if (productId) {
              next = rememberInvoiceAlias(next, invoiceLabel, productId)
              next = rememberInvoiceAlias(next, row.name, productId)
            }
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
    setPages([])
    setPaidDa('')
    setNote('')
    setStep('capture')
    onFlash('purchaseDone')
  }

  return (
    <>
    {step === 'send' ? (
      <HybridSendToPc
        lang={lang}
        supplierName={supplierName.trim() || 'Fournisseur'}
        note={note}
        paidDa={Number(String(paidDa || total).replace(',', '.')) || total}
        lines={rows
          .filter((r) => r.selected && r.qty > 0)
          .map((r) => ({
            name: r.name,
            barcode: r.barcode,
            qty: r.qty,
            unitCostDa: r.unitCostDa,
            category: r.category,
            aisleId: r.aisleId,
            imageDataUrl: r.imageDataUrl,
          }))}
        onFlash={onFlash}
        onDone={() => {
          setRows([])
          setOcrText('')
          setPages([])
          setPaidDa('')
          setNote('')
          setStep('capture')
        }}
      />
    ) : null}
    {step !== 'send' ? (
    <div className="card">
      <h2>📷 {t(lang, 'invoiceScanTitle')}</h2>
      <p className="muted">{t(lang, 'invoiceScanHint')}</p>
      <div className="notice" style={{ marginBottom: 10 }}>
        {t(lang, 'invoiceScanDevices')}
      </div>
      <div className="notice" style={{ marginBottom: 10 }}>
        {online ? t(lang, 'invoiceOfflineReady') : t(lang, 'invoiceOfflineNow')}
      </div>
      {mobile ? (
        <div className="notice" style={{ marginBottom: 10 }}>
          {t(lang, 'hybridPhoneTip')}
        </div>
      ) : (
        <div className="notice" style={{ marginBottom: 10 }}>
          {t(lang, 'hybridPcTip')}
        </div>
      )}

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
                multiple
                hidden
                disabled={busy}
                onChange={(e) => {
                  const list = e.target.files
                  e.target.value = ''
                  if (list?.length) void addCaptureFiles(list)
                }}
              />
            </label>
            <label className={`btn secondary photo-file-btn ${busy ? 'disabled' : ''}`}>
              📄 {t(lang, 'invoiceScanPdf')}
              <input
                type="file"
                accept="application/pdf,.pdf"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void addCaptureFiles([f])
                }}
              />
            </label>
            <label className={`btn ghost photo-file-btn ${busy ? 'disabled' : ''}`}>
              ➕ {t(lang, 'invoiceAddPage')}
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                multiple
                hidden
                disabled={busy}
                onChange={(e) => {
                  const list = e.target.files
                  e.target.value = ''
                  if (list?.length) void addCaptureFiles(list)
                }}
              />
            </label>
          </div>
          {busy ? (
            <div className="muted" style={{ marginTop: 8 }}>
              {t(lang, 'invoiceOcrLoading')} {progress ? `${progress}%` : ''}
            </div>
          ) : null}
          {pages.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                {pages.length} {t(lang, 'invoicePagesCount')}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                }}
              >
                {pages.map((p) => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <img
                      src={p.thumb}
                      alt=""
                      className="product-thumb"
                      style={{ maxHeight: 100, objectFit: 'contain' }}
                    />
                    <button
                      type="button"
                      className="btn ghost"
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        padding: '2px 6px',
                        fontSize: 12,
                      }}
                      disabled={busy}
                      onClick={() =>
                        setPages((prev) => prev.filter((x) => x.id !== p.id))
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn block"
                style={{ marginTop: 10 }}
                disabled={busy || !pages.length}
                onClick={() => void runOcrOnPages()}
              >
                🔎 {t(lang, 'invoiceAnalyzePages')}
              </button>
            </div>
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
                  const id = e.target.value
                  setSupplierId(id)
                  const s = state.suppliers.find((x) => x.id === id)
                  const nm = s?.name || supplierName
                  if (s) setSupplierName(s.name)
                  reMatchWithSupplier(id, nm)
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

          {supplierHints.length > 0 ? (
            <div className="notice" style={{ marginBottom: 10 }}>
              <strong>{t(lang, 'invoiceSupplierHistory')}</strong>
              <div className="muted" style={{ marginTop: 4 }}>
                {supplierHints
                  .map((h) => `${h.name} (${h.count})`)
                  .join(' · ')}
              </div>
            </div>
          ) : null}

          <div className="grid-2" style={{ marginBottom: 8, gap: 8 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>{t(lang, 'invoiceMarginPct')}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={200}
                value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn secondary block"
                onClick={applyMarginToNewRows}
              >
                {t(lang, 'invoiceApplyMargin')}
              </button>
            </div>
          </div>

          <div className="btn-row" style={{ marginBottom: 8, gap: 8 }}>
            <button
              type="button"
              className="btn secondary"
              disabled={
                offBusy ||
                busy ||
                !rows.some((r) => r.selected && r.match !== 'stock' && r.barcode)
              }
              onClick={() => void enrichNewWithOff()}
              title={
                online
                  ? t(lang, 'invoiceEnrichOffHint')
                  : t(lang, 'invoiceEnrichOffOffline')
              }
            >
              {offBusy ? '…' : `🌐 ${t(lang, 'invoiceEnrichOff')}`}
            </button>
          </div>
          <div className="muted" style={{ marginBottom: 8 }}>
            {online
              ? t(lang, 'invoiceEnrichOffHint')
              : t(lang, 'invoiceEnrichOffOffline')}
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
                          patchRow(prev, r.id, { selected: e.target.checked }),
                        )
                      }
                    />
                    <span style={{ flex: 1 }}>
                      <input
                        value={r.name}
                        onChange={(e) =>
                          setRows((prev) =>
                            patchRow(prev, r.id, { name: e.target.value }),
                          )
                        }
                        aria-label={t(lang, 'name')}
                        style={{
                          fontWeight: 600,
                          width: '100%',
                          marginBottom: 4,
                        }}
                      />
                      <div className="muted">
                        {r.match === 'stock'
                          ? `✅ ${t(lang, 'invoiceMatchStock')}${
                              r.fromAlias ? ` · ${t(lang, 'invoiceFromMemory')}` : ''
                            }`
                          : r.match === 'maybe'
                            ? `≈ ${t(lang, 'invoiceMatchMaybe')}`
                            : r.match === 'off'
                              ? `🌐 ${t(lang, 'invoiceMatchOff')}`
                              : `🆕 ${t(lang, 'invoiceMatchNew')}`}
                        {r.fromSupplierHistory
                          ? ` · ${t(lang, 'invoiceFromSupplier')}`
                          : ''}
                        {r.matchScore != null && r.match !== 'stock'
                          ? ` · ${Math.round(r.matchScore * 100)}%`
                          : ''}
                        {r.barcode ? ` · ⬛ ${r.barcode}` : ''}
                        {r.aisleId ? ` · ${r.aisleId}` : ''}
                      </div>
                      {r.duplicateOfId && r.match === 'new' ? (
                        <div className="notice" style={{ marginTop: 4 }}>
                          ⚠️ {t(lang, 'invoiceDupWarn')} « {r.duplicateOfName} »
                          <button
                            type="button"
                            className="btn secondary"
                            style={{
                              marginLeft: 8,
                              fontSize: 12,
                              padding: '2px 8px',
                            }}
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? linkRowToProduct(
                                        state,
                                        x,
                                        r.duplicateOfId!,
                                      )
                                    : x,
                                ),
                              )
                            }
                          >
                            {t(lang, 'invoiceConfirmLink')}
                          </button>
                        </div>
                      ) : null}
                      {state.products.length > 0 ? (
                        <div className="field" style={{ marginTop: 4 }}>
                          <select
                            value={
                              r.match === 'stock' ||
                              (r.match === 'maybe' && !r.createIfNew)
                                ? r.productId || ''
                                : r.match === 'maybe'
                                  ? r.productId || ''
                                  : ''
                            }
                            onChange={(e) => {
                              const pid = e.target.value
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? linkRowToProduct(state, x, pid)
                                    : x,
                                ),
                              )
                            }}
                            aria-label={t(lang, 'invoiceLinkStock')}
                          >
                            <option value="">
                              — {t(lang, 'invoiceCreateNewProduct')}
                            </option>
                            {(r.candidates?.length
                              ? r.candidates
                                  .map((c) =>
                                    state.products.find(
                                      (p) => p.id === c.productId,
                                    ),
                                  )
                                  .filter(Boolean)
                              : state.products
                            ).map((p) =>
                              p ? (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {r.candidates?.find((c) => c.productId === p.id)
                                    ? ` (${Math.round(
                                        (r.candidates.find(
                                          (c) => c.productId === p.id,
                                        )?.score || 0) * 100,
                                      )}%)`
                                    : ''}
                                </option>
                              ) : null,
                            )}
                            {r.candidates?.length &&
                            r.candidates.length < state.products.length ? (
                              <optgroup label={t(lang, 'invoiceAllProducts')}>
                                {state.products
                                  .filter(
                                    (p) =>
                                      !r.candidates?.some(
                                        (c) => c.productId === p.id,
                                      ),
                                  )
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                              </optgroup>
                            ) : null}
                          </select>
                        </div>
                      ) : null}
                      {r.match === 'maybe' && r.productId ? (
                        <div className="btn-row" style={{ gap: 6, marginTop: 4 }}>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ fontSize: 13, padding: '4px 10px' }}
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? linkRowToProduct(state, x, r.productId!)
                                    : x,
                                ),
                              )
                            }
                          >
                            ✅ {t(lang, 'invoiceConfirmLink')}
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ fontSize: 13, padding: '4px 10px' }}
                            onClick={() =>
                              setRows((prev) =>
                                patchRow(prev, r.id, {
                                  match: 'new',
                                  createIfNew: true,
                                  productId: undefined,
                                }),
                              )
                            }
                          >
                            🆕 {t(lang, 'invoiceKeepNew')}
                          </button>
                        </div>
                      ) : null}
                      <div className="grid-2" style={{ marginTop: 4 }}>
                        <input
                          value={String(r.qty)}
                          onChange={(e) =>
                            setRows((prev) =>
                              patchRow(prev, r.id, {
                                qty:
                                  Number(e.target.value.replace(',', '.')) || 0,
                              }),
                            )
                          }
                          aria-label={t(lang, 'qty')}
                        />
                        <input
                          value={String(r.unitCostDa || '')}
                          onChange={(e) => {
                            const unitCostDa =
                              Number(e.target.value.replace(',', '.')) || 0
                            const pct = Number(
                              String(marginPct).replace(',', '.'),
                            )
                            const safe = Number.isFinite(pct) ? pct : 20
                            setRows((prev) =>
                              patchRow(prev, r.id, {
                                unitCostDa,
                                salePriceDa:
                                  r.match === 'stock' && !r.createIfNew
                                    ? r.salePriceDa
                                    : suggestSalePriceDa(unitCostDa, safe),
                              }),
                            )
                          }}
                          placeholder={t(lang, 'costDa')}
                          aria-label={t(lang, 'costDa')}
                        />
                      </div>
                      {(r.match !== 'stock' || r.createIfNew) && (
                        <div className="field" style={{ marginTop: 4 }}>
                          <label>{t(lang, 'invoiceSalePrice')}</label>
                          <input
                            value={String(r.salePriceDa ?? '')}
                            onChange={(e) =>
                              setRows((prev) =>
                                patchRow(prev, r.id, {
                                  salePriceDa:
                                    Number(e.target.value.replace(',', '.')) ||
                                    0,
                                }),
                              )
                            }
                            aria-label={t(lang, 'invoiceSalePrice')}
                          />
                        </div>
                      )}
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
            onClick={() => {
              if (!supplierName.trim() && !supplierId) {
                onFlash('invoiceNeedSupplier')
                return
              }
              setStep('send')
            }}
          >
            📡 {t(lang, 'hybridSendToPc')}
          </button>
          <button
            type="button"
            className="btn secondary block"
            style={{ marginTop: 8 }}
            disabled={!rows.some((r) => r.selected) || busy}
            onClick={confirmPurchase}
          >
            ✅ {t(lang, 'invoiceConfirmPurchase')}
          </button>
          <p className="muted" style={{ marginTop: 8 }}>
            {t(lang, 'hybridOrValidateHere')}
          </p>
        </>
      )}
    </div>
    ) : null}
    </>
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
