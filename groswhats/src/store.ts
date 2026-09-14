import type {
  AppState,
  CommerceMode,
  CashEntry,
  CashSession,
  Client,
  Driver,
  Expense,
  ExpenseCategory,
  IncomingOrder,
  Language,
  Mission,
  MissionStatus,
  MissionStop,
  Order,
  OrderLine,
  Product,
  Purchase,
  PurchaseLine,
  ReturnLine,
  SaleReturn,
  ShopSettings,
  StopStatus,
  Supplier,
  TeamSettings,
  ZakatRecord,
} from './types'
import {
  DEFAULT_AGENT_PERMISSIONS,
  type AgentPermissions,
} from './agent/permissions'
import { APP_BRAND } from './brand'
import { countryByCode, convertPriceDa } from './data/countries'
import { catalogFor } from './data/catalogs'
import { domainById } from './data/domains'
import { catalogImagePath } from './utils/productArt'
import { parseLanguage } from './locale/langs'
import { defaultZakatOn } from './locale/adapt'

const STORAGE_KEY = 'az-pos-v1'
const LEGACY_STORAGE_KEYS = [
  'grossiste-dz-v1',
  'groswhats-v3',
  'groswhats-v2',
  'groswhats-v1',
]

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function defaultSettings(): ShopSettings {
  return {
    shopName: APP_BRAND.defaultShopName,
    phone: '',
    city: '',
    language: 'fr',
    setupDone: false,
    countryCode: 'DZ',
    commerceMode: 'gros',
    domainId: 'gros-alimentaire',
    currency: 'DA',
    nextInvoiceNumber: 1,
    stockAlertsEnabled: true,
    uiSoundsEnabled: true,
    easyMode: true,
    themePreset: 'forest',
    fontScale: 'normal',
    showZakat: true,
    showCalculator: true,
    showGallery: true,
    agentPermissions: { ...DEFAULT_AGENT_PERMISSIONS },
  }
}

function defaultTeam(): TeamSettings {
  return {
    companyCode: '',
    role: 'owner',
    currentDriverId: null,
    syncSecret: '',
    multiPosteEnabled: false,
    hasChosenRole: false,
  }
}

function genCode(len = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function cleanShopName(name: string | undefined): string {
  if (!name) return APP_BRAND.defaultShopName
  const n = name.toLowerCase()
  if (
    n.includes('groswhats') ||
    n.includes('dépôt gros') ||
    n.includes('depot gros') ||
    n === 'grossiste dz' ||
    n === 'grossiste-dz'
  ) {
    return APP_BRAND.defaultShopName
  }
  return name
}

function cleanCity(city: string | undefined): string {
  if (!city) return ''
  if (city.toLowerCase().includes('boumerd')) return ''
  return city
}

function seedState(): AppState {
  const companyCode = genCode(6)
  return {
    settings: defaultSettings(),
    products: [],
    clients: [],
    orders: [],
    incomingOrders: [],
    zakatHistory: [],
    expenses: [],
    cashEntries: [],
    drivers: [],
    missions: [],
    team: {
      ...defaultTeam(),
      companyCode,
      syncSecret: genCode(8),
    },
    suppliers: [],
    purchases: [],
    cashSessions: [],
    returns: [],
  }
}

function migrate(raw: unknown): AppState {
  const data = raw as {
    settings?: Partial<ShopSettings>
    products?: AppState['products']
    clients?: AppState['clients']
    orders?: AppState['orders']
    incomingOrders?: AppState['incomingOrders']
    zakatHistory?: AppState['zakatHistory']
    expenses?: AppState['expenses']
    cashEntries?: CashEntry[]
    drivers?: Driver[]
    missions?: Mission[]
    team?: Partial<TeamSettings>
    suppliers?: Supplier[]
    purchases?: Purchase[]
    cashSessions?: CashSession[]
    returns?: SaleReturn[]
  }
  const incoming = data.settings ?? {}
  const defaults = defaultSettings()
  const themeOk = ['forest', 'ocean', 'sand', 'night', 'coral'] as const
  const fontOk = ['normal', 'large', 'xlarge'] as const
  const settings: ShopSettings = {
    shopName: cleanShopName(incoming.shopName) || defaults.shopName,
    phone:
      incoming.phone === '0555000000' || !incoming.phone ? '' : incoming.phone,
    city: cleanCity(incoming.city),
    language: parseLanguage(incoming.language),
    setupDone:
      incoming.setupDone === true || (data.products?.length ?? 0) > 0,
    countryCode: incoming.countryCode || defaults.countryCode,
    commerceMode: (['gros', 'detail', 'sante', 'auto', 'services'] as const).includes(
      incoming.commerceMode as CommerceMode,
    )
      ? (incoming.commerceMode as CommerceMode)
      : defaults.commerceMode,
    domainId: incoming.domainId || defaults.domainId,
    currency: incoming.currency || defaults.currency,
    nextInvoiceNumber: incoming.nextInvoiceNumber ?? defaults.nextInvoiceNumber,
    stockAlertsEnabled: incoming.stockAlertsEnabled ?? true,
    uiSoundsEnabled: incoming.uiSoundsEnabled !== false,
    easyMode: incoming.easyMode !== false,
    themePreset: themeOk.includes(incoming.themePreset as (typeof themeOk)[number])
      ? (incoming.themePreset as ShopSettings['themePreset'])
      : defaults.themePreset,
    fontScale: fontOk.includes(incoming.fontScale as (typeof fontOk)[number])
      ? (incoming.fontScale as ShopSettings['fontScale'])
      : defaults.fontScale,
    showZakat: incoming.showZakat !== false,
    showCalculator: incoming.showCalculator !== false,
    showGallery: incoming.showGallery !== false,
    agentPermissions: {
      ...DEFAULT_AGENT_PERMISSIONS,
      ...(incoming.agentPermissions as Partial<AgentPermissions> | undefined),
    },
  }
  const teamDefaults = defaultTeam()
  const team: TeamSettings = {
    companyCode: data.team?.companyCode || genCode(6),
    role: data.team?.role === 'driver' ? 'driver' : 'owner',
    currentDriverId: data.team?.currentDriverId ?? null,
    syncSecret: data.team?.syncSecret || genCode(8),
    multiPosteEnabled: data.team?.multiPosteEnabled === true,
    hasChosenRole: data.team?.hasChosenRole === true,
  }
  return {
    settings,
    products: (data.products ?? []).map((p) => {
      const piecesPerPack =
        typeof p.piecesPerPack === 'number' && p.piecesPerPack > 0
          ? Math.round(p.piecesPerPack)
          : undefined
      const gros =
        typeof p.grosPriceDa === 'number' && p.grosPriceDa > 0
          ? p.grosPriceDa
          : typeof p.packPriceDa === 'number' && p.packPriceDa > 0
            ? p.packPriceDa
            : undefined
      return {
        ...p,
        costDa: typeof p.costDa === 'number' ? p.costDa : 0,
        piecesPerPack,
        barcode:
          typeof (p as Product).barcode === 'string'
            ? (p as Product).barcode!.trim()
            : undefined,
        demiGrosPriceDa:
          typeof p.demiGrosPriceDa === 'number' && p.demiGrosPriceDa > 0
            ? p.demiGrosPriceDa
            : undefined,
        grosPriceDa: gros,
        superGrosPriceDa:
          typeof p.superGrosPriceDa === 'number' && p.superGrosPriceDa > 0
            ? p.superGrosPriceDa
            : undefined,
        packPriceDa: gros,
      }
    }),
    clients: (data.clients ?? []).map((c) => ({
      ...c,
      city: cleanCity(c.city),
      address: typeof c.address === 'string' ? c.address : '',
      notes: typeof c.notes === 'string' ? c.notes : '',
      lat: typeof c.lat === 'number' ? c.lat : undefined,
      lng: typeof c.lng === 'number' ? c.lng : undefined,
      balanceAdjustDa:
        typeof c.balanceAdjustDa === 'number' ? c.balanceAdjustDa : 0,
    })),
    orders: (data.orders ?? []).map((o) => {
      const total = typeof o.totalDa === 'number' ? o.totalDa : 0
      const pay = normalizeOrderAmounts(o, total)
      return {
        ...o,
        totalDa: total,
        ...pay,
        lines: (o.lines ?? []).map((l) => ({
          ...l,
          unitCostDa: typeof l.unitCostDa === 'number' ? l.unitCostDa : 0,
        })),
      }
    }),
    incomingOrders: data.incomingOrders ?? [],
    zakatHistory: data.zakatHistory ?? [],
    expenses: (data.expenses ?? []).map((e) => ({
      ...e,
      note: typeof e.note === 'string' ? e.note : '',
      category: (e.category as ExpenseCategory) || 'autre',
    })),
    cashEntries: (data.cashEntries ?? []).map((e) => ({
      ...e,
      id: e.id || uid('cash'),
      amountDa: typeof e.amountDa === 'number' ? e.amountDa : 0,
      note: typeof e.note === 'string' ? e.note : '',
      createdAt: e.createdAt || new Date().toISOString(),
      missionStopId:
        typeof e.missionStopId === 'string' ? e.missionStopId : undefined,
    })),
    drivers: (data.drivers ?? []).map((d) => ({
      ...d,
      active: d.active !== false,
      pin: String(d.pin || '0000').slice(0, 4),
    })),
    missions: (data.missions ?? []).map((m) => ({
      ...m,
      stops: (m.stops ?? []).map((s, i) => ({
        ...s,
        id: s.id || uid('ms'),
        note: s.note || '',
        status: (s.status as StopStatus) || 'todo',
        sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : i,
        clientPhone: s.clientPhone || '',
        city: s.city || '',
        address: s.address || '',
        collectDa:
          typeof s.collectDa === 'number' && s.collectDa >= 0 ? s.collectDa : 0,
        collectedDa:
          typeof s.collectedDa === 'number' && s.collectedDa >= 0
            ? s.collectedDa
            : 0,
        cashPostedAt:
          typeof s.cashPostedAt === 'string' ? s.cashPostedAt : undefined,
        cashPostedDa:
          typeof s.cashPostedDa === 'number' && s.cashPostedDa >= 0
            ? s.cashPostedDa
            : undefined,
      })),
      status: (m.status as MissionStatus) || 'draft',
      updatedAt: m.updatedAt || m.createdAt || new Date().toISOString(),
    })),
    team: { ...teamDefaults, ...team },
    suppliers: (data.suppliers ?? []).map((s) => ({
      ...s,
      id: s.id || uid('sup'),
      name: s.name || '',
      phone: typeof s.phone === 'string' ? s.phone : '',
      note: typeof s.note === 'string' ? s.note : '',
      createdAt: s.createdAt || new Date().toISOString(),
    })),
    purchases: (data.purchases ?? []).map((p) => ({
      ...p,
      id: p.id || uid('pur'),
      supplierId: p.supplierId || '',
      supplierName: p.supplierName || '',
      lines: Array.isArray(p.lines) ? p.lines : [],
      totalDa: typeof p.totalDa === 'number' ? p.totalDa : 0,
      paidDa: typeof p.paidDa === 'number' ? p.paidDa : 0,
      note: typeof p.note === 'string' ? p.note : '',
      createdAt: p.createdAt || new Date().toISOString(),
    })),
    cashSessions: (data.cashSessions ?? []).map((s) => ({
      ...s,
      id: s.id || uid('cs'),
      openedAt: s.openedAt || new Date().toISOString(),
      openingFloatDa:
        typeof s.openingFloatDa === 'number' ? s.openingFloatDa : 0,
      note: typeof s.note === 'string' ? s.note : '',
    })),
    returns: (data.returns ?? []).map((r) => ({
      ...r,
      id: r.id || uid('ret'),
      clientName: r.clientName || '',
      lines: Array.isArray(r.lines) ? r.lines : [],
      totalDa: typeof r.totalDa === 'number' ? r.totalDa : 0,
      refundMode: r.refundMode === 'credit' ? 'credit' : 'cash',
      note: typeof r.note === 'string' ? r.note : '',
      createdAt: r.createdAt || new Date().toISOString(),
    })),
  }
}

export function loadState(): AppState {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const raw = localStorage.getItem(key)
      if (raw) {
        const migrated = migrate(JSON.parse(raw))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        return migrated
      }
    }
    const seeded = seedState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  } catch {
    return seedState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function updateSettings(state: AppState, settings: Partial<ShopSettings>): AppState {
  return { ...state, settings: { ...state.settings, ...settings } }
}

export type ShopSetupInput = {
  countryCode: string
  commerceMode: CommerceMode
  domainId: string
  shopName: string
  phone: string
  language: Language
  replaceCatalog: boolean
}

export function applyShopSetup(state: AppState, input: ShopSetupInput): AppState {
  const country = countryByCode(input.countryCode)
  const domain = domainById(input.domainId)
  const factor = country.priceFactor
  const stock =
    input.commerceMode === 'gros' ? 80 : input.commerceMode === 'detail' ? 16 : 40
  const low = input.commerceMode === 'gros' ? 10 : 4
  const products: Product[] = catalogFor(domain.catalog).map((seed) => {
    const price = Math.max(0, convertPriceDa(seed.priceDa, factor))
    const cost = Math.max(0, convertPriceDa(seed.costDa, factor))
    const wholesale = input.commerceMode === 'gros'
    const pack = wholesale ? seed.pack : undefined
    const gros =
      wholesale && pack && pack > 1
        ? convertPriceDa(seed.priceDa * pack * 0.88, factor)
        : undefined
    return {
      id: uid('p'),
      name: seed.name,
      category: seed.category,
      unit: seed.unit,
      priceDa: price,
      costDa: cost,
      stock,
      lowStockAt: low,
      piecesPerPack: pack,
      demiGrosPriceDa:
        wholesale && pack ? convertPriceDa(seed.priceDa * 0.94, factor) : undefined,
      grosPriceDa: gros,
      superGrosPriceDa:
        wholesale && pack
          ? convertPriceDa(seed.priceDa * pack * 0.8, factor)
          : undefined,
      packPriceDa: gros,
      imageDataUrl: catalogImagePath(seed.name, seed.category),
      createdAt: new Date().toISOString(),
    }
  })
  const keep = !input.replaceCatalog && state.products.length > 0
  return {
    ...state,
    settings: {
      ...state.settings,
      setupDone: true,
      countryCode: country.code,
      commerceMode: input.commerceMode,
      domainId: domain.id,
      currency: country.currency,
      shopName: input.shopName.trim() || domain.nameFr,
      phone: input.phone.trim(),
      language: input.language,
      showZakat: defaultZakatOn(country.code),
    },
    products: keep ? state.products : products,
  }
}

export function addProduct(
  state: AppState,
  input: Omit<Product, 'id' | 'createdAt'>,
): AppState {
  const product: Product = {
    ...input,
    id: uid('p'),
    createdAt: new Date().toISOString(),
  }
  return { ...state, products: [product, ...state.products] }
}

export function updateProduct(state: AppState, id: string, patch: Partial<Product>): AppState {
  return {
    ...state,
    products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }
}

export function deleteProduct(state: AppState, id: string): AppState {
  return { ...state, products: state.products.filter((p) => p.id !== id) }
}

export function addClient(
  state: AppState,
  input: Omit<Client, 'id' | 'createdAt'>,
): AppState {
  const exists = state.clients.some(
    (c) => c.phone.replace(/\D/g, '') === input.phone.replace(/\D/g, ''),
  )
  if (exists) return state
  const client: Client = {
    ...input,
    id: uid('c'),
    createdAt: new Date().toISOString(),
  }
  return { ...state, clients: [client, ...state.clients] }
}

export function addClientsBulk(
  state: AppState,
  inputs: Array<Omit<Client, 'id' | 'createdAt' | 'city' | 'address' | 'notes'> & {
    city?: string
    address?: string
    notes?: string
    lat?: number
    lng?: number
  }>,
): { state: AppState; added: number } {
  let next = state
  let added = 0
  for (const input of inputs) {
    const before = next.clients.length
    next = addClient(next, {
      name: input.name,
      phone: input.phone,
      city: input.city ?? state.settings.city,
      address: input.address ?? '',
      notes: input.notes ?? '',
      lat: input.lat,
      lng: input.lng,
    })
    if (next.clients.length > before) added += 1
  }
  return { state: next, added }
}

export function updateClient(
  state: AppState,
  id: string,
  patch: Partial<Omit<Client, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    clients: state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }
}

export function deleteClient(state: AppState, id: string): AppState {
  return { ...state, clients: state.clients.filter((c) => c.id !== id) }
}

/** Normalise paidDa / remainingDa (anciennes factures paye|credit). */
export function normalizeOrderAmounts(
  o: Partial<Order>,
  total = o.totalDa ?? 0,
): Pick<Order, 'paidDa' | 'remainingDa' | 'payment'> {
  let paidDa = typeof o.paidDa === 'number' ? o.paidDa : NaN
  let remainingDa = typeof o.remainingDa === 'number' ? o.remainingDa : NaN
  if (!Number.isFinite(paidDa) || !Number.isFinite(remainingDa)) {
    if (o.payment === 'paye') {
      paidDa = total
      remainingDa = 0
    } else {
      paidDa = 0
      remainingDa = total
    }
  }
  paidDa = Math.max(0, +paidDa.toFixed(2))
  remainingDa = Math.max(0, +remainingDa.toFixed(2))
  return {
    paidDa,
    remainingDa,
    payment: remainingDa <= 0.001 ? 'paye' : 'credit',
  }
}

export function buildPaymentFields(
  totalDa: number,
  paidDa: number,
): Pick<Order, 'paidDa' | 'remainingDa' | 'payment'> {
  const paid = Math.max(0, Math.min(totalDa, +paidDa.toFixed(2)))
  const remaining = Math.max(0, +(totalDa - paid).toFixed(2))
  return {
    paidDa: paid,
    remainingDa: remaining,
    payment: remaining <= 0.001 ? 'paye' : 'credit',
  }
}

export function createOrder(
  state: AppState,
  orderInput: Omit<Order, 'id' | 'createdAt' | 'whatsappSent' | 'invoiceNumber'>,
): AppState {
  const invoiceNumber = String(state.settings.nextInvoiceNumber).padStart(4, '0')
  const order: Order = {
    ...orderInput,
    ...normalizeOrderAmounts(
      {
        ...orderInput,
        paidDa: orderInput.paidDa,
        remainingDa: orderInput.remainingDa,
        payment: orderInput.payment,
      },
      orderInput.totalDa,
    ),
    id: uid('o'),
    createdAt: new Date().toISOString(),
    whatsappSent: false,
    invoiceNumber,
    invoiceSent: false,
  }

  const deductByProduct = new Map<string, number>()
  for (const line of order.lines) {
    const p = state.products.find((x) => x.id === line.productId)
    const units = stockUnitsSold(p, line)
    deductByProduct.set(
      line.productId,
      (deductByProduct.get(line.productId) ?? 0) + units,
    )
  }

  const products = state.products.map((p) => {
    const take = deductByProduct.get(p.id)
    if (!take) return p
    return { ...p, stock: Math.max(0, +(p.stock - take).toFixed(3)) }
  })

  return {
    ...state,
    settings: {
      ...state.settings,
      nextInvoiceNumber: state.settings.nextInvoiceNumber + 1,
    },
    products,
    orders: [order, ...state.orders],
  }
}

/** Combien d’unités de stock (base) une ligne de commande retire. */
export function stockUnitsSold(
  product: Product | undefined,
  line: Pick<OrderLine, 'unit' | 'qty' | 'priceTier'>,
): number {
  if (!product) return line.qty
  const tier = line.priceTier
  if (
    (tier === 'gros' ||
      tier === 'super_gros' ||
      line.unit === 'carton') &&
    product.piecesPerPack &&
    product.piecesPerPack > 0
  ) {
    return +(line.qty * product.piecesPerPack).toFixed(3)
  }
  return line.qty
}

export function hasPackPricing(p: Product): boolean {
  return !!(
    p.piecesPerPack &&
    p.piecesPerPack > 0 &&
    ((p.grosPriceDa ?? 0) > 0 ||
      (p.superGrosPriceDa ?? 0) > 0 ||
      (p.packPriceDa ?? 0) > 0)
  )
}

export function packStockAvailable(p: Product): number {
  if (!p.piecesPerPack || p.piecesPerPack <= 0) return 0
  return Math.floor(p.stock / p.piecesPerPack)
}

export function markOrderWhatsappSent(state: AppState, orderId: string): AppState {
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, whatsappSent: true } : o,
    ),
  }
}

export function markInvoiceSent(state: AppState, orderId: string): AppState {
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, invoiceSent: true } : o,
    ),
  }
}

export function addIncomingOrder(
  state: AppState,
  input: Omit<IncomingOrder, 'id' | 'createdAt' | 'status'>,
): AppState {
  const item: IncomingOrder = {
    ...input,
    id: uid('in'),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  return { ...state, incomingOrders: [item, ...state.incomingOrders] }
}

export function updateIncomingOrder(
  state: AppState,
  id: string,
  patch: Partial<IncomingOrder>,
): AppState {
  return {
    ...state,
    incomingOrders: state.incomingOrders.map((o) =>
      o.id === id ? { ...o, ...patch } : o,
    ),
  }
}

/** Valeur marchande du stock (prix de vente) — base classique zakat marchandises */
export function stockValueDa(state: AppState): number {
  return state.products.reduce((sum, p) => sum + p.priceDa * p.stock, 0)
}

/** Coût d'achat du stock */
export function stockCostDa(state: AppState): number {
  return state.products.reduce((sum, p) => sum + (p.costDa || 0) * p.stock, 0)
}

/** Marge potentielle encore en stock (vente − achat) */
export function stockMarginDa(state: AppState): number {
  return stockValueDa(state) - stockCostDa(state)
}

/** Bénéfice réalisé sur les commandes (vente − coût) */
export function realizedProfitDa(state: AppState, orders?: Order[]): number {
  const list = orders ?? state.orders
  return list.reduce(
    (sum, o) =>
      sum +
      o.lines.reduce(
        (s, l) => s + (l.unitPriceDa - (l.unitCostDa || 0)) * l.qty,
        0,
      ),
    0,
  )
}

export function openCreditsDa(state: AppState): number {
  const fromOrders = state.orders.reduce(
    (sum, o) => sum + (o.remainingDa ?? (o.payment === 'credit' ? o.totalDa : 0)),
    0,
  )
  const fromAdjust = state.clients.reduce(
    (sum, c) => sum + (c.balanceAdjustDa ?? 0),
    0,
  )
  return Math.max(0, +(fromOrders + fromAdjust).toFixed(2))
}

/** Reste dû d’une facture */
export function orderRemainingDa(o: Order): number {
  return Math.max(
    0,
    o.remainingDa ?? (o.payment === 'credit' ? o.totalDa : 0),
  )
}

/** Factures encore ouvertes (crédit / partiel) */
export function openCreditOrders(state: AppState): Order[] {
  return state.orders.filter((o) => orderRemainingDa(o) > 0.001)
}

/** YYYY-MM-DD dans N jours (local) */
export function dueDateFromDays(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  d.setDate(d.getDate() + Math.max(0, Math.floor(days)))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Jours restants jusqu’à l’échéance (négatif = en retard) */
export function daysUntilDue(dueDate: string, today = new Date()): number {
  const [y, m, d] = dueDate.split('-').map(Number)
  if (!y || !m || !d) return 0
  const due = new Date(y, m - 1, d)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due.getTime() - start.getTime()) / 86_400_000)
}

export function formatDueDateLabel(dueDate: string, lang: Language): string {
  const [y, m, d] = dueDate.split('-').map(Number)
  if (!y || !m || !d) return dueDate
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Dettes en retard (échéance passée) */
export function overdueCreditOrders(state: AppState): Order[] {
  return openCreditOrders(state).filter((o) => {
    if (!o.dueDate) return false
    return daysUntilDue(o.dueDate) < 0
  })
}

/** Dettes bientôt dues (aujourd’hui → +withinDays), hors retard */
export function dueSoonCreditOrders(state: AppState, withinDays = 3): Order[] {
  return openCreditOrders(state).filter((o) => {
    if (!o.dueDate) return false
    const left = daysUntilDue(o.dueDate)
    return left >= 0 && left <= withinDays
  })
}

export function clientOpenCreditOrders(
  state: AppState,
  clientId: string,
): Order[] {
  return openCreditOrders(state).filter((o) => o.clientId === clientId)
}

/** Encours crédit d’un client (reste factures + ajustement fiche) */
export function clientCreditDa(state: AppState, clientId: string): number {
  if (!clientId) return 0
  const fromOrders = state.orders
    .filter((o) => o.clientId === clientId)
    .reduce(
      (sum, o) =>
        sum + (o.remainingDa ?? (o.payment === 'credit' ? o.totalDa : 0)),
      0,
    )
  const client = state.clients.find((c) => c.id === clientId)
  return Math.max(0, +(fromOrders + (client?.balanceAdjustDa ?? 0)).toFixed(2))
}

/** Argent entré en caisse aujourd’hui (versé sur ventes + règlements dette) */
export function todayCashDa(state: AppState): number {
  const today = new Date().toDateString()
  const fromOrders = todayOrders(state).reduce(
    (sum, o) => sum + (o.paidDa ?? (o.payment === 'paye' ? o.totalDa : 0)),
    0,
  )
  const fromCash = (state.cashEntries ?? [])
    .filter((e) => new Date(e.createdAt).toDateString() === today)
    .reduce((sum, e) => sum + e.amountDa, 0)
  return +(fromOrders + fromCash).toFixed(2)
}

/** Versement sur dette client → réduit les restes + ajoute à la caisse */
export function applyClientPayment(
  state: AppState,
  clientId: string,
  amountDa: number,
  opts?: { note?: string; missionStopId?: string; createdAt?: string },
): AppState {
  let left = Math.max(0, +amountDa.toFixed(2))
  if (left <= 0) return state
  const received = left

  if (opts?.missionStopId) {
    const already = (state.cashEntries ?? []).some(
      (e) => e.missionStopId === opts.missionStopId,
    )
    if (already) return state
  }

  const orders = state.orders.map((o) => {
    if (o.clientId !== clientId || left <= 0) return o
    const rem = o.remainingDa ?? (o.payment === 'credit' ? o.totalDa : 0)
    if (rem <= 0) return o
    const take = Math.min(rem, left)
    left = +(left - take).toFixed(2)
    const paidDa = +((o.paidDa ?? 0) + take).toFixed(2)
    const remainingDa = +(rem - take).toFixed(2)
    return {
      ...o,
      paidDa,
      remainingDa,
      payment: (remainingDa <= 0.001 ? 'paye' : 'credit') as Order['payment'],
      dueDate: remainingDa <= 0.001 ? undefined : o.dueDate,
    }
  })

  let clients = state.clients
  if (left > 0) {
    clients = clients.map((c) => {
      if (c.id !== clientId) return c
      const adj = c.balanceAdjustDa ?? 0
      if (adj <= 0) return c
      const take = Math.min(adj, left)
      left = +(left - take).toFixed(2)
      return { ...c, balanceAdjustDa: +(adj - take).toFixed(2) }
    })
  }

  const entry: CashEntry = {
    id: uid('cash'),
    amountDa: received,
    clientId,
    missionStopId: opts?.missionStopId,
    note: opts?.note || 'Versement client',
    createdAt: opts?.createdAt || new Date().toISOString(),
  }

  return {
    ...state,
    orders,
    clients,
    cashEntries: [entry, ...(state.cashEntries ?? [])],
  }
}

/** Fixe le solde affiché (ajuste balanceAdjustDa) */
export function setClientDisplayedBalance(
  state: AppState,
  clientId: string,
  newBalanceDa: number,
): AppState {
  const fromOrders = state.orders
    .filter((o) => o.clientId === clientId)
    .reduce(
      (sum, o) =>
        sum + (o.remainingDa ?? (o.payment === 'credit' ? o.totalDa : 0)),
      0,
    )
  const adjust = +(Math.max(0, newBalanceDa) - fromOrders).toFixed(2)
  return updateClient(state, clientId, { balanceAdjustDa: adjust })
}

export function todayOrders(state: AppState): Order[] {
  const today = new Date().toDateString()
  return state.orders.filter((o) => new Date(o.createdAt).toDateString() === today)
}

export function lowStockProducts(state: AppState): Product[] {
  return state.products.filter((p) => p.stock <= p.lowStockAt)
}

export function pendingIncoming(state: AppState): IncomingOrder[] {
  return state.incomingOrders.filter((o) => o.status === 'pending')
}

export function addZakatRecord(state: AppState, record: ZakatRecord): AppState {
  return { ...state, zakatHistory: [record, ...state.zakatHistory] }
}

export function markZakatPaid(state: AppState, calculatedAt: string): AppState {
  return {
    ...state,
    zakatHistory: state.zakatHistory.map((z) =>
      z.calculatedAt === calculatedAt
        ? { ...z, paidAt: new Date().toISOString() }
        : z,
    ),
  }
}

export function addExpense(
  state: AppState,
  input: Omit<Expense, 'id' | 'createdAt'>,
): AppState {
  const expense: Expense = {
    ...input,
    id: uid('e'),
    createdAt: new Date().toISOString(),
  }
  return { ...state, expenses: [expense, ...state.expenses] }
}

export function deleteExpense(state: AppState, id: string): AppState {
  return { ...state, expenses: state.expenses.filter((e) => e.id !== id) }
}

export function expensesOnDate(state: AppState, day: Date = new Date()): Expense[] {
  const key = day.toDateString()
  return state.expenses.filter((e) => new Date(e.date).toDateString() === key)
}

export function expensesInMonth(
  state: AppState,
  ref: Date = new Date(),
): Expense[] {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  return state.expenses.filter((e) => {
    const d = new Date(e.date)
    return d.getFullYear() === y && d.getMonth() === m
  })
}

export function expensesInYear(
  state: AppState,
  year: number = new Date().getFullYear(),
): Expense[] {
  return state.expenses.filter((e) => new Date(e.date).getFullYear() === year)
}

export function ordersInYear(
  state: AppState,
  year: number = new Date().getFullYear(),
): Order[] {
  return state.orders.filter((o) => new Date(o.createdAt).getFullYear() === year)
}

/** Bénéfice annuel = gains ventes − dépenses (personnel, gasoil…) */
export function annualNetProfitDa(
  state: AppState,
  year: number = new Date().getFullYear(),
): {
  year: number
  salesProfitDa: number
  expensesDa: number
  netDa: number
  expenses: Expense[]
} {
  const orders = ordersInYear(state, year)
  const expenses = expensesInYear(state, year)
  const salesProfitDa = realizedProfitDa(state, orders)
  const expensesDa = sumExpensesDa(expenses)
  return {
    year,
    salesProfitDa,
    expensesDa,
    netDa: salesProfitDa - expensesDa,
    expenses,
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** Stats de gain entre deux dates (incluses) */
export function profitInRange(
  state: AppState,
  from: Date,
  to: Date,
): {
  salesTotalDa: number
  cashInDa: number
  salesProfitDa: number
  expensesDa: number
  netDa: number
  orderCount: number
} {
  const a = startOfDay(from).getTime()
  const b = endOfDay(to).getTime()
  const orders = state.orders.filter((o) => {
    const t = new Date(o.createdAt).getTime()
    return t >= a && t <= b
  })
  const expenses = state.expenses.filter((e) => {
    const t = new Date(e.date || e.createdAt).getTime()
    return t >= a && t <= b
  })
  const cashExtra = (state.cashEntries ?? []).filter((e) => {
    const t = new Date(e.createdAt).getTime()
    return t >= a && t <= b
  })
  const salesTotalDa = orders.reduce((s, o) => s + o.totalDa, 0)
  const cashFromOrders = orders.reduce(
    (s, o) => s + (o.paidDa ?? (o.payment === 'paye' ? o.totalDa : 0)),
    0,
  )
  const cashInDa =
    cashFromOrders + cashExtra.reduce((s, e) => s + e.amountDa, 0)
  const salesProfitDa = realizedProfitDa(state, orders)
  const expensesDa = sumExpensesDa(expenses)
  return {
    salesTotalDa,
    cashInDa,
    salesProfitDa,
    expensesDa,
    netDa: salesProfitDa - expensesDa,
    orderCount: orders.length,
  }
}

export function rangePresets(now = new Date()): Record<
  'today' | 'lastMonth' | 'thisYear' | 'lastYear',
  { from: Date; to: Date }
> {
  const y = now.getFullYear()
  const m = now.getMonth()
  return {
    today: { from: startOfDay(now), to: endOfDay(now) },
    lastMonth: {
      from: new Date(y, m - 1, 1),
      to: endOfDay(new Date(y, m, 0)),
    },
    thisYear: {
      from: new Date(y, 0, 1),
      to: endOfDay(now),
    },
    lastYear: {
      from: new Date(y - 1, 0, 1),
      to: endOfDay(new Date(y - 1, 11, 31)),
    },
  }
}

export function sumExpensesDa(list: Expense[]): number {
  return list.reduce((s, e) => s + e.amountDa, 0)
}

export function expensesByCategory(
  list: Expense[],
): Record<ExpenseCategory, number> {
  const out: Record<ExpenseCategory, number> = {
    personnel: 0,
    gasoil: 0,
    transport: 0,
    loyer: 0,
    entretien: 0,
    autre: 0,
  }
  for (const e of list) {
    out[e.category] = (out[e.category] ?? 0) + e.amountDa
  }
  return out
}

export function updateTeam(state: AppState, patch: Partial<TeamSettings>): AppState {
  return { ...state, team: { ...state.team, ...patch } }
}

export function ensureCompanyCode(state: AppState): AppState {
  if (state.team.companyCode && state.team.syncSecret) return state
  return {
    ...state,
    team: {
      ...state.team,
      companyCode: state.team.companyCode || genCode(6),
      syncSecret: state.team.syncSecret || genCode(8),
    },
  }
}

export function addDriver(
  state: AppState,
  input: Omit<Driver, 'id' | 'createdAt' | 'active'> & { active?: boolean },
): AppState {
  const driver: Driver = {
    id: uid('d'),
    name: input.name.trim(),
    phone: input.phone.trim(),
    pin: String(input.pin).replace(/\D/g, '').slice(0, 4).padStart(4, '0'),
    active: input.active !== false,
    createdAt: new Date().toISOString(),
  }
  return { ...state, drivers: [driver, ...state.drivers] }
}

export function updateDriver(
  state: AppState,
  id: string,
  patch: Partial<Omit<Driver, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    drivers: state.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
  }
}

export function deleteDriver(state: AppState, id: string): AppState {
  return {
    ...state,
    drivers: state.drivers.filter((d) => d.id !== id),
    missions: state.missions.map((m) =>
      m.driverId === id ? { ...m, driverId: '', status: 'draft' as MissionStatus } : m,
    ),
    team:
      state.team.currentDriverId === id
        ? { ...state.team, currentDriverId: null }
        : state.team,
  }
}

export function createMission(
  state: AppState,
  input: {
    title: string
    date: string
    wilayaCode: string
    driverId: string
    clientIds: string[]
  },
): AppState {
  const stops: MissionStop[] = []
  input.clientIds.forEach((cid, i) => {
    const c = state.clients.find((x) => x.id === cid)
    if (!c) return
    const debt = clientCreditDa(state, c.id)
    stops.push({
      id: uid('ms'),
      clientId: c.id,
      clientName: c.name,
      clientPhone: c.phone,
      address: c.address || '',
      city: c.city || '',
      lat: c.lat,
      lng: c.lng,
      note: '',
      status: 'todo',
      sortOrder: i,
      collectDa: debt > 0 ? debt : 0,
      collectedDa: 0,
    })
  })

  const now = new Date().toISOString()
  const mission: Mission = {
    id: uid('m'),
    title: input.title.trim() || `Tournée ${input.date}`,
    date: input.date,
    wilayaCode: input.wilayaCode,
    driverId: input.driverId,
    status: input.driverId ? 'assigned' : 'draft',
    stops,
    createdAt: now,
    updatedAt: now,
  }
  return { ...state, missions: [mission, ...state.missions] }
}

export function updateMission(
  state: AppState,
  id: string,
  patch: Partial<Omit<Mission, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    missions: state.missions.map((m) =>
      m.id === id
        ? { ...m, ...patch, updatedAt: new Date().toISOString() }
        : m,
    ),
  }
}

export function updateMissionStop(
  state: AppState,
  missionId: string,
  stopId: string,
  patch: Partial<MissionStop>,
): AppState {
  return {
    ...state,
    missions: state.missions.map((m) => {
      if (m.id !== missionId) return m
      const stops = m.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s))
      const allDone = stops.every((s) => s.status === 'done' || s.status === 'skipped')
      const anyProgress = stops.some((s) => s.status !== 'todo')
      let status: MissionStatus = m.status
      if (allDone && stops.length > 0) status = 'done'
      else if (anyProgress) status = 'in_progress'
      else if (m.driverId) status = 'assigned'
      return { ...m, stops, status, updatedAt: new Date().toISOString() }
    }),
  }
}

export function deleteMission(state: AppState, id: string): AppState {
  return { ...state, missions: state.missions.filter((m) => m.id !== id) }
}

export function reorderMissionStops(
  state: AppState,
  missionId: string,
  stopIds: string[],
): AppState {
  return {
    ...state,
    missions: state.missions.map((m) => {
      if (m.id !== missionId) return m
      const byId = new Map(m.stops.map((s) => [s.id, s]))
      const stops = stopIds
        .map((id, i) => {
          const s = byId.get(id)
          return s ? { ...s, sortOrder: i } : null
        })
        .filter((s): s is MissionStop => !!s)
      return { ...m, stops, updatedAt: new Date().toISOString() }
    }),
  }
}

export function missionsForDriver(state: AppState, driverId: string): Mission[] {
  return state.missions
    .filter((m) => m.driverId === driverId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Priorité livreur : aujourd’hui → en retard (pas finies) → demain+ */
export function missionsForDriverToday(
  state: AppState,
  driverId: string,
  day = new Date(),
): Mission[] {
  const today = day.toISOString().slice(0, 10)
  const list = missionsForDriver(state, driverId).filter((m) => {
    if (m.status === 'done') return m.date === today
    if (m.date <= today) return true
    return m.date === today
  })
  return list.sort((a, b) => {
    const aToday = a.date === today ? 0 : a.date < today ? 1 : 2
    const bToday = b.date === today ? 0 : b.date < today ? 1 : 2
    if (aToday !== bToday) return aToday - bToday
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.updatedAt || '').localeCompare(b.updatedAt || '')
  })
}

export function missionCollectTotal(m: Mission): {
  dueDa: number
  takenDa: number
} {
  let dueDa = 0
  let takenDa = 0
  for (const s of m.stops) {
    dueDa += s.collectDa || 0
    takenDa += s.collectedDa || 0
  }
  return { dueDa: +dueDa.toFixed(2), takenDa: +takenDa.toFixed(2) }
}

const STOP_STATUS_RANK: Record<string, number> = {
  todo: 0,
  skipped: 1,
  done: 2,
}

function mergeMissionStop(local: MissionStop, incoming: MissionStop): MissionStop {
  const lRank = STOP_STATUS_RANK[local.status] ?? 0
  const iRank = STOP_STATUS_RANK[incoming.status] ?? 0
  const status =
    lRank >= iRank ? local.status : incoming.status
  const collectedDa = Math.max(local.collectedDa || 0, incoming.collectedDa || 0)
  const cashPostedAt = local.cashPostedAt || incoming.cashPostedAt
  const cashPostedDa = Math.max(
    local.cashPostedDa || 0,
    incoming.cashPostedDa || 0,
  )
  return {
    ...incoming,
    status,
    collectedDa,
    ...(cashPostedAt
      ? { cashPostedAt, cashPostedDa: cashPostedDa || collectedDa }
      : cashPostedDa
        ? { cashPostedDa }
        : {}),
    note:
      (local.note && local.note.length >= (incoming.note || '').length
        ? local.note
        : incoming.note) ||
      local.note ||
      '',
  }
}

function mergeMissionDeep(local: Mission | undefined, incoming: Mission): Mission {
  if (!local) return incoming
  const byId = new Map(local.stops.map((s) => [s.id, s]))
  for (const s of incoming.stops) {
    const prev = byId.get(s.id)
    byId.set(s.id, prev ? mergeMissionStop(prev, s) : s)
  }
  for (const s of local.stops) {
    if (!incoming.stops.some((x) => x.id === s.id)) {
      if (
        s.status !== 'todo' ||
        (s.collectedDa || 0) > 0 ||
        s.cashPostedAt
      ) {
        byId.set(s.id, s)
      }
    }
  }
  const stops = [...byId.values()].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
  )
  const newer =
    (incoming.updatedAt || '') >= (local.updatedAt || '') ? incoming : local
  const allDone =
    stops.length > 0 &&
    stops.every((s) => s.status === 'done' || s.status === 'skipped')
  const anyProgress = stops.some((s) => s.status !== 'todo')
  let status: MissionStatus = newer.status
  if (allDone) status = 'done'
  else if (anyProgress) status = 'in_progress'
  return {
    ...newer,
    stops,
    status,
    updatedAt:
      (incoming.updatedAt || '') >= (local.updatedAt || '')
        ? incoming.updatedAt || local.updatedAt
        : local.updatedAt || incoming.updatedAt,
    createdAt: local.createdAt || incoming.createdAt,
  }
}

/**
 * Encaissement livreur → caisse + réduction solde client (idempotent via missionStopId).
 */
export function applyMissionStopCash(
  state: AppState,
  missionId: string,
  stopId: string,
): AppState {
  const mission = state.missions.find((m) => m.id === missionId)
  const stop = mission?.stops.find((s) => s.id === stopId)
  if (!stop) return state

  const alreadyCash = (state.cashEntries ?? []).some(
    (e) => e.missionStopId === stopId,
  )
  if (stop.cashPostedAt && alreadyCash) return state

  const amount = Math.max(0, +(stop.collectedDa || 0).toFixed(2))
  const postedAt = stop.cashPostedAt || new Date().toISOString()

  let next = state
  if (amount > 0 && !alreadyCash && stop.clientId) {
    next = applyClientPayment(next, stop.clientId, amount, {
      note: `Livreur — ${mission?.title || 'tournée'}`,
      missionStopId: stopId,
      createdAt: postedAt,
    })
  }

  return updateMissionStop(next, missionId, stopId, {
    cashPostedAt: postedAt,
    cashPostedDa: amount,
  })
}

/** Après merge cloud : poster en caisse tout stop déjà cashPosted côté cloud. */
export function settlePostedMissionCash(state: AppState): AppState {
  let next = state
  for (const m of state.missions) {
    for (const s of m.stops) {
      if (!s.cashPostedAt) continue
      const already = (next.cashEntries ?? []).some(
        (e) => e.missionStopId === s.id,
      )
      if (already) continue
      const amount = Math.max(
        0,
        +((s.cashPostedDa ?? s.collectedDa) || 0).toFixed(2),
      )
      if (amount > 0 && s.clientId) {
        next = applyClientPayment(next, s.clientId, amount, {
          note: `Livreur — ${m.title}`,
          missionStopId: s.id,
          createdAt: s.cashPostedAt,
        })
      }
      next = updateMissionStop(next, m.id, s.id, {
        cashPostedAt: s.cashPostedAt,
        cashPostedDa: amount,
      })
    }
  }
  return next
}

export function mergeCloudMissions(
  state: AppState,
  incoming: Mission[],
): AppState {
  const map = new Map(state.missions.map((m) => [m.id, m]))
  for (const m of incoming) {
    map.set(m.id, mergeMissionDeep(map.get(m.id), m))
  }
  const merged: AppState = {
    ...state,
    missions: [...map.values()].sort((a, b) =>
      (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt),
    ),
  }
  return settlePostedMissionCash(merged)
}

export function mergeCloudDrivers(state: AppState, incoming: Driver[]): AppState {
  if (state.team.role === 'owner') {
    if (state.drivers.length > 0) {
      // Patron : fusionner (ne pas perdre les drivers cloud), garder PIN local prioritaire
      const map = new Map(incoming.map((d) => [d.id, d]))
      for (const d of state.drivers) map.set(d.id, d)
      return { ...state, drivers: [...map.values()] }
    }
  }
  const map = new Map(state.drivers.map((d) => [d.id, d]))
  for (const d of incoming) map.set(d.id, d)
  return { ...state, drivers: [...map.values()] }
}

export function findProductByBarcode(
  state: AppState,
  code: string,
): Product | undefined {
  const q = code.trim()
  if (!q) return undefined
  return state.products.find(
    (p) => p.barcode && p.barcode.trim().toLowerCase() === q.toLowerCase(),
  )
}

export function addSupplier(
  state: AppState,
  input: Omit<Supplier, 'id' | 'createdAt'>,
): AppState {
  const item: Supplier = {
    ...input,
    id: uid('sup'),
    createdAt: new Date().toISOString(),
  }
  return { ...state, suppliers: [item, ...state.suppliers] }
}

export function updateSupplier(
  state: AppState,
  id: string,
  patch: Partial<Omit<Supplier, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  }
}

export function deleteSupplier(state: AppState, id: string): AppState {
  return { ...state, suppliers: state.suppliers.filter((s) => s.id !== id) }
}

export function addPurchase(
  state: AppState,
  input: {
    supplierId: string
    supplierName: string
    lines: PurchaseLine[]
    paidDa: number
    note: string
  },
): AppState {
  const totalDa = +(
    input.lines.reduce((s, l) => s + l.lineTotalDa, 0)
  ).toFixed(2)
  const purchase: Purchase = {
    id: uid('pur'),
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    lines: input.lines,
    totalDa,
    paidDa: Math.max(0, +input.paidDa.toFixed(2)),
    note: input.note,
    createdAt: new Date().toISOString(),
  }
  const addBy = new Map<string, { qty: number; unitCost: number }>()
  for (const line of input.lines) {
    const prev = addBy.get(line.productId) ?? { qty: 0, unitCost: line.unitCostDa }
    addBy.set(line.productId, {
      qty: prev.qty + line.qty,
      unitCost: line.unitCostDa,
    })
  }
  const products = state.products.map((p) => {
    const add = addBy.get(p.id)
    if (!add) return p
    return {
      ...p,
      stock: +(p.stock + add.qty).toFixed(3),
      costDa: add.unitCost > 0 ? add.unitCost : p.costDa,
    }
  })
  let next = {
    ...state,
    products,
    purchases: [purchase, ...state.purchases],
  }
  if (purchase.paidDa > 0) {
    next = addExpense(next, {
      category: 'autre',
      amountDa: purchase.paidDa,
      note: `Achat ${purchase.supplierName}${purchase.note ? ` — ${purchase.note}` : ''}`,
      date: purchase.createdAt.slice(0, 10),
    })
  }
  return next
}

export function openCashSession(
  state: AppState,
  openingFloatDa: number,
  note = '',
): AppState {
  if (activeCashSession(state)) return state
  const session: CashSession = {
    id: uid('cs'),
    openedAt: new Date().toISOString(),
    openingFloatDa: Math.max(0, +openingFloatDa.toFixed(2)),
    note,
  }
  return { ...state, cashSessions: [session, ...state.cashSessions] }
}

export function activeCashSession(state: AppState): CashSession | undefined {
  return state.cashSessions.find((s) => !s.closedAt)
}

function cashInPeriod(state: AppState, fromIso: string, toIso?: string): number {
  const from = new Date(fromIso).getTime()
  const to = toIso ? new Date(toIso).getTime() : Date.now()
  let sum = 0
  for (const o of state.orders) {
    const t = new Date(o.createdAt).getTime()
    if (t >= from && t <= to) sum += o.paidDa || 0
  }
  for (const e of state.cashEntries) {
    const t = new Date(e.createdAt).getTime()
    if (t >= from && t <= to) sum += e.amountDa || 0
  }
  for (const r of state.returns) {
    if (r.refundMode !== 'cash') continue
    const t = new Date(r.createdAt).getTime()
    if (t >= from && t <= to) sum -= r.totalDa || 0
  }
  return +sum.toFixed(2)
}

export function expectedCashForSession(
  state: AppState,
  session: CashSession,
  atIso?: string,
): number {
  const moved = cashInPeriod(state, session.openedAt, atIso || session.closedAt)
  return +(session.openingFloatDa + moved).toFixed(2)
}

export function closeCashSession(
  state: AppState,
  closingCountDa: number,
  note = '',
): AppState {
  const open = activeCashSession(state)
  if (!open) return state
  const closedAt = new Date().toISOString()
  const expected = expectedCashForSession(state, open, closedAt)
  const counted = Math.max(0, +closingCountDa.toFixed(2))
  return {
    ...state,
    cashSessions: state.cashSessions.map((s) =>
      s.id === open.id
        ? {
            ...s,
            closedAt,
            closingCountDa: counted,
            expectedCashDa: expected,
            varianceDa: +(counted - expected).toFixed(2),
            note: note || s.note,
          }
        : s,
    ),
  }
}

export function createSaleReturn(
  state: AppState,
  input: {
    orderId?: string
    clientId?: string
    clientName: string
    lines: ReturnLine[]
    refundMode: 'cash' | 'credit'
    note: string
  },
): AppState {
  const totalDa = +(input.lines.reduce((s, l) => s + l.lineTotalDa, 0)).toFixed(2)
  if (totalDa <= 0 || input.lines.length === 0) return state
  const item: SaleReturn = {
    id: uid('ret'),
    orderId: input.orderId,
    clientId: input.clientId,
    clientName: input.clientName,
    lines: input.lines,
    totalDa,
    refundMode: input.refundMode,
    note: input.note,
    createdAt: new Date().toISOString(),
  }
  const addBy = new Map<string, number>()
  for (const line of input.lines) {
    const p = state.products.find((x) => x.id === line.productId)
    const units = stockUnitsSold(p, line)
    addBy.set(line.productId, (addBy.get(line.productId) ?? 0) + units)
  }
  let next: AppState = {
    ...state,
    products: state.products.map((p) => {
      const add = addBy.get(p.id)
      if (!add) return p
      return { ...p, stock: +(p.stock + add).toFixed(3) }
    }),
    returns: [item, ...state.returns],
  }
  if (input.refundMode === 'credit' && input.clientId) {
    next = applyClientPayment(next, input.clientId, totalDa)
  }
  return next
}
