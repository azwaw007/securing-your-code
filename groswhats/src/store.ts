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
  MedicalDocument,
  MedicalDocKind,
  ClinicCharge,
  ClinicStation,
  GymCheckIn,
  Employee,
  EmployeeLeave,
  StaffLedgerEntry,
  ShopLocation,
  ShopSettings,
  StopStatus,
  Supplier,
  TeamSettings,
  HeldSale,
  Appointment,
  AppointmentRemindStage,
  ZakatRecord,
  PriceTier,
  FloorTable,
  RepairOrder,
  InvoiceProductAlias,
} from './types'
import {
  DEFAULT_AGENT_PERMISSIONS,
  type AgentPermissions,
} from './agent/permissions'
import { APP_BRAND } from './brand'
import { countryByCode, convertPriceDa } from './data/countries'
import { bestForeignCatalogHit, catalogFor, catalogNameHits } from './data/catalogs'
import { domainById } from './data/domains'
import { catalogImagePath } from './utils/productArt'
import { resolvePackSize, normalizePackOptions } from './utils/packSize'
import { parseLanguage } from './locale/langs'
import { defaultZakatOn } from './locale/adapt'

const STORAGE_KEY = 'az-pos-v1'
const LEGACY_STORAGE_KEYS = [
  'grossiste-dz-v1',
  'groswhats-v3',
  'groswhats-v2',
  'groswhats-v1',
]

export const DEFAULT_LOCATION_ID = 'loc_main'
export const DEFAULT_LOCATION_NAME = 'Magasin principal'

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function defaultLocation(): ShopLocation {
  return { id: DEFAULT_LOCATION_ID, name: DEFAULT_LOCATION_NAME }
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
    themeSource: 'metier',
    fontScale: 'normal',
    showZakat: true,
    showCalculator: true,
    showGallery: true,
    agentPermissions: { ...DEFAULT_AGENT_PERMISSIONS },
    multiLocationEnabled: false,
    activeLocationId: DEFAULT_LOCATION_ID,
    clinicShareEnabled: false,
    clinicStation: undefined,
    clinicStationChosen: false,
    appointmentAutoRemind: true,
    purchaseMarginPct: 20,
  }
}

/** Stock d’un produit dans un dépôt */
export function stockAt(p: Product, locId: string): number {
  const map = p.stockByLocation
  if (map && typeof map[locId] === 'number') return map[locId]
  return 0
}

/** Recalcule Product.stock = somme des dépôts */
export function syncProductStockSum(p: Product): Product {
  const map = p.stockByLocation ?? {}
  const sum = Object.values(map).reduce(
    (s, n) => s + (typeof n === 'number' && Number.isFinite(n) ? n : 0),
    0,
  )
  return { ...p, stock: +sum.toFixed(3), stockByLocation: { ...map } }
}

export function setStockAt(p: Product, locId: string, qty: number): Product {
  const safe = Math.max(0, +qty.toFixed(3))
  const map = { ...(p.stockByLocation ?? {}) }
  map[locId] = safe
  return syncProductStockSum({ ...p, stockByLocation: map })
}

export function adjustStockAt(p: Product, locId: string, delta: number): Product {
  return setStockAt(p, locId, stockAt(p, locId) + delta)
}

/** Magasin actif (fallback dépôt principal) */
export function activeLocationId(state: AppState): string {
  const id = state.settings.activeLocationId
  if (id && state.locations.some((l) => l.id === id)) return id
  return state.locations[0]?.id || DEFAULT_LOCATION_ID
}

export function activeLocation(state: AppState): ShopLocation | undefined {
  const id = activeLocationId(state)
  return state.locations.find((l) => l.id === id) ?? state.locations[0]
}

/**
 * Stock affiché à la caisse / produits :
 * multi on → dépôt actif ; sinon total.
 */
export function displayStock(state: AppState, p: Product): number {
  if (state.settings.multiLocationEnabled) {
    return stockAt(p, activeLocationId(state))
  }
  return p.stock
}

/** Assure au moins un dépôt + activeLocationId + stockByLocation migrés */
export function ensureDefaultLocation(state: AppState): AppState {
  let locations = Array.isArray(state.locations) ? [...state.locations] : []
  if (locations.length === 0) {
    locations = [defaultLocation()]
  }
  const activeId =
    state.settings.activeLocationId &&
    locations.some((l) => l.id === state.settings.activeLocationId)
      ? state.settings.activeLocationId
      : locations[0].id

  const products = state.products.map((p) => {
    const hasMap =
      p.stockByLocation &&
      typeof p.stockByLocation === 'object' &&
      Object.keys(p.stockByLocation).length > 0
    if (hasMap) return syncProductStockSum(p)
    const qty = typeof p.stock === 'number' && Number.isFinite(p.stock) ? p.stock : 0
    return setStockAt(p, activeId, qty)
  })

  return {
    ...state,
    locations,
    products,
    settings: {
      ...state.settings,
      activeLocationId: activeId,
      multiLocationEnabled: state.settings.multiLocationEnabled === true,
    },
  }
}

export function addLocation(
  state: AppState,
  name: string,
  city?: string,
): AppState {
  const trimmed = name.trim()
  if (!trimmed) return state
  /** Offre Pro : jusqu’à 3 magasins / dépôts */
  if (state.locations.length >= 3) return state
  const loc: ShopLocation = {
    id: uid('loc'),
    name: trimmed,
    city: city?.trim() || undefined,
  }
  return { ...state, locations: [...state.locations, loc] }
}

export function updateLocation(
  state: AppState,
  id: string,
  patch: Partial<Pick<ShopLocation, 'name' | 'city'>>,
): AppState {
  return {
    ...state,
    locations: state.locations.map((l) =>
      l.id === id
        ? {
            ...l,
            name: patch.name !== undefined ? patch.name.trim() || l.name : l.name,
            city:
              patch.city !== undefined
                ? patch.city.trim() || undefined
                : l.city,
          }
        : l,
    ),
  }
}

export function deleteLocation(state: AppState, id: string): AppState {
  if (state.locations.length <= 1) return state
  if (!state.locations.some((l) => l.id === id)) return state
  const fallback =
    state.locations.find((l) => l.id !== id)?.id || DEFAULT_LOCATION_ID
  const products = state.products.map((p) => {
    const moving = stockAt(p, id)
    const map = { ...(p.stockByLocation ?? {}) }
    delete map[id]
    const next = { ...p, stockByLocation: map }
    if (moving > 0) return adjustStockAt(next, fallback, moving)
    return syncProductStockSum(next)
  })
  const locations = state.locations.filter((l) => l.id !== id)
  const active =
    state.settings.activeLocationId === id
      ? fallback
      : state.settings.activeLocationId
  return {
    ...state,
    locations,
    products,
    settings: { ...state.settings, activeLocationId: active },
  }
}

export function setActiveLocation(state: AppState, locationId: string): AppState {
  if (!state.locations.some((l) => l.id === locationId)) return state
  return updateSettings(state, { activeLocationId: locationId })
}

export function setMultiLocationEnabled(
  state: AppState,
  enabled: boolean,
): AppState {
  let next = ensureDefaultLocation(state)
  next = updateSettings(next, { multiLocationEnabled: enabled })
  return next
}

/** Transfert stock entre deux dépôts */
export function transferStock(
  state: AppState,
  productId: string,
  fromId: string,
  toId: string,
  qty: number,
): AppState {
  if (fromId === toId || qty <= 0) return state
  if (!state.locations.some((l) => l.id === fromId)) return state
  if (!state.locations.some((l) => l.id === toId)) return state
  const product = state.products.find((p) => p.id === productId)
  if (!product) return state
  const available = stockAt(product, fromId)
  const take = Math.min(available, +qty.toFixed(3))
  if (take <= 0) return state
  return {
    ...state,
    products: state.products.map((p) => {
      if (p.id !== productId) return p
      return adjustStockAt(adjustStockAt(p, fromId, -take), toId, take)
    }),
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
    locations: [defaultLocation()],
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
    medicalDocuments: [],
    clinicCharges: [],
    gymCheckIns: [],
    employees: [],
    employeeLeaves: [],
    staffLedger: [],
    heldSales: [],
    appointments: [],
    tables: [],
    repairOrders: [],
    invoiceAliases: [],
  }
}

export function migrate(raw: unknown): AppState {
  const data = raw as {
    settings?: Partial<ShopSettings>
    locations?: ShopLocation[]
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
    medicalDocuments?: MedicalDocument[]
    clinicCharges?: ClinicCharge[]
    gymCheckIns?: GymCheckIn[]
    employees?: Employee[]
    employeeLeaves?: EmployeeLeave[]
    staffLedger?: StaffLedgerEntry[]
    appointments?: Appointment[]
    tables?: FloorTable[]
    repairOrders?: RepairOrder[]
    invoiceAliases?: InvoiceProductAlias[]
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
    domainId:
      incoming.domainId === 'detail-alimentation'
        ? 'detail-superette'
        : incoming.domainId || defaults.domainId,
    currency: incoming.currency || defaults.currency,
    nextInvoiceNumber: incoming.nextInvoiceNumber ?? defaults.nextInvoiceNumber,
    stockAlertsEnabled: incoming.stockAlertsEnabled ?? true,
    uiSoundsEnabled: incoming.uiSoundsEnabled !== false,
    easyMode: incoming.easyMode !== false,
    themePreset: themeOk.includes(incoming.themePreset as (typeof themeOk)[number])
      ? (incoming.themePreset as ShopSettings['themePreset'])
      : defaults.themePreset,
    themeSource: incoming.themeSource === 'user' ? 'user' : 'metier',
    fontScale: fontOk.includes(incoming.fontScale as (typeof fontOk)[number])
      ? (incoming.fontScale as ShopSettings['fontScale'])
      : defaults.fontScale,
    showZakat: incoming.showZakat !== false,
    showCalculator: incoming.showCalculator !== false,
    showGallery: incoming.showGallery !== false,
    enabledTools:
      incoming.enabledTools && typeof incoming.enabledTools === 'object'
        ? (incoming.enabledTools as ShopSettings['enabledTools'])
        : undefined,
    cashierPin:
      typeof incoming.cashierPin === 'string' &&
      /^\d{4,6}$/.test(incoming.cashierPin.trim())
        ? incoming.cashierPin.trim()
        : undefined,
    fiscalNif:
      typeof incoming.fiscalNif === 'string' && incoming.fiscalNif.trim()
        ? incoming.fiscalNif.trim()
        : undefined,
    fiscalRc:
      typeof incoming.fiscalRc === 'string' && incoming.fiscalRc.trim()
        ? incoming.fiscalRc.trim()
        : undefined,
    fiscalAi:
      typeof incoming.fiscalAi === 'string' && incoming.fiscalAi.trim()
        ? incoming.fiscalAi.trim()
        : undefined,
    agentPermissions: {
      ...DEFAULT_AGENT_PERMISSIONS,
      ...(incoming.agentPermissions as Partial<AgentPermissions> | undefined),
    },
    multiLocationEnabled: incoming.multiLocationEnabled === true,
    activeLocationId:
      typeof incoming.activeLocationId === 'string' && incoming.activeLocationId
        ? incoming.activeLocationId
        : defaults.activeLocationId,
    clinicShareEnabled: incoming.clinicShareEnabled === true,
    clinicStation:
      incoming.clinicStation === 'doctor' || incoming.clinicStation === 'reception'
        ? incoming.clinicStation
        : undefined,
    clinicStationChosen: incoming.clinicStationChosen === true,
    retailRayons: Array.isArray(incoming.retailRayons)
      ? incoming.retailRayons
          .filter(
            (r): r is NonNullable<ShopSettings['retailRayons']>[number] =>
              !!r &&
              typeof (r as { id?: string }).id === 'string' &&
              (r as { id: string }).id.length > 0,
          )
          .map((r) => ({
            id: String((r as { id: string }).id),
            enabled: (r as { enabled?: boolean }).enabled !== false,
            labelFr:
              typeof (r as { labelFr?: string }).labelFr === 'string'
                ? (r as { labelFr: string }).labelFr
                : undefined,
            labelAr:
              typeof (r as { labelAr?: string }).labelAr === 'string'
                ? (r as { labelAr: string }).labelAr
                : undefined,
          }))
      : undefined,
    purchaseMarginPct:
      typeof incoming.purchaseMarginPct === 'number' &&
      Number.isFinite(incoming.purchaseMarginPct) &&
      incoming.purchaseMarginPct >= 0 &&
      incoming.purchaseMarginPct <= 200
        ? incoming.purchaseMarginPct
        : 20,
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
  const locationsRaw = Array.isArray(data.locations) ? data.locations : []
  const locations: ShopLocation[] =
    locationsRaw.length > 0
      ? locationsRaw.map((l) => ({
          id: typeof l.id === 'string' && l.id ? l.id : uid('loc'),
          name:
            typeof l.name === 'string' && l.name.trim()
              ? l.name.trim()
              : DEFAULT_LOCATION_NAME,
          city:
            typeof l.city === 'string' && l.city.trim()
              ? l.city.trim()
              : undefined,
        }))
      : [defaultLocation()]

  const base: AppState = {
    settings,
    locations,
    products: (data.products ?? []).map((p) => {
      const piecesPerPack =
        typeof p.piecesPerPack === 'number' && p.piecesPerPack > 0
          ? Math.round(p.piecesPerPack)
          : undefined
      const packOptions = normalizePackOptions((p as Product).packOptions)
      const gros =
        typeof p.grosPriceDa === 'number' && p.grosPriceDa > 0
          ? p.grosPriceDa
          : typeof p.packPriceDa === 'number' && p.packPriceDa > 0
            ? p.packPriceDa
            : undefined
      const stockByLocation =
        p.stockByLocation && typeof p.stockByLocation === 'object'
          ? Object.fromEntries(
              Object.entries(p.stockByLocation).filter(
                ([, v]) => typeof v === 'number' && Number.isFinite(v),
              ),
            )
          : undefined
      return {
        ...p,
        costDa: typeof p.costDa === 'number' ? p.costDa : 0,
        stock: typeof p.stock === 'number' ? p.stock : 0,
        stockByLocation,
        piecesPerPack,
        packOptions,
        barcode:
          typeof (p as Product).barcode === 'string'
            ? (p as Product).barcode!.trim()
            : undefined,
        aisleId:
          typeof (p as Product).aisleId === 'string' && (p as Product).aisleId!.trim()
            ? (p as Product).aisleId!.trim()
            : undefined,
        imei:
          typeof (p as Product).imei === 'string' && (p as Product).imei!.trim()
            ? (p as Product).imei!.trim()
            : undefined,
        size:
          typeof (p as Product).size === 'string' && (p as Product).size!.trim()
            ? (p as Product).size!.trim()
            : undefined,
        color:
          typeof (p as Product).color === 'string' && (p as Product).color!.trim()
            ? (p as Product).color!.trim()
            : undefined,
        oemRef:
          typeof (p as Product).oemRef === 'string' && (p as Product).oemRef!.trim()
            ? (p as Product).oemRef!.trim()
            : undefined,
        favorite: (p as Product).favorite === true,
        expiryDate:
          typeof (p as Product).expiryDate === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test((p as Product).expiryDate!)
            ? (p as Product).expiryDate
            : undefined,
        lotNumber:
          typeof (p as Product).lotNumber === 'string' &&
          (p as Product).lotNumber!.trim()
            ? (p as Product).lotNumber!.trim()
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
      creditLimitDa:
        typeof c.creditLimitDa === 'number' && c.creditLimitDa > 0
          ? c.creditLimitDa
          : undefined,
      birthDate: typeof c.birthDate === 'string' ? c.birthDate : undefined,
      sex: c.sex === 'M' || c.sex === 'F' || c.sex === 'X' ? c.sex : undefined,
      bloodGroup: typeof c.bloodGroup === 'string' ? c.bloodGroup : undefined,
      allergies: typeof c.allergies === 'string' ? c.allergies : undefined,
      antecedents: typeof c.antecedents === 'string' ? c.antecedents : undefined,
      membershipStart: typeof c.membershipStart === 'string' ? c.membershipStart : undefined,
      membershipEnd: typeof c.membershipEnd === 'string' ? c.membershipEnd : undefined,
      membershipPlan: typeof c.membershipPlan === 'string' ? c.membershipPlan : undefined,
      sportGoal: typeof c.sportGoal === 'string' ? c.sportGoal : undefined,
      trainingProgram: typeof c.trainingProgram === 'string' ? c.trainingProgram : undefined,
      dietPlan: typeof c.dietPlan === 'string' ? c.dietPlan : undefined,
      coachNotes: typeof c.coachNotes === 'string' ? c.coachNotes : undefined,
      treatmentPlan: typeof c.treatmentPlan === 'string' ? c.treatmentPlan : undefined,
      petSpecies: typeof c.petSpecies === 'string' ? c.petSpecies : undefined,
      weightClass: typeof c.weightClass === 'string' ? c.weightClass : undefined,
      teamName: typeof c.teamName === 'string' ? c.teamName : undefined,
      playerPosition: typeof c.playerPosition === 'string' ? c.playerPosition : undefined,
      level: typeof c.level === 'string' ? c.level : undefined,
      beltGrade: typeof c.beltGrade === 'string' ? c.beltGrade : undefined,
      colorFormula: typeof c.colorFormula === 'string' ? c.colorFormula : undefined,
      preferences: typeof c.preferences === 'string' ? c.preferences : undefined,
      vehiclePlate: typeof c.vehiclePlate === 'string' ? c.vehiclePlate : undefined,
      vehicleModel: typeof c.vehicleModel === 'string' ? c.vehicleModel : undefined,
      nextService: typeof c.nextService === 'string' ? c.nextService : undefined,
      licenseId: typeof c.licenseId === 'string' ? c.licenseId : undefined,
      caseRef: typeof c.caseRef === 'string' ? c.caseRef : undefined,
      nfcUid:
        typeof c.nfcUid === 'string' && c.nfcUid.trim()
          ? c.nfcUid.trim().toUpperCase().replace(/[\s:.-]+/g, '')
          : undefined,
    })),
    orders: (data.orders ?? []).map((o) => {
      const total = typeof o.totalDa === 'number' ? o.totalDa : 0
      const pay = normalizeOrderAmounts(o, total)
      const pm = (o as Order).paymentMethod
      const paymentMethod =
        pm === 'cash' ||
        pm === 'baridimob' ||
        pm === 'ccp' ||
        pm === 'card' ||
        pm === 'cheque'
          ? pm
          : undefined
      return {
        ...o,
        totalDa: total,
        ...pay,
        paymentMethod,
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
      dueDate:
        typeof (p as Purchase).dueDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test((p as Purchase).dueDate!)
          ? (p as Purchase).dueDate
          : undefined,
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
    medicalDocuments: (data.medicalDocuments ?? [])
      .filter((d) => d && typeof d.clientId === 'string')
      .map((d) => ({
        id: d.id || uid('mdoc'),
        clientId: d.clientId,
        clientName: d.clientName || '',
        kind: (['ordonnance', 'orientation', 'certificat', 'compte_rendu'] as const).includes(
          d.kind as MedicalDocKind,
        )
          ? (d.kind as MedicalDocKind)
          : 'ordonnance',
        title: typeof d.title === 'string' ? d.title : '',
        body: typeof d.body === 'string' ? d.body : '',
        createdAt: d.createdAt || new Date().toISOString(),
      })),
    clinicCharges: (data.clinicCharges ?? [])
      .filter((c) => c && typeof c.clientId === 'string')
      .map((c) => ({
        id: c.id || uid('chg'),
        clientId: c.clientId,
        clientName: c.clientName || '',
        clientPhone: typeof c.clientPhone === 'string' ? c.clientPhone : '',
        label: typeof c.label === 'string' ? c.label : '',
        amountDa: typeof c.amountDa === 'number' ? c.amountDa : 0,
        note: typeof c.note === 'string' ? c.note : '',
        status:
          c.status === 'paid' || c.status === 'cancelled' ? c.status : 'pending',
        createdAt: c.createdAt || new Date().toISOString(),
        paidAt: typeof c.paidAt === 'string' ? c.paidAt : undefined,
        orderId: typeof c.orderId === 'string' ? c.orderId : undefined,
      })),
    gymCheckIns: (data.gymCheckIns ?? [])
      .filter((g) => g && typeof g.clientId === 'string')
      .map((g) => ({
        id: g.id || uid('gin'),
        clientId: g.clientId,
        clientName: g.clientName || '',
        kind: g.kind === 'out' ? 'out' : 'in',
        at: g.at || new Date().toISOString(),
        source:
          g.source === 'qr' ||
          g.source === 'manual' ||
          g.source === 'wedge' ||
          g.source === 'nfc'
            ? g.source
            : 'manual',
      })),
    employees: (data.employees ?? [])
      .filter((e) => e && typeof e.name === 'string')
      .map((e) => ({
        id: e.id || uid('emp'),
        name: e.name,
        phone: typeof e.phone === 'string' ? e.phone : '',
        role: (['vendeur','caissier','livreur','manager','technicien','assistant','autre'] as const).includes(e.role as never)
          ? e.role
          : 'autre',
        contractStart: typeof e.contractStart === 'string' ? e.contractStart : undefined,
        contractEnd: typeof e.contractEnd === 'string' ? e.contractEnd : undefined,
        salaryDa: typeof e.salaryDa === 'number' ? e.salaryDa : 0,
        insuranceStart: typeof e.insuranceStart === 'string' ? e.insuranceStart : undefined,
        insuranceEnd: typeof e.insuranceEnd === 'string' ? e.insuranceEnd : undefined,
        insuranceNote: typeof e.insuranceNote === 'string' ? e.insuranceNote : undefined,
        notes: typeof e.notes === 'string' ? e.notes : '',
        active: e.active !== false,
        createdAt: e.createdAt || new Date().toISOString(),
      })),
    employeeLeaves: (data.employeeLeaves ?? [])
      .filter((l) => l && typeof l.employeeId === 'string')
      .map((l) => ({
        id: l.id || uid('elv'),
        employeeId: l.employeeId,
        kind: (['conge','maladie','sans_solde','autre'] as const).includes(l.kind as never) ? l.kind : 'conge',
        startDate: l.startDate || '',
        endDate: l.endDate || '',
        note: typeof l.note === 'string' ? l.note : '',
        createdAt: l.createdAt || new Date().toISOString(),
      })),
    staffLedger: (data.staffLedger ?? [])
      .filter((s) => s && typeof s.employeeId === 'string')
      .map((s) => ({
        id: s.id || uid('sledg'),
        employeeId: s.employeeId,
        kind: (['avance','dette','paiement_salaire','remboursement'] as const).includes(s.kind as never)
          ? s.kind
          : 'avance',
        amountDa: typeof s.amountDa === 'number' ? s.amountDa : 0,
        note: typeof s.note === 'string' ? s.note : '',
        periodLabel: typeof s.periodLabel === 'string' ? s.periodLabel : undefined,
        createdAt: s.createdAt || new Date().toISOString(),
      })),
    heldSales: Array.isArray((data as { heldSales?: HeldSale[] }).heldSales)
      ? ((data as { heldSales: HeldSale[] }).heldSales)
          .filter((h) => h && typeof h.id === 'string')
          .map((h) => ({
            id: h.id || uid('hold'),
            label: typeof h.label === 'string' && h.label.trim() ? h.label.trim() : 'En attente',
            clientId: typeof h.clientId === 'string' ? h.clientId : '',
            qtyMap:
              h.qtyMap && typeof h.qtyMap === 'object'
                ? (h.qtyMap as Record<string, number>)
                : {},
            tierMap:
              h.tierMap && typeof h.tierMap === 'object'
                ? (h.tierMap as Record<string, PriceTier>)
                : {},
            imeiMap:
              h.imeiMap && typeof h.imeiMap === 'object'
                ? (h.imeiMap as Record<string, string>)
                : undefined,
            priceOverrides:
              h.priceOverrides && typeof h.priceOverrides === 'object'
                ? (h.priceOverrides as Record<string, number>)
                : undefined,
            flashLines: Array.isArray(h.flashLines)
              ? h.flashLines
                  .filter(
                    (f) =>
                      f &&
                      typeof f.id === 'string' &&
                      typeof f.name === 'string',
                  )
                  .map((f) => ({
                    id: f.id,
                    name: String(f.name).slice(0, 120),
                    unit: f.unit || 'piece',
                    qty: typeof f.qty === 'number' && f.qty > 0 ? f.qty : 1,
                    unitPriceDa:
                      typeof f.unitPriceDa === 'number' && f.unitPriceDa >= 0
                        ? f.unitPriceDa
                        : 0,
                  }))
              : undefined,
            totalOverrideDa:
              typeof h.totalOverrideDa === 'number' && h.totalOverrideDa >= 0
                ? h.totalOverrideDa
                : undefined,
            discountPercent:
              typeof h.discountPercent === 'number' && h.discountPercent > 0
                ? h.discountPercent
                : undefined,
            createdAt: h.createdAt || new Date().toISOString(),
          }))
      : [],
    appointments: (data.appointments ?? [])
      .filter((a) => a && typeof a.clientId === 'string' && a.at)
      .map((a) => ({
        id: a.id || uid('rdv'),
        clientId: a.clientId,
        clientName: a.clientName || '',
        clientPhone: typeof a.clientPhone === 'string' ? a.clientPhone : '',
        at: a.at,
        note: typeof a.note === 'string' ? a.note : '',
        status:
          a.status === 'done' || a.status === 'cancelled' ? a.status : 'planned',
        remindStages: Array.isArray(a.remindStages)
          ? a.remindStages.filter(
              (st): st is AppointmentRemindStage => st === '24h' || st === '2h',
            )
          : [],
        remindedAt: typeof a.remindedAt === 'string' ? a.remindedAt : undefined,
        createdAt: a.createdAt || new Date().toISOString(),
      })),
    tables: (data.tables ?? [])
      .filter((tb) => tb && typeof tb.name === 'string')
      .slice(0, 40)
      .map((tb) => ({
        id: tb.id || uid('tbl'),
        name: tb.name,
        seats: typeof tb.seats === 'number' && tb.seats > 0 ? tb.seats : 2,
        status:
          tb.status === 'busy' || tb.status === 'bill' ? tb.status : 'free',
        heldSaleId: typeof tb.heldSaleId === 'string' ? tb.heldSaleId : undefined,
        note: typeof tb.note === 'string' ? tb.note : undefined,
      })),
    repairOrders: (data.repairOrders ?? [])
      .filter((r) => r && typeof r.title === 'string')
      .map((r) => ({
        id: r.id || uid('rep'),
        clientId: typeof r.clientId === 'string' ? r.clientId : '',
        clientName: typeof r.clientName === 'string' ? r.clientName : '',
        clientPhone: typeof r.clientPhone === 'string' ? r.clientPhone : '',
        title: r.title,
        status:
          (['devis', 'or', 'done', 'cancelled'] as const).includes(
            r.status as never,
          )
            ? r.status
            : 'devis',
        estimateDa: typeof r.estimateDa === 'number' ? r.estimateDa : 0,
        note: typeof r.note === 'string' ? r.note : '',
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
      })),
    invoiceAliases: Array.isArray(data.invoiceAliases)
      ? data.invoiceAliases
          .filter(
            (a) =>
              a &&
              typeof a.key === 'string' &&
              a.key.trim() &&
              typeof a.productId === 'string' &&
              a.productId,
          )
          .map((a) => ({
            key: a.key.trim(),
            productId: a.productId,
            hits: typeof a.hits === 'number' && a.hits > 0 ? a.hits : 1,
            updatedAt: a.updatedAt || new Date().toISOString(),
          }))
          .slice(0, 500)
      : [],
  }
  return ensureDefaultLocation(base)
}

export function loadState(): AppState {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const raw = localStorage.getItem(key)
      if (raw) {
        const migrated = repairMismatchedCatalog(migrate(JSON.parse(raw)))
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
    const pack = wholesale
      ? seed.pack ?? resolvePackSize(seed.name)
      : seed.pack
    const gros =
      wholesale && pack && pack > 1
        ? convertPriceDa(seed.priceDa * pack * 0.88, factor)
        : undefined
    const packOptions =
      !wholesale && seed.packs?.length
        ? seed.packs
            .map((o) => ({
              size: o.size,
              priceDa: convertPriceDa(o.priceDa, factor),
            }))
            .filter((o) => o.size > 1 && o.priceDa > 0)
        : undefined
    const locId = activeLocationId(state)
    const base: Product = {
      id: uid('p'),
      name: seed.name,
      category: seed.category,
      aisleId: seed.aisleId,
      unit: seed.unit,
      priceDa: price,
      costDa: cost,
      stock,
      lowStockAt: low,
      piecesPerPack: pack && pack > 1 ? pack : undefined,
      packOptions: packOptions?.length ? packOptions : undefined,
      demiGrosPriceDa:
        wholesale && pack ? convertPriceDa(seed.priceDa * 0.94, factor) : undefined,
      grosPriceDa: gros,
      superGrosPriceDa:
        wholesale && pack
          ? convertPriceDa(seed.priceDa * pack * 0.8, factor)
          : undefined,
      packPriceDa: gros,
      imageDataUrl: catalogImagePath(
        seed.name,
        seed.category,
        seed.emoji,
        domain.catalog,
      ),
      createdAt: new Date().toISOString(),
    }
    return setStockAt(base, locId, stock)
  })
  /** Changer de métier / mode = toujours nouveau catalogue (sinon médecine dans sport, etc.) */
  const metierChanged =
    state.settings.domainId !== domain.id ||
    state.settings.commerceMode !== input.commerceMode
  const keep =
    !input.replaceCatalog &&
    !metierChanged &&
    state.products.length > 0
  return ensureDefaultLocation({
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
      themeSource: 'metier',
      clinicShareEnabled: domain.mode === 'sante',
      clinicStationChosen: false,
      clinicStation: undefined,
      retailRayons: undefined,
    },
    products: keep ? state.products : products,
    /** RDV / file clinique d’un autre métier ne doivent pas traîner */
    appointments: metierChanged ? [] : state.appointments ?? [],
    clinicCharges: metierChanged ? [] : state.clinicCharges ?? [],
    medicalDocuments: metierChanged ? [] : state.medicalDocuments ?? [],
    gymCheckIns: metierChanged ? [] : state.gymCheckIns ?? [],
  })
}

/**
 * Si le stock local appartient clairement à un AUTRE métier
 * (ex. actes médicaux restés en salle de sport / superette), on resynchronise.
 * Ne touche pas aux catalogues 100 % personnalisés (aucun match seed).
 */
export function repairMismatchedCatalog(state: AppState): AppState {
  const domainId = state.settings.domainId
  if (!domainId || !state.settings.setupDone) return state
  const domain = domainById(domainId)
  const catalog = catalogFor(domain.catalog)
  if (catalog.length === 0 || state.products.length === 0) return state
  const names = state.products.map((p) => p.name)
  const ownHits = catalogNameHits(domain.catalog, names)
  const foreign = bestForeignCatalogHit(domain.catalog, names)
  if (!foreign || foreign.hits < 3) return state
  if (ownHits >= 2 && ownHits >= foreign.hits) return state
  if (foreign.hits <= ownHits) return state
  return applyShopSetup(state, {
    countryCode: state.settings.countryCode,
    commerceMode: state.settings.commerceMode,
    domainId: domain.id,
    shopName: state.settings.shopName,
    phone: state.settings.phone,
    language: state.settings.language,
    replaceCatalog: true,
  })
}

export function addProduct(
  state: AppState,
  input: Omit<Product, 'id' | 'createdAt'>,
): AppState {
  const locId = activeLocationId(state)
  const product: Product = setStockAt(
    {
      ...input,
      id: uid('p'),
      createdAt: new Date().toISOString(),
      stockByLocation: input.stockByLocation,
    },
    locId,
    typeof input.stock === 'number' ? input.stock : 0,
  )
  return { ...state, products: [product, ...state.products] }
}

export function updateProduct(state: AppState, id: string, patch: Partial<Product>): AppState {
  const locId = activeLocationId(state)
  return {
    ...state,
    products: state.products.map((p) => {
      if (p.id !== id) return p
      if (typeof patch.stock === 'number' && patch.stockByLocation === undefined) {
        const { stock: _stock, ...rest } = patch
        return syncProductStockSum(setStockAt({ ...p, ...rest }, locId, patch.stock))
      }
      return syncProductStockSum({ ...p, ...patch })
    }),
  }
}

export function deleteProduct(state: AppState, id: string): AppState {
  return { ...state, products: state.products.filter((p) => p.id !== id) }
}

export function holdSale(
  state: AppState,
  input: Omit<HeldSale, 'id' | 'createdAt'>,
): AppState {
  const held: HeldSale = {
    ...input,
    id: uid('hold'),
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    heldSales: [held, ...(state.heldSales || [])].slice(0, 30),
  }
}

export function removeHeldSale(state: AppState, id: string): AppState {
  return {
    ...state,
    heldSales: (state.heldSales || []).filter((h) => h.id !== id),
  }
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
  const clean = { ...patch }
  if (patch.nfcUid !== undefined) {
    clean.nfcUid = patch.nfcUid
      ? patch.nfcUid.trim().toUpperCase().replace(/[\s:.-]+/g, '')
      : undefined
  }
  return {
    ...state,
    clients: state.clients.map((c) => (c.id === id ? { ...c, ...clean } : c)),
  }
}


export function addAppointment(
  state: AppState,
  input: {
    clientId: string
    at: string
    note?: string
  },
): AppState {
  const client = state.clients.find((c) => c.id === input.clientId)
  if (!client || !input.at) return state
  const item: Appointment = {
    id: uid('rdv'),
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    at: input.at,
    note: (input.note || '').trim(),
    status: 'planned',
    remindStages: [],
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    appointments: [item, ...(state.appointments ?? [])].slice(0, 500),
  }
}

export function updateAppointment(
  state: AppState,
  id: string,
  patch: Partial<Omit<Appointment, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    appointments: (state.appointments ?? []).map((a) =>
      a.id === id ? { ...a, ...patch } : a,
    ),
  }
}

export function deleteAppointment(state: AppState, id: string): AppState {
  return {
    ...state,
    appointments: (state.appointments ?? []).filter((a) => a.id !== id),
  }
}

export function upcomingAppointments(
  state: AppState,
  limit = 20,
  now = new Date(),
): Appointment[] {
  const t0 = now.getTime() - 30 * 60_000
  return (state.appointments ?? [])
    .filter((a) => a.status === 'planned' && new Date(a.at).getTime() >= t0)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, limit)
}

export type AppointmentRemindNeed = {
  appointment: Appointment
  stage: AppointmentRemindStage
}

/** RDV planifiés à rappeler : fenêtre 24h puis 2h avant. */
export function appointmentsNeedingReminder(
  state: AppState,
  now = new Date(),
): AppointmentRemindNeed[] {
  const tNow = now.getTime()
  const out: AppointmentRemindNeed[] = []
  for (const a of state.appointments ?? []) {
    if (a.status !== 'planned') continue
    const tAt = new Date(a.at).getTime()
    if (!Number.isFinite(tAt)) continue
    const msLeft = tAt - tNow
    if (msLeft < -15 * 60_000) continue
    const stages = a.remindStages || []
    if (msLeft <= 2 * 60 * 60_000 && !stages.includes('2h')) {
      out.push({ appointment: a, stage: '2h' })
    } else if (msLeft <= 24 * 60 * 60_000 && !stages.includes('24h')) {
      out.push({ appointment: a, stage: '24h' })
    }
  }
  out.sort(
    (x, y) =>
      new Date(x.appointment.at).getTime() - new Date(y.appointment.at).getTime(),
  )
  return out
}

export function markAppointmentReminded(
  state: AppState,
  id: string,
  stage: AppointmentRemindStage,
): AppState {
  return {
    ...state,
    appointments: (state.appointments ?? []).map((a) => {
      if (a.id !== id) return a
      const stages = a.remindStages || []
      if (stages.includes(stage)) return a
      return {
        ...a,
        remindStages: [...stages, stage],
        remindedAt: new Date().toISOString(),
      }
    }),
  }
}

const MAX_TABLES = 40

export function upsertFloorTable(
  state: AppState,
  input: { id?: string; name: string; seats: number },
): AppState {
  const tables = state.tables ?? []
  if (input.id) {
    return {
      ...state,
      tables: tables.map((tb) =>
        tb.id === input.id ? { ...tb, name: input.name, seats: input.seats } : tb,
      ),
    }
  }
  if (tables.length >= MAX_TABLES) return state
  const table: FloorTable = {
    id: uid('tbl'),
    name: input.name,
    seats: input.seats,
    status: 'free',
  }
  return { ...state, tables: [...tables, table] }
}

export function deleteFloorTable(state: AppState, id: string): AppState {
  return {
    ...state,
    tables: (state.tables ?? []).filter((tb) => tb.id !== id),
  }
}

export function setTableStatus(
  state: AppState,
  id: string,
  status: FloorTable['status'],
  heldSaleId?: string,
): AppState {
  return {
    ...state,
    tables: (state.tables ?? []).map((tb) =>
      tb.id === id
        ? {
            ...tb,
            status,
            heldSaleId: status === 'free' ? undefined : heldSaleId ?? tb.heldSaleId,
          }
        : tb,
    ),
  }
}

export function addRepairOrder(
  state: AppState,
  input: Omit<RepairOrder, 'id' | 'createdAt' | 'updatedAt'>,
): AppState {
  const now = new Date().toISOString()
  const order: RepairOrder = {
    ...input,
    id: uid('rep'),
    createdAt: now,
    updatedAt: now,
  }
  return { ...state, repairOrders: [order, ...(state.repairOrders ?? [])] }
}

export function updateRepairOrder(
  state: AppState,
  id: string,
  patch: Partial<Omit<RepairOrder, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    repairOrders: (state.repairOrders ?? []).map((r) =>
      r.id === id
        ? { ...r, ...patch, updatedAt: new Date().toISOString() }
        : r,
    ),
  }
}

export function deleteRepairOrder(state: AppState, id: string): AppState {
  return {
    ...state,
    repairOrders: (state.repairOrders ?? []).filter((r) => r.id !== id),
  }
}

/** Filtre ventes du magasin actif (si multi-emplacement). */
export function ordersForActiveLocation(state: AppState): Order[] {
  if (!state.settings.multiLocationEnabled) return state.orders
  const loc = activeLocationId(state)
  return state.orders.filter((o) => !o.locationId || o.locationId === loc)
}

export function todayOrdersAtActiveLocation(state: AppState): Order[] {
  const day = new Date().toISOString().slice(0, 10)
  return ordersForActiveLocation(state).filter((o) => o.createdAt.slice(0, 10) === day)
}

export function deleteClient(state: AppState, id: string): AppState {
  return {
    ...state,
    clients: state.clients.filter((c) => c.id !== id),
    medicalDocuments: (state.medicalDocuments ?? []).filter((d) => d.clientId !== id),
  }
}

export function findClientByNfcUid(
  state: AppState,
  rawUid: string,
): Client | undefined {
  const uid = rawUid.trim().toUpperCase().replace(/[\s:.-]+/g, '')
  if (!uid) return undefined
  return state.clients.find((c) => c.nfcUid && c.nfcUid === uid)
}

function gymDayKey(iso: string): string {
  return iso.slice(0, 10)
}

/** Dernier événement du jour par client → présents = last kind === 'in' */
export function gymPresentClientIds(state: AppState, at = new Date()): string[] {
  const today = gymDayKey(at.toISOString())
  const last = new Map<string, GymCheckIn>()
  for (const ev of state.gymCheckIns ?? []) {
    if (gymDayKey(ev.at) !== today) continue
    const prev = last.get(ev.clientId)
    if (!prev || ev.at >= prev.at) last.set(ev.clientId, ev)
  }
  const ids: string[] = []
  for (const [clientId, ev] of last) {
    if (ev.kind === 'in') ids.push(clientId)
  }
  return ids
}

export function gymOccupancyCount(state: AppState): number {
  return gymPresentClientIds(state).length
}

export function isClientPresentInGym(state: AppState, clientId: string): boolean {
  return gymPresentClientIds(state).includes(clientId)
}

/** Entrée si absent, sortie si déjà présent. */
export function toggleGymCheckIn(
  state: AppState,
  clientId: string,
  source: GymCheckIn['source'] = 'manual',
): { state: AppState; kind: 'in' | 'out'; client: Client } | null {
  const client = state.clients.find((c) => c.id === clientId)
  if (!client) return null
  const kind: 'in' | 'out' = isClientPresentInGym(state, clientId) ? 'out' : 'in'
  const entry: GymCheckIn = {
    id: uid('gin'),
    clientId: client.id,
    clientName: client.name,
    kind,
    at: new Date().toISOString(),
    source,
  }
  return {
    state: {
      ...state,
      gymCheckIns: [entry, ...(state.gymCheckIns ?? [])].slice(0, 2000),
    },
    kind,
    client,
  }
}

export function gymCheckInByUid(
  state: AppState,
  rawUid: string,
  source: GymCheckIn['source'] = 'nfc',
):
  | { state: AppState; kind: 'in' | 'out'; client: Client }
  | { error: 'unknown_chip' | 'empty' } {
  const raw = rawUid.trim()
  if (!raw) return { error: 'empty' }
  const client = findClientByNfcUid(state, raw)
  if (!client) return { error: 'unknown_chip' }
  const res = toggleGymCheckIn(state, client.id, source)
  if (!res) return { error: 'unknown_chip' }
  return res
}

export function medicalDocsForClient(
  state: AppState,
  clientId: string,
): MedicalDocument[] {
  return (state.medicalDocuments ?? [])
    .filter((d) => d.clientId === clientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function addMedicalDocument(
  state: AppState,
  input: {
    clientId: string
    kind: MedicalDocKind
    title: string
    body: string
  },
): AppState {
  const client = state.clients.find((c) => c.id === input.clientId)
  if (!client) return state
  const doc: MedicalDocument = {
    id: uid('mdoc'),
    clientId: client.id,
    clientName: client.name,
    kind: input.kind,
    title: input.title.trim() || input.kind,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    medicalDocuments: [doc, ...(state.medicalDocuments ?? [])].slice(0, 1000),
  }
}

export function updateMedicalDocument(
  state: AppState,
  id: string,
  patch: Partial<Pick<MedicalDocument, 'title' | 'body' | 'kind'>>,
): AppState {
  return {
    ...state,
    medicalDocuments: (state.medicalDocuments ?? []).map((d) =>
      d.id === id ? { ...d, ...patch } : d,
    ),
  }
}

export function deleteMedicalDocument(state: AppState, id: string): AppState {
  return {
    ...state,
    medicalDocuments: (state.medicalDocuments ?? []).filter((d) => d.id !== id),
  }
}

export function pendingClinicCharges(state: AppState): ClinicCharge[] {
  return (state.clinicCharges ?? [])
    .filter((c) => c.status === 'pending')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** Médecin → file d’attente de la réception / caisse */
export function sendToReceptionCash(
  state: AppState,
  input: {
    clientId: string
    label: string
    amountDa: number
    note?: string
  },
): AppState {
  const client = state.clients.find((c) => c.id === input.clientId)
  if (!client) return state
  const amount = Math.max(0, +input.amountDa.toFixed(2))
  if (amount <= 0) return state
  const charge: ClinicCharge = {
    id: uid('chg'),
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    label: input.label.trim() || 'Consultation',
    amountDa: amount,
    note: (input.note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    clinicCharges: [charge, ...(state.clinicCharges ?? [])].slice(0, 500),
  }
}

export function cancelClinicCharge(state: AppState, id: string): AppState {
  return {
    ...state,
    clinicCharges: (state.clinicCharges ?? []).map((c) =>
      c.id === id && c.status === 'pending' ? { ...c, status: 'cancelled' } : c,
    ),
  }
}

export function markClinicChargePaid(
  state: AppState,
  id: string,
  orderId?: string,
): AppState {
  return {
    ...state,
    clinicCharges: (state.clinicCharges ?? []).map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'paid',
            paidAt: new Date().toISOString(),
            orderId: orderId || c.orderId,
          }
        : c,
    ),
  }
}

export function setClinicStation(
  state: AppState,
  station: ClinicStation,
): AppState {
  return updateSettings(state, {
    clinicStation: station,
    clinicStationChosen: true,
    clinicShareEnabled: true,
  })
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
  const locIdForOrder = orderInput.locationId || activeLocationId(state)
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
    locationId: locIdForOrder,
    createdAt: new Date().toISOString(),
    whatsappSent: false,
    invoiceNumber,
    invoiceSent: false,
  }

  const deductByProduct = new Map<string, number>()
  for (const line of order.lines) {
    if (line.flash || line.productId.startsWith('flash')) continue
    const p = state.products.find((x) => x.id === line.productId)
    const units = stockUnitsSold(p, line)
    deductByProduct.set(
      line.productId,
      (deductByProduct.get(line.productId) ?? 0) + units,
    )
  }

  const locId = activeLocationId(state)
  const products = state.products.map((p) => {
    const take = deductByProduct.get(p.id)
    if (!take) return p
    const available = stockAt(p, locId)
    const cut = Math.min(available, take)
    return adjustStockAt(p, locId, -cut)
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

/**
 * Corrige une facture déjà enregistrée :
 * - stock : annule l’ancien déstockage puis applique les nouvelles lignes
 * - caisse / crédit : met à jour paidDa / remainingDa (le total caisse du jour suit)
 */
export function reviseOrder(
  state: AppState,
  orderId: string,
  input: {
    lines: OrderLine[]
    totalDa: number
    paidDa: number
    note?: string
    discountPercent?: number
    discountDa?: number
  },
): AppState {
  const prev = state.orders.find((o) => o.id === orderId)
  if (!prev) return state
  if (!input.lines.length) return state

  const locId = prev.locationId || activeLocationId(state)
  const stockDelta = new Map<string, number>()

  for (const line of prev.lines) {
    if (line.flash || line.productId.startsWith('flash')) continue
    const p = state.products.find((x) => x.id === line.productId)
    const units = stockUnitsSold(p, line)
    stockDelta.set(line.productId, (stockDelta.get(line.productId) ?? 0) + units)
  }
  for (const line of input.lines) {
    if (line.flash || line.productId.startsWith('flash')) continue
    const p = state.products.find((x) => x.id === line.productId)
    const units = stockUnitsSold(p, line)
    stockDelta.set(line.productId, (stockDelta.get(line.productId) ?? 0) - units)
  }

  const pay = buildPaymentFields(input.totalDa, input.paidDa)
  const subtotalDa = +input.lines
    .reduce((s, l) => s + l.lineTotalDa, 0)
    .toFixed(2)

  const products = state.products.map((p) => {
    const d = stockDelta.get(p.id)
    if (!d || Math.abs(d) < 0.0001) return p
    return adjustStockAt(p, locId, d)
  })

  const orders = state.orders.map((o) => {
    if (o.id !== orderId) return o
    return {
      ...o,
      lines: input.lines.map((l) => ({ ...l })),
      totalDa: +input.totalDa.toFixed(2),
      subtotalDa,
      discountPercent: input.discountPercent,
      discountDa: input.discountDa,
      note: input.note !== undefined ? input.note : o.note,
      revisedAt: new Date().toISOString(),
      ...pay,
    }
  })

  return { ...state, products, orders }
}

/** Combien d’unités de stock (base) une ligne de commande retire. */
export function stockUnitsSold(
  product: Product | undefined,
  line: Pick<OrderLine, 'unit' | 'qty' | 'priceTier' | 'packSize'>,
): number {
  if (!product) return line.qty
  if (line.packSize && line.packSize > 1) {
    return +(line.qty * line.packSize).toFixed(3)
  }
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
  if (state.settings.multiLocationEnabled) {
    const loc = activeLocationId(state)
    return state.products.reduce(
      (sum, p) => sum + p.priceDa * stockAt(p, loc),
      0,
    )
  }
  return state.products.reduce((sum, p) => sum + p.priceDa * p.stock, 0)
}

/** Coût d'achat du stock */
export function stockCostDa(state: AppState): number {
  if (state.settings.multiLocationEnabled) {
    const loc = activeLocationId(state)
    return state.products.reduce(
      (sum, p) => sum + (p.costDa || 0) * stockAt(p, loc),
      0,
    )
  }
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
  const day = new Date().toISOString().slice(0, 10)
  return ordersForActiveLocation(state).filter((o) => o.createdAt.slice(0, 10) === day)
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
  const scoped = ordersForActiveLocation(state)
  const orders = scoped.filter((o) => {
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
  const q = normalizeBarcode(code)
  if (!q) return undefined
  return state.products.find(
    (p) => p.barcode && barcodesMatch(p.barcode, q),
  )
}

/** Compare codes (espaces, tirets, zéros devant EAN). */
export function normalizeBarcode(code: string): string {
  return code.trim().replace(/[\s_-]+/g, '')
}

export function barcodesMatch(a: string, b: string): boolean {
  const x = normalizeBarcode(a)
  const y = normalizeBarcode(b)
  if (!x || !y) return false
  if (x.toLowerCase() === y.toLowerCase()) return true
  const nx = x.replace(/^0+/, '') || '0'
  const ny = y.replace(/^0+/, '') || '0'
  return /^\d+$/.test(nx) && /^\d+$/.test(ny) && nx === ny
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
    const locId = activeLocationId(state)
    return {
      ...adjustStockAt(p, locId, add.qty),
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
      return adjustStockAt(p, activeLocationId(state), add)
    }),
    returns: [item, ...state.returns],
  }
  if (input.refundMode === 'credit' && input.clientId) {
    next = applyClientPayment(next, input.clientId, totalDa)
  }
  return next
}

export function addEmployee(
  state: AppState,
  input: Omit<Employee, 'id' | 'createdAt'>,
): AppState {
  const emp: Employee = {
    ...input,
    id: uid('emp'),
    createdAt: new Date().toISOString(),
  }
  return { ...state, employees: [emp, ...(state.employees ?? [])] }
}

export function updateEmployee(
  state: AppState,
  id: string,
  patch: Partial<Omit<Employee, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    employees: (state.employees ?? []).map((e) =>
      e.id === id ? { ...e, ...patch } : e,
    ),
  }
}

export function deleteEmployee(state: AppState, id: string): AppState {
  return {
    ...state,
    employees: (state.employees ?? []).filter((e) => e.id !== id),
    employeeLeaves: (state.employeeLeaves ?? []).filter((l) => l.employeeId !== id),
    staffLedger: (state.staffLedger ?? []).filter((s) => s.employeeId !== id),
  }
}

export function employeeLeavesFor(
  state: AppState,
  employeeId: string,
): EmployeeLeave[] {
  return (state.employeeLeaves ?? [])
    .filter((l) => l.employeeId === employeeId)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
}

export function addEmployeeLeave(
  state: AppState,
  input: Omit<EmployeeLeave, 'id' | 'createdAt'>,
): AppState {
  const leave: EmployeeLeave = {
    ...input,
    id: uid('elv'),
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    employeeLeaves: [leave, ...(state.employeeLeaves ?? [])].slice(0, 2000),
  }
}

export function deleteEmployeeLeave(state: AppState, id: string): AppState {
  return {
    ...state,
    employeeLeaves: (state.employeeLeaves ?? []).filter((l) => l.id !== id),
  }
}

export function staffLedgerFor(
  state: AppState,
  employeeId: string,
): StaffLedgerEntry[] {
  return (state.staffLedger ?? [])
    .filter((s) => s.employeeId === employeeId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function addStaffLedgerEntry(
  state: AppState,
  input: Omit<StaffLedgerEntry, 'id' | 'createdAt'>,
): AppState {
  const row: StaffLedgerEntry = {
    ...input,
    id: uid('sledg'),
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    staffLedger: [row, ...(state.staffLedger ?? [])].slice(0, 5000),
  }
}

/** Avances ouvertes, dettes employé, reste à payer ce mois (salaire − avances + dettes). */
export function staffBalanceFor(
  state: AppState,
  employeeId: string,
): { avancesOuvertes: number; detteEmploye: number; resteAPayer: number } {
  const emp = (state.employees ?? []).find((e) => e.id === employeeId)
  const salary = emp?.salaryDa ?? 0
  let avances = 0
  let dettes = 0
  let paiements = 0
  let remboursements = 0
  for (const row of state.staffLedger ?? []) {
    if (row.employeeId !== employeeId) continue
    if (row.kind === 'avance') avances += row.amountDa
    else if (row.kind === 'dette') dettes += row.amountDa
    else if (row.kind === 'paiement_salaire') paiements += row.amountDa
    else if (row.kind === 'remboursement') remboursements += row.amountDa
  }
  const avancesOuvertes = Math.max(0, avances - remboursements)
  const detteEmploye = Math.max(0, dettes)
  // Ce que le patron doit encore verser ce cycle : salaire − avances ouvertes − déjà payé + 0
  const resteAPayer = Math.max(0, salary - avancesOuvertes - paiements + detteEmploye)
  return { avancesOuvertes, detteEmploye, resteAPayer }
}
