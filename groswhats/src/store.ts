import type {
  AppState,
  CashEntry,
  Client,
  Driver,
  Expense,
  ExpenseCategory,
  IncomingOrder,
  Mission,
  MissionStatus,
  MissionStop,
  Order,
  OrderLine,
  Product,
  ShopSettings,
  StopStatus,
  TeamSettings,
  ZakatRecord,
} from './types'
import {
  DEFAULT_AGENT_PERMISSIONS,
  type AgentPermissions,
} from './agent/permissions'

const STORAGE_KEY = 'grossiste-dz-v1'

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function defaultSettings(): ShopSettings {
  return {
    shopName: 'Grossiste DZ',
    phone: '',
    city: '',
    language: 'fr',
    nextInvoiceNumber: 1,
    stockAlertsEnabled: true,
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
  if (!name) return 'Grossiste DZ'
  const n = name.toLowerCase()
  if (n.includes('groswhats') || n.includes('dépôt gros') || n.includes('depot gros')) {
    return 'Grossiste DZ'
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
    language: incoming.language === 'ar' ? 'ar' : 'fr',
    nextInvoiceNumber: incoming.nextInvoiceNumber ?? defaults.nextInvoiceNumber,
    stockAlertsEnabled: incoming.stockAlertsEnabled ?? true,
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
  }
}

export function loadState(): AppState {
  try {
    for (const key of [
      STORAGE_KEY,
      'groswhats-v3',
      'groswhats-v2',
      'groswhats-v1',
    ]) {
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
