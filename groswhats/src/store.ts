import type {
  AppState,
  CommerceMode,
  CashEntry,
  CashSession,
  Cashier,
  PosSeller,
  PosSellerRole,
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
  GymSession,
  GymDisciplineId,
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
  GameStation,
  GameStationTabLine,
  GameConsoleKind,
  GameConsoleTariff,
  GameTariffs,
  GameFreeMinuteEntry,
  RepairOrder,
  InvoiceProductAlias,
  Recipe,
  RecipeIngredient,
  ProductionRun,
} from './types'
import {
  DEFAULT_AGENT_PERMISSIONS,
  type AgentPermissions,
} from './agent/permissions'
import {
  DEFAULT_VENDEUR_PERMISSIONS,
  migrateSellerPermissions,
  sellerCan,
} from './sellerPermissions'
import { APP_BRAND } from './brand'
import { countryByCode, convertPriceDa } from './data/countries'
import { bestForeignCatalogHit, catalogFor, catalogNameHits } from './data/catalogs'
import { domainById } from './data/domains'
import { catalogImagePath } from './utils/productArt'
import { resolvePackSize, normalizePackOptions } from './utils/packSize'
import { parseLanguage } from './locale/langs'
import { defaultZakatOn } from './locale/adapt'
import {
  defaultGymSettings,
  migrateGymSettings,
  membershipStillValid,
  resolveSportDomainId,
  SPORT_DOMAIN_ALIASES,
} from './gym/disciplines'

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
    adminPin: undefined,
    gamePricePerMinuteDa: 7,
    gameTariffs: { ...DEFAULT_GAME_TARIFFS },
    gymSettings: defaultGymSettings(),
    gameFreeMaxMinutes: 30,
    currentSellerId: undefined,
  }
}

export const DEFAULT_GAME_PRICE_PER_MINUTE_DA = 7

/** Grille par défaut — liste prix + Xbox Series S + أشواط إضافية */
export const DEFAULT_GAME_CONSOLES: GameConsoleTariff[] = [
  { id: 'xbox_one', label: 'XBOX ONE', hourDa: 200, matchDa: 50, match4Da: 100, extraRoundDa: 30 },
  { id: 'ps4', label: 'PS4', hourDa: 200, matchDa: 50, match4Da: 100, extraRoundDa: 30 },
  { id: 'ps4_pro', label: 'PS4 PRO', hourDa: 250, matchDa: 70, match4Da: 140, extraRoundDa: 30 },
  { id: 'ps5', label: 'PS5', hourDa: 300, matchDa: 100, match4Da: 200, extraRoundDa: 50 },
  { id: 'xbox_360', label: 'XBOX 360', hourDa: 100, matchDa: 0, match4Da: 0, extraRoundDa: 0 },
  { id: 'xbox_series_s', label: 'XBOX Series S', hourDa: 300, matchDa: 70, match4Da: 140, extraRoundDa: 40 },
]

export const DEFAULT_GAME_TARIFFS: GameTariffs = {
  matchMinutes: 15,
  extraRoundMinutes: 10,
  consoles: DEFAULT_GAME_CONSOLES.map((c) => ({ ...c })),
}

export function defaultSellers(): PosSeller[] {
  const now = new Date().toISOString()
  const vendeurPerms = { ...DEFAULT_VENDEUR_PERMISSIONS }
  return [
    { id: 'seller_admin', name: 'Admin', role: 'admin', pin: '', active: true, createdAt: now },
    {
      id: 'seller_v1',
      name: 'Vendeur 1',
      role: 'vendeur',
      pin: '',
      active: true,
      createdAt: now,
      permissions: { ...vendeurPerms },
    },
    {
      id: 'seller_v2',
      name: 'Vendeur 2',
      role: 'vendeur',
      pin: '',
      active: true,
      createdAt: now,
      permissions: { ...vendeurPerms },
    },
    {
      id: 'seller_v3',
      name: 'Vendeur 3',
      role: 'vendeur',
      pin: '',
      active: true,
      createdAt: now,
      permissions: { ...vendeurPerms },
    },
  ]
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
  return syncProductStockSum({
    ...p,
    stockByLocation: map,
    updatedAt: new Date().toISOString(),
  })
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
    currentCashierId: null,
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
    cashiers: [],
    sellers: defaultSellers(),
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
    gymSessions: [],
    employees: [],
    employeeLeaves: [],
    staffLedger: [],
    heldSales: [],
    appointments: [],
    tables: [],
    gameStations: [],
    gameFreeMinutes: [],
    repairOrders: [],
    invoiceAliases: [],
    recipes: [],
    productionRuns: [],
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
    gameStations?: GameStation[]
    repairOrders?: RepairOrder[]
    invoiceAliases?: InvoiceProductAlias[]
    recipes?: Recipe[]
    productionRuns?: ProductionRun[]
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
    domainId: (() => {
      const raw =
        incoming.domainId === 'detail-alimentation'
          ? 'detail-superette'
          : incoming.domainId || defaults.domainId
      return resolveSportDomainId(raw)
    })(),
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
    adminPin:
      typeof incoming.adminPin === 'string' &&
      /^\d{4,6}$/.test(incoming.adminPin.trim())
        ? incoming.adminPin.trim()
        : undefined,
    gamePricePerMinuteDa:
      typeof incoming.gamePricePerMinuteDa === 'number' &&
      incoming.gamePricePerMinuteDa >= 0
        ? +incoming.gamePricePerMinuteDa.toFixed(2)
        : DEFAULT_GAME_PRICE_PER_MINUTE_DA,
    gameTariffs: migrateGameTariffs(incoming.gameTariffs, incoming.gamePricePerMinuteDa),
    gymSettings: migrateGymSettings(
      incoming.gymSettings,
      typeof incoming.domainId === 'string' ? incoming.domainId : undefined,
    ),
    gameFreeMaxMinutes:
      typeof incoming.gameFreeMaxMinutes === 'number' &&
      incoming.gameFreeMaxMinutes >= 1
        ? Math.min(180, Math.round(incoming.gameFreeMaxMinutes))
        : 30,
    currentSellerId:
      typeof incoming.currentSellerId === 'string' && incoming.currentSellerId
        ? incoming.currentSellerId
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
    role:
      data.team?.role === 'driver'
        ? 'driver'
        : data.team?.role === 'cashier'
          ? 'cashier'
          : 'owner',
    currentDriverId: data.team?.currentDriverId ?? null,
    currentCashierId: data.team?.currentCashierId ?? null,
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
      membershipPlanId:
        typeof (c as Client).membershipPlanId === 'string'
          ? (c as Client).membershipPlanId
          : undefined,
      membershipDisciplineIds: Array.isArray((c as Client).membershipDisciplineIds)
        ? ((c as Client).membershipDisciplineIds as GymDisciplineId[])
        : undefined,
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
    cashiers: ((data as AppState).cashiers ?? []).map((c) => ({
      ...c,
      id: c.id || uid('ca'),
      name: typeof c.name === 'string' ? c.name : '',
      phone: typeof c.phone === 'string' ? c.phone : '',
      active: c.active !== false,
      pin: String(c.pin || '0000').replace(/\D/g, '').slice(0, 4).padStart(4, '0'),
      createdAt: c.createdAt || new Date().toISOString(),
    })),
    sellers: migrateSellers((data as AppState).sellers),
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
    gymSessions: migrateGymSessions(
      (data as { gymSessions?: GymSession[] }).gymSessions,
    ),
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
    gameStations: migrateGameStations(data.gameStations),
    gameFreeMinutes: migrateGameFreeMinutes(
      (data as { gameFreeMinutes?: GameFreeMinuteEntry[] }).gameFreeMinutes,
    ),
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
    recipes: migrateRecipes(data.recipes),
    productionRuns: migrateProductionRuns(data.productionRuns),
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
    products: keep ? state.products : products,
    /** RDV / file clinique d’un autre métier ne doivent pas traîner */
    appointments: metierChanged ? [] : state.appointments ?? [],
    clinicCharges: metierChanged ? [] : state.clinicCharges ?? [],
    medicalDocuments: metierChanged ? [] : state.medicalDocuments ?? [],
    gymCheckIns: metierChanged ? [] : state.gymCheckIns ?? [],
    gymSessions: metierChanged ? [] : state.gymSessions ?? [],
    settings: {
      ...state.settings,
      setupDone: true,
      countryCode: country.code,
      commerceMode: input.commerceMode,
      domainId: resolveSportDomainId(domain.id),
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
      gymSettings: (() => {
        const alias = SPORT_DOMAIN_ALIASES[domain.id]
        if (alias) return defaultGymSettings(alias.disciplines)
        if (state.settings.domainId === domain.id && state.settings.gymSettings) {
          return state.settings.gymSettings
        }
        return state.settings.gymSettings ?? defaultGymSettings()
      })(),
    },
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
      updatedAt: new Date().toISOString(),
      stockByLocation: input.stockByLocation,
    },
    locId,
    typeof input.stock === 'number' ? input.stock : 0,
  )
  return { ...state, products: [product, ...state.products] }
}

export function updateProduct(state: AppState, id: string, patch: Partial<Product>): AppState {
  const locId = activeLocationId(state)
  const now = new Date().toISOString()
  return {
    ...state,
    products: state.products.map((p) => {
      if (p.id !== id) return p
      if (typeof patch.stock === 'number' && patch.stockByLocation === undefined) {
        const { stock: _stock, ...rest } = patch
        return syncProductStockSum(
          setStockAt({ ...p, ...rest, updatedAt: now }, locId, patch.stock),
        )
      }
      return syncProductStockSum({ ...p, ...patch, updatedAt: now })
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

/** Ajoute / retire un produit catalogue sur le ticket d’une session salle. */
export function bumpGymSessionProduct(
  state: AppState,
  sessionId: string,
  productId: string,
  delta: number,
): AppState {
  let next = ensureGymSessionHeld(state, sessionId)
  const session = (next.gymSessions ?? []).find((s) => s.id === sessionId)
  if (!session) return state
  const product = next.products.find((p) => p.id === productId)
  if (!product) return next

  const held = (next.heldSales || []).find((h) => h.id === session.heldSaleId)
  if (!held) return next

  const key = productId
  const cur = held.qtyMap?.[key] || 0
  const stock = displayStock(next, product)
  const qty = Math.max(0, Math.min(stock, +(cur + delta).toFixed(3)))
  const qtyMap = { ...(held.qtyMap || {}) }
  const tierMap = { ...(held.tierMap || {}) }
  if (qty <= 0) {
    delete qtyMap[key]
    delete tierMap[key]
  } else {
    qtyMap[key] = qty
    if (!tierMap[key]) tierMap[key] = 'piece'
  }

  return {
    ...next,
    heldSales: (next.heldSales || []).map((h) =>
      h.id === held.id ? { ...h, qtyMap, tierMap } : h,
    ),
  }
}

/** Total ticket session (flash séance + produits catalogue). */
export function gymSessionTicketTotal(
  state: AppState,
  sessionId: string,
): { totalDa: number; productLines: number; sessionFeeDa: number } {
  const session = (state.gymSessions ?? []).find((s) => s.id === sessionId)
  if (!session) return { totalDa: 0, productLines: 0, sessionFeeDa: 0 }
  const held = (state.heldSales || []).find((h) => h.id === session.heldSaleId)
  if (!held) return { totalDa: 0, productLines: 0, sessionFeeDa: 0 }

  let sessionFeeDa = 0
  for (const f of held.flashLines || []) {
    sessionFeeDa += (f.unitPriceDa || 0) * (f.qty || 0)
  }
  let productsDa = 0
  let productLines = 0
  for (const [pid, qty] of Object.entries(held.qtyMap || {})) {
    if (qty <= 0) continue
    const p = state.products.find((x) => x.id === pid)
    if (!p) continue
    productLines += 1
    const tier = held.tierMap?.[pid] || 'piece'
    const price =
      held.priceOverrides?.[`${pid}::${tier}`] ??
      (tier === 'gros' || tier === 'super_gros'
        ? p.grosPriceDa || p.priceDa
        : tier === 'demi_gros'
          ? p.demiGrosPriceDa || p.priceDa
          : p.priceDa)
    productsDa += price * qty
  }
  let sum = sessionFeeDa + productsDa
  const disc = held.discountPercent || 0
  if (disc > 0) sum = sum * (1 - disc / 100)
  if (typeof held.totalOverrideDa === 'number') {
    return {
      totalDa: held.totalOverrideDa,
      productLines,
      sessionFeeDa,
    }
  }
  return {
    totalDa: Math.round(sum),
    productLines,
    sessionFeeDa: Math.round(sessionFeeDa),
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

const DEFAULT_GAME_STATION_COUNT = 15
const MAX_GAME_STATIONS = 30

function migrateGameStations(raw: GameStation[] | undefined): GameStation[] {
  const list = Array.isArray(raw) ? raw : []
  return list
    .filter((g) => g && typeof g.number === 'number')
    .slice(0, MAX_GAME_STATIONS)
    .map((g, i) => {
      const num = g.number > 0 ? g.number : i + 1
      const kindOk =
        g.tvKind === 'tasmota' ||
        g.tvKind === 'custom' ||
        g.tvKind === 'shelly' ||
        g.tvKind === 'smart_tv' ||
        g.tvKind === 'google_tv'
      return {
        id: g.id || uid('gs'),
        name: typeof g.name === 'string' && g.name.trim() ? g.name : `Poste ${num}`,
        number: num,
        status:
          g.status === 'active' || g.status === 'standby' ? g.status : 'free',
        endsAt: typeof g.endsAt === 'string' ? g.endsAt : undefined,
        startedAt: typeof g.startedAt === 'string' ? g.startedAt : undefined,
        paidMinutes:
          typeof g.paidMinutes === 'number' && g.paidMinutes > 0
            ? g.paidMinutes
            : undefined,
        freeMinutes:
          typeof g.freeMinutes === 'number' && g.freeMinutes > 0
            ? Math.round(g.freeMinutes)
            : undefined,
        clientLabel: typeof g.clientLabel === 'string' ? g.clientLabel : undefined,
        note: typeof g.note === 'string' ? g.note : undefined,
        consoleKind: normalizeConsoleKind(g.consoleKind),
        matchMinutes:
          typeof g.matchMinutes === 'number' && g.matchMinutes > 0
            ? Math.round(g.matchMinutes)
            : undefined,
        tvKind: kindOk ? g.tvKind : undefined,
        tvHost: typeof g.tvHost === 'string' ? g.tvHost : undefined,
        tvMac: typeof g.tvMac === 'string' ? g.tvMac : undefined,
        tvAdbPort:
          typeof g.tvAdbPort === 'number' && g.tvAdbPort > 0
            ? Math.round(g.tvAdbPort)
            : undefined,
        tvOnUrl: typeof g.tvOnUrl === 'string' ? g.tvOnUrl : undefined,
        tvOffUrl: typeof g.tvOffUrl === 'string' ? g.tvOffUrl : undefined,
        tabLines: migrateGameStationTabLines(
          (g as GameStation).tabLines,
        ),
      }
    })
}

function migrateGameStationTabLines(
  raw: GameStationTabLine[] | undefined,
): GameStationTabLine[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const lines = raw
    .filter(
      (l) =>
        l &&
        typeof l.name === 'string' &&
        l.name.trim() &&
        typeof l.unitPriceDa === 'number',
    )
    .slice(0, 80)
    .map((l) => ({
      id: l.id || uid('gstab'),
      kind: l.kind === 'product' ? ('product' as const) : ('game' as const),
      productId:
        typeof l.productId === 'string' && l.productId
          ? l.productId
          : `flash_${uid('g')}`,
      name: l.name.trim(),
      qty: Math.max(0.001, Number(l.qty) || 1),
      unitPriceDa: Math.max(0, +Number(l.unitPriceDa).toFixed(2)),
      unit: (l.unit || 'piece') as GameStationTabLine['unit'],
      flash: l.flash === true || l.kind !== 'product' || undefined,
    }))
  return lines.length > 0 ? lines : undefined
}

function buildDefaultGameStations(count = DEFAULT_GAME_STATION_COUNT): GameStation[] {
  return Array.from({ length: count }, (_, i) => {
    const number = i + 1
    return {
      id: uid('gs'),
      name: `Poste ${number}`,
      number,
      status: 'free' as const,
      consoleKind: 'ps4' as const,
      tvKind: 'google_tv' as const,
    }
  })
}

/** Crée les 15 postes PS si absents. */
export function ensureGameStations(
  state: AppState,
  count = DEFAULT_GAME_STATION_COUNT,
): AppState {
  const existing = state.gameStations ?? []
  if (existing.length > 0) return state
  return { ...state, gameStations: buildDefaultGameStations(count) }
}

export function updateGameStation(
  state: AppState,
  id: string,
  patch: Partial<
    Pick<
      GameStation,
      | 'name'
      | 'consoleKind'
      | 'matchMinutes'
      | 'tvKind'
      | 'tvHost'
      | 'tvMac'
      | 'tvAdbPort'
      | 'tvOnUrl'
      | 'tvOffUrl'
      | 'clientLabel'
      | 'note'
    >
  >,
): AppState {
  return {
    ...state,
    gameStations: (state.gameStations ?? []).map((g) =>
      g.id === id ? { ...g, ...patch } : g,
    ),
  }
}

/** Démarre ou prolonge une session (minutes payées ou gratuites). */
export function addGameStationTime(
  state: AppState,
  id: string,
  minutes: number,
  clientLabel?: string,
  opts?: { free?: boolean },
): AppState {
  const mins = Math.max(1, Math.round(minutes))
  const now = Date.now()
  const free = opts?.free === true
  return {
    ...state,
    gameStations: (state.gameStations ?? []).map((g) => {
      if (g.id !== id) return g
      const base =
        g.status === 'active' && g.endsAt
          ? Math.max(now, new Date(g.endsAt).getTime())
          : now
      const endsAt = new Date(base + mins * 60_000).toISOString()
      const wasActive = g.status === 'active'
      return {
        ...g,
        status: 'active' as const,
        startedAt: wasActive && g.startedAt ? g.startedAt : new Date(now).toISOString(),
        endsAt,
        paidMinutes: free
          ? wasActive
            ? g.paidMinutes
            : undefined
          : (wasActive ? g.paidMinutes || 0 : 0) + mins,
        freeMinutes: free
          ? (wasActive ? g.freeMinutes || 0 : 0) + mins
          : wasActive
            ? g.freeMinutes
            : undefined,
        clientLabel:
          clientLabel !== undefined
            ? clientLabel
            : g.status === 'active'
              ? g.clientLabel
              : g.clientLabel,
      }
    }),
  }
}

/** Fin de temps → veille (TV à couper côté UI). */
export function setGameStationStandby(state: AppState, id: string): AppState {
  return {
    ...state,
    gameStations: (state.gameStations ?? []).map((g) =>
      g.id === id
        ? {
            ...g,
            status: 'standby' as const,
            endsAt: undefined,
          }
        : g,
    ),
  }
}

/** Libère le poste pour un nouveau client. */
export function freeGameStation(state: AppState, id: string): AppState {
  return {
    ...state,
    gameStations: (state.gameStations ?? []).map((g) =>
      g.id === id
        ? {
            ...g,
            status: 'free' as const,
            endsAt: undefined,
            startedAt: undefined,
            paidMinutes: undefined,
            freeMinutes: undefined,
            clientLabel: undefined,
            tabLines: undefined,
          }
        : g,
    ),
  }
}

export function gameStationTabTotalDa(station: GameStation | undefined): number {
  if (!station?.tabLines?.length) return 0
  return +station.tabLines
    .reduce((s, l) => s + l.qty * l.unitPriceDa, 0)
    .toFixed(2)
}

export function gameStationTabGameDa(station: GameStation | undefined): number {
  if (!station?.tabLines?.length) return 0
  return +station.tabLines
    .filter((l) => l.kind === 'game')
    .reduce((s, l) => s + l.qty * l.unitPriceDa, 0)
    .toFixed(2)
}

export function gameStationTabProductDa(
  station: GameStation | undefined,
): number {
  if (!station?.tabLines?.length) return 0
  return +station.tabLines
    .filter((l) => l.kind === 'product')
    .reduce((s, l) => s + l.qty * l.unitPriceDa, 0)
    .toFixed(2)
}

function appendStationTabLine(
  state: AppState,
  stationId: string,
  line: GameStationTabLine,
): AppState {
  return {
    ...state,
    gameStations: (state.gameStations ?? []).map((g) => {
      if (g.id !== stationId) return g
      const prev = g.tabLines ?? []
      // Fusion qty pour même produit catalogue
      if (line.kind === 'product' && !line.flash) {
        const idx = prev.findIndex(
          (x) => x.kind === 'product' && x.productId === line.productId,
        )
        if (idx >= 0) {
          const cur = prev[idx]!
          const nextLines = [...prev]
          nextLines[idx] = {
            ...cur,
            qty: +(cur.qty + line.qty).toFixed(3),
            unitPriceDa: line.unitPriceDa,
          }
          return { ...g, tabLines: nextLines }
        }
      }
      return { ...g, tabLines: [...prev, line].slice(-80) }
    }),
  }
}

/** Ajoute un produit catalogue sur l’addition du poste. */
export function addGameStationProduct(
  state: AppState,
  stationId: string,
  productId: string,
  qty = 1,
): { state: AppState; ok: boolean; reason?: 'bad' | 'nostock' } {
  const station = (state.gameStations ?? []).find((g) => g.id === stationId)
  if (!station) return { state, ok: false, reason: 'bad' }
  const product = state.products.find((p) => p.id === productId)
  if (!product) return { state, ok: false, reason: 'bad' }
  const q = Math.max(0.001, Number(qty) || 1)
  const available = displayStock(state, product)
  if (available + 1e-9 < q) return { state, ok: false, reason: 'nostock' }
  const line: GameStationTabLine = {
    id: uid('gstab'),
    kind: 'product',
    productId: product.id,
    name: product.name,
    qty: +q.toFixed(3),
    unitPriceDa: product.priceDa,
    unit: product.unit || 'piece',
  }
  return { state: appendStationTabLine(state, stationId, line), ok: true }
}

export function removeGameStationTabLine(
  state: AppState,
  stationId: string,
  lineId: string,
): AppState {
  return {
    ...state,
    gameStations: (state.gameStations ?? []).map((g) => {
      if (g.id !== stationId) return g
      const next = (g.tabLines ?? []).filter((l) => l.id !== lineId)
      return { ...g, tabLines: next.length > 0 ? next : undefined }
    }),
  }
}

/**
 * Encaisser l’addition du poste (jeux + produits) → une vente caisse.
 * Libère le poste après encaissement.
 */
export function settleGameStation(
  state: AppState,
  stationId: string,
  opts?: { freeStation?: boolean },
): {
  state: AppState
  totalDa: number
  ok: boolean
  reason?: 'empty' | 'bad'
} {
  const station = (state.gameStations ?? []).find((g) => g.id === stationId)
  if (!station) return { state, totalDa: 0, ok: false, reason: 'bad' }
  const lines = station.tabLines ?? []
  if (lines.length === 0) return { state, totalDa: 0, ok: false, reason: 'empty' }

  const orderLines: OrderLine[] = lines.map((l) => {
    const lineTotal = +(l.qty * l.unitPriceDa).toFixed(2)
    const product =
      l.kind === 'product'
        ? state.products.find((p) => p.id === l.productId)
        : undefined
    return {
      productId: l.productId,
      name: l.name,
      unit: l.unit,
      qty: l.qty,
      unitPriceDa: l.unitPriceDa,
      unitCostDa: product?.costDa ?? 0,
      lineTotalDa: lineTotal,
      flash: l.kind === 'game' || l.flash === true || undefined,
    }
  })
  const totalDa = +orderLines
    .reduce((s, l) => s + l.lineTotalDa, 0)
    .toFixed(2)
  const seller = currentSeller(state)
  let next = createOrder(state, {
    clientId: '',
    clientName: station.clientLabel?.trim() || station.name || 'Passage',
    clientPhone: '',
    lines: orderLines,
    totalDa,
    paidDa: totalDa,
    remainingDa: 0,
    payment: 'paye',
    note: `Salle de jeux · ${station.name} · encaissement`,
    sellerId: seller?.id,
    sellerName: seller?.name,
  })
  // Vider l’addition
  next = {
    ...next,
    gameStations: (next.gameStations ?? []).map((g) =>
      g.id === stationId ? { ...g, tabLines: undefined } : g,
    ),
  }
  if (opts?.freeStation !== false) {
    next = freeGameStation(next, stationId)
  }
  return { state: next, totalDa, ok: true }
}

/** Passe en veille tous les postes dont le temps est écoulé. */
export function expireGameStations(
  state: AppState,
  nowMs = Date.now(),
): { state: AppState; expiredIds: string[] } {
  const expiredIds: string[] = []
  const gameStations = (state.gameStations ?? []).map((g) => {
    if (g.status !== 'active' || !g.endsAt) return g
    if (new Date(g.endsAt).getTime() > nowMs) return g
    expiredIds.push(g.id)
    return {
      ...g,
      status: 'standby' as const,
      endsAt: undefined,
    }
  })
  if (expiredIds.length === 0) return { state, expiredIds }
  return { state: { ...state, gameStations }, expiredIds }
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

function migrateRecipes(raw: Recipe[] | undefined): Recipe[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (r) =>
        r &&
        typeof r.name === 'string' &&
        r.name.trim() &&
        typeof r.outputProductId === 'string' &&
        r.outputProductId,
    )
    .map((r) => ({
      id: r.id || uid('rcp'),
      name: r.name.trim(),
      outputProductId: r.outputProductId,
      ingredients: Array.isArray(r.ingredients)
        ? r.ingredients
            .filter(
              (ing): ing is RecipeIngredient =>
                !!ing &&
                typeof ing.productId === 'string' &&
                ing.productId.length > 0 &&
                typeof ing.qtyPerUnit === 'number' &&
                ing.qtyPerUnit > 0,
            )
            .map((ing) => ({
              productId: ing.productId,
              qtyPerUnit: ing.qtyPerUnit,
            }))
        : [],
      note: typeof r.note === 'string' ? r.note : undefined,
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
    }))
    .slice(0, 200)
}

function migrateProductionRuns(raw: ProductionRun[] | undefined): ProductionRun[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (r) =>
        r &&
        typeof r.recipeId === 'string' &&
        typeof r.qtyProduced === 'number' &&
        r.qtyProduced > 0,
    )
    .map((r) => ({
      id: r.id || uid('prod'),
      recipeId: r.recipeId,
      recipeName: typeof r.recipeName === 'string' ? r.recipeName : '',
      outputProductId:
        typeof r.outputProductId === 'string' ? r.outputProductId : '',
      outputName: typeof r.outputName === 'string' ? r.outputName : '',
      qtyProduced: r.qtyProduced,
      consumed: Array.isArray(r.consumed)
        ? r.consumed
            .filter(
              (c) =>
                c &&
                typeof c.productId === 'string' &&
                typeof c.qty === 'number' &&
                c.qty > 0,
            )
            .map((c) => ({
              productId: c.productId,
              name: typeof c.name === 'string' ? c.name : '',
              qty: c.qty,
            }))
        : [],
      unitCostDa:
        typeof r.unitCostDa === 'number' && r.unitCostDa >= 0
          ? r.unitCostDa
          : undefined,
      locationId:
        typeof r.locationId === 'string' && r.locationId
          ? r.locationId
          : DEFAULT_LOCATION_ID,
      createdAt: r.createdAt || new Date().toISOString(),
    }))
    .slice(0, 500)
}

export function addRecipe(
  state: AppState,
  input: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
): AppState {
  const now = new Date().toISOString()
  const recipe: Recipe = {
    ...input,
    name: input.name.trim(),
    ingredients: input.ingredients.filter((i) => i.qtyPerUnit > 0),
    id: uid('rcp'),
    createdAt: now,
  }
  return { ...state, recipes: [recipe, ...(state.recipes ?? [])] }
}

export function updateRecipe(
  state: AppState,
  id: string,
  patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    recipes: (state.recipes ?? []).map((r) =>
      r.id === id
        ? {
            ...r,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() : r.name,
            ingredients: patch.ingredients
              ? patch.ingredients.filter((i) => i.qtyPerUnit > 0)
              : r.ingredients,
            updatedAt: new Date().toISOString(),
          }
        : r,
    ),
  }
}

export function deleteRecipe(state: AppState, id: string): AppState {
  return {
    ...state,
    recipes: (state.recipes ?? []).filter((r) => r.id !== id),
  }
}

export type ProduceResult =
  | { ok: true; state: AppState; run: ProductionRun }
  | { ok: false; error: 'missing_recipe' | 'bad_qty' | 'missing_output' | 'missing_ingredient' | 'insufficient_stock'; missingName?: string; need?: number; have?: number }

/** Fabrication : déduit les MP et entre le produit fini en stock. */
export function produceFromRecipe(
  state: AppState,
  recipeId: string,
  qtyProduced: number,
): ProduceResult {
  const qty = Number(qtyProduced)
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: 'bad_qty' }
  }
  const recipe = (state.recipes ?? []).find((r) => r.id === recipeId)
  if (!recipe) return { ok: false, error: 'missing_recipe' }
  if (!recipe.ingredients.length) {
    return { ok: false, error: 'missing_ingredient' }
  }

  const locId = activeLocationId(state)
  const output = state.products.find((p) => p.id === recipe.outputProductId)
  if (!output) return { ok: false, error: 'missing_output' }

  const consumed: ProductionRun['consumed'] = []
  let unitCostDa = 0

  for (const ing of recipe.ingredients) {
    const mp = state.products.find((p) => p.id === ing.productId)
    if (!mp) {
      return { ok: false, error: 'missing_ingredient', missingName: ing.productId }
    }
    const need = ing.qtyPerUnit * qty
    const have = stockAt(mp, locId)
    if (have + 1e-9 < need) {
      return {
        ok: false,
        error: 'insufficient_stock',
        missingName: mp.name,
        need,
        have,
      }
    }
    consumed.push({ productId: mp.id, name: mp.name, qty: need })
    unitCostDa += (mp.costDa || 0) * ing.qtyPerUnit
  }

  let products = state.products.map((p) => {
    const line = consumed.find((c) => c.productId === p.id)
    if (!line) return p
    return adjustStockAt(p, locId, -line.qty)
  })

  products = products.map((p) => {
    if (p.id !== output.id) return p
    const before = stockAt(p, locId)
    const next = adjustStockAt(p, locId, qty)
    const oldCost = p.costDa || 0
    const blended =
      before > 0
        ? (before * oldCost + qty * unitCostDa) / (before + qty)
        : unitCostDa
    return {
      ...next,
      costDa: Math.round(blended * 100) / 100,
      updatedAt: new Date().toISOString(),
    }
  })

  const run: ProductionRun = {
    id: uid('prod'),
    recipeId: recipe.id,
    recipeName: recipe.name,
    outputProductId: output.id,
    outputName: output.name,
    qtyProduced: qty,
    consumed,
    unitCostDa: Math.round(unitCostDa * 100) / 100,
    locationId: locId,
    createdAt: new Date().toISOString(),
  }

  return {
    ok: true,
    state: {
      ...state,
      products,
      productionRuns: [run, ...(state.productionRuns ?? [])].slice(0, 500),
    },
    run,
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

function migrateGymSessions(raw: GymSession[] | undefined): GymSession[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (s) =>
        s &&
        typeof s.heldSaleId === 'string' &&
        s.heldSaleId &&
        typeof s.clientName === 'string',
    )
    .map((s): GymSession => ({
      id: s.id || uid('gs'),
      clientId: typeof s.clientId === 'string' ? s.clientId : '',
      clientName: s.clientName,
      kind: s.kind === 'walk_in' ? 'walk_in' : 'member',
      disciplineId: s.disciplineId,
      membershipPlanId:
        typeof s.membershipPlanId === 'string' ? s.membershipPlanId : undefined,
      heldSaleId: s.heldSaleId,
      startedAt: s.startedAt || new Date().toISOString(),
      status: s.status === 'billing' ? 'billing' : 'open',
      nfcUid: typeof s.nfcUid === 'string' ? s.nfcUid : undefined,
    }))
    .slice(0, 80)
}

export function openGymSessions(state: AppState): GymSession[] {
  return (state.gymSessions ?? []).filter(
    (s) => s.status === 'open' || s.status === 'billing',
  )
}

export function gymSessionForClient(
  state: AppState,
  clientId: string,
): GymSession | undefined {
  if (!clientId) return undefined
  return openGymSessions(state).find((s) => s.clientId === clientId)
}

export function updateGymSettings(
  state: AppState,
  patch: Partial<NonNullable<ShopSettings['gymSettings']>>,
): AppState {
  const cur = state.settings.gymSettings ?? defaultGymSettings()
  return {
    ...state,
    settings: {
      ...state.settings,
      gymSettings: {
        ...cur,
        ...patch,
        enabledDisciplines:
          patch.enabledDisciplines ?? cur.enabledDisciplines,
        plans: patch.plans ?? cur.plans,
      },
    },
  }
}

function openGymSessionTicket(
  state: AppState,
  input: {
    clientId: string
    clientName: string
    kind: 'member' | 'walk_in'
    disciplineId?: GymDisciplineId
    membershipPlanId?: string
    nfcUid?: string
    flashLines?: HeldSale['flashLines']
  },
): AppState {
  const existing = input.clientId
    ? gymSessionForClient(state, input.clientId)
    : undefined
  if (existing) return state

  const held = holdSale(state, {
    label: `Séance · ${input.clientName}`,
    clientId: input.clientId,
    qtyMap: {},
    tierMap: {},
    flashLines: input.flashLines,
  })
  const heldSaleId = held.heldSales[0]?.id
  if (!heldSaleId) return state

  const session: GymSession = {
    id: uid('gs'),
    clientId: input.clientId,
    clientName: input.clientName,
    kind: input.kind,
    disciplineId: input.disciplineId,
    membershipPlanId: input.membershipPlanId,
    heldSaleId,
    startedAt: new Date().toISOString(),
    status: 'open',
    nfcUid: input.nfcUid,
  }
  return {
    ...held,
    gymSessions: [session, ...(held.gymSessions ?? [])].slice(0, 80),
  }
}

/** Si le ticket a été absorbé par la caisse, en recrée un lié à la session. */
export function ensureGymSessionHeld(
  state: AppState,
  sessionId: string,
): AppState {
  const session = (state.gymSessions ?? []).find((s) => s.id === sessionId)
  if (!session) return state
  if ((state.heldSales || []).some((h) => h.id === session.heldSaleId)) {
    return markGymSessionBilling(state, sessionId)
  }
  const plan = (state.settings.gymSettings?.plans ?? []).find(
    (p) => p.id === session.membershipPlanId,
  )
  const flashLines =
    session.kind === 'walk_in' && plan && plan.priceDa > 0
      ? [
          {
            id: uid('flash'),
            name: plan.name,
            qty: 1,
            unitPriceDa: plan.priceDa,
            unit: 'piece' as const,
          },
        ]
      : undefined
  const held = holdSale(state, {
    label: `Séance · ${session.clientName}`,
    clientId: session.clientId,
    qtyMap: {},
    tierMap: {},
    flashLines,
  })
  const newId = held.heldSales[0]?.id
  if (!newId) return state
  return {
    ...held,
    gymSessions: (held.gymSessions ?? []).map((s) =>
      s.id === sessionId
        ? { ...s, heldSaleId: newId, status: 'billing' as const }
        : s,
    ),
  }
}

/** Après « mettre en attente » depuis la caisse : rattache le nouveau ticket. */
export function relinkGymSessionHeld(
  state: AppState,
  heldSaleId: string,
  hint?: { clientId?: string; label?: string },
): AppState {
  const sessions = openGymSessions(state)
  if (!sessions.length) return state
  let target =
    (hint?.clientId &&
      sessions.find((s) => s.clientId && s.clientId === hint.clientId)) ||
    sessions.find((s) => s.status === 'billing') ||
    sessions[0]
  if (!target) return state
  return {
    ...state,
    gymSessions: (state.gymSessions ?? []).map((s) =>
      s.id === target!.id
        ? { ...s, heldSaleId, status: 'open' as const }
        : s,
    ),
  }
}

/** Passager : entrée sans abonnement longue durée. */
export function startWalkInGymSession(
  state: AppState,
  input: {
    name?: string
    clientId?: string
    disciplineId?: GymDisciplineId
    planId?: string
  } = {},
): { state: AppState; session: GymSession } | { error: 'no_ticket' } {
  const plans = state.settings.gymSettings?.plans ?? []
  const walkPlan =
    (input.planId && plans.find((p) => p.id === input.planId)) ||
    plans.find((p) => p.walkIn && p.active !== false)
  const name =
    input.name?.trim() ||
    (input.clientId
      ? state.clients.find((c) => c.id === input.clientId)?.name
      : undefined) ||
    'Passager'
  const clientId = input.clientId || ''
  const flashLines =
    walkPlan && walkPlan.priceDa > 0
      ? [
          {
            id: uid('flash'),
            name: walkPlan.name,
            qty: 1,
            unitPriceDa: walkPlan.priceDa,
            unit: 'piece' as const,
          },
        ]
      : undefined
  let next = openGymSessionTicket(state, {
    clientId,
    clientName: name,
    kind: 'walk_in',
    disciplineId:
      input.disciplineId ||
      walkPlan?.disciplineIds[0] ||
      state.settings.gymSettings?.enabledDisciplines[0],
    membershipPlanId: walkPlan?.id,
    flashLines,
  })
  const session = openGymSessions(next).find(
    (s) =>
      s.heldSaleId &&
      s.clientName === name &&
      (!clientId || s.clientId === clientId),
  )
  if (!session) return { error: 'no_ticket' }

  if (clientId && !isClientPresentInGym(next, clientId)) {
    const toggled = toggleGymCheckIn(next, clientId, 'manual', {
      skipSession: true,
    })
    if (toggled && !('error' in toggled)) next = toggled.state
  }
  return { state: next, session }
}

export function markGymSessionBilling(
  state: AppState,
  sessionId: string,
): AppState {
  return {
    ...state,
    gymSessions: (state.gymSessions ?? []).map((s) =>
      s.id === sessionId ? { ...s, status: 'billing' as const } : s,
    ),
  }
}

/** Après encaissement : ferme session + check-out + retire held. */
export function closeGymSession(
  state: AppState,
  sessionId: string,
  opts?: { checkout?: boolean },
): AppState {
  const session = (state.gymSessions ?? []).find((s) => s.id === sessionId)
  if (!session) return state
  let next = removeHeldSale(state, session.heldSaleId)
  next = {
    ...next,
    gymSessions: (next.gymSessions ?? []).filter((s) => s.id !== sessionId),
  }
  if (opts?.checkout !== false && session.clientId) {
    if (isClientPresentInGym(next, session.clientId)) {
      const out = toggleGymCheckIn(next, session.clientId, 'manual', {
        skipSession: true,
        forceKind: 'out',
      })
      if (out && !('error' in out)) next = out.state
    }
  }
  return next
}

/**
 * Entrée si absent, sortie si déjà présent.
 * Entrée → ticket session (conso). Sortie bloquée si conso non encaissée.
 */
export function toggleGymCheckIn(
  state: AppState,
  clientId: string,
  source: GymCheckIn['source'] = 'manual',
  opts?: {
    skipSession?: boolean
    forceKind?: 'in' | 'out'
    disciplineId?: GymDisciplineId
  },
):
  | {
      state: AppState
      kind: 'in' | 'out'
      client: Client
      sessionId?: string
      membershipExpired?: boolean
    }
  | { error: 'session_open'; session: GymSession; client: Client }
  | null {
  const client = state.clients.find((c) => c.id === clientId)
  if (!client) return null
  const kind: 'in' | 'out' =
    opts?.forceKind ||
    (isClientPresentInGym(state, clientId) ? 'out' : 'in')

  if (kind === 'out' && !opts?.skipSession) {
    const open = gymSessionForClient(state, clientId)
    if (open) {
      const held = (state.heldSales || []).find((h) => h.id === open.heldSaleId)
      const hasLines =
        !!held &&
        (Object.keys(held.qtyMap || {}).some((k) => (held.qtyMap[k] || 0) > 0) ||
          (held.flashLines?.length ?? 0) > 0)
      if (hasLines || open.status === 'billing') {
        return { error: 'session_open', session: open, client }
      }
      state = closeGymSession(state, open.id, { checkout: false })
    }
  }

  const entry: GymCheckIn = {
    id: uid('gin'),
    clientId: client.id,
    clientName: client.name,
    kind,
    at: new Date().toISOString(),
    source,
  }
  let next: AppState = {
    ...state,
    gymCheckIns: [entry, ...(state.gymCheckIns ?? [])].slice(0, 2000),
  }

  const membershipExpired =
    !!client.membershipEnd && !membershipStillValid(client.membershipEnd)

  let sessionId: string | undefined
  if (
    kind === 'in' &&
    !opts?.skipSession &&
    next.settings.gymSettings?.openTicketOnEntry !== false
  ) {
    next = openGymSessionTicket(next, {
      clientId: client.id,
      clientName: client.name,
      kind: membershipExpired ? 'walk_in' : 'member',
      disciplineId:
        opts?.disciplineId ||
        client.membershipDisciplineIds?.[0] ||
        next.settings.gymSettings?.enabledDisciplines[0],
      membershipPlanId: client.membershipPlanId,
      nfcUid: client.nfcUid,
    })
    sessionId = gymSessionForClient(next, client.id)?.id
  }

  return {
    state: next,
    kind,
    client,
    sessionId,
    membershipExpired: kind === 'in' ? membershipExpired : undefined,
  }
}

export function gymCheckInByUid(
  state: AppState,
  rawUid: string,
  source: GymCheckIn['source'] = 'nfc',
):
  | {
      state: AppState
      kind: 'in' | 'out'
      client: Client
      sessionId?: string
      membershipExpired?: boolean
    }
  | {
      error: 'unknown_chip' | 'empty' | 'session_open'
      session?: GymSession
      client?: Client
    } {
  const raw = rawUid.trim()
  if (!raw) return { error: 'empty' }
  const client = findClientByNfcUid(state, raw)
  if (!client) return { error: 'unknown_chip' }
  const res = toggleGymCheckIn(state, client.id, source)
  if (!res) return { error: 'unknown_chip' }
  if ('error' in res) {
    return { error: 'session_open', session: res.session, client: res.client }
  }
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

export function addCashier(
  state: AppState,
  input: Omit<Cashier, 'id' | 'createdAt' | 'active'> & { active?: boolean },
): AppState {
  const pin = String(input.pin).replace(/\D/g, '').slice(0, 4).padStart(4, '0')
  const clash =
    state.drivers.some((d) => d.active !== false && d.pin === pin) ||
    (state.cashiers || []).some((c) => c.active !== false && c.pin === pin)
  if (clash) return state
  const cashier: Cashier = {
    id: uid('ca'),
    name: input.name.trim(),
    phone: input.phone.trim(),
    pin,
    active: input.active !== false,
    createdAt: new Date().toISOString(),
  }
  return { ...state, cashiers: [cashier, ...(state.cashiers || [])] }
}

export function updateCashier(
  state: AppState,
  id: string,
  patch: Partial<Omit<Cashier, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    cashiers: (state.cashiers || []).map((c) =>
      c.id === id ? { ...c, ...patch } : c,
    ),
  }
}

export function deleteCashier(state: AppState, id: string): AppState {
  return {
    ...state,
    cashiers: (state.cashiers || []).filter((c) => c.id !== id),
    team:
      state.team.currentCashierId === id
        ? { ...state.team, currentCashierId: null }
        : state.team,
  }
}

function migrateSellers(raw: PosSeller[] | undefined): PosSeller[] {
  const list = Array.isArray(raw) ? raw : []
  const mapped = list
    .filter((s) => s && typeof s.name === 'string' && s.name.trim())
    .map((s) => {
      const role = (s.role === 'admin' ? 'admin' : 'vendeur') as PosSellerRole
      const permissions =
        role === 'admin'
          ? undefined
          : migrateSellerPermissions({
              ...s,
              role,
              canGrantFreeMinutes: s.canGrantFreeMinutes === true,
            })
      return {
        id: s.id || uid('sel'),
        name: s.name.trim(),
        role,
        pin: String(s.pin || '').replace(/\D/g, '').slice(0, 6),
        active: s.active !== false,
        createdAt: s.createdAt || new Date().toISOString(),
        canGrantFreeMinutes:
          role === 'vendeur' &&
          (s.canGrantFreeMinutes === true ||
            permissions?.gameFreeMinutes === true),
        permissions,
      }
    })
  return mapped.length > 0 ? mapped : defaultSellers()
}

function migrateGameFreeMinutes(
  raw: GameFreeMinuteEntry[] | undefined,
): GameFreeMinuteEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e) => e && typeof e.stationId === 'string' && e.minutes > 0)
    .slice(0, 500)
    .map((e) => ({
      id: e.id || uid('gfm'),
      stationId: e.stationId,
      stationName: typeof e.stationName === 'string' ? e.stationName : '',
      consoleKind: normalizeConsoleKind(e.consoleKind),
      mode:
        e.mode === 'match' || e.mode === 'match4' || e.mode === 'extra'
          ? e.mode
          : ('hour' as const),
      minutes: Math.round(e.minutes),
      sellerId: typeof e.sellerId === 'string' ? e.sellerId : undefined,
      sellerName: typeof e.sellerName === 'string' ? e.sellerName : undefined,
      clientLabel: typeof e.clientLabel === 'string' ? e.clientLabel : undefined,
      createdAt: e.createdAt || new Date().toISOString(),
      note: typeof e.note === 'string' ? e.note : undefined,
    }))
}

export function currentSeller(state: AppState): PosSeller | undefined {
  const id = state.settings.currentSellerId
  const list = (state.sellers || []).filter((s) => s.active !== false)
  if (id) {
    const found = list.find((s) => s.id === id)
    if (found) return found
  }
  return list.find((s) => s.role === 'admin') || list[0]
}

export function setCurrentSeller(state: AppState, sellerId: string): AppState {
  const s = (state.sellers || []).find((x) => x.id === sellerId && x.active !== false)
  if (!s) return state
  return updateSettings(state, { currentSellerId: sellerId })
}

export function addSeller(
  state: AppState,
  input: { name: string; role?: PosSellerRole; pin?: string },
): AppState {
  const name = input.name.trim()
  if (!name) return state
  const pin = String(input.pin || '').replace(/\D/g, '').slice(0, 6)
  const role: PosSellerRole = input.role === 'admin' ? 'admin' : 'vendeur'
  const seller: PosSeller = {
    id: uid('sel'),
    name,
    role,
    pin,
    active: true,
    createdAt: new Date().toISOString(),
    permissions:
      role === 'vendeur' ? { ...DEFAULT_VENDEUR_PERMISSIONS } : undefined,
  }
  return { ...state, sellers: [...(state.sellers || []), seller] }
}

export function updateSeller(
  state: AppState,
  id: string,
  patch: Partial<Omit<PosSeller, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    sellers: (state.sellers || []).map((s) => {
      if (s.id !== id) return s
      const role =
        patch.role === 'admin' || patch.role === 'vendeur' ? patch.role : s.role
      let permissions = s.permissions
      if (role === 'admin') {
        permissions = undefined
      } else if (patch.permissions !== undefined) {
        permissions = {
          ...DEFAULT_VENDEUR_PERMISSIONS,
          ...s.permissions,
          ...patch.permissions,
        }
      } else if (!permissions) {
        permissions = { ...DEFAULT_VENDEUR_PERMISSIONS }
      }
      const freeFromPerm = permissions?.gameFreeMinutes === true
      const canGrantFreeMinutes =
        patch.canGrantFreeMinutes !== undefined
          ? patch.canGrantFreeMinutes === true
          : patch.permissions?.gameFreeMinutes !== undefined
            ? freeFromPerm
            : s.canGrantFreeMinutes === true || freeFromPerm
      if (
        role === 'vendeur' &&
        permissions &&
        canGrantFreeMinutes !== permissions.gameFreeMinutes
      ) {
        permissions = { ...permissions, gameFreeMinutes: canGrantFreeMinutes }
      }
      return {
        ...s,
        ...patch,
        name: patch.name !== undefined ? patch.name.trim() || s.name : s.name,
        pin:
          patch.pin !== undefined
            ? String(patch.pin).replace(/\D/g, '').slice(0, 6)
            : s.pin,
        role,
        permissions,
        canGrantFreeMinutes: role === 'vendeur' ? canGrantFreeMinutes : undefined,
      }
    }),
  }
}

export function deleteSeller(state: AppState, id: string): AppState {
  const list = state.sellers || []
  if (list.length <= 1) return state
  const next = list.filter((s) => s.id !== id)
  const cur = state.settings.currentSellerId
  return {
    ...state,
    sellers: next,
    settings: {
      ...state.settings,
      currentSellerId: cur === id ? next[0]?.id : cur,
    },
  }
}

export function verifyAdminPin(state: AppState, pin: string): boolean {
  const expected = state.settings.adminPin
  if (!expected) {
    return pin.trim() === '1234'
  }
  return pin.trim() === expected
}

export function addGameStation(state: AppState, name?: string): AppState {
  const stations = state.gameStations ?? []
  if (stations.length >= MAX_GAME_STATIONS) return state
  const number =
    stations.reduce((m, g) => Math.max(m, g.number), 0) + 1 || stations.length + 1
  const station: GameStation = {
    id: uid('gs'),
    name: (name || '').trim() || `Poste ${number}`,
    number,
    status: 'free',
    consoleKind: 'ps4',
    tvKind: 'google_tv',
  }
  return { ...state, gameStations: [...stations, station] }
}

export function removeGameStation(state: AppState, id: string): AppState {
  const st = (state.gameStations ?? []).find((g) => g.id === id)
  if (!st) return state
  if (st.status === 'active') return state
  return {
    ...state,
    gameStations: (state.gameStations ?? []).filter((g) => g.id !== id),
  }
}

/** Fixe le nombre de postes (ajoute ou retire les libres en fin de liste). */
export function setGameStationCount(state: AppState, count: number): AppState {
  const target = Math.max(1, Math.min(MAX_GAME_STATIONS, Math.round(count)))
  let next = ensureGameStations(state, Math.min(target, DEFAULT_GAME_STATION_COUNT))
  let stations = [...(next.gameStations ?? [])]
  while (stations.length < target) {
    next = addGameStation(next)
    stations = [...(next.gameStations ?? [])]
  }
  while (stations.length > target) {
    const removable = [...stations].reverse().find((g) => g.status !== 'active')
    if (!removable) break
    next = removeGameStation(next, removable.id)
    stations = [...(next.gameStations ?? [])]
  }
  return next
}

const CONSOLE_IDS: GameConsoleKind[] = [
  'xbox_one',
  'ps4',
  'ps4_pro',
  'ps5',
  'xbox_360',
  'xbox_series_s',
]

export function normalizeConsoleKind(raw: unknown): GameConsoleKind {
  if (typeof raw === 'string' && (CONSOLE_IDS as string[]).includes(raw)) {
    return raw as GameConsoleKind
  }
  return 'ps4'
}

export function consoleLabelOf(kind: GameConsoleKind): string {
  return (
    DEFAULT_GAME_CONSOLES.find((c) => c.id === kind)?.label ||
    kind.toUpperCase()
  )
}

export function migrateGameTariffs(
  raw: GameTariffs | undefined,
  legacyPerMin?: number,
): GameTariffs {
  const matchMinutes =
    raw && typeof raw.matchMinutes === 'number' && raw.matchMinutes > 0
      ? Math.round(raw.matchMinutes)
      : DEFAULT_GAME_TARIFFS.matchMinutes
  const extraRoundMinutes =
    raw && typeof raw.extraRoundMinutes === 'number' && raw.extraRoundMinutes > 0
      ? Math.round(raw.extraRoundMinutes)
      : DEFAULT_GAME_TARIFFS.extraRoundMinutes

  const byId = new Map<GameConsoleKind, GameConsoleTariff>()
  for (const c of DEFAULT_GAME_CONSOLES) {
    byId.set(c.id, { ...c })
  }

  // Ancien format plat PS4/PS5
  if (raw && typeof raw === 'object') {
    if (typeof raw.ps4HourDa === 'number' && raw.ps4HourDa >= 0) {
      const row = byId.get('ps4')!
      row.hourDa = +raw.ps4HourDa.toFixed(2)
    }
    if (typeof raw.ps5HourDa === 'number' && raw.ps5HourDa >= 0) {
      const row = byId.get('ps5')!
      row.hourDa = +raw.ps5HourDa.toFixed(2)
    }
    if (typeof raw.ps4MatchDa === 'number' && raw.ps4MatchDa >= 0) {
      const row = byId.get('ps4')!
      row.matchDa = +raw.ps4MatchDa.toFixed(2)
    }
    if (typeof raw.ps5MatchDa === 'number' && raw.ps5MatchDa >= 0) {
      const row = byId.get('ps5')!
      row.matchDa = +raw.ps5MatchDa.toFixed(2)
    }
    if (Array.isArray(raw.consoles)) {
      for (const item of raw.consoles) {
        if (!item || typeof item !== 'object') continue
        const id = normalizeConsoleKind((item as GameConsoleTariff).id)
        const prev = byId.get(id) || {
          id,
          label: consoleLabelOf(id),
          hourDa: 0,
          matchDa: 0,
          match4Da: 0,
          extraRoundDa: 0,
        }
        const hour =
          typeof (item as GameConsoleTariff).hourDa === 'number' &&
          (item as GameConsoleTariff).hourDa >= 0
            ? +(item as GameConsoleTariff).hourDa.toFixed(2)
            : prev.hourDa
        const match =
          typeof (item as GameConsoleTariff).matchDa === 'number' &&
          (item as GameConsoleTariff).matchDa >= 0
            ? +(item as GameConsoleTariff).matchDa.toFixed(2)
            : prev.matchDa
        const match4Raw = (item as GameConsoleTariff).match4Da
        const match4 =
          typeof match4Raw === 'number' && match4Raw >= 0
            ? +match4Raw.toFixed(2)
            : typeof prev.match4Da === 'number' && prev.match4Da >= 0
              ? prev.match4Da
              : match > 0
                ? +(match * 2).toFixed(2)
                : 0
        const extra =
          typeof (item as GameConsoleTariff).extraRoundDa === 'number' &&
          (item as GameConsoleTariff).extraRoundDa >= 0
            ? +(item as GameConsoleTariff).extraRoundDa.toFixed(2)
            : prev.extraRoundDa
        const label =
          typeof (item as GameConsoleTariff).label === 'string' &&
          (item as GameConsoleTariff).label.trim()
            ? (item as GameConsoleTariff).label.trim()
            : prev.label
        byId.set(id, {
          id,
          label,
          hourDa: hour,
          matchDa: match,
          match4Da: match4,
          extraRoundDa: extra,
        })
      }
    }
  } else if (typeof legacyPerMin === 'number' && legacyPerMin > 0) {
    const ps4 = byId.get('ps4')!
    ps4.hourDa = +(legacyPerMin * 60).toFixed(2)
    const ps5 = byId.get('ps5')!
    ps5.hourDa = +(legacyPerMin * 60 * 1.25).toFixed(2)
  }

  // Garantit match4 = 2× match si non renseigné
  for (const [id, row] of byId) {
    if (row.matchDa > 0 && !(typeof row.match4Da === 'number' && row.match4Da > 0)) {
      byId.set(id, { ...row, match4Da: +(row.matchDa * 2).toFixed(2) })
    }
  }

  const consoles = CONSOLE_IDS.map((id) => byId.get(id)!).filter(Boolean)

  return { matchMinutes, extraRoundMinutes, consoles }
}

export function resolveGameTariffs(state: AppState): GameTariffs {
  return migrateGameTariffs(
    state.settings.gameTariffs,
    state.settings.gamePricePerMinuteDa,
  )
}

export function tariffForConsole(
  state: AppState,
  consoleKind: GameConsoleKind,
): GameConsoleTariff {
  const t = resolveGameTariffs(state)
  return (
    t.consoles.find((c) => c.id === consoleKind) ||
    DEFAULT_GAME_CONSOLES.find((c) => c.id === consoleKind) ||
    DEFAULT_GAME_CONSOLES[1]
  )
}

export function stationConsole(station: GameStation | undefined): GameConsoleKind {
  return normalizeConsoleKind(station?.consoleKind)
}

export function stationMatchMinutes(
  state: AppState,
  station: GameStation | undefined,
): number {
  const tariffs = resolveGameTariffs(state)
  if (station && typeof station.matchMinutes === 'number' && station.matchMinutes > 0) {
    return Math.round(station.matchMinutes)
  }
  return tariffs.matchMinutes
}

export function stationExtraRoundMinutes(
  state: AppState,
): number {
  const tariffs = resolveGameTariffs(state)
  return Math.max(1, tariffs.extraRoundMinutes || DEFAULT_GAME_TARIFFS.extraRoundMinutes)
}

export function hourRateDa(state: AppState, consoleKind: GameConsoleKind): number {
  return tariffForConsole(state, consoleKind).hourDa
}

export function matchRateDa(state: AppState, consoleKind: GameConsoleKind): number {
  return tariffForConsole(state, consoleKind).matchDa
}

/** Match 4 joueurs = double du match normal (sauf tarif admin explicite). */
export function match4RateDa(state: AppState, consoleKind: GameConsoleKind): number {
  const row = tariffForConsole(state, consoleKind)
  if (typeof row.match4Da === 'number' && row.match4Da > 0) {
    return row.match4Da
  }
  if (row.matchDa > 0) return +(row.matchDa * 2).toFixed(2)
  return 0
}

export function extraRoundRateDa(
  state: AppState,
  consoleKind: GameConsoleKind,
): number {
  return tariffForConsole(state, consoleKind).extraRoundDa
}

/** @deprecated — dérivé du tarif heure PS4 / 60 */
export function gamePricePerMinute(state: AppState): number {
  return +(hourRateDa(state, 'ps4') / 60).toFixed(2)
}

export type GameBillMode = 'hour' | 'match' | 'match4' | 'extra'

/** Encaisser heure, match, match 4J ou شوط إضافي → timer + caisse. */
export function billGameSession(
  state: AppState,
  input: {
    stationId: string
    mode: GameBillMode
    /** Minutes (mode heure) — ex. 15, 30, 60 */
    minutes?: number
    /** Nombre de matchs / ashawt (mode match | extra) */
    matches?: number
    /** Durée override (min) pour match / extra */
    matchMinutes?: number
    clientLabel?: string
    /** Encaisser en caisse (défaut true) */
    billCash?: boolean
  },
): { state: AppState; totalDa: number; minutes: number; label: string } {
  const station = state.gameStations.find((g) => g.id === input.stationId)
  const consoleKind = stationConsole(station)
  const consoleLabel = tariffForConsole(state, consoleKind).label
  const billCash = input.billCash !== false
  const matchPrice = matchRateDa(state, consoleKind)
  const match4Price = match4RateDa(state, consoleKind)
  const extraPrice = extraRoundRateDa(state, consoleKind)

  let minutes = 0
  let totalDa = 0
  let label = ''

  if (input.mode === 'extra') {
    const count = Math.max(1, Math.round(input.matches || 1))
    const extraMin =
      input.matchMinutes && input.matchMinutes > 0
        ? Math.round(input.matchMinutes)
        : stationExtraRoundMinutes(state)
    minutes = extraMin * count
    totalDa = +(Math.max(0, extraPrice) * count).toFixed(2)
    label = station
      ? `${station.name} ${consoleLabel} · Prolongation 2 manches (${extraMin} min)`
      : `${consoleLabel} · Prolongation 2 manches`
  } else if (input.mode === 'match4') {
    const matchCount = Math.max(1, Math.round(input.matches || 1))
    const matchMin =
      input.matchMinutes && input.matchMinutes > 0
        ? Math.round(input.matchMinutes)
        : stationMatchMinutes(state, station)
    minutes = matchMin * matchCount
    const unit =
      match4Price > 0
        ? match4Price
        : matchPrice > 0
          ? +(matchPrice * 2).toFixed(2)
          : +(((hourRateDa(state, consoleKind) * matchMin) / 60) * 2).toFixed(2)
    totalDa = +(unit * matchCount).toFixed(2)
    label = station
      ? `${station.name} ${consoleLabel} · ${matchCount} match 4J (${matchMin} min)`
      : `${consoleLabel} · ${matchCount} match 4J`
  } else if (input.mode === 'match') {
    if (matchPrice <= 0) {
      const matchMin =
        input.matchMinutes && input.matchMinutes > 0
          ? Math.round(input.matchMinutes)
          : stationMatchMinutes(state, station)
      minutes = matchMin
      totalDa = +((hourRateDa(state, consoleKind) * minutes) / 60).toFixed(2)
      label = station
        ? `${station.name} ${consoleLabel} · ${minutes} min`
        : `${consoleLabel} · ${minutes} min`
    } else {
      const matchCount = Math.max(1, Math.round(input.matches || 1))
      const matchMin =
        input.matchMinutes && input.matchMinutes > 0
          ? Math.round(input.matchMinutes)
          : stationMatchMinutes(state, station)
      minutes = matchMin * matchCount
      totalDa = +(matchPrice * matchCount).toFixed(2)
      label = station
        ? `${station.name} ${consoleLabel} · ${matchCount} match (${matchMin} min)`
        : `${consoleLabel} · ${matchCount} match`
    }
  } else {
    minutes = Math.max(1, Math.round(input.minutes || 60))
    const hourPrice = hourRateDa(state, consoleKind)
    totalDa = +((hourPrice * minutes) / 60).toFixed(2)
    label = station
      ? `${station.name} ${consoleLabel} · ${minutes} min`
      : `${consoleLabel} · ${minutes} min`
  }

  let next = addGameStationTime(
    state,
    input.stationId,
    minutes,
    input.clientLabel,
  )

  if (
    (input.mode === 'match' || input.mode === 'match4') &&
    input.matchMinutes &&
    input.matchMinutes > 0
  ) {
    next = updateGameStation(next, input.stationId, {
      matchMinutes: Math.round(input.matchMinutes),
    })
  }

  if (!billCash || totalDa <= 0) {
    return { state: next, totalDa, minutes, label }
  }

  const st = next.gameStations.find((g) => g.id === input.stationId)
  const tabLine: GameStationTabLine = {
    id: uid('gstab'),
    kind: 'game',
    productId: `flash_game_${input.mode}_${consoleKind}`,
    name: label,
    qty: 1,
    unitPriceDa: totalDa,
    unit: 'piece',
    flash: true,
  }
  next = appendStationTabLine(next, input.stationId, tabLine)
  if (input.clientLabel?.trim() && st && !st.clientLabel) {
    next = updateGameStation(next, input.stationId, {
      clientLabel: input.clientLabel.trim(),
    })
  }
  return { state: next, totalDa, minutes, label }
}

/** Admin toujours ; vendeur seulement si autorisé. */
export function sellerCanGrantFreeMinutes(state: AppState): boolean {
  return sellerCan(state, 'gameFreeMinutes')
}

export function gameFreeMaxMinutes(state: AppState): number {
  const n = state.settings.gameFreeMaxMinutes
  if (typeof n === 'number' && n >= 1) return Math.min(180, Math.round(n))
  return 30
}

/**
 * Ajoute du temps gratuit (heure / match / match 4J / prolongation).
 * Enregistre une ligne « minute gratuite » — 0 DA en caisse.
 */
export function grantGameFreeMinutes(
  state: AppState,
  input: {
    stationId: string
    mode: GameBillMode
    minutes?: number
    matches?: number
    matchMinutes?: number
    clientLabel?: string
  },
): {
  state: AppState
  minutes: number
  label: string
  ok: boolean
  reason?: 'denied' | 'bad' | 'cap'
} {
  if (!sellerCanGrantFreeMinutes(state)) {
    return { state, minutes: 0, label: '', ok: false, reason: 'denied' }
  }

  const station = state.gameStations.find((g) => g.id === input.stationId)
  if (!station) {
    return { state, minutes: 0, label: '', ok: false, reason: 'bad' }
  }

  const consoleKind = stationConsole(station)
  const consoleLabel = tariffForConsole(state, consoleKind).label
  const matchPrice = matchRateDa(state, consoleKind)
  const match4Price = match4RateDa(state, consoleKind)
  const extraPrice = extraRoundRateDa(state, consoleKind)
  const cap = gameFreeMaxMinutes(state)

  let minutes = 0
  let label = ''

  if (input.mode === 'extra') {
    if (extraPrice <= 0 && !input.matchMinutes) {
      return { state, minutes: 0, label: '', ok: false, reason: 'bad' }
    }
    const count = Math.max(1, Math.round(input.matches || 1))
    const extraMin =
      input.matchMinutes && input.matchMinutes > 0
        ? Math.round(input.matchMinutes)
        : stationExtraRoundMinutes(state)
    minutes = extraMin * count
    label = `${station.name} ${consoleLabel} · Prolongation gratuite (${extraMin} min)`
  } else if (input.mode === 'match4') {
    const matchCount = Math.max(1, Math.round(input.matches || 1))
    const matchMin =
      input.matchMinutes && input.matchMinutes > 0
        ? Math.round(input.matchMinutes)
        : stationMatchMinutes(state, station)
    if (match4Price <= 0 && matchPrice <= 0 && matchMin < 1) {
      return { state, minutes: 0, label: '', ok: false, reason: 'bad' }
    }
    minutes = matchMin * matchCount
    label = `${station.name} ${consoleLabel} · Match 4J gratuit (${matchMin} min)`
  } else if (input.mode === 'match') {
    const matchCount = Math.max(1, Math.round(input.matches || 1))
    const matchMin =
      input.matchMinutes && input.matchMinutes > 0
        ? Math.round(input.matchMinutes)
        : stationMatchMinutes(state, station)
    if (matchPrice <= 0 && matchMin < 1) {
      return { state, minutes: 0, label: '', ok: false, reason: 'bad' }
    }
    minutes = matchMin * matchCount
    label = `${station.name} ${consoleLabel} · Match gratuit (${matchMin} min)`
  } else {
    minutes = Math.max(1, Math.round(input.minutes || 5))
    if (minutes > cap) {
      return { state, minutes: 0, label: '', ok: false, reason: 'cap' }
    }
    label = `${station.name} ${consoleLabel} · ${minutes} min gratuites`
  }

  if (minutes < 1) {
    return { state, minutes: 0, label: '', ok: false, reason: 'bad' }
  }

  let next = addGameStationTime(state, input.stationId, minutes, input.clientLabel, {
    free: true,
  })

  const seller = currentSeller(next)
  const entry: GameFreeMinuteEntry = {
    id: uid('gfm'),
    stationId: station.id,
    stationName: station.name,
    consoleKind,
    mode: input.mode,
    minutes,
    sellerId: seller?.id,
    sellerName: seller?.name,
    clientLabel: input.clientLabel?.trim() || station.clientLabel,
    createdAt: new Date().toISOString(),
    note: label,
  }
  next = {
    ...next,
    gameFreeMinutes: [entry, ...(next.gameFreeMinutes ?? [])].slice(0, 500),
  }

  return { state: next, minutes, label, ok: true }
}

/** @deprecated utiliser billGameSession */
export function billGameMinutes(
  state: AppState,
  input: {
    stationId: string
    minutes: number
    clientLabel?: string
  },
): AppState {
  return billGameSession(state, {
    stationId: input.stationId,
    mode: 'hour',
    minutes: input.minutes,
    clientLabel: input.clientLabel,
  }).state
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

export function mergeCloudCashiers(
  state: AppState,
  incoming: Cashier[],
): AppState {
  const local = state.cashiers || []
  if (state.team.role === 'owner' && local.length > 0) {
    const map = new Map(incoming.map((c) => [c.id, c]))
    for (const c of local) map.set(c.id, c)
    return { ...state, cashiers: [...map.values()] }
  }
  const map = new Map(local.map((c) => [c.id, c]))
  for (const c of incoming) map.set(c.id, c)
  return { ...state, cashiers: [...map.values()] }
}

function stampOf(row: { updatedAt?: string; createdAt?: string }): string {
  return row.updatedAt || row.createdAt || ''
}

export function mergeCloudProducts(
  state: AppState,
  incoming: Product[],
): AppState {
  const map = new Map(state.products.map((p) => [p.id, p]))
  for (const p of incoming) {
    if (!p?.id) continue
    const prev = map.get(p.id)
    if (!prev) {
      map.set(p.id, p)
      continue
    }
    const iStamp = stampOf(p)
    const cStamp = stampOf(prev)
    if (iStamp > cStamp) {
      map.set(p.id, {
        ...prev,
        ...p,
        // garder image locale si cloud lean n’en a pas
        imageDataUrl: p.imageDataUrl || prev.imageDataUrl,
        costDa:
          typeof p.costDa === 'number' ? p.costDa : prev.costDa,
      })
    } else if (iStamp < cStamp) {
      map.set(p.id, prev)
    } else {
      const locs = new Set([
        ...Object.keys(prev.stockByLocation || {}),
        ...Object.keys(p.stockByLocation || {}),
      ])
      const locMap: Record<string, number> = {}
      for (const loc of locs) {
        const a = prev.stockByLocation?.[loc]
        const b = p.stockByLocation?.[loc]
        if (typeof a === 'number' && typeof b === 'number') locMap[loc] = Math.min(a, b)
        else if (typeof a === 'number') locMap[loc] = a
        else if (typeof b === 'number') locMap[loc] = b
      }
      const sum = Object.values(locMap).reduce((s, n) => s + n, 0)
      map.set(p.id, {
        ...prev,
        ...p,
        imageDataUrl: p.imageDataUrl || prev.imageDataUrl,
        costDa: typeof p.costDa === 'number' ? p.costDa : prev.costDa,
        stockByLocation: locMap,
        stock: +sum.toFixed(3),
      })
    }
  }
  return { ...state, products: [...map.values()] }
}

export function mergeCloudClients(
  state: AppState,
  incoming: Client[],
): AppState {
  const map = new Map(state.clients.map((c) => [c.id, c]))
  for (const c of incoming) {
    if (!c?.id) continue
    const prev = map.get(c.id)
    if (!prev) {
      map.set(c.id, c)
      continue
    }
    const newer = stampOf(c) >= stampOf(prev) ? c : prev
    const older = newer === c ? prev : c
    map.set(c.id, { ...older, ...newer })
  }
  return { ...state, clients: [...map.values()] }
}

export function mergeCloudOrders(state: AppState, incoming: Order[]): AppState {
  const map = new Map(state.orders.map((o) => [o.id, o]))
  for (const o of incoming) {
    if (!o?.id) continue
    const prev = map.get(o.id)
    if (!prev) {
      map.set(o.id, o)
      continue
    }
    map.set(o.id, {
      ...prev,
      ...o,
      paidDa: Math.max(prev.paidDa || 0, o.paidDa || 0),
      remainingDa: Math.min(
        prev.remainingDa ?? o.remainingDa ?? 0,
        o.remainingDa ?? prev.remainingDa ?? 0,
      ),
    })
  }
  return {
    ...state,
    orders: [...map.values()].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || ''),
    ),
  }
}

export function mergeCloudCashEntries(
  state: AppState,
  incoming: CashEntry[],
): AppState {
  const map = new Map((state.cashEntries || []).map((e) => [e.id, e]))
  for (const e of incoming) {
    if (!e?.id) continue
    const prev = map.get(e.id)
    if (!prev) {
      map.set(e.id, e)
      continue
    }
    map.set(e.id, {
      ...prev,
      ...e,
      amountDa: Math.max(prev.amountDa || 0, e.amountDa || 0),
    })
  }
  return {
    ...state,
    cashEntries: [...map.values()].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || ''),
    ),
  }
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
