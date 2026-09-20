/**
 * Tests parse / matching facture fournisseur.
 * Run: npx --yes tsx scripts/test-invoice-parse.ts
 */
import assert from 'node:assert/strict'
import {
  extractBarcodes,
  mergeBrokenOcrLines,
  matchInvoiceLineToStock,
  nameScore,
  parseInvoiceText,
  sanitizeBarcodeToken,
  STOCK_MATCH_THRESHOLD,
} from '../src/utils/invoiceParse.ts'
import type { Product } from '../src/types.ts'

function fakeProduct(partial: Partial<Product> & { id: string; name: string }): Product {
  return {
    category: 'alimentaire',
    unit: 'piece',
    priceDa: 100,
    costDa: 80,
    stock: 10,
    lowStockAt: 2,
    createdAt: Date.now(),
    ...partial,
  }
}

// --- barcodes OCR ---
assert.equal(sanitizeBarcodeToken('613O123456789'), '6130123456789')
assert.equal(sanitizeBarcodeToken('bad'), undefined)
assert.deepEqual(extractBarcodes('Lait 613O12345678 12 x 45.5'), [
  '613012345678',
])

// --- merge broken lines ---
assert.deepEqual(
  mergeBrokenOcrLines(['Coca Cola 33cl', '24 x 55.00']),
  ['Coca Cola 33cl 24 x 55.00'],
)

// --- parse qty x price ---
{
  const r = parseInvoiceText(
    `SARL Distrib Plus\nFacture N° FAC-2024-01\nLait Candia 1L 6130123456789 12 x 85.50\nHuile Elio 5L 6 x 620`,
    [{ id: 's1', name: 'SARL Distrib Plus', phone: '', note: '', createdAt: '' }],
  )
  assert.equal(r.supplierName, 'SARL Distrib Plus')
  assert.equal(r.invoiceRef, 'FAC-2024-01')
  assert.ok(r.lines.length >= 2)
  const lait = r.lines.find((l) => /lait/i.test(l.name))
  assert.ok(lait)
  assert.equal(lait!.qty, 12)
  assert.equal(lait!.unitCostDa, 85.5)
  assert.equal(lait!.barcode, '6130123456789')
}

// --- qty label + PU ---
{
  const r = parseInvoiceText('Sucre crystal Qté: 10 PU: 120.00')
  assert.equal(r.lines.length, 1)
  assert.equal(r.lines[0].qty, 10)
  assert.equal(r.lines[0].unitCostDa, 120)
}

// --- tri qty prix total ---
{
  const r = parseInvoiceText('Riz basmati 5 250 1250')
  assert.equal(r.lines[0].qty, 5)
  assert.equal(r.lines[0].unitCostDa, 250)
  assert.equal(r.lines[0].lineTotalDa, 1250)
}

// --- name score fuzzy ---
assert.ok(nameScore('Coca Cola 33cl', 'coca cola 33 cl') >= 0.8)
assert.ok(nameScore('Lait Candia', 'Candia Lait') >= 0.5)
assert.ok(nameScore('abc', 'zzzz') < 0.3)

// --- stock match barcode + fuzzy ---
{
  const products = [
    fakeProduct({
      id: 'p1',
      name: 'Coca Cola 33cl',
      barcode: '6130123456789',
    }),
    fakeProduct({ id: 'p2', name: 'Lait Candia 1L', barcode: '6130999999999' }),
  ]
  const byCode = matchInvoiceLineToStock(
    { raw: '', name: 'coca', barcode: '6130123456789', qty: 1, unitCostDa: 50 },
    products,
  )
  assert.equal(byCode.product?.id, 'p1')
  assert.equal(byCode.score, 1)

  const byName = matchInvoiceLineToStock(
    { raw: '', name: 'Lait Candia 1 litre', qty: 2, unitCostDa: 80 },
    products,
  )
  assert.ok(byName.score >= STOCK_MATCH_THRESHOLD)
  assert.equal(byName.product?.id, 'p2')

  // suffix barcode
  const bySuffix = matchInvoiceLineToStock(
    { raw: '', name: 'x', barcode: '123456789', qty: 1, unitCostDa: 1 },
    [
      fakeProduct({
        id: 'p3',
        name: 'Produit X',
        barcode: '000123456789',
      }),
    ],
  )
  assert.equal(bySuffix.product?.id, 'p3')
}

console.log('invoiceParse tests: OK')
