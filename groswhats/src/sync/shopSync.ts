import type {
  AppState,
  CashEntry,
  Cashier,
  Client,
  Driver,
  Mission,
  Order,
  Product,
} from '../types'
import {
  ensureCompanyCode,
  mergeCloudCashEntries,
  mergeCloudCashiers,
  mergeCloudClients,
  mergeCloudDrivers,
  mergeCloudMissions,
  mergeCloudOrders,
  mergeCloudProducts,
} from '../store'
import {
  pullTeamCloud,
  pushTeamCloud,
  type TeamCloudPayload,
} from './teamApi'

const ORDER_WINDOW_MS = 90 * 24 * 60 * 60 * 1000

/** Produit sans image (poids Blob). */
export function leanProduct(p: Product): Product {
  const { imageDataUrl: _img, ...rest } = p
  return {
    ...rest,
    updatedAt: p.updatedAt || p.createdAt,
  }
}

export function leanClient(c: Client): Client {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    city: c.city || '',
    address: c.address || '',
    notes: c.notes || '',
    balanceAdjustDa: c.balanceAdjustDa,
    creditLimitDa: c.creditLimitDa,
    lat: c.lat,
    lng: c.lng,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt || c.createdAt,
  }
}

function recentOrders(orders: Order[]): Order[] {
  const cut = Date.now() - ORDER_WINDOW_MS
  return (orders || []).filter((o) => {
    const t = new Date(o.createdAt).getTime()
    return Number.isFinite(t) && t >= cut
  })
}

function recentCash(entries: CashEntry[]): CashEntry[] {
  const cut = Date.now() - ORDER_WINDOW_MS
  return (entries || []).filter((e) => {
    const t = new Date(e.createdAt).getTime()
    return Number.isFinite(t) && t >= cut
  })
}

export function buildTeamCloudPayload(state: AppState): TeamCloudPayload {
  const s = ensureCompanyCode(state)
  return {
    companyCode: s.team.companyCode,
    syncSecret: s.team.syncSecret,
    shopName: s.settings.shopName,
    drivers: s.drivers,
    cashiers: s.cashiers || [],
    missions: s.missions,
    products: (s.products || []).map(leanProduct),
    clients: (s.clients || []).map(leanClient),
    orders: recentOrders(s.orders || []),
    cashEntries: recentCash(s.cashEntries || []),
    updatedAt: new Date().toISOString(),
  }
}

export function applyTeamCloudData(
  state: AppState,
  data: TeamCloudPayload,
): AppState {
  let next = state
  if (Array.isArray(data.drivers)) next = mergeCloudDrivers(next, data.drivers)
  if (Array.isArray(data.cashiers)) next = mergeCloudCashiers(next, data.cashiers)
  if (Array.isArray(data.missions)) next = mergeCloudMissions(next, data.missions)
  if (Array.isArray(data.products)) next = mergeCloudProducts(next, data.products)
  if (Array.isArray(data.clients)) next = mergeCloudClients(next, data.clients)
  if (Array.isArray(data.orders)) next = mergeCloudOrders(next, data.orders)
  if (Array.isArray(data.cashEntries)) {
    next = mergeCloudCashEntries(next, data.cashEntries)
  }
  return next
}

export async function syncTeamPull(
  state: AppState,
  opts?: { driverId?: string; cashierId?: string },
): Promise<{ ok: boolean; state: AppState; message?: string }> {
  const s = ensureCompanyCode(state)
  const res = await pullTeamCloud(
    s.team.companyCode,
    s.team.syncSecret,
    opts?.driverId,
    opts?.cashierId,
  )
  if (!res.ok || !res.data) {
    return { ok: false, state: s, message: res.message }
  }
  return { ok: true, state: applyTeamCloudData(s, res.data) }
}

export async function syncTeamPush(
  state: AppState,
): Promise<{ ok: boolean; state: AppState; message?: string }> {
  let s = ensureCompanyCode(state)

  const pulled = await pullTeamCloud(s.team.companyCode, s.team.syncSecret)
  if (pulled.ok && pulled.data) {
    s = applyTeamCloudData(s, pulled.data)
  }

  const res = await pushTeamCloud(buildTeamCloudPayload(s))
  if (res.ok && res.data) {
    s = applyTeamCloudData(s, res.data)
  }
  return {
    ok: res.ok,
    state: s,
    message: res.message,
  }
}

export type { Driver, Cashier, Mission, Product, Client, Order, CashEntry }
