/** Tests merge équipe multi-poste (stock / caisse / caissiers). */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  mergeTeamPayload,
  mergeProducts,
  mergeByIdUnion,
} = require('../api/team-merge.cjs')

const base = {
  companyCode: 'ABC123',
  syncSecret: 'secret',
  shopName: 'Test',
  drivers: [],
  cashiers: [{ id: 'ca1', name: 'Sara', phone: '', pin: '4321', active: true, createdAt: '2026-01-01' }],
  missions: [],
  products: [
    {
      id: 'p1',
      name: 'Huile',
      stock: 10,
      stockByLocation: { loc1: 10 },
      priceDa: 100,
      costDa: 80,
      updatedAt: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z',
    },
  ],
  clients: [],
  orders: [],
  cashEntries: [],
  updatedAt: '2026-01-01T10:00:00.000Z',
}

const sold = mergeTeamPayload(base, {
  ...base,
  products: [
    {
      id: 'p1',
      name: 'Huile',
      stock: 7,
      stockByLocation: { loc1: 7 },
      priceDa: 100,
      updatedAt: '2026-01-01T11:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z',
    },
  ],
  orders: [
    {
      id: 'o1',
      clientId: 'c1',
      clientName: 'Ali',
      clientPhone: '',
      lines: [],
      totalDa: 300,
      paidDa: 300,
      remainingDa: 0,
      payment: 'paye',
      createdAt: '2026-01-01T11:00:00.000Z',
      whatsappSent: false,
    },
  ],
  cashEntries: [
    { id: 'ce1', amountDa: 50, note: 'versement', createdAt: '2026-01-01T11:05:00.000Z' },
  ],
})

assert.equal(sold.products[0].stock, 7)
assert.equal(sold.orders.length, 1)
assert.equal(sold.cashEntries.length, 1)
assert.equal(sold.cashiers.length, 1)

const equalStamp = mergeProducts(
  [{ id: 'p1', stock: 5, stockByLocation: { a: 5 }, updatedAt: 't', createdAt: 't' }],
  [{ id: 'p1', stock: 3, stockByLocation: { a: 3 }, updatedAt: 't', createdAt: 't' }],
)
assert.equal(equalStamp[0].stockByLocation.a, 3)

const orders = mergeByIdUnion(
  [{ id: 'o1', paidDa: 100, remainingDa: 50, createdAt: 'a' }],
  [{ id: 'o1', paidDa: 120, remainingDa: 30, createdAt: 'a' }],
)
assert.equal(orders[0].paidDa, 120)
assert.equal(orders[0].remainingDa, 30)

console.log('ok team-merge multi-poste')
