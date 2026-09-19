import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { AppState, Language, Product, ProductCategory, PurchaseLine } from './types'
import { t } from './i18n'
import { formatDa } from './utils/format'
import {
  assemblePurchaseQrChunks,
  buildPurchasePack,
  decodePurchasePack,
  downloadPurchasePackFile,
  isLikelyMobileDevice,
  parsePurchaseQrChunk,
  purchasePackToQrChunks,
  readPurchasePackFile,
  type BridgePurchasePack,
} from './utils/deviceBridge'
import { findSupplierMatch } from './utils/invoiceParse'
import { addProduct, addPurchase, addSupplier } from './store'
import { BarcodeCameraModal, isBarcodeCameraSupported } from './BarcodeCamera'

/** Après scan facture sur téléphone : envoyer au PC sans Internet. */
export function HybridSendToPc({
  lang,
  supplierName,
  note,
  paidDa,
  lines,
  onFlash,
  onDone,
}: {
  lang: Language
  supplierName: string
  note: string
  paidDa: number
  lines: Array<{
    name: string
    barcode?: string
    qty: number
    unitCostDa: number
    category?: ProductCategory
    aisleId?: string
    imageDataUrl?: string
  }>
  onFlash: (key: string) => void
  onDone: () => void
}) {
  const packFile = useMemo(
    () =>
      buildPurchasePack({
        supplierName,
        note,
        paidDa,
        lines,
        includeImages: true,
      }),
    [supplierName, note, paidDa, lines],
  )
  const chunks = useMemo(
    () =>
      purchasePackToQrChunks(
        buildPurchasePack({
          supplierName,
          note,
          paidDa,
          lines,
          includeImages: false,
        }),
      ),
    [supplierName, note, paidDa, lines],
  )
  const [page, setPage] = useState(0)

  return (
    <div className="card">
      <h2>📡 {t(lang, 'hybridSendTitle')}</h2>
      <p className="muted">{t(lang, 'hybridSendHint')}</p>
      <div className="notice" style={{ marginBottom: 10 }}>
        {t(lang, 'hybridNoBluetooth')}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 12,
          background: '#fff',
          borderRadius: 12,
        }}
      >
        <QRCodeSVG value={chunks[page] || ''} size={220} level="M" includeMargin />
      </div>
      <div className="muted" style={{ textAlign: 'center', marginTop: 8 }}>
        {t(lang, 'hybridQrPage')} {page + 1}/{chunks.length}
      </div>
      {chunks.length > 1 ? (
        <div className="btn-row" style={{ gap: 8, marginTop: 8 }}>
          <button
            type="button"
            className="btn secondary"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ←
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={page >= chunks.length - 1}
            onClick={() => setPage((p) => Math.min(chunks.length - 1, p + 1))}
          >
            →
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="btn secondary block"
        style={{ marginTop: 12 }}
        onClick={() => {
          downloadPurchasePackFile(packFile)
          onFlash('hybridFileSaved')
        }}
      >
        💾 {t(lang, 'hybridDownloadFile')}
      </button>
      <p className="muted" style={{ marginTop: 8 }}>
        {t(lang, 'hybridFileHint')}
      </p>
      <button type="button" className="btn ghost block" onClick={onDone}>
        {t(lang, 'hybridSendDone')}
      </button>
    </div>
  )
}

function applyPackToState(
  state: AppState,
  pack: BridgePurchasePack,
): AppState {
  let next = state
  let name = pack.supplierName.trim() || 'Fournisseur'
  const existing = findSupplierMatch(name, next.suppliers)
  let supplierId = existing?.id || ''
  if (existing) name = existing.name
  else {
    next = addSupplier(next, { name, phone: '', note: 'Pont téléphone' })
    supplierId = next.suppliers[0]?.id || ''
  }

  const purchaseLines: PurchaseLine[] = []
  for (const row of pack.lines) {
    if (!row.name || row.qty <= 0) continue
    let productId: string | undefined
    if (row.barcode) {
      productId = next.products.find(
        (p) =>
          p.barcode &&
          p.barcode.trim().toLowerCase() === row.barcode!.trim().toLowerCase(),
      )?.id
    }
    if (!productId) {
      const byName = next.products.find(
        (p) => p.name.trim().toLowerCase() === row.name.trim().toLowerCase(),
      )
      productId = byName?.id
    }
    if (!productId) {
      const draft: Omit<Product, 'id' | 'createdAt'> = {
        name: row.name.trim(),
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
  if (!purchaseLines.length || !supplierId) return next
  const total = purchaseLines.reduce((s, l) => s + l.lineTotalDa, 0)
  const paid =
    typeof pack.paidDa === 'number' && Number.isFinite(pack.paidDa)
      ? pack.paidDa
      : total
  return addPurchase(next, {
    supplierId,
    supplierName: name,
    lines: purchaseLines,
    paidDa: paid,
    note: pack.note || `Pont ${pack.id}`,
  })
}

/** Sur le PC : recevoir le brouillon scanné sur le téléphone. */
export function HybridReceiveFromPhone({
  state: _state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [camOpen, setCamOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [chunks, setChunks] = useState<string[]>([])
  const [preview, setPreview] = useState<BridgePurchasePack | null>(null)
  const mobile = isLikelyMobileDevice()

  function tryAssemble(list: string[]) {
    const pack = assemblePurchaseQrChunks(list)
    if (pack) {
      setPreview(pack)
      onFlash('hybridPackReady')
      return
    }
    const joined = decodePurchasePack(list.join('\n'))
    if (joined) {
      setPreview(joined)
      onFlash('hybridPackReady')
    }
  }

  function onQrDetect(code: string) {
    const part = parsePurchaseQrChunk(code)
    if (!part) {
      const pack = decodePurchasePack(code)
      if (pack) {
        setPreview(pack)
        onFlash('hybridPackReady')
        setCamOpen(false)
      } else {
        onFlash('hybridQrBad')
      }
      return
    }
    setChunks((prev) => {
      const next = [...prev.filter((c) => {
        const p = parsePurchaseQrChunk(c)
        return p && p.id === part.id
      }), code]
      const uniq = new Map<number, string>()
      for (const c of next) {
        const p = parsePurchaseQrChunk(c)
        if (p) uniq.set(p.index, c)
      }
      const list = [...uniq.values()]
      if (uniq.size >= part.total) {
        queueMicrotask(() => {
          tryAssemble(list)
          setCamOpen(false)
        })
      } else {
        onFlash('hybridQrProgress')
      }
      return list
    })
  }

  if (mobile && !open) {
    return null
  }

  return (
    <div className="card">
      <h2>💻 {t(lang, 'hybridReceiveTitle')}</h2>
      <p className="muted">{t(lang, 'hybridReceiveHint')}</p>
      {!open ? (
        <button
          type="button"
          className="btn secondary block"
          onClick={() => setOpen(true)}
        >
          📥 {t(lang, 'hybridReceiveOpen')}
        </button>
      ) : (
        <>
          <div className="btn-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                if (!isBarcodeCameraSupported()) {
                  window.alert(t(lang, 'barcodeCamUnsupported'))
                  return
                }
                setCamOpen(true)
              }}
            >
              📷 {t(lang, 'hybridScanQr')}
            </button>
            <label className="btn secondary photo-file-btn">
              📄 {t(lang, 'hybridImportFile')}
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  void readPurchasePackFile(f).then((pack) => {
                    if (!pack) {
                      onFlash('hybridFileBad')
                      return
                    }
                    setPreview(pack)
                    onFlash('hybridPackReady')
                  })
                }}
              />
            </label>
          </div>
          {chunks.length > 0 ? (
            <div className="muted" style={{ marginTop: 8 }}>
              {t(lang, 'hybridChunksGot')} {chunks.length}
            </div>
          ) : null}
          <div className="field" style={{ marginTop: 10 }}>
            <label>{t(lang, 'hybridPasteCode')}</label>
            <textarea
              rows={3}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="AZP1...."
            />
          </div>
          <button
            type="button"
            className="btn secondary block"
            disabled={!paste.trim()}
            onClick={() => {
              const pack = decodePurchasePack(paste)
              if (!pack) {
                onFlash('hybridQrBad')
                return
              }
              setPreview(pack)
              onFlash('hybridPackReady')
            }}
          >
            🔎 {t(lang, 'hybridDecodePaste')}
          </button>

          {preview ? (
            <div style={{ marginTop: 12 }}>
              <strong>{preview.supplierName}</strong>
              <div className="muted">
                {preview.lines.length} {t(lang, 'products')} ·{' '}
                {formatDa(
                  preview.lines.reduce(
                    (s, l) => s + l.qty * l.unitCostDa,
                    0,
                  ),
                )}
              </div>
              <ul className="line-preview">
                {preview.lines.slice(0, 12).map((l, i) => (
                  <li key={`${l.name}-${i}`}>
                    {l.name} × {l.qty} · {formatDa(l.unitCostDa)}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn block"
                onClick={() => {
                  onState((s) => applyPackToState(s, preview))
                  setPreview(null)
                  setChunks([])
                  setPaste('')
                  setOpen(false)
                  onFlash('purchaseDone')
                }}
              >
                ✅ {t(lang, 'hybridApplyPc')}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="btn ghost block"
            style={{ marginTop: 8 }}
            onClick={() => {
              setOpen(false)
              setPreview(null)
              setChunks([])
            }}
          >
            {t(lang, 'cancel')}
          </button>
        </>
      )}

      {camOpen ? (
        <BarcodeCameraModal
          lang={lang}
          title={t(lang, 'hybridScanQr')}
          hint={t(lang, 'hybridScanQrHint')}
          onDetect={onQrDetect}
          onClose={() => setCamOpen(false)}
        />
      ) : null}
    </div>
  )
}
