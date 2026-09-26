import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppState,
  CommerceMode,
  Client,
  ExpenseCategory,
  Language,
  Order,
  OrderLine,
  PriceTier,
  Product,
  ProductCategory,
  Screen,
  ThemePreset,
  FontScale,
  Unit,
  ClinicStation,
  FlashSaleLine,
  TeamRole,
} from './types'
import { EXPENSE_CATEGORIES } from './types'
import { unitsForMetier } from './locale/unitsCatalog'
import { DesktopChrome } from './DesktopChrome'
import { DesktopRailsSettings } from './DesktopRailsSettings'
import {
  addClient,
  addClientsBulk,
  addExpense,
  addIncomingOrder,
  addProduct,
  addZakatRecord,
  createOrder,
  deleteClient,
  deleteExpense,
  deleteProduct,
  expensesByCategory,
  expensesInMonth,
  expensesOnDate,
  annualNetProfitDa,
  loadState,
  lowStockProducts,
  markInvoiceSent,
  markOrderWhatsappSent,
  markZakatPaid,
  openCreditsDa,
  clientCreditDa,
  todayCashDa,
  pendingIncoming,
  realizedProfitDa,
  saveState,
  stockCostDa,
  stockMarginDa,
  stockValueDa,
  sumExpensesDa,
  todayOrders,
  updateClient,
  updateIncomingOrder,
  updateProduct,
  updateSettings,
  applyShopSetup,
  ensureGameStations,
  applyClientPayment,
  setClientDisplayedBalance,
  buildPaymentFields,
  profitInRange,
  rangePresets,
  updateTeam,
  ensureCompanyCode,
  dueDateFromDays,
  overdueCreditOrders,
  dueSoonCreditOrders,
  clientOpenCreditOrders,
  formatDueDateLabel,
  daysUntilDue,
  orderRemainingDa,
  displayStock,
  stockAt,
  activeLocationId,
  activeLocation,
  addLocation,
  updateLocation,
  deleteLocation,
  setActiveLocation,
  setMultiLocationEnabled,
  transferStock,
  holdSale,
  removeHeldSale,
  setClinicStation,
  setTableStatus,
  closeGymSession,
  ensureGymSessionHeld,
  relinkGymSessionHeld,
  uid,
} from './store'
import {
  sellerCan,
  sellerCanAccessScreen,
} from './sellerPermissions'
import { isDecimalUnit, qtyStep, t, unitLabel } from './i18n'
import { mt } from './locale/modeCopy'
import { formatDa, formatQty, setActiveCurrency, setActiveLocale } from './utils/format'
import { productDisplaySrc } from './utils/productArt'
import { SetupWizard } from './SetupWizard'
import { countryByCode } from './data/countries'
import { domainById, domainName, modeLabel } from './data/domains'
import { CityField, DzPhoneInput, WilayaSelect } from './DzFields'
import {
  defaultLang,
  htmlLang,
  isRtl,
  langInCountry,
  LANG_SHORT,
  nextSuggestedLang,
} from './locale/langs'
import {
  cashChipsFor,
  cityLabel,
  countryDisplayName,
  isShopRetail,
  isWholesale,
  numberLocale,
  preferClientOnSale,
  shopVocab,
  showDemiGros,
  showDelivery,
  showDepotTools,
  showGallery,
  showGymCheckin,
  showClinicAgenda,
  showHomeScan,
  showTableService,
  showGameStations,
  showRepairOrder,
  showProduction,
  showMedicalDossier,
  showReturns,
  showStaffHr,
  showWholesaleTiers,
} from './locale/adapt'
import { metierCopy, metierPackFor } from './locale/metierPacks'
import { specialtyProfileFor } from './locale/specialtyParams'
import {
  defaultCategoryForAisle,
  retailChipRayons,
  resolveRetailRayons,
  rayonLabel,
  showImeiTracking,
  showOemRef,
  showRetailVariants,
} from './locale/retailRayons'
import { LanguagePicker } from './locale/LanguagePicker'
import { getCachedSeatLimit, getCachedPlanId, isProPlan } from './license/license'
import { applyEffectiveTheme, applyUiTheme, themeLabel, THEME_PRESETS } from './utils/theme'
import {
  DEFAULT_AGENT_PERMISSIONS,
  type AgentPermissions,
} from './agent/permissions'
import { openWhatsapp, openWhatsappText, openSupportWhatsapp } from './utils/whatsapp'
import {
  buildProductStory,
  buildProductWhatsappPromo,
} from './marketing/merchantPromo'
import { compressImageFile } from './utils/image'
import { amountFromQtyDa, availableTiers, costForTier, isCartonTier, maxQtyForTier, priceForTier, qtyFromAmountDa, sellUnitForTier } from './utils/pricing'
import {
  normalizePackOptions,
  packSizeLabel,
  priceForPackSize,
  sellablePackOptions,
} from './utils/packSize'
import { parseQtyInput } from './utils/qtyInput'
import {
  clientMapsUrl,
  getCurrentPosition,
  mapsEmbedUrl,
  parseMapsCoords,
} from './utils/maps'
import {
  getPreferBluetoothPrinter,
  printTicketBluetooth,
  setPreferBluetoothPrinter,
} from './utils/ticket'
import { buildInvoiceText, openInvoiceWhatsapp } from './utils/invoice'
import {
  registerMuteAskHandler,
  speak,
  stopSpeaking,
} from './utils/speak'
import { notifyDueAlerts, notifyStockRuptures } from './utils/notify'
import {
  installUiClickSounds,
  playBarcodeError,
  playBarcodeOk,
  setUiSoundsEnabled,
} from './utils/sfx'
import {
  ArrivagesPage,
  enableStockAlerts,
  importPhoneContacts,
  importPastedContacts,
  InboxPage,
  StockAlertCard,
  DueAlertCard,
} from './ExtraScreens'
import { CashierPinGate, OptionalToolPage } from './OptionalTools'
import {
  OPTIONAL_TOOLS,
  toolsForMetier,
  OPTIONAL_TOOL_SCREENS,
  PAYMENT_METHODS,
  isCashierUnlocked,
  isToolEnabled,
  paymentMethodEmoji,
  paymentMethodLabel,
  toolLabel,
  type OptionalToolId,
  type PaymentMethod,
} from './data/optionalTools'
import { CalculatorPage } from './CalculatorPage'
import { DeliveryMapPage } from './DeliveryMapPage'
import { MissionsPage } from './MissionsPage'
import { CashierHome } from './CashierHome'
import { AgentPage } from './AgentPage'
import { DigitalCockpitPage } from './DigitalCockpitPage'
import { GlobalSmartSearch, SmartSearchBar, suggestNames } from './SmartSearchBar'
import type { SearchHit } from './utils/smartSearch'
import {
  buildActivityLog,
  filterActivity,
  type ActivityKind,
} from './utils/activityLog'
import {
  CashSessionPage,
  PurchasesPage,
  ReturnsPage,
  BarcodeScanInput,
  bumpProductFromBarcode,
} from './PosOps'
import { ProductBarcodeField, BarcodeCameraModal, isBarcodeCameraSupported } from './BarcodeCamera'
import { useOffBarcodeAutofill } from './utils/useOffBarcodeAutofill'
import type { OffLookupHit } from './utils/offLookup'
import { ClientQrCard } from './ClientQrCard'
import { DossierPatientPanel } from './DossierPatientPanel'
import { AthleteDossierPanel } from './AthleteDossierPanel'
import { SpecialtyDossierPanel } from './SpecialtyDossierPanel'
import { ReceptionCashQueue, SendToCashForm } from './ClinicSharePanels'
import { GymCheckinPanel } from './GymCheckinPanel'
import { ClinicAgendaPanel } from './ClinicAgendaPanel'
import { TableFloorPanel } from './TableFloorPanel'
import { GameStationsPanel } from './GameStationsPanel'
import {
  GamePriceAdminCard,
  SellerSwitcherBar,
  SellersPanel,
} from './SellersPanel'
import { RepairOrderPanel } from './RepairOrderPanel'
import { ProductionPage } from './ProductionPage'
import { StaffPanel } from './StaffPanel'
import { ExpertComptableCard } from './ExpertComptableCard'
import { OrderRevisePanel } from './OrderRevisePanel'
import { MigrationImportCard } from './MigrationImportCard'
import { classifyHomeScan } from './utils/clientQr'
import { APP_BRAND } from './brand'
import { APP_VERSION, activateLicense, getAccessStatus } from './license/license'

function clinicStationOf(state: {
  settings: {
    commerceMode: string
    clinicShareEnabled?: boolean
    clinicStation?: ClinicStation
  }
}): ClinicStation | null {
  if (state.settings.commerceMode !== 'sante' || !state.settings.clinicShareEnabled) {
    return null
  }
  return state.settings.clinicStation === 'reception' ? 'reception' : 'doctor'
}

function navItems(
  mode: CommerceMode | undefined,
  station: ClinicStation | null,
): Array<{ id: Screen; icon: string }> {
  if (mode === 'sante') {
    if (station === 'doctor') {
      return [
        { id: 'home', icon: '🏠' },
        { id: 'clients', icon: '👤' },
        { id: 'products', icon: '📦' },
        { id: 'history', icon: '📜' },
      ]
    }
    if (station === 'reception') {
      return [
        { id: 'home', icon: '🏠' },
        { id: 'order', icon: '💵' },
        { id: 'products', icon: '📦' },
        { id: 'clients', icon: '👤' },
      ]
    }
    return [
      { id: 'home', icon: '🏠' },
      { id: 'order', icon: '🩺' },
      { id: 'clients', icon: '👤' },
      { id: 'products', icon: '📦' },
    ]
  }
  if (mode === 'auto') {
    return [
      { id: 'home', icon: '🏠' },
      { id: 'order', icon: '🚗' },
      { id: 'products', icon: '📦' },
      { id: 'clients', icon: '👥' },
    ]
  }
  if (mode === 'services') {
    return [
      { id: 'home', icon: '🏠' },
      { id: 'order', icon: '🧰' },
      { id: 'clients', icon: '👥' },
      { id: 'products', icon: '📦' },
    ]
  }
  if (isWholesale(mode)) {
    return [
      { id: 'home', icon: '🏠' },
      { id: 'order', icon: '📦' },
      { id: 'clients', icon: '👥' },
      { id: 'products', icon: '📦' },
    ]
  }
  return [
    { id: 'home', icon: '🏠' },
    { id: 'order', icon: '🛒' },
    { id: 'products', icon: '🛍️' },
    { id: 'clients', icon: '👥' },
  ]
}

const CATEGORIES: ProductCategory[] = [
  'alimentaire',
  'cosmetique',
  'consommable',
  'quincaillerie',
  'textile',
  'autre',
]

/** Filtre caisse : produits sans code-barres (bouton / rayon « Autre ») */
const NO_BARCODE_FILTER = '__no_barcode__'

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [screen, setScreen] = useState<Screen>('home')
  const [navStack, setNavStack] = useState<Screen[]>([])
  /** Pages déjà ouvertes : restent en mémoire (saisie / travail non perdu au retour) */
  const [aliveScreens, setAliveScreens] = useState<Screen[]>(['home'])
  const [toast, setToast] = useState('')
  const [focusClientId, setFocusClientId] = useState<string | null>(null)
  const [focusProductId, setFocusProductId] = useState<string | null>(null)
  const [seedProductBarcode, setSeedProductBarcode] = useState<string | null>(null)
  const [seedProductQuery, setSeedProductQuery] = useState<string | null>(null)
  const [seedSellProductId, setSeedSellProductId] = useState<string | null>(null)
  const [seedHeldId, setSeedHeldId] = useState<string | null>(null)
  const [seedClientNotes, setSeedClientNotes] = useState<string | null>(null)
  const [historySeed, setHistorySeed] = useState<{
    from: string
    to: string
  } | null>(null)
  const [agentSeed, setAgentSeed] = useState<string | null>(null)
  const [redoSetup, setRedoSetup] = useState(false)
  const [cashierGateTick, setCashierGateTick] = useState(0)
  const lang = state.settings.language
  const domainId = state.settings.domainId
  const vocab = shopVocab(state.settings.commerceMode, lang, domainId)
  const metier = metierPackFor(domainId, state.settings.commerceMode)
  const needsCashierPin =
    isToolEnabled(state.settings, 'cashierPin') &&
    !!state.settings.cashierPin &&
    !isCashierUnlocked()
  // re-render when unlock changes
  void cashierGateTick

  useEffect(() => {
    registerMuteAskHandler(null)
    stopSpeaking()
    return () => registerMuteAskHandler(null)
  }, [])

  function keepAlive(id: Screen) {
    setAliveScreens((list) => (list.includes(id) ? list : [...list, id]))
  }

  function goTo(next: Screen, _spokenLabel?: string) {
    if (!sellerCanAccessScreen(state, next)) {
      setToast(t(lang, 'sellerAccessDenied'))
      return
    }
    keepAlive(next)
    setScreen((curr) => {
      if (curr !== next) {
        setNavStack((stack) => [...stack, curr])
      }
      return next
    })
  }

  function goBack() {
    setNavStack((stack) => {
      if (stack.length === 0) {
        keepAlive('home')
        setScreen('home')
        return stack
      }
      const prev = stack[stack.length - 1]!
      keepAlive(prev)
      setScreen(prev)
      return stack.slice(0, -1)
    })
  }

  function isAlive(id: Screen) {
    return aliveScreens.includes(id) || screen === id
  }

  const showBackBtn = screen !== 'home' || navStack.length > 0

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.lang = htmlLang(lang)
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr'
  }, [lang])

  useEffect(() => {
    applyEffectiveTheme({
      themeSource: state.settings.themeSource,
      themePreset: state.settings.themePreset,
      fontScale: state.settings.fontScale,
      domainId: state.settings.domainId,
      commerceMode: state.settings.commerceMode,
    })
    document.documentElement.classList.toggle(
      'easy-mode',
      state.settings.easyMode !== false,
    )
  }, [
    state.settings.themePreset,
    state.settings.themeSource,
    state.settings.fontScale,
    state.settings.easyMode,
    state.settings.domainId,
    state.settings.commerceMode,
  ])

  useEffect(() => {
    setUiSoundsEnabled(state.settings.uiSoundsEnabled !== false)
  }, [state.settings.uiSoundsEnabled])

  useEffect(() => installUiClickSounds(), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!state.settings.stockAlertsEnabled) return
    const low = lowStockProducts(state)
    if (low.length > 0) notifyStockRuptures(low, lang)
    const overdue = overdueCreditOrders(state)
    const soon = dueSoonCreditOrders(state, 3)
    if (overdue.length > 0 || soon.length > 0) {
      notifyDueAlerts(overdue, soon, lang)
    }
  }, [state.products, state.orders, state.settings.stockAlertsEnabled, lang])

  const stats = useMemo(() => {
    const today = todayOrders(state)
    const todayExp = sumExpensesDa(expensesOnDate(state))
    const monthExp = sumExpensesDa(expensesInMonth(state))
    const todayProfit = realizedProfitDa(state, today)
    const overdue = overdueCreditOrders(state)
    return {
      todayCount: today.length,
      todayTotal: today.reduce((s, o) => s + o.totalDa, 0),
      todayCash: todayCashDa(state),
      todayProfit,
      todayExpenses: todayExp,
      monthExpenses: monthExp,
      netToday: todayProfit - todayExp,
      stockValue: stockValueDa(state),
      stockCost: stockCostDa(state),
      stockMargin: stockMarginDa(state),
      lowStock: lowStockProducts(state).length,
      credits: openCreditsDa(state),
      pendingInbox: pendingIncoming(state).length,
      overdueCount: overdue.length,
    }
  }, [state])

  function flash(key: string) {
    setToast(t(lang, key))
  }

  const low = lowStockProducts(state)
  const isDriverMode =
    state.team.multiPosteEnabled && state.team.role === 'driver'
  const isCashierMode =
    state.team.multiPosteEnabled && state.team.role === 'cashier'
  const needCashierLogin = isCashierMode && !state.team.currentCashierId
  const clinicStation = clinicStationOf(state)
  const isClinicDoctor = clinicStation === 'doctor'
  const isClinicReception = clinicStation === 'reception'
  const needRolePick =
    state.team.multiPosteEnabled && !state.team.hasChosenRole
  const needClinicRolePick =
    state.settings.commerceMode === 'sante' &&
    state.settings.clinicShareEnabled === true &&
    !state.settings.clinicStationChosen
  const needSetup = !state.settings.setupDone || redoSetup

  useEffect(() => {
    if (isDriverMode && screen !== 'missions') goTo('missions')
  }, [isDriverMode, screen])

  useEffect(() => {
    if (needCashierLogin) return
    if (
      isCashierMode &&
      (screen === 'settings' ||
        screen === 'profits' ||
        screen === 'purchases' ||
        screen === 'staff' ||
        screen === 'missions')
    ) {
      goTo('home')
    }
  }, [isCashierMode, needCashierLogin, screen])

  useEffect(() => {
    if (needSetup || needRolePick || needCashierLogin) return
    if (!sellerCanAccessScreen(state, screen)) {
      setScreen('home')
      setNavStack([])
    }
  }, [state.sellers, state.settings.currentSellerId, screen, needSetup, needRolePick, needCashierLogin])

  /** Voix agent / TTS désactivée */
  useEffect(() => {
    stopSpeaking()
  }, [])

  useEffect(() => {
    setActiveCurrency(state.settings.currency || 'DA')
    setActiveLocale(numberLocale(lang, state.settings.countryCode || 'DZ'))
  }, [state.settings.currency, state.settings.countryCode, lang])

  useEffect(() => {
    const code = state.settings.countryCode || 'DZ'
    if (!langInCountry(lang, code)) {
      setState((s) => updateSettings(s, { language: defaultLang(code) }))
    }
  }, [state.settings.countryCode, lang])

  return (
    <DesktopChrome
      lang={lang}
      mode={state.settings.commerceMode}
      family={metier.family}
      railsConfig={state.settings.desktopRails}
      activeScreen={screen}
      onLang={(l) => setState((s) => updateSettings(s, { language: l }))}
      onGo={(s) =>
        goTo(
          s,
          s === 'order'
            ? vocab.sell
            : s === 'clients'
              ? vocab.client
              : s === 'products'
                ? vocab.product
                : t(lang, s === 'profits' ? 'profitsTitle' : s),
        )
      }
      onAction={(id) => {
        if (id === 'search') {
          const el = document.querySelector<HTMLInputElement>(
            '.smart-search input, .global-smart-search input, input[type="search"], .home-hero input',
          )
          el?.focus()
          el?.select()
          return
        }
        if (id === 'newProduct') {
          goTo('products', vocab.product)
          return
        }
        if (id === 'alerts') {
          keepAlive('inventory')
          goTo('inventory', t(lang, 'inventory'))
        }
      }}
    >
    <div
      className={`app-shell mode-${state.settings.commerceMode || 'gros'} metier-${metier.family} ${screen === 'delivery' ? 'map-mode' : ''} ${
        state.settings.easyMode !== false ? 'easy-ui' : ''
      } ${isDriverMode ? 'driver-mode' : ''} ${isCashierMode ? 'cashier-mode' : ''} ${isClinicDoctor ? 'clinic-doctor' : ''} ${isClinicReception ? 'clinic-reception' : ''}`}
    >
      {needSetup ? (
        <SetupWizard
          lang={lang}
          existingProducts={state.products.length}
          startStep={redoSetup ? 1 : 0}
          initial={{
            countryCode: state.settings.countryCode,
            commerceMode: state.settings.commerceMode,
            domainId: state.settings.domainId,
            shopName: state.settings.shopName,
            phone: state.settings.phone,
          }}
          onCancel={redoSetup ? () => setRedoSetup(false) : undefined}
          onDone={(input) => {
            setState((s) => applyShopSetup(s, input))
            setRedoSetup(false)
            goTo('home')
          }}
        />
      ) : null}

      {!needSetup && needsCashierPin ? (
        <CashierPinGate
          settings={state.settings}
          lang={lang}
          onUnlock={() => setCashierGateTick((n) => n + 1)}
        />
      ) : null}

      {!needSetup && needRolePick ? (
        <RolePickGate
          lang={lang}
          onPick={(role) => {
            setState((s) =>
              updateTeam(s, {
                role,
                hasChosenRole: true,
                currentDriverId: role === 'driver' ? s.team.currentDriverId : null,
                currentCashierId:
                  role === 'cashier' ? s.team.currentCashierId : null,
              }),
            )
            goTo(role === 'driver' ? 'missions' : 'home')
          }}
        />
      ) : null}

      {!needSetup && !needRolePick && needCashierLogin ? (
        <CashierHome
          state={state}
          lang={lang}
          onState={setState}
          onFlash={flash}
        />
      ) : null}

      {!needSetup && !needRolePick && needClinicRolePick ? (
        <ClinicRolePickGate
          lang={lang}
          onPick={(station) => {
            setState((s) => setClinicStation(s, station))
            goTo('home')
          }}
        />
      ) : null}

      {!needSetup && !needRolePick && !needCashierLogin && !needClinicRolePick && screen !== 'delivery' && !isDriverMode ? (
      <header className="topbar">
        <div className="topbar-left">
          {showBackBtn && screen !== 'home' ? (
            <button
              type="button"
              className="back-btn"
              onClick={goBack}
              aria-label={t(lang, 'back')}
              title={t(lang, 'back')}
            >
              ←
            </button>
          ) : null}
          <div>
            <div className="brand brand-mark">
              <img
                src={APP_BRAND.logoHeader}
                alt={APP_BRAND.name}
                className="brand-logo"
                width={128}
                height={128}
                decoding="async"
              />
            </div>
            <div className="muted">
              {state.settings.shopName}
              {state.settings.city ? ` · ${state.settings.city}` : ''}
              {stats.pendingInbox > 0 ? ` · 📥 ${stats.pendingInbox}` : ''}
              {stats.lowStock > 0 ? ` · ⚠️ ${stats.lowStock}` : ''}
            </div>
          </div>
        </div>
        <div className="topbar-actions">
          {state.settings.multiLocationEnabled && state.locations.length > 0 ? (
            <label className="location-pill location-switch" title={t(lang, 'activeLocation')}>
              <span aria-hidden>🏪</span>
              <select
                value={activeLocationId(state)}
                aria-label={t(lang, 'activeLocation')}
                onChange={(e) => {
                  const id = e.target.value
                  setState((s) => setActiveLocation(s, id))
                  const name =
                    state.locations.find((l) => l.id === id)?.name || id
                  setToast(`${t(lang, 'activeLocation')}: ${name}`)
                }}
              >
                {state.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {toast ? <div className="badge">{toast}</div> : null}
          <button
            type="button"
            className="lang-toggle"
            onClick={() =>
              setState((s) =>
                updateSettings(s, {
                  language: nextSuggestedLang(
                    s.settings.language,
                    s.settings.countryCode || 'DZ',
                  ),
                }),
              )
            }
            aria-label={t(lang, 'language')}
            title={t(lang, 'language')}
          >
            {LANG_SHORT[lang]}
          </button>
          <button
            className={`settings-btn ${screen === 'settings' ? 'active' : ''}`}
            onClick={() => goTo('settings')}
            aria-label={t(lang, 'settings')}
            title={t(lang, 'settings')}
            hidden={isCashierMode || !sellerCan(state, 'settings')}
          >
            ⚙️
          </button>
        </div>
      </header>
      ) : !needSetup && !needRolePick && isDriverMode ? (
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="back-btn"
              onClick={() =>
                setState((s) =>
                  updateTeam(s, {
                    role: 'owner',
                    hasChosenRole: true,
                    currentDriverId: null,
                  }),
                )
              }
              aria-label={t(lang, 'switchToOwner')}
              title={t(lang, 'switchToOwner')}
            >
              ←
            </button>
            <div>
              <div className="brand brand-mark">
                <img
                  src={APP_BRAND.logoHeader}
                  alt={APP_BRAND.name}
                  className="brand-logo"
                  width={128}
                  height={128}
                  decoding="async"
                />
              </div>
              <div className="muted">🚚 {t(lang, 'driverMode')}</div>
            </div>
          </div>
          {toast ? <div className="badge">{toast}</div> : null}
        </header>
      ) : !needSetup && !needRolePick && toast ? (
        <div className="badge map-toast">{toast}</div>
      ) : null}

      {!needSetup && !needRolePick && !needCashierLogin && screen === 'delivery' ? (
        <button
          type="button"
          className="back-btn map-back"
          onClick={goBack}
          aria-label={t(lang, 'back')}
        >
          ← {t(lang, 'back')}
        </button>
      ) : null}

      {!needSetup && !needRolePick && !needCashierLogin ? (
      <>
      {isAlive('home') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'home' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'home'}
          inert={screen !== 'home' ? true : undefined}
        >
        {isCashierMode && state.team.currentCashierId ? (
          <CashierHome
            state={state}
            lang={lang}
            onState={setState}
            onFlash={flash}
          />
        ) : null}
        <HomePage
          state={state}
          stats={stats}
          lang={lang}
          low={low}
          clinicStation={clinicStation}
          onState={setState}
          onFlash={(msg) => setToast(msg)}
          onGo={goTo}
          onFocusClient={(id) => setFocusClientId(id)}
          onFocusProduct={(id) => setFocusProductId(id)}
          onSeedNewProduct={(barcode) => {
            setSeedProductBarcode(barcode)
            setFocusProductId(null)
          }}
          onSeedProductSearch={(q) => {
            setSeedProductQuery(q)
            setFocusProductId(null)
          }}
          onSeedNewClient={(note) => {
            setSeedClientNotes(note)
            setFocusClientId(null)
          }}
          onSeedSell={(productId) => {
            setSeedSellProductId(productId)
          }}
          onOpenTableOrder={(tableId, heldSaleId) => {
            const existing = heldSaleId
              ? state.heldSales?.find((h) => h.id === heldSaleId)
              : undefined
            if (existing) {
              setSeedHeldId(existing.id)
              goTo('order', vocab.sell)
              return
            }
            const table = state.tables?.find((tb) => tb.id === tableId)
            const held = holdSale(state, {
              label: table?.name || t(lang, 'tableFloorTitle'),
              clientId: '',
              qtyMap: {},
              tierMap: {},
            })
            const newHeldId = held.heldSales[0]?.id
            setState(setTableStatus(held, tableId, 'busy', newHeldId))
            if (newHeldId) setSeedHeldId(newHeldId)
            goTo('order', vocab.sell)
          }}
          onOpenGymSession={(sessionId) => {
            const ensured = ensureGymSessionHeld(state, sessionId)
            const session = (ensured.gymSessions ?? []).find(
              (s) => s.id === sessionId,
            )
            if (!session) {
              flash('gymSessionFailed')
              return
            }
            setState(ensured)
            setSeedHeldId(session.heldSaleId)
            goTo('order', vocab.sell)
          }}
          onOpenHistoryDates={(from, to) => {
            setHistorySeed({ from, to })
            goTo('history', t(lang, 'appHistory'))
          }}
          onEnableAlerts={async () => {
            const result = await enableStockAlerts()
            if (result === 'granted') {
              setState((s) => updateSettings(s, { stockAlertsEnabled: true }))
              notifyStockRuptures(lowStockProducts(state), lang)
              flash('alertsEnabled')
            } else {
              flash('alertsDenied')
            }
          }}
          onWhatsapp={(order) => {
            openWhatsapp(order, state.settings)
            setState((s) => markOrderWhatsappSent(s, order.id))
            flash('whatsappOpened')
          }}
          onPrint={async (order) => {
            const mode = await printTicketBluetooth(order, state.settings)
            flash(mode === 'bluetooth' ? 'ticketSent' : 'ticketPreview')
          }}
          onBoth={async (order) => {
            openWhatsapp(order, state.settings)
            setState((s) => markOrderWhatsappSent(s, order.id))
            await printTicketBluetooth(order, state.settings)
            flash('bothDone')
          }}
          onInvoice={(order) => {
            openInvoiceWhatsapp(order, state.settings)
            setState((s) => markInvoiceSent(s, order.id))
            flash('invoiceSent')
          }}
          onOpenExpertCompta={() => {
            setAgentSeed(lang === 'ar' ? 'خبير محاسبة' : 'conseil compta')
            goTo('agent', t(lang, 'expertComptaTitle'))
          }}
        />
        </div>
      ) : null}
      {isAlive('products') ? (
        <div
          className={`screen-pane ${screen === 'products' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'products'}
          inert={screen !== 'products' ? true : undefined}
        >
        <ProductsPage
          state={state}
          lang={lang}
          onFlash={flash}
          canEdit={sellerCan(state, 'editStock')}
          showCosts={sellerCan(state, 'viewProfits')}
          initialProductId={focusProductId}
          seedBarcode={seedProductBarcode}
          seedQuery={seedProductQuery}
          onSeedConsumed={() => {
            setFocusProductId(null)
            setSeedProductBarcode(null)
            setSeedProductQuery(null)
          }}
          onAdd={(p) => {
            if (!sellerCan(state, 'editStock')) {
              flash('sellerAccessDenied')
              return
            }
            setState((s) => addProduct(s, p))
            flash('productAdded')
          }}
          onUpdate={(id, patch) => {
            if (!sellerCan(state, 'editStock')) {
              flash('sellerAccessDenied')
              return
            }
            setState((s) => updateProduct(s, id, patch))
            flash('productUpdated')
          }}
          onDelete={(id) => {
            if (!sellerCan(state, 'editStock')) {
              flash('sellerAccessDenied')
              return
            }
            setState((s) => deleteProduct(s, id))
            flash('productDeleted')
          }}
          onOpenGallery={() => goTo('gallery')}
        />
        </div>
      ) : null}
      {isAlive('clients') ? (
        <div
          className={`screen-pane ${screen === 'clients' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'clients'}
          inert={screen !== 'clients' ? true : undefined}
        >
        <ClientsPage
          state={state}
          lang={lang}
          clinicStation={clinicStation}
          canEdit={sellerCan(state, 'editClients')}
          initialClientId={focusClientId}
          seedNotes={seedClientNotes}
          onSeedConsumed={() => {
            setFocusClientId(null)
            setSeedClientNotes(null)
          }}
          onState={setState}
          onAdd={(c) => {
            if (!sellerCan(state, 'editClients')) {
              flash('sellerAccessDenied')
              return
            }
            setState((s) => addClient(s, c))
            flash('clientAdded')
          }}
          onUpdate={(id, patch) => {
            if (!sellerCan(state, 'editClients')) {
              flash('sellerAccessDenied')
              return
            }
            setState((s) => updateClient(s, id, patch))
            flash('clientUpdated')
          }}
          onPayDebt={(id, amount) => {
            setState((s) => applyClientPayment(s, id, amount))
            flash('debtPaymentSaved')
          }}
          onSetBalance={(id, balance) => {
            if (!sellerCan(state, 'editClients')) {
              flash('sellerAccessDenied')
              return
            }
            setState((s) => setClientDisplayedBalance(s, id, balance))
            flash('balanceUpdated')
          }}
          onImport={(list) => {
            if (!sellerCan(state, 'editClients')) {
              flash('sellerAccessDenied')
              return
            }
            const { state: next, added } = addClientsBulk(state, list)
            setState(next)
            if (added > 0) flash('contactsImported')
          }}
          onDelete={(id) => {
            if (!sellerCan(state, 'editClients')) {
              flash('sellerAccessDenied')
              return
            }
            setState((s) => deleteClient(s, id))
            flash('clientDeleted')
          }}
          onFlash={flash}
          onToast={(msg) => setToast(msg)}
        />
        </div>
      ) : null}
      {isAlive('order') ? (
        <div
          className={`screen-pane ${screen === 'order' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'order'}
          inert={screen !== 'order' ? true : undefined}
        >
        <OrderPage
          state={state}
          lang={lang}
          seedProductId={seedSellProductId}
          onSeedConsumed={() => setSeedSellProductId(null)}
          seedHeldId={seedHeldId}
          onSeedHeldConsumed={() => setSeedHeldId(null)}
          onGo={goTo}
          onFlash={flash}
          onUpdateProduct={(id, patch) => setState((s) => updateProduct(s, id, patch))}
          onHoldSale={(input) =>
            setState((s) => {
              const next = holdSale(s, input)
              const newId = next.heldSales[0]?.id
              if (!newId) return next
              return relinkGymSessionHeld(next, newId, {
                clientId: input.clientId,
                label: input.label,
              })
            })
          }
          onRemoveHeld={(id) => setState((s) => removeHeldSale(s, id))}
          onCreate={(order) => {
            let next = createOrder(state, order)
            const sessions = next.gymSessions ?? []
            for (const s of [...sessions]) {
              const matchClient =
                !!order.clientId && s.clientId === order.clientId
              const matchWalkIn =
                !order.clientId &&
                s.kind === 'walk_in' &&
                (s.status === 'billing' || s.clientName === order.clientName)
              if (matchClient || matchWalkIn) {
                next = closeGymSession(next, s.id)
              }
            }
            setState(next)
            return next.orders[0]
          }}
          onWhatsapp={(order, customText) => {
            openWhatsapp(order, state.settings, customText)
            setState((s) => markOrderWhatsappSent(s, order.id))
            flash('whatsappOpened')
          }}
          onPrint={async (order, customText) => {
            const mode = await printTicketBluetooth(order, state.settings, customText)
            flash(mode === 'bluetooth' ? 'ticketSent' : 'ticketPreview')
          }}
          onBoth={async (order, customText) => {
            openWhatsapp(order, state.settings, customText)
            setState((s) => markOrderWhatsappSent(s, order.id))
            await printTicketBluetooth(order, state.settings, customText)
            flash('bothDone')
          }}
          onInvoice={(order, customText) => {
            openInvoiceWhatsapp(order, state.settings, customText)
            setState((s) => markInvoiceSent(s, order.id))
            flash('invoiceSent')
          }}
        />
        </div>
      ) : null}
      {isAlive('inbox') ? (
        <div
          className={`screen-pane ${screen === 'inbox' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'inbox'}
          inert={screen !== 'inbox' ? true : undefined}
        >
        <InboxPage
          state={state}
          lang={lang}
          onAdd={(input) => setState((s) => addIncomingOrder(s, input))}
          onUpdate={(id, patch) => setState((s) => updateIncomingOrder(s, id, patch))}
          onGoOrder={() => goTo('order')}
        />
        </div>
      ) : null}
      {isAlive('agent') ? (
        <div
          className={`screen-pane ${screen === 'agent' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'agent'}
          inert={screen !== 'agent' ? true : undefined}
        >
        <AgentPage
          state={state}
          lang={lang}
          initialUtterance={agentSeed}
          onState={setState}
          onNavigate={goTo}
          onInvoiceSent={() => {
            const last = state.orders[0]
            if (last) {
              setState((s) => markInvoiceSent(s, last.id))
              flash('invoiceSent')
            }
            setAgentSeed(null)
          }}
        />
        </div>
      ) : null}
      {isAlive('digital') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'digital' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'digital'}
          inert={screen !== 'digital' ? true : undefined}
        >
          <DigitalCockpitPage
            state={state}
            lang={lang}
            onFlash={(msg) => setToast(msg)}
            onNavigate={goTo}
            onCampaignAction={(res) => {
              if (res.action?.type === 'open_whatsapp') {
                openWhatsappText(res.action.phone, res.action.message)
              }
              if (res.action?.type === 'broadcast_prospects') {
                res.action.items.forEach((item, i) => {
                  window.setTimeout(
                    () => openWhatsappText(item.phone, item.message),
                    i * 700,
                  )
                })
              }
              if (res.action?.type === 'navigate') {
                goTo(
                  res.action.screen === 'agent' ? 'digital' : res.action.screen,
                )
              }
            }}
          />
        </div>
      ) : null}
      {isAlive('arrivages') ? (
        <div
          className={`screen-pane ${screen === 'arrivages' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'arrivages'}
          inert={screen !== 'arrivages' ? true : undefined}
        >
          <ArrivagesPage state={state} lang={lang} />
        </div>
      ) : null}
      {isAlive('expenses') ? (
        <div
          className={`screen-pane ${screen === 'expenses' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'expenses'}
          inert={screen !== 'expenses' ? true : undefined}
        >
        <ExpensesPage
          state={state}
          lang={lang}
          onAdd={(e) => {
            setState((s) => addExpense(s, e))
            flash('expenseAdded')
          }}
          onDelete={(id) => {
            setState((s) => deleteExpense(s, id))
            flash('expenseDeleted')
          }}
        />
        </div>
      ) : null}
      {isAlive('calculator') ? (
        <div
          className={`screen-pane ${screen === 'calculator' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'calculator'}
          inert={screen !== 'calculator' ? true : undefined}
        >
          <CalculatorPage lang={lang} />
        </div>
      ) : null}
      {isAlive('gallery') ? (
        <div
          className={`screen-pane ${screen === 'gallery' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'gallery'}
          inert={screen !== 'gallery' ? true : undefined}
        >
        <GalleryPage
          state={state}
          lang={lang}
          onOrder={() => goTo('order')}
          onEditStock={() => goTo('products')}
        />
        </div>
      ) : null}
      {isAlive('delivery') ? (
        <div
          className={`screen-pane ${screen === 'delivery' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'delivery'}
          inert={screen !== 'delivery' ? true : undefined}
        >
        <DeliveryMapPage
          state={state}
          lang={lang}
          active={screen === 'delivery'}
          onOpenClient={(id) => {
            setFocusClientId(id)
            goTo('clients')
          }}
        />
        </div>
      ) : null}
      {state.team.multiPosteEnabled && isAlive('missions') ? (
        <div
          className={`screen-pane ${
            screen === 'missions' || isDriverMode ? 'is-active' : 'is-cached'
          }`}
          aria-hidden={screen !== 'missions' && !isDriverMode}
          inert={screen !== 'missions' && !isDriverMode ? true : undefined}
        >
        <MissionsPage
          state={state}
          lang={lang}
          onState={setState}
          onFlash={flash}
        />
        </div>
      ) : null}
      {isAlive('history') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'history' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'history'}
          inert={screen !== 'history' ? true : undefined}
        >
        <HistoryPage
          state={state}
          lang={lang}
          seedFrom={historySeed?.from}
          seedTo={historySeed?.to}
          onSeedConsumed={() => setHistorySeed(null)}
          onState={setState}
          onFlash={flash}
          onOpenClient={(id) => {
            setFocusClientId(id)
            goTo('clients')
          }}
          onWhatsapp={(order) => {
            openWhatsapp(order, state.settings)
            setState((s) => markOrderWhatsappSent(s, order.id))
            flash('whatsappOpened')
          }}
          onPrint={async (order) => {
            const mode = await printTicketBluetooth(order, state.settings)
            flash(mode === 'bluetooth' ? 'ticketSent' : 'ticketPreview')
          }}
          onBoth={async (order) => {
            openWhatsapp(order, state.settings)
            setState((s) => markOrderWhatsappSent(s, order.id))
            await printTicketBluetooth(order, state.settings)
            flash('bothDone')
          }}
          onInvoice={(order) => {
            openInvoiceWhatsapp(order, state.settings)
            setState((s) => markInvoiceSent(s, order.id))
            flash('invoiceSent')
          }}
        />
        </div>
      ) : null}
      {isAlive('profits') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'profits' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'profits'}
          inert={screen !== 'profits' ? true : undefined}
        >
          <ProfitsPage state={state} lang={lang} />
        </div>
      ) : null}
      {isAlive('caisse') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'caisse' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'caisse'}
          inert={screen !== 'caisse' ? true : undefined}
        >
          <CashSessionPage
            state={state}
            lang={lang}
            onState={setState}
            onFlash={flash}
          />
        </div>
      ) : null}
      {isAlive('returns') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'returns' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'returns'}
          inert={screen !== 'returns' ? true : undefined}
        >
          <ReturnsPage
            state={state}
            lang={lang}
            onState={setState}
            onFlash={flash}
          />
        </div>
      ) : null}
      {isAlive('purchases') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'purchases' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'purchases'}
          inert={screen !== 'purchases' ? true : undefined}
        >
          <PurchasesPage
            state={state}
            lang={lang}
            onState={setState}
            onFlash={flash}
          />
        </div>
      ) : null}
      {isAlive('stock') ? (
        <div
          className={`screen-pane ${screen === 'stock' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'stock'}
          inert={screen !== 'stock' ? true : undefined}
        >
          <StockPage
            state={state}
            stats={stats}
            lang={lang}
            showCosts={sellerCan(state, 'viewProfits')}
          />
        </div>
      ) : null}
      {isAlive('production') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'production' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'production'}
          inert={screen !== 'production' ? true : undefined}
        >
          <ProductionPage
            state={state}
            lang={lang}
            onState={setState}
            onFlash={(msg) => setToast(msg)}
          />
        </div>
      ) : null}
      {isAlive('zakat') ? (
        <div
          className={`screen-pane ${screen === 'zakat' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'zakat'}
          inert={screen !== 'zakat' ? true : undefined}
        >
        <ZakatPage
          state={state}
          lang={lang}
          onCalculate={(includeCredits) => {
            const stock = stockValueDa(state)
            const credits = includeCredits ? openCreditsDa(state) : 0
            const base = stock + credits
            setState((s) =>
              addZakatRecord(s, {
                yearLabel: new Date().getFullYear().toString(),
                calculatedAt: new Date().toISOString(),
                stockValueDa: stock,
                includeCredits,
                creditsValueDa: credits,
                baseDa: base,
                rate: 0.025,
                amountDa: Math.round(base * 0.025),
              }),
            )
            flash('zakatCalculated')
          }}
          onMarkPaid={(calculatedAt) => {
            setState((s) => markZakatPaid(s, calculatedAt))
            flash('zakatMarkedPaid')
          }}
        />
        </div>
      ) : null}
      {isAlive('staff') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'staff' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'staff'}
          inert={screen !== 'staff' ? true : undefined}
        >
          <StaffPanel
            state={state}
            lang={lang}
            onState={setState}
            onFlash={(msg) => setToast(msg)}
          />
        </div>
      ) : null}
      {isAlive('sellers') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'sellers' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'sellers'}
          inert={screen !== 'sellers' ? true : undefined}
        >
          <SellersPanel
            state={state}
            lang={lang}
            onState={setState}
            onFlash={(msg) => setToast(msg)}
          />
        </div>
      ) : null}
      {OPTIONAL_TOOL_SCREENS.map((toolScreen) =>
        isAlive(toolScreen) && !isDriverMode ? (
          <div
            key={toolScreen}
            className={`screen-pane ${screen === toolScreen ? 'is-active' : 'is-cached'}`}
            aria-hidden={screen !== toolScreen}
            inert={screen !== toolScreen ? true : undefined}
          >
            <OptionalToolPage
              toolId={toolScreen as OptionalToolId}
              state={state}
              lang={lang}
              onState={setState}
              onFlash={(msg) => setToast(msg)}
              onFocusClient={(id) => {
                setFocusClientId(id)
                goTo('clients')
              }}
              onFocusProduct={(id) => {
                setFocusProductId(id)
                goTo('products')
              }}
            />
          </div>
        ) : null,
      )}
      {isAlive('settings') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'settings' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'settings'}
          inert={screen !== 'settings' ? true : undefined}
        >
        <SettingsPage
          state={state}
          lang={lang}
          onState={setState}
          onFlash={flash}
          onRedoSetup={() => setRedoSetup(true)}
          onSave={(patch) => {
            setState((s) => updateSettings(s, patch))
            flash('settingsSaved')
          }}
          onToggleMultiPoste={(enabled) => {
            setState((s) => {
              let next = ensureCompanyCode(s)
              next = updateTeam(next, {
                multiPosteEnabled: enabled,
                hasChosenRole: enabled ? false : true,
                role: enabled ? next.team.role : 'owner',
                currentDriverId: enabled ? next.team.currentDriverId : null,
                currentCashierId: enabled ? next.team.currentCashierId : null,
              })
              return next
            })
            flash(enabled ? 'multiPosteOn' : 'multiPosteOff')
            if (enabled) goTo('missions')
            else {
              setNavStack([])
              keepAlive('home')
              setScreen('home')
            }
          }}
          onToggleMultiLocation={(enabled) => {
            setState((s) => setMultiLocationEnabled(s, enabled))
            flash(enabled ? 'multiLocationOn' : 'multiLocationOff')
          }}
          onAddLocation={(name) => {
            setState((s) => addLocation(s, name))
          }}
          onRenameLocation={(id, name) => {
            setState((s) => updateLocation(s, id, { name }))
          }}
          onDeleteLocation={(id) => {
            setState((s) => deleteLocation(s, id))
          }}
          onSetActiveLocation={(id) => {
            setState((s) => setActiveLocation(s, id))
          }}
          onTransfer={(productId, fromId, toId, qty) => {
            const before = state.products.find((p) => p.id === productId)
            const fromBefore = before ? stockAt(before, fromId) : 0
            setState((s) => transferStock(s, productId, fromId, toId, qty))
            const ok = fromBefore >= qty && qty > 0 && fromId !== toId
            flash(ok ? 'transferDone' : 'transferFail')
          }}
          onGo={goTo}
        />
        </div>
      ) : null}
      </>
      ) : null}

      {!needSetup && !needRolePick && !needCashierLogin && !isDriverMode ? (
      <nav className="bottom-nav" aria-label="Navigation">
        {navItems(state.settings.commerceMode, clinicStation)
          .filter((item) => {
            if (!sellerCanAccessScreen(state, item.id)) return false
            if (!isCashierMode) return true
            return (
              item.id === 'home' ||
              item.id === 'order' ||
              item.id === 'clients' ||
              item.id === 'products'
            )
          })
          .map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${screen === item.id ? 'active' : ''}`}
            onClick={() =>
              goTo(
                item.id,
                item.id === 'order'
                  ? vocab.sell
                  : item.id === 'clients'
                    ? vocab.client
                    : item.id === 'products'
                      ? vocab.product
                      : t(lang, item.id),
              )
            }
          >
            <span className="nav-emoji">{item.icon}</span>
            <span className="nav-text">
              {item.id === 'order'
                ? vocab.sell
                : item.id === 'clients'
                  ? vocab.client
                  : item.id === 'products'
                    ? vocab.product
                    : t(lang, item.id)}
            </span>
          </button>
        ))}
      </nav>
      ) : null}
    </div>
    </DesktopChrome>
  )
}

function RolePickGate({
  lang,
  onPick,
}: {
  lang: Language
  onPick: (role: TeamRole) => void
}) {
  return (
    <div className="page role-pick">
      <div className="card">
        <h2>📱 {t(lang, 'rolePickTitle')}</h2>
        <p className="muted">{t(lang, 'rolePickHint')}</p>
        <div className="choice-grid">
          <button
            type="button"
            className="choice-card"
            onClick={() => onPick('owner')}
          >
            <span className="choice-emoji">👔</span>
            <strong>{t(lang, 'roleOwner')}</strong>
            <span className="muted">{t(lang, 'roleOwnerHint')}</span>
          </button>
          <button
            type="button"
            className="choice-card"
            onClick={() => onPick('cashier')}
          >
            <span className="choice-emoji">🧾</span>
            <strong>{t(lang, 'roleCashier')}</strong>
            <span className="muted">{t(lang, 'roleCashierHint')}</span>
          </button>
          <button
            type="button"
            className="choice-card"
            onClick={() => onPick('driver')}
          >
            <span className="choice-emoji">🚚</span>
            <strong>{t(lang, 'roleDriver')}</strong>
            <span className="muted">{t(lang, 'roleDriverHint')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ClinicRolePickGate({
  lang,
  onPick,
}: {
  lang: Language
  onPick: (station: ClinicStation) => void
}) {
  return (
    <div className="page role-pick">
      <div className="card">
        <h2>🩺 {t(lang, 'clinicRoleTitle')}</h2>
        <p className="muted">{t(lang, 'clinicRoleHint')}</p>
        <div className="choice-grid">
          <button
            type="button"
            className="choice-card"
            onClick={() => onPick('doctor')}
          >
            <span className="choice-emoji">👨‍⚕️</span>
            <strong>{t(lang, 'clinicRoleDoctor')}</strong>
            <span className="muted">{t(lang, 'clinicRoleDoctorHint')}</span>
          </button>
          <button
            type="button"
            className="choice-card"
            onClick={() => onPick('reception')}
          >
            <span className="choice-emoji">🧾</span>
            <strong>{t(lang, 'clinicRoleReception')}</strong>
            <span className="muted">{t(lang, 'clinicRoleReceptionHint')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsPage({
  state,
  lang,
  onSave,
  onState,
  onFlash,
  onToggleMultiPoste,
  onToggleMultiLocation,
  onAddLocation,
  onRenameLocation,
  onDeleteLocation,
  onSetActiveLocation,
  onTransfer,
  onGo,
  onRedoSetup,
}: {
  state: AppState
  lang: Language
  onSave: (patch: Partial<AppState['settings']>) => void
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
  onToggleMultiPoste: (enabled: boolean) => void
  onToggleMultiLocation: (enabled: boolean) => void
  onAddLocation: (name: string) => void
  onRenameLocation: (id: string, name: string) => void
  onDeleteLocation: (id: string) => void
  onSetActiveLocation: (id: string) => void
  onTransfer: (
    productId: string,
    fromId: string,
    toId: string,
    qty: number,
  ) => void
  onGo: (s: Screen) => void
  onRedoSetup: () => void
}) {
  const [shopName, setShopName] = useState(state.settings.shopName)
  const [phone, setPhone] = useState(state.settings.phone)
  const [city, setCity] = useState(state.settings.city)
  const [language, setLanguage] = useState<Language>(state.settings.language)
  const [stockAlertsEnabled, setStockAlertsEnabled] = useState(
    state.settings.stockAlertsEnabled,
  )
  const [uiSoundsEnabled, setUiSoundsEnabledLocal] = useState(
    state.settings.uiSoundsEnabled !== false,
  )
  const [easyMode, setEasyMode] = useState(state.settings.easyMode !== false)
  const [themePreset, setThemePreset] = useState<ThemePreset>(
    state.settings.themePreset || 'forest',
  )
  const [fontScale, setFontScale] = useState<FontScale>(
    state.settings.fontScale || 'normal',
  )
  const [showZakat, setShowZakat] = useState(state.settings.showZakat !== false)
  const [showCalculator, setShowCalculator] = useState(
    state.settings.showCalculator !== false,
  )
  const [showGallery, setShowGallery] = useState(
    state.settings.showGallery !== false,
  )
  const [enabledTools, setEnabledTools] = useState<
    Partial<Record<OptionalToolId, boolean>>
  >(() => ({ ...(state.settings.enabledTools || {}) }))
  const [desktopRails, setDesktopRails] = useState(
    () => state.settings.desktopRails,
  )
  const [agentPerms, setAgentPerms] = useState<AgentPermissions>(() => ({
    ...DEFAULT_AGENT_PERMISSIONS,
    ...state.settings.agentPermissions,
  }))
  const [useBt, setUseBt] = useState(getPreferBluetoothPrinter())
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseInfo, setLicenseInfo] = useState('')
  const [newLocName, setNewLocName] = useState('')
  const [xferProductId, setXferProductId] = useState(
    state.products[0]?.id || '',
  )
  const [xferFrom, setXferFrom] = useState(activeLocationId(state))
  const [xferTo, setXferTo] = useState(
    state.locations.find((l) => l.id !== activeLocationId(state))?.id ||
      state.locations[0]?.id ||
      '',
  )
  const [xferQty, setXferQty] = useState('1')

  useEffect(() => {
    setLanguage(state.settings.language)
  }, [state.settings.language])

  useEffect(() => {
    setXferFrom(activeLocationId(state))
    const other = state.locations.find((l) => l.id !== activeLocationId(state))
    if (other) setXferTo(other.id)
  }, [state.settings.activeLocationId, state.locations])

  useEffect(() => {
    void getAccessStatus().then((s) => {
      if (s.ok && s.mode === 'licensed') {
        setLicenseInfo(`Licence: ${s.customer} — expire ${s.expiresAt}`)
      } else if (s.ok && s.mode === 'trial') {
        setLicenseInfo(`Essai: ${s.daysLeft} j restants`)
      } else {
        setLicenseInfo(s.message)
      }
    })
  }, [])

  function patchPerm(key: keyof AgentPermissions, value: boolean) {
    setAgentPerms((p) => ({ ...p, [key]: value }))
  }

  function saveAll(extra?: Partial<AppState['settings']>) {
    onSave({
      shopName,
      phone,
      city,
      language,
      stockAlertsEnabled,
      uiSoundsEnabled,
      easyMode,
      themePreset,
      themeSource: extra?.themeSource ?? state.settings.themeSource ?? 'metier',
      fontScale,
      showZakat,
      showCalculator,
      showGallery,
      enabledTools,
      desktopRails,
      agentPermissions: agentPerms,
      ...extra,
    })
  }

  return (
    <>
      <div className="card">
        <h2>{t(lang, 'settingsTitle')}</h2>
        <div className="notice">{t(lang, 'oneAppHint')}</div>
        <button
          type="button"
          className="btn block"
          style={{ marginBottom: 10 }}
          onClick={() => onGo('sellers')}
        >
          🧍 {t(lang, 'sellersTitle')}
        </button>
        <div className="settings-brand">
          <img
            src={APP_BRAND.logoHeader}
            alt={APP_BRAND.name}
            className="brand-logo"
            width={128}
            height={128}
            decoding="async"
          />
          <div className="muted">
            {APP_BRAND.name} v{APP_VERSION}
          </div>
        </div>
        <div className="notice" style={{ marginTop: 8 }}>
          {licenseInfo || '…'}
        </div>
        <div className="card" style={{ marginTop: 10 }}>
          <h3 style={{ margin: '0 0 6px' }}>💬 {t(lang, 'supportTitle')}</h3>
          <p className="muted" style={{ margin: '0 0 10px' }}>
            {t(lang, 'supportHint')} {APP_BRAND.supportDisplay}
          </p>
          <button
            type="button"
            className="btn block"
            onClick={() => {
              openSupportWhatsapp({
                language: lang === 'ar' ? 'ar' : 'fr',
                shopName: state.settings.shopName,
                version: APP_VERSION,
              })
              onFlash('supportOpened')
            }}
          >
            {t(lang, 'supportWhatsapp')}
          </button>
        </div>
        <div className="notice pro-upsell">
          <strong>{t(lang, 'proUpsell')}</strong>
          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/seller/pro.html" target="_blank" rel="noreferrer">
              {t(lang, 'proUpsellLink')}
            </a>
            <a href="/az-soft/" target="_blank" rel="noreferrer">
              {t(lang, 'azSoftSite')}
            </a>
          </span>
        </div>
        <div className="card install-help" style={{ marginTop: 10 }}>
          <h3 style={{ margin: '0 0 6px' }}>{t(lang, 'installTitle')}</h3>
          <p className="muted" style={{ margin: '0 0 10px' }}>
            {t(lang, 'installHint')}
          </p>
          <ul className="install-steps">
            <li>{t(lang, 'installIos')}</li>
            <li>{t(lang, 'installAndroid')}</li>
            <li>{t(lang, 'installDesktop')}</li>
          </ul>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <a
              className="btn secondary"
              href="https://github.com/azwaw007/securing-your-code/releases/download/v1.2.3-win/AZ-POS-Setup-1.2.3.exe"
              rel="noreferrer"
            >
              {t(lang, 'installWindows')}
            </a>
            <a className="btn ghost" href="/az-soft/" target="_blank" rel="noreferrer">
              {t(lang, 'azSoftSite')}
            </a>
          </div>
        </div>
        <div className="field">
          <label>Clé de licence</label>
          <textarea
            rows={2}
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="GDZ1...."
          />
        </div>
        <button
          className="btn secondary block"
          disabled={!licenseKey.trim()}
          onClick={async () => {
            const res = await activateLicense(licenseKey)
            if (res.ok) {
              setLicenseInfo(`Licence: ${res.payload.c} — expire ${res.payload.e}`)
              setLicenseKey('')
              saveAll()
            } else {
              setLicenseInfo(res.error)
            }
          }}
        >
          Activer / renouveler licence
        </button>
        <a className="btn ghost block" href="/guide.html" target="_blank" rel="noreferrer">
          Guide d’utilisation
        </a>

        <div className="field">
          <label>{t(lang, 'language')}</label>
          <p className="muted" style={{ margin: '0 0 8px' }}>
            {countryDisplayName(state.settings.countryCode || 'DZ', lang)}
          </p>
          <LanguagePicker
            lang={lang}
            value={language}
            countryCode={state.settings.countryCode}
            onChange={(l) => {
              setLanguage(l)
              onSave({ language: l })
            }}
          />
        </div>

        <div className="field">
          <label>{t(lang, 'themeTitle')}</label>
          <p className="muted">
            {state.settings.themeSource === 'user'
              ? t(lang, 'themeSourceUser')
              : t(lang, 'themeSourceMetier')}
          </p>
          <button
            type="button"
            className="btn secondary block"
            style={{ marginBottom: 8 }}
            onClick={() => {
              saveAll({ themeSource: 'metier' })
            }}
          >
            {t(lang, 'themeUseMetier')}
          </button>
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((id) => (
              <button
                key={id}
                type="button"
                className={`btn ${themePreset === id && state.settings.themeSource === 'user' ? '' : 'ghost'}`}
                onClick={() => {
                  setThemePreset(id)
                  applyUiTheme(id, fontScale)
                  saveAll({ themePreset: id, themeSource: 'user' })
                }}
              >
                {themeLabel(lang, id)}
              </button>
            ))}
          </div>
        </div>

        {state.settings.commerceMode === 'sante' ? (
          <div className="field">
            <label>{t(lang, 'clinicShare')}</label>
            <p className="muted">{t(lang, 'clinicShareHint')}</p>
            <div className="btn-row" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${state.settings.clinicShareEnabled ? '' : 'ghost'}`}
                onClick={() =>
                  saveAll({
                    clinicShareEnabled: true,
                    clinicStationChosen: false,
                  })
                }
              >
                {t(lang, 'clinicShareOn')}
              </button>
              <button
                type="button"
                className={`btn ${!state.settings.clinicShareEnabled ? '' : 'ghost'}`}
                onClick={() =>
                  saveAll({
                    clinicShareEnabled: false,
                    clinicStationChosen: false,
                    clinicStation: undefined,
                  })
                }
              >
                {t(lang, 'clinicShareOff')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="field">
          <label>{t(lang, 'fontTitle')}</label>
          <div className="btn-row">
            {(
              [
                ['normal', 'fontNormal'],
                ['large', 'fontLarge'],
                ['xlarge', 'fontXlarge'],
              ] as const
            ).map(([id, key]) => (
              <button
                key={id}
                type="button"
                className={`btn ${fontScale === id ? '' : 'ghost'}`}
                onClick={() => {
                  setFontScale(id)
                  applyUiTheme(themePreset, id)
                }}
              >
                {t(lang, key)}
              </button>
            ))}
          </div>
        </div>

        <label className="field check-row">
          <input
            type="checkbox"
            checked={easyMode}
            onChange={(e) => setEasyMode(e.target.checked)}
          />
          <span>
            <strong>{t(lang, 'easyMode')}</strong>
            <div className="muted">{t(lang, 'easyModeHint')}</div>
          </span>
        </label>

        <button
          type="button"
          className="btn secondary block"
          onClick={() => {
            setEasyMode(true)
            setFontScale('large')
            setShowZakat(true)
            setShowCalculator(true)
            setShowGallery(true)
            applyUiTheme(themePreset, 'large')
            saveAll({
              easyMode: true,
              fontScale: 'large',
              showZakat: true,
              showCalculator: true,
              showGallery: true,
            })
          }}
        >
          ✨ {t(lang, 'organizeEasyBtn')}
        </button>

        <div className="field">
          <label>{t(lang, 'showIconsTitle')}</label>
          <p className="muted" style={{ marginTop: 0 }}>
            {t(lang, 'optionalToolsHint')}
          </p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showZakat}
              onChange={(e) => setShowZakat(e.target.checked)}
            />
            <span>{t(lang, 'zakat')}</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showCalculator}
              onChange={(e) => setShowCalculator(e.target.checked)}
            />
            <span>{t(lang, 'calculator')}</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showGallery}
              onChange={(e) => setShowGallery(e.target.checked)}
            />
            <span>{t(lang, 'gallery')}</span>
          </label>
          {toolsForMetier(
            metierPackFor(state.settings.domainId, state.settings.commerceMode)
              .family,
          ).map((tool) => (
            <label className="check-row" key={tool.id}>
              <input
                type="checkbox"
                checked={enabledTools[tool.id] === true}
                onChange={(e) => {
                  const on = e.target.checked
                  const next = { ...enabledTools, [tool.id]: on }
                  setEnabledTools(next)
                  saveAll({ enabledTools: next })
                }}
              />
              <span>
                {tool.icon} {toolLabel(tool, lang)}
                <div className="muted">
                  {lang === 'ar' ? tool.hintAr : tool.hintFr}
                </div>
              </span>
            </label>
          ))}
        </div>

        <DesktopRailsSettings
          lang={lang}
          family={
            metierPackFor(state.settings.domainId, state.settings.commerceMode)
              .family
          }
          mode={state.settings.commerceMode}
          value={desktopRails}
          onChange={(next) => {
            setDesktopRails(next)
            saveAll({ desktopRails: next })
          }}
        />

        <label className="field check-row">
          <input
            type="checkbox"
            checked={stockAlertsEnabled}
            onChange={(e) => setStockAlertsEnabled(e.target.checked)}
          />
          {t(lang, 'stockAlertsToggle')}
        </label>

        <label className="field check-row">
          <input
            type="checkbox"
            checked={uiSoundsEnabled}
            onChange={(e) => {
              const on = e.target.checked
              setUiSoundsEnabledLocal(on)
              setUiSoundsEnabled(on)
              if (on) playBarcodeOk()
            }}
          />
          <span>
            <strong>{t(lang, 'uiSoundsToggle')}</strong>
            <div className="muted">{t(lang, 'uiSoundsHint')}</div>
          </span>
        </label>

        <div className="notice">
          <strong>{t(lang, 'unitsAvailable')} :</strong>{' '}
          {unitsForMetier(
            metierPackFor(state.settings.domainId, state.settings.commerceMode)
              .family,
          )
            .map((u) => unitLabel(language, u))
            .join(' · ')}
        </div>

        <label className="field check-row">
          <input
            type="checkbox"
            checked={useBt}
            onChange={(e) => {
              setUseBt(e.target.checked)
              setPreferBluetoothPrinter(e.target.checked)
            }}
          />
          <span>
            <strong>{t(lang, 'useBtPrinter')}</strong>
            <div className="muted">{t(lang, 'useBtPrinterHint')}</div>
          </span>
        </label>

        <label className="field check-row">
          <input
            type="checkbox"
            checked={state.team.multiPosteEnabled}
            onChange={(e) => onToggleMultiPoste(e.target.checked)}
          />
          <span>
            <strong>{t(lang, 'multiPoste')}</strong>
            <div className="muted">{t(lang, 'multiPosteHint')}</div>
          </span>
        </label>

        {state.team.multiPosteEnabled ? (
          <div className="notice" style={{ marginBottom: 12 }}>
            <div>
              <strong>{t(lang, 'companyCode')} :</strong>{' '}
              {state.team.companyCode}
            </div>
            <div>
              <strong>{t(lang, 'syncSecret')} :</strong> {state.team.syncSecret}
            </div>
            <button
              type="button"
              className="btn secondary"
              style={{ marginTop: 8 }}
              onClick={() => onGo('missions')}
            >
              🚚 {t(lang, 'missions')}
            </button>
          </div>
        ) : null}

        <label className="field check-row">
          <input
            type="checkbox"
            checked={state.settings.multiLocationEnabled === true}
            disabled={!isProPlan(getCachedPlanId()) && getCachedPlanId() !== 'trial'}
            onChange={(e) => {
              if (!isProPlan(getCachedPlanId()) && getCachedPlanId() !== 'trial') {
                window.alert(
                  'Multi-magasin réservé à AZ POS Pro (3 / 10 / illimité postes).',
                )
                return
              }
              onToggleMultiLocation(e.target.checked)
            }}
          />
          <span>
            <strong>{t(lang, 'multiLocation')}</strong>
            <div className="muted">{t(lang, 'multiLocationHint')}</div>
            {!isProPlan(getCachedPlanId()) && getCachedPlanId() !== 'trial' ? (
              <div className="muted">Licence 1 poste : un seul magasin. Passez en Pro pour plusieurs postes.</div>
            ) : (
              <div className="muted">
                Postes / dépôts autorisés :{' '}
                {getCachedSeatLimit() >= 9999 ? 'illimités' : getCachedSeatLimit()}
              </div>
            )}
          </span>
        </label>

        {state.settings.multiLocationEnabled ? (
          <div className="locations-block">
            <h3 style={{ margin: '8px 0' }}>{t(lang, 'locationsTitle')}</h3>
            <div className="field">
              <label>{t(lang, 'activeLocation')}</label>
              <select
                value={activeLocationId(state)}
                onChange={(e) => onSetActiveLocation(e.target.value)}
              >
                {state.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            {state.locations.map((l) => (
              <div className="list-item location-row" key={l.id}>
                <input
                  value={l.name}
                  onChange={(e) => onRenameLocation(l.id, e.target.value)}
                  aria-label={t(lang, 'locationName')}
                />
                {state.locations.length > 1 ? (
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => onDeleteLocation(l.id)}
                  >
                    {t(lang, 'deleteLocation')}
                  </button>
                ) : null}
              </div>
            ))}
            <div className="btn-row" style={{ marginTop: 8 }}>
              <input
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder={t(lang, 'locationName')}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn secondary"
                disabled={
                  !newLocName.trim() || state.locations.length >= getCachedSeatLimit()
                }
                onClick={() => {
                  onAddLocation(newLocName)
                  setNewLocName('')
                }}
              >
                {t(lang, 'addLocation')}
              </button>
            </div>
            {state.locations.length >= getCachedSeatLimit() ? (
              <p className="muted" style={{ marginTop: 6 }}>
                {t(lang, 'locationsMaxHint')}{' '}
                ({getCachedSeatLimit() >= 9999 ? '∞' : getCachedSeatLimit()} postes)
              </p>
            ) : null}

            {state.locations.length > 1 && state.products.length > 0 ? (
              <div className="transfer-block">
                <h3 style={{ margin: '14px 0 6px' }}>{t(lang, 'transferTitle')}</h3>
                <div className="muted" style={{ marginBottom: 8 }}>
                  {t(lang, 'transferHint')}
                </div>
                <div className="field">
                  <label>{t(lang, 'product')}</label>
                  <select
                    value={xferProductId}
                    onChange={(e) => setXferProductId(e.target.value)}
                  >
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label>{t(lang, 'transferFrom')}</label>
                    <select
                      value={xferFrom}
                      onChange={(e) => setXferFrom(e.target.value)}
                    >
                      {state.locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>{t(lang, 'transferTo')}</label>
                    <select
                      value={xferTo}
                      onChange={(e) => setXferTo(e.target.value)}
                    >
                      {state.locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>{t(lang, 'transferQty')}</label>
                  <input
                    inputMode="decimal"
                    value={xferQty}
                    onChange={(e) => setXferQty(e.target.value)}
                  />
                  {(() => {
                    const p = state.products.find((x) => x.id === xferProductId)
                    if (!p || !xferFrom) return null
                    return (
                      <p className="muted" style={{ margin: '6px 0 0' }}>
                        {t(lang, 'transferAvailable')} :{' '}
                        <strong>
                          {formatQty(stockAt(p, xferFrom))} {unitLabel(lang, p.unit)}
                        </strong>
                      </p>
                    )
                  })()}
                </div>
                <button
                  type="button"
                  className="btn block"
                  onClick={() => {
                    const qty = Number(xferQty) || 0
                    onTransfer(xferProductId, xferFrom, xferTo, qty)
                  }}
                >
                  {t(lang, 'transferDo')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="btn-row">
          <button className="btn secondary" onClick={() => onGo('stock')}>
            {t(lang, 'stock')}
          </button>
          <button className="btn secondary" onClick={() => onGo('gallery')}>
            🖼️ {t(lang, 'gallery')}
          </button>
          {state.team.multiPosteEnabled ? (
            <button className="btn secondary" onClick={() => onGo('missions')}>
              🚚 {t(lang, 'missions')}
            </button>
          ) : null}
          <button className="btn secondary" onClick={() => onGo('expenses')}>
            💸 {t(lang, 'expenses')}
          </button>
          <button className="btn secondary" onClick={() => onGo('calculator')}>
            🧮 {t(lang, 'calculator')}
          </button>
          <button className="btn secondary" onClick={() => onGo('zakat')}>
            {t(lang, 'zakat')}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>🤖 {t(lang, 'agentRightsTitle')}</h2>
        <div className="notice">{t(lang, 'agentRightsHint')}</div>
        {(
          [
            ['navigate', 'agentPermNavigate'],
            ['readBusiness', 'agentPermRead'],
            ['editSettings', 'agentPermSettings'],
            ['organizeUi', 'agentPermOrganize'],
            ['mutateBusiness', 'agentPermMutate'],
            ['openExternal', 'agentPermExternal'],
            ['agenticLoop', 'agentPermAgentic'],
          ] as const
        ).map(([key, labelKey]) => (
          <label className="field check-row" key={key}>
            <input
              type="checkbox"
              checked={agentPerms[key]}
              onChange={(e) => patchPerm(key, e.target.checked)}
            />
            <span>{t(lang, labelKey)}</span>
          </label>
        ))}
        <button type="button" className="btn secondary block" onClick={() => onGo('agent')}>
          🤖 {t(lang, 'agent')}
        </button>
      </div>

      <div className="card">
        <h2>{t(lang, 'setupCommerceTitle')}</h2>
        <p className="muted">{t(lang, 'setupCurrent')}</p>
        <div className="notice" style={{ marginBottom: 12 }}>
          {countryDisplayName(state.settings.countryCode || 'DZ', lang)}
          {' · '}
          {modeLabel(state.settings.commerceMode || 'gros', lang)}
          {' · '}
          {domainName(domainById(state.settings.domainId || 'gros-alimentaire'), lang)}
        </div>
        {state.settings.domainId !== 'svc-jeux' ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              {t(lang, 'gameRoomHowTo')}
            </p>
            <button
              type="button"
              className="btn block"
              style={{ marginBottom: 8 }}
              onClick={() => {
                onState((s) =>
                  ensureGameStations(
                    updateSettings(s, {
                      commerceMode: 'services',
                      domainId: 'svc-jeux',
                      themeSource: 'metier',
                    }),
                  ),
                )
                onFlash('gameRoomActivated')
              }}
            >
              🎮 {t(lang, 'gameRoomActivate')}
            </button>
          </>
        ) : (
          <p className="notice" style={{ marginBottom: 12 }}>
            {t(lang, 'gameRoomActive')}
          </p>
        )}
        <button type="button" className="btn secondary block" onClick={onRedoSetup}>
          {t(lang, 'setupChangeType')}
        </button>
      </div>

      <MigrationImportCard
        lang={lang}
        state={state}
        onState={onState}
        onFlash={onFlash}
      />

      {isShopRetail(state.settings.commerceMode) ? (
        <div className="card">
          <h2>{t(lang, 'retailRayonsTitle')}</h2>
          <p className="muted">{t(lang, 'retailRayonsHint')}</p>
          {resolveRetailRayons(
            state.settings.domainId,
            state.settings,
            lang,
          ).map((r) => {
            const overrides = state.settings.retailRayons || []
            const current = overrides.find((o) => o.id === r.id)
            const labelValue =
              lang === 'ar'
                ? current?.labelAr ?? r.labelAr
                : current?.labelFr ?? r.labelFr
            return (
              <div className="field" key={r.id} style={{ marginBottom: 10 }}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      const next = resolveRetailRayons(
                        state.settings.domainId,
                        state.settings,
                        lang,
                      ).map((x) => {
                        const prev = overrides.find((o) => o.id === x.id)
                        return {
                          id: x.id,
                          enabled: x.id === r.id ? enabled : x.enabled,
                          labelFr: prev?.labelFr,
                          labelAr: prev?.labelAr,
                        }
                      })
                      onSave({ retailRayons: next })
                    }}
                  />
                  <span>
                    {r.emoji ? `${r.emoji} ` : ''}
                    <strong>{r.label}</strong>
                    <div className="muted">{t(lang, 'retailRayonEnabled')}</div>
                  </span>
                </label>
                <input
                  value={labelValue}
                  placeholder={t(lang, 'retailRayonLabel')}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = resolveRetailRayons(
                      state.settings.domainId,
                      state.settings,
                      lang,
                    ).map((x) => {
                      const prev = overrides.find((o) => o.id === x.id)
                      return {
                        id: x.id,
                        enabled: x.enabled,
                        labelFr:
                          x.id === r.id && lang !== 'ar'
                            ? v
                            : prev?.labelFr,
                        labelAr:
                          x.id === r.id && lang === 'ar'
                            ? v
                            : prev?.labelAr,
                      }
                    })
                    onSave({ retailRayons: next })
                  }}
                />
              </div>
            )
          })}
        </div>
      ) : null}

      {showGameStations(state.settings.commerceMode, state.settings.domainId) ? (
        <GamePriceAdminCard
          state={state}
          lang={lang}
          onState={(next) => onState(() => next)}
          onFlash={(msg) => onFlash(msg)}
        />
      ) : null}

      <div className="card">
        <h2>{t(lang, 'shopInfo')}</h2>
        <div className="field">
          <label>{t(lang, 'shopName')}</label>
          <input value={shopName} onChange={(e) => setShopName(e.target.value)} />
        </div>
        <div className="field">
          <label>{t(lang, 'phone')}</label>
          <DzPhoneInput
            value={phone}
            onChange={setPhone}
            countryCode={state.settings.countryCode || 'DZ'}
            placeholder={countryByCode(state.settings.countryCode || 'DZ').phoneHint}
          />
          <div className="muted">{countryByCode(state.settings.countryCode || 'DZ').phoneHint}</div>
        </div>
        <div className="field">
          <label>{cityLabel(state.settings.countryCode || 'DZ', lang)}</label>
          {(state.settings.countryCode || 'DZ') === 'DZ' ? (
            <WilayaSelect lang={lang} value={city} onChange={setCity} />
          ) : (
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          )}
        </div>
        <button className="btn block" onClick={() => saveAll()}>
          {t(lang, 'save')}
        </button>
      </div>
    </>
  )
}

function HomePage({
  state,
  stats,
  lang,
  low,
  clinicStation,
  onState,
  onFlash,
  onGo,
  onFocusClient,
  onFocusProduct,
  onSeedNewProduct,
  onSeedProductSearch,
  onSeedNewClient,
  onSeedSell,
  onOpenTableOrder,
  onOpenGymSession,
  onOpenHistoryDates,
  onEnableAlerts,
  onWhatsapp,
  onPrint,
  onBoth,
  onInvoice,
  onOpenExpertCompta,
}: {
  state: AppState
  stats: {
    todayCount: number
    todayTotal: number
    todayCash: number
    todayProfit: number
    todayExpenses: number
    monthExpenses: number
    netToday: number
    stockValue: number
    stockCost: number
    stockMargin: number
    lowStock: number
    pendingInbox: number
    credits: number
    overdueCount: number
  }
  lang: Language
  low: Product[]
  clinicStation: ClinicStation | null
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  onGo: (s: Screen, spokenLabel?: string) => void
  onFocusClient: (id: string) => void
  onFocusProduct: (id: string) => void
  onSeedNewProduct: (barcode: string) => void
  onSeedProductSearch: (query: string) => void
  onSeedNewClient: (note: string) => void
  onSeedSell: (productId: string) => void
  /** Ouvre une table (resto) : crée/reprend le ticket en attente puis va à la caisse */
  onOpenTableOrder: (tableId: string, heldSaleId?: string) => void
  /** Ouvre le ticket session salle de sport en caisse */
  onOpenGymSession: (sessionId: string) => void
  onOpenHistoryDates: (from: string, to: string) => void
  onEnableAlerts: () => void
  onWhatsapp: (order: Order) => void
  onPrint: (order: Order) => Promise<void>
  onBoth: (order: Order) => Promise<void>
  onInvoice: (order: Order) => void
  /** Expert comptable horizontal (tous métiers) */
  onOpenExpertCompta: () => void
}) {
  const domainId = state.settings.domainId
  const vocab = shopVocab(state.settings.commerceMode, lang, domainId)
  const mcopy = metierCopy(domainId, state.settings.commerceMode, lang)
  const feats = metierPackFor(domainId, state.settings.commerceMode).features
  const recent = (todayOrders(state).length > 0 ? todayOrders(state) : state.orders).slice(0, 4)
  const [scanOpen, setScanOpen] = useState(false)
  const [unknownCode, setUnknownCode] = useState<string | null>(null)
  const [showMoreApps, setShowMoreApps] = useState(false)
  const overdue = useMemo(() => overdueCreditOrders(state), [state])
  const soon = useMemo(() => dueSoonCreditOrders(state, 3), [state])
  const needsSetup = state.products.length === 0

  function handleHit(hit: SearchHit) {
    if (hit.clientId) {
      onFocusClient(hit.clientId)
      onGo('clients', hit.label)
      return
    }
    if (hit.screen) onGo(hit.screen, hit.label)
  }

  function handleHomeScan(code: string) {
    const hit = classifyHomeScan(code, state.clients, state.products)
    if (hit.kind === 'client' && hit.clientId) {
      onFocusClient(hit.clientId)
      onGo('clients', t(lang, 'appClients'))
      return
    }
    if (hit.kind === 'member') {
      if (hit.clientId) {
        onFocusClient(hit.clientId)
        onGo('clients', vocab.client)
        return
      }
      if (hit.nfcUid) {
        onSeedNewClient(`NFC:${hit.nfcUid}`)
        onGo('clients', vocab.client)
        return
      }
    }
    if (hit.kind === 'product' && hit.productId) {
      if (isWholesale(state.settings.commerceMode)) {
        onFocusProduct(hit.productId)
        onGo('products', t(lang, 'appStock'))
      } else {
        onSeedSell(hit.productId)
        onGo('order', vocab.sell)
      }
      return
    }
    playBarcodeError()
    setUnknownCode(hit.code)
  }

  const mode = state.settings.commerceMode
  const isDoctor = clinicStation === 'doctor'
  const isReception = clinicStation === 'reception'
  const dailyApps: Array<{
    id: Screen
    label: string
    icon: string
    tone: string
    badge?: number
  }> =
    isDoctor
      ? [
          { id: 'clients', label: vocab.client, icon: '👤', tone: 'navy' },
          {
            id: 'products',
            label: vocab.product,
            icon: '📦',
            tone: 'blue',
            badge: stats.lowStock,
          },
          { id: 'history', label: mcopy.historyLabel, icon: '📜', tone: 'slate' },
        ]
      : isReception
        ? [
            { id: 'order', label: vocab.sell, icon: '💵', tone: 'amber' },
            {
              id: 'products',
              label: vocab.product,
              icon: '📦',
              tone: 'blue',
              badge: stats.lowStock,
            },
            { id: 'clients', label: vocab.client, icon: '👤', tone: 'navy' },
            { id: 'caisse', label: t(lang, 'appCaisse'), icon: '💵', tone: 'amber' },
          ]
        : mode === 'sante'
      ? [
          { id: 'clients', label: vocab.client, icon: '👤', tone: 'navy' },
          {
            id: 'products',
            label: vocab.product,
            icon: '📦',
            tone: 'blue',
            badge: stats.lowStock,
          },
          { id: 'caisse', label: t(lang, 'appCaisse'), icon: '💵', tone: 'amber' },
          { id: 'history', label: mcopy.historyLabel, icon: '📜', tone: 'slate' },
        ]
      : mode === 'auto'
        ? [
            {
              id: 'products',
              label: vocab.product,
              icon: '📦',
              tone: 'blue',
              badge: stats.lowStock,
            },
            { id: 'clients', label: vocab.client, icon: '👥', tone: 'navy' },
            { id: 'caisse', label: t(lang, 'appCaisse'), icon: '💵', tone: 'amber' },
            { id: 'history', label: mcopy.historyLabel, icon: '📜', tone: 'slate' },
          ]
        : mode === 'services'
          ? feats.gameStations
            ? [
                { id: 'order', label: vocab.sell, icon: '🎮', tone: 'amber' },
                {
                  id: 'products',
                  label: vocab.product,
                  icon: '📦',
                  tone: 'blue',
                  badge: stats.lowStock,
                },
                { id: 'caisse', label: t(lang, 'appCaisse'), icon: '💵', tone: 'amber' },
                { id: 'history', label: mcopy.historyLabel, icon: '📜', tone: 'slate' },
              ]
            : [
              {
                id: 'products',
                label: vocab.product,
                icon: '📦',
                tone: 'blue',
                badge: stats.lowStock,
              },
              { id: 'clients', label: vocab.client, icon: '👥', tone: 'navy' },
              { id: 'caisse', label: t(lang, 'appCaisse'), icon: '💵', tone: 'amber' },
              { id: 'history', label: mcopy.historyLabel, icon: '📜', tone: 'slate' },
            ]
          : isWholesale(mode)
            ? [
                { id: 'clients', label: vocab.client, icon: '👥', tone: 'navy' },
                ...(showDelivery(mode, domainId)
                  ? [
                      {
                        id: 'delivery' as Screen,
                        label: t(lang, 'appMaps'),
                        icon: '🗺️',
                        tone: 'teal',
                      },
                    ]
                  : []),
                { id: 'caisse', label: t(lang, 'appCaisse'), icon: '💵', tone: 'amber' },
                {
                  id: 'products',
                  label: vocab.product,
                  icon: '📦',
                  tone: 'blue',
                  badge: stats.lowStock,
                },
              ]
            : [
                {
                  id: 'products',
                  label: vocab.product,
                  icon: feats.tableService ? '🍽️' : '🛍️',
                  tone: 'blue',
                  badge: stats.lowStock,
                },
                { id: 'caisse', label: t(lang, 'appCaisse'), icon: '💵', tone: 'amber' },
                { id: 'history', label: mcopy.historyLabel, icon: '📜', tone: 'slate' },
                { id: 'clients', label: vocab.client, icon: '👥', tone: 'navy' },
              ]

  const canSell = sellerCan(state, 'sell')

  const depot = showDepotTools(state.settings.commerceMode, domainId)
  const moreApps: Array<{
    id: Screen
    label: string
    icon: string
    tone: string
    badge?: number
  }> = [
    ...(depot
      ? [
          ...(state.team.multiPosteEnabled
            ? [
                {
                  id: 'missions' as Screen,
                  label: t(lang, 'appMissions'),
                  icon: '🚚',
                  tone: 'lime',
                  badge: state.missions.filter((m) => m.status !== 'done').length || undefined,
                },
              ]
            : []),
          { id: 'purchases' as Screen, label: t(lang, 'appPurchases'), icon: '🏭', tone: 'steel' },
          {
            id: 'inbox' as Screen,
            label: t(lang, 'appInbox'),
            icon: '📥',
            tone: 'coral',
            badge: stats.pendingInbox,
          },
          { id: 'arrivages' as Screen, label: t(lang, 'appArrivals'), icon: '🆕', tone: 'lime' },
        ]
      : []),
    // En gros : Historique passe ici (la Carte est sur la grille principale)
    ...(isWholesale(mode)
      ? [{ id: 'history' as Screen, label: mcopy.historyLabel, icon: '📜', tone: 'slate' }]
      : []),
    ...(state.settings.showGallery !== false && showGallery(state.settings.commerceMode, domainId)
      ? [{ id: 'gallery' as Screen, label: t(lang, 'appGallery'), icon: '🖼️', tone: 'blue' }]
      : []),
    ...(showReturns(state.settings.commerceMode, domainId)
      ? [{ id: 'returns' as Screen, label: t(lang, 'appReturns'), icon: '↩️', tone: 'coral' }]
      : []),
    { id: 'agent' as Screen, label: t(lang, 'appAgent'), icon: '🤖', tone: 'slate' },
    { id: 'digital' as Screen, label: t(lang, 'appDigital'), icon: '🚀', tone: 'blue' },
    { id: 'expenses' as Screen, label: t(lang, 'appExpenses'), icon: '💸', tone: 'rose' },
    { id: 'profits' as Screen, label: t(lang, 'appProfits'), icon: '💰', tone: 'amber' },
    { id: 'stock' as Screen, label: t(lang, 'appValue'), icon: '📈', tone: 'emerald' },
    ...(showProduction(mode, domainId)
      ? [{ id: 'production' as Screen, label: t(lang, 'prodTitle'), icon: '🥖', tone: 'amber' }]
      : []),
    ...(state.settings.showZakat !== false
      ? [{ id: 'zakat' as Screen, label: t(lang, 'appZakat'), icon: '🌙', tone: 'forest' }]
      : []),
    ...(state.settings.showCalculator !== false
      ? [{ id: 'calculator' as Screen, label: t(lang, 'appCalc'), icon: '🧮', tone: 'steel' }]
      : []),
    ...(feats.staffHr || showStaffHr(mode, domainId)
      ? [{ id: 'staff' as Screen, label: t(lang, 'staffTitle'), icon: '👥', tone: 'navy' }]
      : []),
    { id: 'sellers' as Screen, label: t(lang, 'sellersTitle'), icon: '🧍', tone: 'navy' },
    { id: 'settings' as Screen, label: t(lang, 'appSettings'), icon: '⚙️', tone: 'charcoal' },
  ].filter((app) => sellerCanAccessScreen(state, app.id))

  const dailyAppsFiltered = dailyApps.filter((app) =>
    sellerCanAccessScreen(state, app.id),
  )
  const optionalApps: Array<{
    id: Screen
    label: string
    icon: string
    tone: string
    badge?: number
  }> = OPTIONAL_TOOLS.filter((tool) => isToolEnabled(state.settings, tool.id))
    .map((tool) => ({
      id: tool.screen,
      label: toolLabel(tool, lang),
      icon: tool.icon,
      tone: tool.tone,
    }))
    .filter((app) => sellerCanAccessScreen(state, app.id))
  const moreBadge = moreApps.reduce((n, app) => n + (app.badge ?? 0), 0)

  return (
    <div className="home-screen">
      <SellerSwitcherBar
        state={state}
        lang={lang}
        onState={onState}
        onFlash={onFlash}
        onManage={
          sellerCan(state, 'manageSellers')
            ? () => onGo('sellers', t(lang, 'sellersTitle'))
            : undefined
        }
      />
      <StockAlertCard
        products={low}
        lang={lang}
        enabled={state.settings.stockAlertsEnabled}
        onEnable={onEnableAlerts}
      />
      <DueAlertCard
        overdue={overdue}
        soon={soon}
        lang={lang}
        enabled={state.settings.stockAlertsEnabled}
        onEnable={onEnableAlerts}
        onOpenClient={(id) => {
          onFocusClient(id)
          onGo('clients', t(lang, 'appClients'))
        }}
      />

      {showClinicAgenda(mode, domainId) ? (
        <ClinicAgendaPanel
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}

      {showTableService(mode, domainId) ? (
        <TableFloorPanel
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
          onOpenTable={(tableId, heldSaleId) => onOpenTableOrder(tableId, heldSaleId)}
        />
      ) : null}

      {showGameStations(mode, domainId) ? (
        <GameStationsPanel
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}

      {showRepairOrder(mode, domainId) ? (
        <RepairOrderPanel
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}

      {showGymCheckin(mode, domainId) ? (
        <GymCheckinPanel
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
          onBindUnknown={(uid) => {
            onSeedNewClient(`NFC:${uid}`)
            onGo('clients', vocab.client)
          }}
          onOpenSession={(session) => {
            onOpenGymSession(session.id)
          }}
        />
      ) : null}

      <ExpertComptableCard
        state={state}
        lang={lang}
        onOpen={onOpenExpertCompta}
      />

      {isReception ? (
        <ReceptionCashQueue
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
          onFocusClient={(id) => {
            onFocusClient(id)
            onGo('clients', vocab.client)
          }}
          onGoEncaisser={(clientId) => {
            onFocusClient(clientId)
            onGo('order', vocab.sell)
          }}
        />
      ) : null}

      <section className="home-hero">
        <div className="home-hero-text">
          <h2 className="home-shop">{state.settings.shopName || APP_BRAND.defaultShopName}</h2>
        </div>
        <GlobalSmartSearch
          state={state}
          lang={lang}
          onHit={handleHit}
          onOpenHistory={onOpenHistoryDates}
        />
        {showHomeScan(mode, domainId) ? (
        <button
          type="button"
          className="scan-cta"
          onClick={() => {
            if (!isBarcodeCameraSupported()) {
              window.alert(t(lang, 'barcodeCamUnsupported'))
              return
            }
            setScanOpen(true)
          }}
          aria-label={t(
            lang,
            isWholesale(mode)
              ? 'homeScanTitleGros'
              : mode === 'auto'
                ? 'homeScanTitleAuto'
                : 'homeScanTitleRetail',
          )}
        >
          <span className="sell-cta-emoji">📷</span>
        </button>
        ) : null}
        {!isDoctor && canSell ? (
        <button
          type="button"
          className="sell-cta"
          onClick={() => onGo('order', vocab.sell)}
          aria-label={mcopy.primaryCta || vocab.sell}
        >
          <span className="sell-cta-emoji">
            {mode === 'sante'
              ? '🩺'
              : mode === 'auto'
                ? '🚗'
                : mode === 'services'
                  ? '🧰'
                  : isWholesale(mode)
                    ? '📦'
                    : '🛒'}
          </span>
        </button>
        ) : null}
        {sellerCan(state, 'viewHistory') ? (
        <button
          type="button"
          className="history-cta"
          onClick={() => onGo('history', t(lang, 'appHistory'))}
          aria-label={mt(state.settings.commerceMode, lang, 'salesHistoryBtn')}
        >
          <span className="cal">📅</span>
        </button>
        ) : null}
      </section>

      {needsSetup ? (
        <section className="start-guide" aria-label={t(lang, 'startHere')}>
          <button type="button" className="start-step" onClick={() => onGo('products', vocab.product)}>
            <strong>1. {vocab.product}</strong>
          </button>
          {!isShopRetail(state.settings.commerceMode) ? (
          <button type="button" className="start-step" onClick={() => onGo('clients', vocab.client)}>
            <strong>2. {vocab.client}</strong>
          </button>
          ) : null}
          <button type="button" className="start-step" onClick={() => onGo('order', vocab.sell)}>
            <strong>
              {isShopRetail(state.settings.commerceMode) ? '2' : '3'}. {vocab.sell}
            </strong>
          </button>
        </section>
      ) : null}

      <section className="home-apps" aria-label={t(lang, 'appMenu')}>
        <div className="app-grid">
          {dailyAppsFiltered.map((app) => (
            <button
              key={app.id}
              type="button"
              className="app-tile"
              onClick={() => onGo(app.id, app.label)}
            >
              <span className={`app-icon tone-${app.tone}`}>
                {app.icon}
                {app.badge && app.badge > 0 ? (
                  <i className="app-badge">{app.badge > 99 ? '99+' : app.badge}</i>
                ) : null}
              </span>
              <span className="app-label">{app.label}</span>
            </button>
          ))}
        </div>

        {optionalApps.length > 0 ? (
          <div className="app-grid" style={{ marginTop: 10 }} aria-label={t(lang, 'showIconsTitle')}>
            {optionalApps.map((app) => (
              <button
                key={app.id}
                type="button"
                className="app-tile"
                onClick={() => onGo(app.id, app.label)}
              >
                <span className={`app-icon tone-${app.tone}`}>{app.icon}</span>
                <span className="app-label">{app.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="more-apps-btn"
          onClick={() => setShowMoreApps((v) => !v)}
        >
          {showMoreApps ? t(lang, 'hideMoreApps') : t(lang, 'moreApps')}
          {!showMoreApps && moreBadge > 0 ? (
            <i className="app-badge inline">{moreBadge > 99 ? '99+' : moreBadge}</i>
          ) : null}
        </button>

        {showMoreApps ? (
          <div className="app-grid more-grid">
            {moreApps.map((app) => (
              <button
                key={app.id}
                type="button"
                className="app-tile"
                onClick={() => onGo(app.id, app.label)}
              >
                <span className={`app-icon tone-${app.tone}`}>
                  {app.icon}
                  {app.badge && app.badge > 0 ? (
                    <i className="app-badge">{app.badge > 99 ? '99+' : app.badge}</i>
                  ) : null}
                </span>
                <span className="app-label">{app.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="card home-recent">
        <div className="list-item" style={{ borderBottom: 'none', paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>{mt(state.settings.commerceMode, lang, 'lastOrders')}</h2>
          <button type="button" className="btn secondary" onClick={() => onGo('history', mt(state.settings.commerceMode, lang, 'history'))}>
            📜 {mt(state.settings.commerceMode, lang, 'history')}
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="empty">{mt(state.settings.commerceMode, lang, 'noOrdersToday')}</div>
        ) : (
          recent.map((o) => (
            <div className="order-block" key={o.id}>
              <div className="list-item">
                <div>
                  <strong>{o.clientName}</strong>
                  <div className="muted">
                    {o.invoiceNumber ? `N°${o.invoiceNumber} · ` : ''}
                    {o.remainingDa > 0.001
                      ? `${t(lang, 'paidPartial')} ${formatDa(o.paidDa ?? 0)} · ${t(lang, 'stillOwes')} ${formatDa(o.remainingDa)}`
                      : t(lang, 'paidFull')}
                  </div>
                </div>
                <strong>{formatDa(o.totalDa)}</strong>
              </div>
              <OrderShareButtons
                mode={state.settings.commerceMode}
                lang={lang}
                hasPhone={!!o.clientPhone}
                onWhatsapp={() => onWhatsapp(o)}
                onPrint={() => onPrint(o)}
                onBoth={() => onBoth(o)}
                onInvoice={() => onInvoice(o)}
              />
            </div>
          ))
        )}
      </div>

      {scanOpen ? (
        <BarcodeCameraModal
          lang={lang}
          title={t(lang, 'homeScanTitle')}
          hint={t(lang, 'homeScanCamHint')}
          onDetect={handleHomeScan}
          onClose={() => setScanOpen(false)}
        />
      ) : null}

      {unknownCode ? (
        <div className="barcode-cam-overlay" role="dialog" aria-modal="true">
          <div className="barcode-cam-card">
            <h3>❓ {t(lang, 'scanUnknownTitle')}</h3>
            <p className="muted">{t(lang, 'scanUnknownHint')}</p>
            <div className="notice warn" style={{ wordBreak: 'break-all' }}>
              {unknownCode}
            </div>
            <button
              type="button"
              className="btn block"
              style={{ marginTop: 10 }}
              onClick={() => {
                const code = unknownCode
                setUnknownCode(null)
                onSeedNewProduct(code)
                onGo('products', t(lang, 'newProduct'))
              }}
            >
              ➕ {t(lang, 'scanAddProduct')}
            </button>
            <button
              type="button"
              className="btn secondary block"
              style={{ marginTop: 8 }}
              onClick={() => {
                const code = unknownCode
                setUnknownCode(null)
                onSeedNewClient(`${t(lang, 'scanCodeNote')}: ${code}`)
                onGo('clients', t(lang, 'appClients'))
              }}
            >
              👤 {t(lang, 'scanAddClient')}
            </button>
            <button
              type="button"
              className="btn secondary block"
              style={{ marginTop: 8 }}
              onClick={() => {
                const code = unknownCode
                setUnknownCode(null)
                onSeedProductSearch(code)
                onGo('products', t(lang, 'appStock'))
              }}
            >
              🔍 {t(lang, 'scanManualSearch')}
            </button>
            <button
              type="button"
              className="btn ghost block"
              style={{ marginTop: 8 }}
              onClick={() => setUnknownCode(null)}
            >
              {t(lang, 'cancel')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HistoryPage({
  state,
  lang,
  seedFrom,
  seedTo,
  onSeedConsumed,
  onWhatsapp,
  onPrint,
  onBoth,
  onInvoice,
  onOpenClient,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  seedFrom?: string
  seedTo?: string
  onSeedConsumed?: () => void
  onWhatsapp: (order: Order) => void
  onPrint: (order: Order) => Promise<void>
  onBoth: (order: Order) => Promise<void>
  onInvoice: (order: Order) => void
  onOpenClient?: (id: string) => void
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ActivityKind>('all')
  const [dayPreset, setDayPreset] = useState<
    'all' | 'today' | 'yesterday' | 'week' | 'month'
  >('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editOrderId, setEditOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!seedFrom && !seedTo) return
    setDateFrom(seedFrom || '')
    setDateTo(seedTo || '')
    setDayPreset('all')
    onSeedConsumed?.()
  }, [seedFrom, seedTo, onSeedConsumed])

  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ'
  const allItems = useMemo(() => buildActivityLog(state, lang), [state, lang])

  const suggestions = useMemo(() => {
    const names = [
      ...state.clients.map((c) => c.name),
      ...state.products.map((p) => p.name),
      ...state.orders
        .map((o) => o.invoiceNumber)
        .filter(Boolean)
        .map((n) => `N°${n}`),
      mt(state.settings.commerceMode, lang, 'act_order'),
      t(lang, 'act_invoice'),
      t(lang, 'act_client'),
      t(lang, 'act_cash'),
    ]
    return suggestNames(names, query, 10)
  }, [state, query, lang])

  const filtered = useMemo(
    () =>
      filterActivity(allItems, {
        kind,
        query,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        dayPreset: dateFrom || dateTo ? 'all' : dayPreset,
      }),
    [allItems, kind, query, dateFrom, dateTo, dayPreset],
  )

  const ordersInView = useMemo(() => {
    const ids = new Set(
      filtered.filter((f) => f.orderId).map((f) => f.orderId as string),
    )
    return state.orders.filter((o) => ids.has(o.id))
  }, [filtered, state.orders])

  const editing = editOrderId
    ? state.orders.find((o) => o.id === editOrderId) ?? null
    : null

  if (editing) {
    return (
      <div className="page">
        <OrderRevisePanel
          lang={lang}
          order={editing}
          onState={onState}
          onFlash={onFlash}
          onClose={() => setEditOrderId(null)}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <h2>📜 {mt(state.settings.commerceMode, lang, 'history')}</h2>
        <p className="muted">{mt(state.settings.commerceMode, lang, 'historyActivityHint')}</p>

        <SmartSearchBar
          lang={lang}
          value={query}
          onChange={setQuery}
          placeholder={t(lang, 'searchHistoryHint')}
          suggestions={suggestions}
          showCalendar
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFrom={(v) => {
            setDateFrom(v)
            setDayPreset('all')
          }}
          onDateTo={(v) => {
            setDateTo(v)
            setDayPreset('all')
          }}
        />

        <div className="field">
          <label>📅 {t(lang, 'historyPeriod')}</label>
          <select
            value={dayPreset}
            onChange={(e) => {
              setDayPreset(e.target.value as typeof dayPreset)
              setDateFrom('')
              setDateTo('')
            }}
          >
            <option value="all">{t(lang, 'filterAll')}</option>
            <option value="today">{t(lang, 'filterToday')}</option>
            <option value="yesterday">{t(lang, 'filterYesterday')}</option>
            <option value="week">{t(lang, 'filterWeek')}</option>
            <option value="month">{t(lang, 'filterMonth')}</option>
          </select>
        </div>

        <div className="field">
          <label>{t(lang, 'historyType')}</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ActivityKind)}
          >
            <option value="all">{t(lang, 'act_all')}</option>
            <option value="order">{mt(state.settings.commerceMode, lang, 'act_order')}</option>
            <option value="invoice">{t(lang, 'act_invoice')}</option>
            <option value="client">{t(lang, 'act_client')}</option>
            <option value="cash">{t(lang, 'act_cash')}</option>
            <option value="expense">{t(lang, 'act_expense')}</option>
            <option value="product">{t(lang, 'act_product')}</option>
          </select>
        </div>

        <div className="btn-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          {(
            [
              ['all', 'act_all'],
              ['order', 'act_order'],
              ['invoice', 'act_invoice'],
              ['client', 'act_client'],
              ['cash', 'act_cash'],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              className={`btn ${kind === id ? '' : 'secondary'}`}
              onClick={() => setKind(id)}
            >
              {t(lang, key)}
            </button>
          ))}
        </div>

        <div className="home-chips">
          <div className="home-chip">
            <span>{t(lang, 'historyCount')}</span>
            <strong>{filtered.length}</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>{t(lang, 'activityList')}</h3>
        {filtered.length === 0 ? (
          <div className="empty">{t(lang, 'noHistory')}</div>
        ) : (
          filtered.map((a) => (
            <button
              type="button"
              className="activity-row"
              key={a.id}
              onClick={() => {
                if (a.clientId && a.kind === 'client' && onOpenClient) {
                  onOpenClient(a.clientId)
                }
              }}
            >
              <div className="activity-ico">
                {a.kind === 'order'
                  ? '🛒'
                  : a.kind === 'invoice'
                    ? '🧾'
                    : a.kind === 'client'
                      ? '👤'
                      : a.kind === 'cash'
                        ? '💵'
                        : a.kind === 'expense'
                          ? '💸'
                          : '📦'}
              </div>
              <div className="activity-body">
                <strong>{a.title}</strong>
                <div className="muted">
                  {new Date(a.at).toLocaleString(locale)} · {a.detail}
                </div>
              </div>
              {a.amountDa != null ? (
                <strong className="activity-amt">{formatDa(a.amountDa)}</strong>
              ) : null}
            </button>
          ))
        )}
      </div>

      {ordersInView.length > 0 && (kind === 'all' || kind === 'order' || kind === 'invoice') ? (
        <div className="card">
          <h3>{mt(state.settings.commerceMode, lang, 'ordersInPeriod')}</h3>
          {ordersInView.map((o) => (
            <div className="order-block" key={o.id}>
              <div className="list-item">
                <div>
                  <strong>{o.clientName}</strong>
                  <div className="muted">
                    {new Date(o.createdAt).toLocaleString(locale)}
                    {o.invoiceNumber ? ` · N°${o.invoiceNumber}` : ''}
                  </div>
                </div>
                <strong>{formatDa(o.totalDa)}</strong>
              </div>
              <OrderShareButtons
                mode={state.settings.commerceMode}
                lang={lang}
                hasPhone={!!o.clientPhone}
                onWhatsapp={() => onWhatsapp(o)}
                onPrint={() => onPrint(o)}
                onBoth={() => onBoth(o)}
                onInvoice={() => onInvoice(o)}
              />
              <button
                type="button"
                className="btn secondary block"
                style={{ marginTop: 8 }}
                onClick={() => setEditOrderId(o.id)}
              >
                ✏️ {t(lang, 'orderReviseBtn')}
                {o.revisedAt ? ` · ${t(lang, 'orderRevisedBadge')}` : ''}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function OrderShareButtons({
  lang,
  mode,
  onWhatsapp,
  onPrint,
  onBoth,
  onInvoice,
  stacked = false,
  hasPhone = true,
}: {
  lang: Language
  mode?: CommerceMode
  onWhatsapp: () => void
  onPrint: () => void | Promise<void>
  onBoth: () => void | Promise<void>
  onInvoice?: () => void
  stacked?: boolean
  hasPhone?: boolean
}) {
  return (
    <div className={stacked ? 'action-stack' : 'btn-row order-actions'}>
      <button className={`btn secondary icon-btn ${stacked ? 'block' : ''}`} onClick={() => void onPrint()}>
        <span className="btn-emoji">🖨️</span>
        <span>{t(lang, 'printTicket')}</span>
      </button>
      {hasPhone ? (
        <>
          <button className={`btn icon-btn ${stacked ? 'block' : ''}`} onClick={onWhatsapp}>
            <span className="btn-emoji">📲</span>
            <span>{t(lang, 'sendWhatsapp')}</span>
          </button>
          {onInvoice ? (
            <button className={`btn secondary icon-btn ${stacked ? 'block' : ''}`} onClick={onInvoice}>
              <span className="btn-emoji">🧾</span>
              <span>{t(lang, 'sendInvoice')}</span>
            </button>
          ) : null}
          <button className={`btn warn icon-btn ${stacked ? 'block' : ''}`} onClick={() => void onBoth()}>
            <span className="btn-emoji">🖨️📲</span>
            <span>{t(lang, 'whatsappTicket')}</span>
          </button>
        </>
      ) : (
        <div className="muted">{mt(mode, lang, 'noWhatsappQuick')}</div>
      )}
    </div>
  )
}

function GalleryPage({
  state,
  lang,
  onOrder,
  onEditStock,
}: {
  state: AppState
  lang: Language
  onOrder: () => void
  onEditStock: () => void
}) {
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)

  const productSuggestions = useMemo(() => {
    const names = [
      ...state.products.map((p) => p.name),
      ...CATEGORIES.map((c) => t(lang, `cat_${c}`)),
    ]
    return suggestNames(names, query, 10)
  }, [state.products, query, lang])

  const products = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...state.products]
      .filter((p) => inDateRange(p.createdAt, dateFrom, dateTo))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    if (!q) return list
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        t(lang, `cat_${p.category}`).toLowerCase().includes(q),
    )
  }, [state.products, query, dateFrom, dateTo, lang])

  const preview = products.find((p) => p.id === previewId) ?? null

  return (
    <div className="page">
      <div className="card">
        <h2>{t(lang, 'galleryTitle')}</h2>
        <p className="muted">{t(lang, 'galleryHint')}</p>
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <button className="btn" onClick={onOrder}>
            🛒 {t(lang, 'orderThis')}
          </button>
          <button className="btn secondary" onClick={onEditStock}>
            📦 {t(lang, 'viewStock')}
          </button>
        </div>
        <SmartSearchBar
          lang={lang}
          value={query}
          onChange={setQuery}
          placeholder={t(lang, 'searchProductsSmartHint')}
          suggestions={productSuggestions}
          showCalendar
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
        />
      </div>

      {products.length === 0 ? (
        <div className="card empty">{t(lang, 'noProductFound')}</div>
      ) : (
        <div className="gallery-grid">
          {products.map((p) => (
            <button
              type="button"
              className="gallery-tile"
              key={p.id}
              onClick={() => setPreviewId(p.id)}
            >
              <img src={productDisplaySrc(p.name, p.category, p.imageDataUrl)} alt={p.name} />
              <div className="gallery-tile-meta">
                <strong>{p.name}</strong>
                <span>
                  {formatDa(p.priceDa)} / {unitLabel(lang, p.unit)}
                </span>
                <span className="muted">
                  {t(lang, 'stockQty')} : {formatQty(displayStock(state, p))}
                  {state.settings.multiLocationEnabled
                    ? ` · ${t(lang, 'stockTotal')} ${formatQty(p.stock)}`
                    : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {preview ? (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="gallery-lightbox-card"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={productDisplaySrc(preview.name, preview.category, preview.imageDataUrl)}
              alt={preview.name}
            />
            <div className="gallery-lightbox-body">
              <h3>{preview.name}</h3>
              <p className="muted">
                {t(lang, `cat_${preview.category}`)} ·{' '}
                {formatDa(preview.priceDa)} / {unitLabel(lang, preview.unit)}
              </p>
              <p>
                {t(lang, 'stockQty')} : {formatQty(displayStock(state, preview))}{' '}
                {unitLabel(lang, preview.unit)}
                {state.settings.multiLocationEnabled
                  ? ` · ${t(lang, 'stockTotal')} ${formatQty(preview.stock)}`
                  : ''}
              </p>
              <div className="btn-row">
                <button className="btn" onClick={onOrder}>
                  🛒 {t(lang, 'orderThis')}
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setPreviewId(null)}
                >
                  {t(lang, 'cancelEdit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PhotoPickControls({
  lang,
  busy,
  hasPhoto,
  onPick,
  onRemove,
}: {
  lang: Language
  busy: boolean
  hasPhoto: boolean
  onPick: (file: File | null | undefined) => void
  onRemove?: () => void
}) {
  return (
    <div className="product-photo-actions">
      <div className="btn-row photo-pick-row">
        <label className={`btn secondary photo-file-btn ${busy ? 'disabled' : ''}`}>
          🖼️ {t(lang, 'fromGallery')}
          <input
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
            disabled={busy}
            onChange={(e) => {
              onPick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        <label className={`btn secondary photo-file-btn ${busy ? 'disabled' : ''}`}>
          📷 {t(lang, 'takePhoto')}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(e) => {
              onPick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {busy ? <div className="muted">{t(lang, 'photoBusy')}</div> : null}
      {hasPhoto && onRemove ? (
        <button type="button" className="btn ghost" onClick={onRemove}>
          {t(lang, 'removePhoto')}
        </button>
      ) : null}
    </div>
  )
}

function ProductPricingFields({
  lang,
  costDa,
  setCostDa,
  priceDa,
  setPriceDa,
  demiGrosPriceDa,
  setDemiGrosPriceDa,
  piecesPerPack,
  setPiecesPerPack,
  grosPriceDa,
  setGrosPriceDa,
  superGrosPriceDa,
  setSuperGrosPriceDa,
  packOptionRows,
  setPackOptionRows,
  stock,
  setStock,
  showLowStock,
  lowStockAt,
  setLowStockAt,
  commerceMode,
}: {
  lang: Language
  commerceMode?: CommerceMode
  costDa: string
  setCostDa: (v: string) => void
  priceDa: string
  setPriceDa: (v: string) => void
  demiGrosPriceDa: string
  setDemiGrosPriceDa: (v: string) => void
  piecesPerPack: string
  setPiecesPerPack: (v: string) => void
  grosPriceDa: string
  setGrosPriceDa: (v: string) => void
  superGrosPriceDa: string
  setSuperGrosPriceDa: (v: string) => void
  packOptionRows: { size: string; priceDa: string }[]
  setPackOptionRows: (rows: { size: string; priceDa: string }[]) => void
  stock: string
  setStock: (v: string) => void
  showLowStock?: boolean
  lowStockAt?: string
  setLowStockAt?: (v: string) => void
}) {
  const ppp = Number(piecesPerPack) || 0
  const gros = Number(grosPriceDa) || 0
  const superG = Number(superGrosPriceDa) || 0
  const wholesale = showWholesaleTiers(commerceMode)

  return (
    <>
      <div className="field">
        <label>{t(lang, 'costPrice')}</label>
        <input
          inputMode="decimal"
          value={costDa}
          onChange={(e) => setCostDa(e.target.value)}
          placeholder="0"
        />
        <div className="muted">{t(lang, 'costPriceHint')}</div>
      </div>

      <div className="pricing-board">
        <h3 className="pricing-board-title">💰 {mt(commerceMode, lang, 'pricingBoardTitle')}</h3>
        {wholesale ? (
          <p className="muted pricing-board-hint">{t(lang, 'pricingBoardHint')}</p>
        ) : null}

        <div className="pricing-row tone-piece">
          <div className="pricing-emoji">1️⃣</div>
          <div className="field" style={{ margin: 0, flex: 1 }}>
            <label>{t(lang, 'pricePiece')}</label>
            <input
              inputMode="decimal"
              value={priceDa}
              onChange={(e) => setPriceDa(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>

        {showDemiGros(commerceMode) ? (
        <div className="pricing-row tone-demi">
          <div className="pricing-emoji">📦</div>
          <div className="field" style={{ margin: 0, flex: 1 }}>
            <label>{t(lang, 'priceDemiGros')}</label>
            <input
              inputMode="decimal"
              value={demiGrosPriceDa}
              onChange={(e) => setDemiGrosPriceDa(e.target.value)}
              placeholder="90"
            />
            <div className="muted">{t(lang, 'priceDemiGrosHint')}</div>
          </div>
        </div>
        ) : null}

        {wholesale ? (
        <>
        <div className="pricing-row tone-carton">
          <div className="pricing-emoji">📦📦</div>
          <div style={{ flex: 1 }}>
            <div className="field">
              <label>{t(lang, 'piecesPerPack')}</label>
              <input
                inputMode="numeric"
                value={piecesPerPack}
                onChange={(e) =>
                  setPiecesPerPack(e.target.value.replace(/\D/g, ''))
                }
                placeholder="24"
              />
              <div className="muted">{t(lang, 'piecesPerPackHint')}</div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>{t(lang, 'priceGros')}</label>
              <input
                inputMode="decimal"
                value={grosPriceDa}
                onChange={(e) => setGrosPriceDa(e.target.value)}
                placeholder="2000"
              />
              <div className="muted">{t(lang, 'priceGrosHint')}</div>
            </div>
            {ppp > 0 && gros > 0 ? (
              <div className="pricing-equiv">
                = {formatDa(gros / ppp)} {t(lang, 'perPieceEquiv')}
              </div>
            ) : null}
          </div>
        </div>

        <div className="pricing-row tone-super">
          <div className="pricing-emoji">🏭</div>
          <div className="field" style={{ margin: 0, flex: 1 }}>
            <label>{t(lang, 'priceSuperGros')}</label>
            <input
              inputMode="decimal"
              value={superGrosPriceDa}
              onChange={(e) => setSuperGrosPriceDa(e.target.value)}
              placeholder="1800"
            />
            <div className="muted">{t(lang, 'priceSuperGrosHint')}</div>
            {ppp > 0 && superG > 0 ? (
              <div className="pricing-equiv">
                = {formatDa(superG / ppp)} {t(lang, 'perPieceEquiv')}
              </div>
            ) : null}
          </div>
        </div>
        </>
        ) : (
        <div className="pricing-row tone-carton">
          <div className="pricing-emoji">📦</div>
          <div style={{ flex: 1 }}>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>{t(lang, 'packOptionsTitle')}</label>
              <div className="muted">{t(lang, 'packOptionsHint')}</div>
            </div>
            <button
              type="button"
              className="btn ghost"
              style={{ marginBottom: 8 }}
              onClick={() => {
                const presets = [
                  { size: '10', priceDa: '' },
                  { size: '15', priceDa: '' },
                  { size: '30', priceDa: '' },
                ]
                const have = new Set(packOptionRows.map((r) => r.size))
                const merged = [...packOptionRows]
                for (const p of presets) {
                  if (!have.has(p.size)) merged.push(p)
                }
                setPackOptionRows(merged)
              }}
            >
              + {t(lang, 'packPreset101530')}
            </button>
            {packOptionRows.map((row, i) => (
              <div className="grid-2" key={i} style={{ gap: 6, marginBottom: 6 }}>
                <label className="muted" style={{ fontSize: '0.8rem' }}>
                  {t(lang, 'packOptionSize')}
                  <input
                    inputMode="numeric"
                    value={row.size}
                    placeholder="10"
                    onChange={(e) => {
                      const next = [...packOptionRows]
                      next[i] = {
                        ...row,
                        size: e.target.value.replace(/\D/g, ''),
                      }
                      setPackOptionRows(next)
                    }}
                  />
                </label>
                <label className="muted" style={{ fontSize: '0.8rem' }}>
                  {t(lang, 'packOptionPrice')}
                  <input
                    inputMode="decimal"
                    value={row.priceDa}
                    placeholder="200"
                    onChange={(e) => {
                      const next = [...packOptionRows]
                      next[i] = { ...row, priceDa: e.target.value }
                      setPackOptionRows(next)
                    }}
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                setPackOptionRows([
                  ...packOptionRows,
                  { size: '', priceDa: '' },
                ])
              }
            >
              + {t(lang, 'packOptionAdd')}
            </button>
          </div>
        </div>
        )}
      </div>

      <div className={showLowStock ? 'grid-2' : undefined}>
        <div className="field">
          <label>{t(lang, 'stockInPieces')}</label>
          <input
            inputMode="decimal"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="100"
          />
          <div className="muted">{t(lang, 'packStockHint')}</div>
          {wholesale && ppp > 0 && Number(stock) > 0 ? (
            <div className="muted">
              ≈ {Math.floor(Number(stock) / ppp)} {t(lang, 'cartonsLeft')}
            </div>
          ) : null}
        </div>
        {showLowStock && setLowStockAt ? (
          <div className="field">
            <label>{t(lang, 'lowStock')}</label>
            <input
              inputMode="decimal"
              value={lowStockAt ?? ''}
              onChange={(e) => setLowStockAt(e.target.value)}
            />
          </div>
        ) : null}
      </div>
    </>
  )
}

function inDateRange(iso: string | undefined, from: string, to: string): boolean {
  if (!from && !to) return true
  if (!iso) return false
  const day = iso.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

function ProductsPage({
  state,
  lang,
  onFlash,
  canEdit = true,
  showCosts = true,
  onAdd,
  onUpdate,
  onDelete,
  onOpenGallery,
  initialProductId,
  seedBarcode,
  seedQuery,
  onSeedConsumed,
}: {
  state: AppState
  lang: Language
  onFlash: (key: string) => void
  canEdit?: boolean
  showCosts?: boolean
  onAdd: (p: Omit<Product, 'id' | 'createdAt'>) => void
  onUpdate: (id: string, patch: Partial<Product>) => void
  onDelete: (id: string) => void
  onOpenGallery: () => void
  initialProductId?: string | null
  seedBarcode?: string | null
  seedQuery?: string | null
  onSeedConsumed?: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProductCategory>(() =>
    defaultCategoryForAisle(
      state.settings.domainId,
      retailChipRayons(state.settings.domainId, state.settings, lang)[0]?.id,
    ),
  )
  const [aisleId, setAisleId] = useState(
    () =>
      retailChipRayons(state.settings.domainId, state.settings, lang)[0]?.id ||
      '',
  )
  const [imei, setImei] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [oemRef, setOemRef] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [unit, setUnit] = useState<Unit>('piece')
  const [costDa, setCostDa] = useState('')
  const [priceDa, setPriceDa] = useState('')
  const [demiGrosPriceDa, setDemiGrosPriceDa] = useState('')
  const [grosPriceDa, setGrosPriceDa] = useState('')
  const [superGrosPriceDa, setSuperGrosPriceDa] = useState('')
  const [stock, setStock] = useState('')
  const [piecesPerPack, setPiecesPerPack] = useState('')
  const [packOptionRows, setPackOptionRows] = useState<
    { size: string; priceDa: string }[]
  >([])
  const [expiryDate, setExpiryDate] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>()
  const [photoBusy, setPhotoBusy] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [barcode, setBarcode] = useState('')
  const [promoProductId, setPromoProductId] = useState<string | null>(null)
  const nameRef = useRef(name)
  const imageRef = useRef(imageDataUrl)
  nameRef.current = name
  imageRef.current = imageDataUrl

  const offStatus = useOffBarcodeAutofill(
    barcode,
    (hit: OffLookupHit) => {
      if (!nameRef.current.trim()) setName(hit.name)
      if (!imageRef.current && hit.imageDataUrl) setImageDataUrl(hit.imageDataUrl)
      if (hit.category) setCategory(hit.category)
    },
    !editId,
  )

  useEffect(() => {
    if (initialProductId) {
      setEditId(initialProductId)
      onSeedConsumed?.()
      return
    }
    if (seedBarcode) {
      setBarcode(seedBarcode)
      setEditId(null)
      onSeedConsumed?.()
      return
    }
    if (seedQuery) {
      setQuery(seedQuery)
      setEditId(null)
      onSeedConsumed?.()
    }
  }, [initialProductId, seedBarcode, seedQuery, onSeedConsumed])

  const editing = state.products.find((p) => p.id === editId) ?? null
  const domainId = state.settings.domainId
  const retailMode = isShopRetail(state.settings.commerceMode)
  const aisleOptions = retailChipRayons(domainId, state.settings, lang)
  const trackImei = showImeiTracking(domainId)
  const trackVariants = showRetailVariants(domainId)
  const trackOem = showOemRef(domainId)
  const showExpiry = isToolEnabled(state.settings, 'expiry')
  const unitOptions = unitsForMetier(
    metierPackFor(domainId, state.settings.commerceMode).family,
  )

  const productSuggestions = useMemo(() => {
    const names = [
      ...state.products.map((p) => p.name),
      ...CATEGORIES.map((c) => t(lang, `cat_${c}`)),
    ]
    return suggestNames(names, query, 10)
  }, [state.products, query, lang])

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...state.products]
      .filter((p) => inDateRange(p.createdAt, dateFrom, dateTo))
      .filter((p) => {
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          t(lang, `cat_${p.category}`).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [state.products, query, dateFrom, dateTo, lang])

  async function pickPhoto(
    file: File | null | undefined,
    apply: (url: string | undefined) => void,
  ) {
    if (!file) return
    setPhotoBusy(true)
    try {
      const url = await compressImageFile(file)
      apply(url)
      onFlash('photoSaved')
    } catch {
      apply(undefined)
      onFlash('photoTooBig')
    } finally {
      setPhotoBusy(false)
    }
  }

  if (editing) {
    if (!canEdit) {
      return (
        <div className="card">
          <h2>{editing.name}</h2>
          <p className="muted">{t(lang, 'sellerStockReadOnly')}</p>
          <div className="muted" style={{ marginTop: 4 }}>
            {showCosts ? (
              <>
                {t(lang, 'buyPriceShort')} {formatDa(editing.costDa || 0)} →{' '}
              </>
            ) : null}
            {formatDa(editing.priceDa)} · {formatQty(displayStock(state, editing))}{' '}
            {unitLabel(lang, editing.unit)}
          </div>
          <button
            type="button"
            className="btn secondary block"
            style={{ marginTop: 12 }}
            onClick={() => setEditId(null)}
          >
            {t(lang, 'back')}
          </button>
        </div>
      )
    }
    return (
      <ProductEditCard
        lang={lang}
        commerceMode={state.settings.commerceMode}
        domainId={state.settings.domainId}
        settings={state.settings}
        product={editing}
        stockValue={displayStock(state, editing)}
        photoBusy={photoBusy}
        onPickPhoto={(file) =>
          void pickPhoto(file, (url) => {
            if (url) onUpdate(editing.id, { imageDataUrl: url })
          })
        }
        onRemovePhoto={() => onUpdate(editing.id, { imageDataUrl: undefined })}
        onCancel={() => setEditId(null)}
        onSave={(patch) => {
          onUpdate(editing.id, patch)
          setEditId(null)
        }}
        onDelete={() => {
          onDelete(editing.id)
          setEditId(null)
        }}
      />
    )
  }

  return (
    <>
      {canEdit ? (
      <div className="card">
        <h2>{t(lang, 'newProduct')}</h2>
        <div className="product-photo-field">
          {name.trim() || imageDataUrl ? (
            <img
              className="product-thumb"
              src={productDisplaySrc(name || 'Produit', category, imageDataUrl)}
              alt=""
            />
          ) : (
            <div className="product-thumb placeholder">{t(lang, 'noPhoto')}</div>
          )}
          <PhotoPickControls
            lang={lang}
            busy={photoBusy}
            hasPhoto={!!imageDataUrl}
            onPick={(file) => void pickPhoto(file, setImageDataUrl)}
            onRemove={() => setImageDataUrl(undefined)}
          />
        </div>
        <div className="field">
          <label>{t(lang, 'name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <ProductBarcodeField
          lang={lang}
          value={barcode}
          onChange={setBarcode}
          offStatus={offStatus}
        />
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(lang, `cat_${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t(lang, 'unit')}</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {t(lang, `unit_${u}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {retailMode && aisleOptions.length > 0 ? (
          <div className="field">
            <label>{t(lang, 'retailAisle')}</label>
            <select
              value={aisleId}
              onChange={(e) => {
                const id = e.target.value
                setAisleId(id)
                if (id) setCategory(defaultCategoryForAisle(domainId, id))
              }}
            >
              <option value="">—</option>
              {aisleOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji ? `${a.emoji} ` : ''}
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {trackImei ? (
          <div className="field">
            <label>{t(lang, 'productImei')}</label>
            <input
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              placeholder="35…"
            />
            <div className="muted">{t(lang, 'productImeiHint')}</div>
          </div>
        ) : null}
        {trackVariants ? (
          <div className="grid-2">
            <div className="field">
              <label>{t(lang, 'productSize')}</label>
              <input value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
            <div className="field">
              <label>{t(lang, 'productColor')}</label>
              <input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
        ) : null}
        {trackOem ? (
          <div className="field">
            <label>{t(lang, 'productOemRef')}</label>
            <input
              value={oemRef}
              onChange={(e) => setOemRef(e.target.value)}
              placeholder="OEM…"
            />
            <div className="muted">{t(lang, 'productOemRefHint')}</div>
          </div>
        ) : null}
        {retailMode ? (
          <label className="field check-row">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
            />
            <span>
              <strong>{t(lang, 'productFavorite')}</strong>
              <div className="muted">{t(lang, 'productFavoriteHint')}</div>
            </span>
          </label>
        ) : null}
        {showExpiry ? (
          <div className="grid-2">
            <div className="field">
              <label>{t(lang, 'productExpiry')}</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t(lang, 'productLot')}</label>
              <input
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="LOT…"
              />
            </div>
          </div>
        ) : null}
        <ProductPricingFields
          lang={lang}
          commerceMode={state.settings.commerceMode}
          costDa={costDa}
          setCostDa={setCostDa}
          priceDa={priceDa}
          setPriceDa={setPriceDa}
          demiGrosPriceDa={demiGrosPriceDa}
          setDemiGrosPriceDa={setDemiGrosPriceDa}
          piecesPerPack={piecesPerPack}
          setPiecesPerPack={setPiecesPerPack}
          grosPriceDa={grosPriceDa}
          setGrosPriceDa={setGrosPriceDa}
          superGrosPriceDa={superGrosPriceDa}
          setSuperGrosPriceDa={setSuperGrosPriceDa}
          packOptionRows={packOptionRows}
          setPackOptionRows={setPackOptionRows}
          stock={stock}
          setStock={setStock}
        />
        {costDa && priceDa ? (
          <div className="muted" style={{ marginBottom: 10 }}>
            {t(lang, 'margin')} ({t(lang, 'tier_piece')}) :{' '}
            {formatDa((Number(priceDa) || 0) - (Number(costDa) || 0))}
          </div>
        ) : null}
        <button
          className="btn block"
          disabled={!name || !priceDa || photoBusy}
          onClick={() => {
            const ppp = Number(piecesPerPack) || 0
            const gros = Number(grosPriceDa) || 0
            const superG = Number(superGrosPriceDa) || 0
            const demi = Number(demiGrosPriceDa) || 0
            const packs = normalizePackOptions(
              packOptionRows.map((r) => ({
                size: Number(r.size) || 0,
                priceDa: Number(String(r.priceDa).replace(',', '.')) || 0,
              })),
            )
            onAdd({
              name: name.trim(),
              category,
              aisleId: aisleId || undefined,
              unit,
              costDa: Number(costDa) || 0,
              priceDa: Number(priceDa) || 0,
              stock: Number(stock) || 0,
              lowStockAt: isDecimalUnit(unit) ? qtyStep(unit) * 2 : 5,
              piecesPerPack: ppp > 0 ? ppp : undefined,
              packOptions: packs,
              demiGrosPriceDa: demi > 0 ? demi : undefined,
              grosPriceDa: ppp > 0 && gros > 0 ? gros : undefined,
              superGrosPriceDa: ppp > 0 && superG > 0 ? superG : undefined,
              packPriceDa: ppp > 0 && gros > 0 ? gros : undefined,
              imageDataUrl,
              barcode: barcode.trim() || undefined,
              imei: imei.trim() || undefined,
              size: size.trim() || undefined,
              color: color.trim() || undefined,
              oemRef: oemRef.trim() || undefined,
              favorite: favorite || undefined,
              expiryDate: showExpiry && expiryDate ? expiryDate : undefined,
              lotNumber:
                showExpiry && lotNumber.trim() ? lotNumber.trim() : undefined,
            })
            setName('')
            setBarcode('')
            setExpiryDate('')
            setLotNumber('')
            setAisleId(
              retailChipRayons(domainId, state.settings, lang)[0]?.id || '',
            )
            setCategory(
              defaultCategoryForAisle(
                domainId,
                retailChipRayons(domainId, state.settings, lang)[0]?.id,
              ),
            )
            setImei('')
            setSize('')
            setColor('')
            setOemRef('')
            setFavorite(false)
            setCostDa('')
            setPriceDa('')
            setDemiGrosPriceDa('')
            setGrosPriceDa('')
            setSuperGrosPriceDa('')
            setStock('')
            setPiecesPerPack('')
            setPackOptionRows([])
            setImageDataUrl(undefined)
          }}
        >
          {t(lang, 'addToStock')}
        </button>
      </div>
      ) : (
        <div className="card">
          <h2>{t(lang, 'productCatalog')}</h2>
          <p className="muted">{t(lang, 'sellerStockReadOnly')}</p>
        </div>
      )}

      <div className="card">
        <h2>
          {t(lang, 'productsCount')} ({filteredProducts.length}/{state.products.length})
        </h2>
        <SmartSearchBar
          lang={lang}
          value={query}
          onChange={setQuery}
          placeholder={t(lang, 'searchProductsSmartHint')}
          suggestions={productSuggestions}
          showCalendar
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
        />
        <button
          className="btn secondary block"
          style={{ marginBottom: 12, marginTop: 10 }}
          onClick={onOpenGallery}
        >
          🖼️ {t(lang, 'gallery')}
        </button>
        {filteredProducts.length === 0 ? (
          <div className="empty">{t(lang, 'noProductFound')}</div>
        ) : (
          filteredProducts.map((p) => {
          return (
            <div className="list-item with-thumb" key={p.id}>
              <img
                className="product-thumb"
                src={productDisplaySrc(p.name, p.category, p.imageDataUrl)}
                alt=""
              />
              <div className="product-main">
                <strong>{p.name}</strong>
                <div className="muted">
                  {p.aisleId
                    ? rayonLabel(p.aisleId, domainId, lang, state.settings)
                    : t(lang, `cat_${p.category}`)}{' '}
                  · {unitLabel(lang, p.unit)}
                  {p.packOptions?.length
                    ? ` · ${p.packOptions.map((o) => packSizeLabel(o.size)).join(' ')}`
                    : p.piecesPerPack
                      ? ` · ${t(lang, 'packOf')}${p.piecesPerPack}`
                      : ''}
                  {p.imei ? ` · IMEI ${p.imei}` : ''}
                  {p.size ? ` · ${p.size}` : ''}
                  {p.color ? ` · ${p.color}` : ''}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {showCosts ? (
                    <>
                      {t(lang, 'buyPriceShort')} {formatDa(p.costDa || 0)} →{' '}
                    </>
                  ) : null}
                  {formatDa(p.priceDa)}
                  {showWholesaleTiers(state.settings.commerceMode) && p.demiGrosPriceDa
                    ? ` · ${t(lang, 'tier_demi_gros')} ${formatDa(p.demiGrosPriceDa)}`
                    : ''}
                  {showWholesaleTiers(state.settings.commerceMode) &&
                  (p.grosPriceDa || p.packPriceDa)
                    ? ` · ${t(lang, 'tier_gros')} ${formatDa(p.grosPriceDa || p.packPriceDa || 0)}`
                    : ''}
                  {showWholesaleTiers(state.settings.commerceMode) && p.superGrosPriceDa
                    ? ` · ${t(lang, 'tier_super_gros')} ${formatDa(p.superGrosPriceDa)}`
                    : ''}
                  {!showWholesaleTiers(state.settings.commerceMode) &&
                  p.packOptions?.length
                    ? p.packOptions
                        .map(
                          (o) =>
                            ` · ${t(lang, 'packOf')}${o.size} ${formatDa(o.priceDa)}`,
                        )
                        .join('')
                    : ''}
                </div>
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <span className={`badge ${displayStock(state, p) <= p.lowStockAt ? 'warn' : ''}`}>
                    {formatQty(displayStock(state, p))}{' '}
                    {unitLabel(lang, 'piece')}
                    {state.settings.multiLocationEnabled
                      ? ` · ${t(lang, 'stockTotal')} ${formatQty(p.stock)}`
                      : ''}
                    {showWholesaleTiers(state.settings.commerceMode) && p.piecesPerPack
                      ? ` · ${Math.floor(displayStock(state, p) / p.piecesPerPack)} ${t(lang, 'cartonsLeft')}`
                      : ''}
                  </span>
                  {canEdit ? (
                    <>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      onUpdate(p.id, {
                        stock: +(displayStock(state, p) + qtyStep(p.unit)).toFixed(3),
                      })
                    }
                  >
                    +{qtyStep(p.unit)}
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      onUpdate(p.id, {
                        stock: Math.max(
                          0,
                          +(displayStock(state, p) - qtyStep(p.unit)).toFixed(3),
                        ),
                      })
                    }
                  >
                    -{qtyStep(p.unit)}
                  </button>
                  <button className="btn secondary" onClick={() => setEditId(p.id)}>
                    {t(lang, 'editProduct')}
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setPromoProductId(p.id)}
                  >
                    📣 {t(lang, 'productPromo')}
                  </button>
                  <button className="btn danger" onClick={() => onDelete(p.id)}>
                    {t(lang, 'delete')}
                  </button>
                    </>
                  ) : (
                  <button className="btn secondary" onClick={() => setEditId(p.id)}>
                    {t(lang, 'view')}
                  </button>
                  )}
                </div>
              </div>
              <strong>{formatDa(p.priceDa * p.stock)}</strong>
            </div>
          )
          })
        )}
      </div>

      {promoProductId
        ? (() => {
            const p = state.products.find((x) => x.id === promoProductId)
            if (!p) return null
            const story = buildProductStory(p, state.settings, lang)
            const wa = buildProductWhatsappPromo(p, state.settings, lang)
            return (
              <div className="card" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setPromoProductId(null)}
                >
                  ← {t(lang, 'back')}
                </button>
                <h2>📣 {t(lang, 'productPromoTitle')}</h2>
                <p className="muted">{t(lang, 'productPromoHint')}</p>
                <div className="field">
                  <label>{t(lang, 'productPromoStory')}</label>
                  <textarea rows={6} readOnly value={story} />
                </div>
                <button
                  type="button"
                  className="btn secondary block"
                  onClick={() => {
                    void navigator.clipboard.writeText(story)
                    onFlash('productPromoCopied')
                  }}
                >
                  {t(lang, 'productPromoCopyStory')}
                </button>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>{t(lang, 'productPromoWa')}</label>
                  <textarea rows={5} readOnly value={wa} />
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      void navigator.clipboard.writeText(wa)
                      onFlash('productPromoCopied')
                    }}
                  >
                    {t(lang, 'productPromoCopyWa')}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const clients = state.clients.filter((c) => c.phone)
                      if (clients.length === 0) {
                        onFlash('noClientsYet')
                        return
                      }
                      clients.slice(0, 15).forEach((c, i) => {
                        window.setTimeout(
                          () => openWhatsappText(c.phone, wa),
                          i * 700,
                        )
                      })
                      onFlash('productPromoSent')
                    }}
                  >
                    {t(lang, 'productPromoSendWa')}
                  </button>
                </div>
              </div>
            )
          })()
        : null}
    </>
  )
}

function ProductEditCard({
  lang,
  commerceMode,
  domainId,
  settings,
  product,
  stockValue,
  photoBusy,
  onPickPhoto,
  onRemovePhoto,
  onCancel,
  onSave,
  onDelete,
}: {
  lang: Language
  commerceMode?: CommerceMode
  domainId?: string
  settings?: AppState['settings']
  product: Product
  stockValue: number
  photoBusy: boolean
  onPickPhoto: (file: File | null | undefined) => void
  onRemovePhoto: () => void
  onCancel: () => void
  onSave: (patch: Partial<Omit<Product, 'id' | 'createdAt'>>) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(product.name)
  const [category, setCategory] = useState<ProductCategory>(product.category)
  const [aisleId, setAisleId] = useState(product.aisleId || '')
  const [imei, setImei] = useState(product.imei || '')
  const [size, setSize] = useState(product.size || '')
  const [color, setColor] = useState(product.color || '')
  const [oemRef, setOemRef] = useState(product.oemRef || '')
  const [favorite, setFavorite] = useState(product.favorite === true)
  const [unit, setUnit] = useState<Unit>(product.unit)
  const [costDa, setCostDa] = useState(String(product.costDa || 0))
  const [priceDa, setPriceDa] = useState(String(product.priceDa))
  const [demiGrosPriceDa, setDemiGrosPriceDa] = useState(
    product.demiGrosPriceDa ? String(product.demiGrosPriceDa) : '',
  )
  const [grosPriceDa, setGrosPriceDa] = useState(
    product.grosPriceDa || product.packPriceDa
      ? String(product.grosPriceDa || product.packPriceDa)
      : '',
  )
  const [superGrosPriceDa, setSuperGrosPriceDa] = useState(
    product.superGrosPriceDa ? String(product.superGrosPriceDa) : '',
  )
  const [piecesPerPack, setPiecesPerPack] = useState(
    product.piecesPerPack ? String(product.piecesPerPack) : '',
  )
  const [packOptionRows, setPackOptionRows] = useState<
    { size: string; priceDa: string }[]
  >(() =>
    (product.packOptions ?? []).map((o) => ({
      size: String(o.size),
      priceDa: String(o.priceDa),
    })),
  )
  const [stock, setStock] = useState(String(stockValue))
  const [lowStockAt, setLowStockAt] = useState(String(product.lowStockAt))
  const [barcode, setBarcode] = useState(product.barcode || '')
  const [expiryDate, setExpiryDate] = useState(product.expiryDate || '')
  const [lotNumber, setLotNumber] = useState(product.lotNumber || '')
  const [draftImage, setDraftImage] = useState(product.imageDataUrl)
  const nameRef = useRef(name)
  const imageRef = useRef(draftImage)
  nameRef.current = name
  imageRef.current = draftImage

  useEffect(() => {
    setDraftImage(product.imageDataUrl)
  }, [product.imageDataUrl])

  const offStatus = useOffBarcodeAutofill(barcode, (hit: OffLookupHit) => {
    if (!nameRef.current.trim()) setName(hit.name)
    if (!imageRef.current && hit.imageDataUrl) {
      setDraftImage(hit.imageDataUrl)
    }
    if (hit.category) setCategory(hit.category)
  })

  const retailMode = isShopRetail(commerceMode)
  const aisleOptions = retailChipRayons(domainId, settings, lang)
  const trackImei = showImeiTracking(domainId)
  const trackVariants = showRetailVariants(domainId)
  const trackOem = showOemRef(domainId)
  const showExpiry = settings ? isToolEnabled(settings, 'expiry') : false
  const unitOptions = unitsForMetier(
    metierPackFor(domainId, commerceMode).family,
  )

  return (
    <div className="card">
      <button className="btn ghost" onClick={onCancel}>
        ← {t(lang, 'cancelEdit')}
      </button>
      <h2>{t(lang, 'editProduct')}</h2>

      <div className="product-photo-field">
        <img
          className="product-thumb"
          src={productDisplaySrc(name, category, draftImage)}
          alt=""
        />
        <PhotoPickControls
          lang={lang}
          busy={photoBusy}
          hasPhoto={!!draftImage}
          onPick={onPickPhoto}
          onRemove={() => {
            setDraftImage(undefined)
            onRemovePhoto()
          }}
        />
      </div>

      <div className="field">
        <label>{t(lang, 'name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <ProductBarcodeField
        lang={lang}
        value={barcode}
        onChange={setBarcode}
        offStatus={offStatus}
      />
      <div className="grid-2">
        <div className="field">
          <label>{t(lang, 'category')}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(lang, `cat_${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t(lang, 'unit')}</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {unitOptions.map((u) => (
              <option key={u} value={u}>
                {t(lang, `unit_${u}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {retailMode && aisleOptions.length > 0 ? (
        <div className="field">
          <label>{t(lang, 'retailAisle')}</label>
          <select
            value={aisleId}
            onChange={(e) => {
              const id = e.target.value
              setAisleId(id)
              if (id) setCategory(defaultCategoryForAisle(domainId, id))
            }}
          >
            <option value="">—</option>
            {aisleOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji ? `${a.emoji} ` : ''}
                {a.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {trackImei ? (
        <div className="field">
          <label>{t(lang, 'productImei')}</label>
          <input value={imei} onChange={(e) => setImei(e.target.value)} />
          <div className="muted">{t(lang, 'productImeiHint')}</div>
        </div>
      ) : null}
      {trackVariants ? (
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'productSize')}</label>
            <input value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
          <div className="field">
            <label>{t(lang, 'productColor')}</label>
            <input value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
      ) : null}
      {trackOem ? (
        <div className="field">
          <label>{t(lang, 'productOemRef')}</label>
          <input value={oemRef} onChange={(e) => setOemRef(e.target.value)} />
          <div className="muted">{t(lang, 'productOemRefHint')}</div>
        </div>
      ) : null}
      {retailMode ? (
        <label className="field check-row">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
          />
          <span>
            <strong>{t(lang, 'productFavorite')}</strong>
            <div className="muted">{t(lang, 'productFavoriteHint')}</div>
          </span>
        </label>
      ) : null}
      {showExpiry ? (
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'productExpiry')}</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'productLot')}</label>
            <input
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="LOT…"
            />
          </div>
        </div>
      ) : null}
      <ProductPricingFields
        lang={lang}
        commerceMode={commerceMode}
        costDa={costDa}
        setCostDa={setCostDa}
        priceDa={priceDa}
        setPriceDa={setPriceDa}
        demiGrosPriceDa={demiGrosPriceDa}
        setDemiGrosPriceDa={setDemiGrosPriceDa}
        piecesPerPack={piecesPerPack}
        setPiecesPerPack={setPiecesPerPack}
        grosPriceDa={grosPriceDa}
        setGrosPriceDa={setGrosPriceDa}
        superGrosPriceDa={superGrosPriceDa}
        setSuperGrosPriceDa={setSuperGrosPriceDa}
        packOptionRows={packOptionRows}
        setPackOptionRows={setPackOptionRows}
        stock={stock}
        setStock={setStock}
        showLowStock
        lowStockAt={lowStockAt}
        setLowStockAt={setLowStockAt}
      />
      <div className="muted" style={{ marginBottom: 10 }}>
        {t(lang, 'margin')} ({t(lang, 'tier_piece')}) :{' '}
        {formatDa((Number(priceDa) || 0) - (Number(costDa) || 0))}
      </div>
      <button
        className="btn block"
        disabled={!name.trim() || !priceDa || photoBusy}
        onClick={() => {
          const ppp = Number(piecesPerPack) || 0
          const gros = Number(grosPriceDa) || 0
          const superG = Number(superGrosPriceDa) || 0
          const demi = Number(demiGrosPriceDa) || 0
          const packs = normalizePackOptions(
            packOptionRows.map((r) => ({
              size: Number(r.size) || 0,
              priceDa: Number(String(r.priceDa).replace(',', '.')) || 0,
            })),
          )
          onSave({
            name: name.trim(),
            category,
            aisleId: aisleId || undefined,
            unit,
            costDa: Number(costDa) || 0,
            priceDa: Number(priceDa) || 0,
            stock: Number(stock) || 0,
            lowStockAt: Number(lowStockAt) || 0,
            piecesPerPack: ppp > 0 ? ppp : undefined,
            packOptions: packs,
            demiGrosPriceDa: demi > 0 ? demi : undefined,
            grosPriceDa: ppp > 0 && gros > 0 ? gros : undefined,
            superGrosPriceDa: ppp > 0 && superG > 0 ? superG : undefined,
            packPriceDa: ppp > 0 && gros > 0 ? gros : undefined,
            imageDataUrl: draftImage,
            barcode: barcode.trim() || undefined,
            imei: imei.trim() || undefined,
            size: size.trim() || undefined,
            color: color.trim() || undefined,
            oemRef: oemRef.trim() || undefined,
            favorite: favorite || undefined,
            expiryDate: showExpiry && expiryDate ? expiryDate : undefined,
            lotNumber:
              showExpiry && lotNumber.trim() ? lotNumber.trim() : undefined,
          })
        }}
      >
        {t(lang, 'saveProduct')}
      </button>
      <button className="btn danger block" style={{ marginTop: 8 }} onClick={onDelete}>
        {t(lang, 'delete')}
      </button>
    </div>
  )
}

function ClientsPage({
  state,
  lang,
  clinicStation,
  canEdit = true,
  initialClientId,
  seedNotes,
  onSeedConsumed,
  onState,
  onAdd,
  onUpdate,
  onPayDebt,
  onSetBalance,
  onImport,
  onDelete,
  onFlash,
  onToast,
}: {
  state: AppState
  lang: Language
  clinicStation: ClinicStation | null
  canEdit?: boolean
  initialClientId?: string | null
  seedNotes?: string | null
  onSeedConsumed?: () => void
  onState: (next: AppState) => void
  onAdd: (c: Omit<Client, 'id' | 'createdAt'>) => void
  onUpdate: (id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>) => void
  onPayDebt: (id: string, amount: number) => void
  onSetBalance: (id: string, balance: number) => void
  onImport: (list: Array<Pick<Client, 'name' | 'phone'>>) => void
  onDelete: (id: string) => void
  onFlash: (key: string) => void
  onToast: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState(state.settings.city)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [mapsPaste, setMapsPaste] = useState('')
  const [paste, setPaste] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(
    initialClientId ?? null,
  )
  const [editing, setEditing] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [balanceEdit, setBalanceEdit] = useState('')
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showClientExtra, setShowClientExtra] = useState(false)

  useEffect(() => {
    if (initialClientId) {
      setSelectedId(initialClientId)
      onSeedConsumed?.()
    }
  }, [initialClientId, onSeedConsumed])

  useEffect(() => {
    if (!seedNotes) return
    setSelectedId(null)
    setEditing(false)
    setNotes(seedNotes)
    onSeedConsumed?.()
  }, [seedNotes, onSeedConsumed])

  const selected = state.clients.find((c) => c.id === selectedId) ?? null

  const clientSuggestions = useMemo(() => {
    const names = state.clients.flatMap((c) =>
      [c.name, c.phone, c.city, c.address].filter(Boolean),
    )
    return suggestNames(names, query, 10)
  }, [state.clients, query])

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.clients.filter((c) => {
      if (!inDateRange(c.createdAt, dateFrom, dateTo)) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q)
      )
    })
  }, [state.clients, query, dateFrom, dateTo])

  useEffect(() => {
    if (!selectedId) return
    const debt = clientCreditDa(state, selectedId)
    setBalanceEdit(String(Math.round(debt)))
    setPayAmount('')
  }, [selectedId, state.orders, state.clients])

  async function captureGps(
    apply: (coords: { lat: number; lng: number }) => void,
  ) {
    try {
      const coords = await getCurrentPosition()
      apply(coords)
      onFlash('gpsSaved')
    } catch (err) {
      onFlash(err instanceof Error && err.message === 'unsupported' ? 'gpsUnsupported' : 'gpsDenied')
    }
  }

  function applyPaste(
    raw: string,
    apply: (coords: { lat: number; lng: number }) => void,
  ) {
    const coords = parseMapsCoords(raw)
    if (!coords) {
      onFlash('mapsLinkInvalid')
      return
    }
    apply(coords)
    onFlash('gpsSaved')
  }

  if (selected) {
    const mapsUrl = clientMapsUrl(selected)
    const hasGps =
      typeof selected.lat === 'number' && typeof selected.lng === 'number'
    const debt = clientCreditDa(state, selected.id)

    if (editing) {
      return (
        <ClientEditCard
          lang={lang}
          countryCode={state.settings.countryCode || 'DZ'}
          client={selected}
          showCreditLimit={isToolEnabled(state.settings, 'creditLimit')}
          onCancel={() => setEditing(false)}
          onSave={(patch) => {
            onUpdate(selected.id, patch)
            setEditing(false)
          }}
          onGps={() =>
            captureGps((coords) =>
              onUpdate(selected.id, { lat: coords.lat, lng: coords.lng }),
            )
          }
          onPasteMaps={(raw) =>
            applyPaste(raw, (coords) =>
              onUpdate(selected.id, { lat: coords.lat, lng: coords.lng }),
            )
          }
          onClearGps={() => onUpdate(selected.id, { lat: undefined, lng: undefined })}
        />
      )
    }

    return (
      <>
        <div className="card client-fiche">
          <button className="btn ghost" onClick={() => setSelectedId(null)}>
            ← {t(lang, 'backToClients')}
          </button>
          <h2>{selected.name}</h2>
          <div className="muted">{t(lang, 'clientFiche')}</div>

          <div className="fiche-grid">
            <div>
              <div className="fiche-label">WhatsApp</div>
              <div>{selected.phone || '—'}</div>
            </div>
            <div>
              <div className="fiche-label">{t(lang, 'city')}</div>
              <div>{selected.city || '—'}</div>
            </div>
            <div className="fiche-full">
              <div className="fiche-label">{t(lang, 'clientBalance')}</div>
              <div>
                {debt > 0 ? (
                  <strong className="warn-text">{formatDa(debt)}</strong>
                ) : (
                  <span className="muted">{formatDa(0)}</span>
                )}
              </div>
            </div>
            <div className="fiche-full">
              <div className="fiche-label">{t(lang, 'clientAddress')}</div>
              <div>{selected.address || '—'}</div>
            </div>
            <div className="fiche-full">
              <div className="fiche-label">{t(lang, 'clientNotes')}</div>
              <div>{selected.notes || '—'}</div>
            </div>
            <div className="fiche-full">
              <div className="fiche-label">GPS</div>
              <div>
                {hasGps ? (
                  <span className="badge">{t(lang, 'locationOk')}</span>
                ) : (
                  <span className="muted">{t(lang, 'noLocation')}</span>
                )}
                {hasGps ? (
                  <span className="muted"> · {selected.lat}, {selected.lng}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, boxShadow: 'none' }}>
            <h3>{t(lang, 'debtBoxTitle')}</h3>
            <div className="field">
              <label>{t(lang, 'hePaidNow')}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              className="btn block"
              data-sfx-cash
              disabled={!(Number(payAmount) > 0)}
              onClick={() => {
                const n = Number(String(payAmount).replace(',', '.'))
                if (!(n > 0)) return
                onPayDebt(selected.id, n)
                setPayAmount('')
              }}
            >
              💵 {t(lang, 'addToCash')}
            </button>
            <div className="field" style={{ marginTop: 12 }}>
              <label>{t(lang, 'fixBalance')}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={balanceEdit}
                onChange={(e) => setBalanceEdit(e.target.value)}
              />
            </div>
            <button
              className="btn secondary block"
              onClick={() => {
                const n = Number(String(balanceEdit).replace(',', '.'))
                if (!Number.isFinite(n) || n < 0) return
                onSetBalance(selected.id, n)
              }}
            >
              ✏️ {t(lang, 'saveBalance')}
            </button>
          </div>

          {(() => {
            const open = clientOpenCreditOrders(state, selected.id)
            if (open.length === 0) return null
            return (
              <div className="card" style={{ marginTop: 12, boxShadow: 'none' }}>
                <h3>📅 {t(lang, 'clientDueTitle')}</h3>
                {open.map((o) => {
                  const rem = orderRemainingDa(o)
                  const late =
                    o.dueDate != null && daysUntilDue(o.dueDate) < 0
                  const soon =
                    o.dueDate != null &&
                    daysUntilDue(o.dueDate) >= 0 &&
                    daysUntilDue(o.dueDate) <= 3
                  return (
                    <div className="list-item" key={o.id}>
                      <div>
                        <strong>
                          {o.invoiceNumber
                            ? `N°${o.invoiceNumber}`
                            : o.id.slice(-6)}
                        </strong>
                        <div className="muted">
                          {formatDa(rem)}
                          {o.dueDate
                            ? ` · ${formatDueDateLabel(o.dueDate, lang)}`
                            : ` · ${t(lang, 'dueNone')}`}
                        </div>
                      </div>
                      {late ? (
                        <span className="badge warn">{t(lang, 'dueOverdue')}</span>
                      ) : soon ? (
                        <span className="badge">{t(lang, 'dueSoon')}</span>
                      ) : o.dueDate ? (
                        <span className="badge">{t(lang, 'dueOk')}</span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {hasGps ? (
            <div className="map-embed">
              <iframe
                title={t(lang, 'mapPreview')}
                src={mapsEmbedUrl(selected.lat!, selected.lng!)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}

          <div className="btn-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            {mapsUrl ? (
              <a className="btn" href={mapsUrl} target="_blank" rel="noreferrer">
                {t(lang, 'openMaps')}
              </a>
            ) : null}
            {selected.phone ? (
              <button
                className="btn secondary"
                onClick={() => openWhatsappText(selected.phone, `Salam ${selected.name}`)}
              >
                {t(lang, 'whatsappClient')}
              </button>
            ) : null}
            {canEdit ? (
              <>
            <button className="btn" onClick={() => setEditing(true)}>
              ✏️ {t(lang, 'editClient')}
            </button>
            <button
              className="btn danger"
              onClick={() => {
                onDelete(selected.id)
                setSelectedId(null)
              }}
            >
              {t(lang, 'delete')}
            </button>
              </>
            ) : null}
          </div>

          <ClientQrCard client={selected} lang={lang} />
        </div>
        {(() => {
          const mode = state.settings.commerceMode
          const domainId = state.settings.domainId
          const pack = metierPackFor(domainId, mode)
          const family = pack.family
          /** Fiches dédiées (parallèles) — pas de fusion patient/athlète dans specialty */
          const useMedicalPanel =
            (showMedicalDossier(mode, domainId) || mode === 'sante') &&
            family !== 'vet'
          const useAthletePanel =
            !useMedicalPanel && showGymCheckin(mode, domainId)
          const specialty =
            !useMedicalPanel && !useAthletePanel
              ? specialtyProfileFor(family)
              : null
          return (
            <>
              {useMedicalPanel ? (
                <DossierPatientPanel
                  state={state}
                  client={selected}
                  lang={lang}
                  onState={onState}
                  onFlash={onToast}
                />
              ) : useAthletePanel ? (
                <AthleteDossierPanel
                  state={state}
                  client={selected}
                  lang={lang}
                  onState={onState}
                  onFlash={onToast}
                />
              ) : specialty ? (
                <SpecialtyDossierPanel
                  state={state}
                  client={selected}
                  lang={lang}
                  family={family}
                  profile={specialty}
                  onState={onState}
                  onFlash={onToast}
                />
              ) : null}
              {clinicStation === 'doctor' ? (
                <SendToCashForm
                  state={state}
                  client={selected}
                  lang={lang}
                  onState={onState}
                  onFlash={onToast}
                />
              ) : null}
            </>
          )
        })()}
      </>
    )
  }

  return (
    <>
      <div className="card">
        <h2>{t(lang, 'newClient')}</h2>
        <div className="field">
          <label>{t(lang, 'clientName')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>WhatsApp</label>
          <DzPhoneInput
            value={phone}
            onChange={setPhone}
            countryCode={state.settings.countryCode || 'DZ'}
            placeholder={countryByCode(state.settings.countryCode || 'DZ').phoneHint}
          />
          <div className="muted">{countryByCode(state.settings.countryCode || 'DZ').phoneHint}</div>
        </div>
        <div className="grid-2">
          <CityField
            lang={lang}
            countryCode={state.settings.countryCode || 'DZ'}
            value={city}
            onChange={setCity}
          />
          <div className="field">
            <label>{t(lang, 'clientAddress')}</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t(lang, 'clientAddressHint')}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn ghost block"
          style={{ marginBottom: 10 }}
          onClick={() => setShowClientExtra((v) => !v)}
        >
          {showClientExtra ? t(lang, 'hideDetails') : t(lang, 'moreDetails')}
        </button>
        {showClientExtra ? (
          <>
        <div className="field">
          <label>{t(lang, 'clientNotes')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(lang, 'clientNotesHint')}
          />
        </div>
        <div className="field">
          <label>{t(lang, 'pasteMapsLink')}</label>
          <div className="muted">{t(lang, 'pasteMapsHint')}</div>
          <input
            value={mapsPaste}
            onChange={(e) => setMapsPaste(e.target.value)}
            placeholder="36.7525,3.0420"
          />
        </div>
        <div className="btn-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => captureGps((c) => { setLat(c.lat); setLng(c.lng) })}
          >
            {t(lang, 'useGps')}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={!mapsPaste.trim()}
            onClick={() => {
              applyPaste(mapsPaste, (c) => {
                setLat(c.lat)
                setLng(c.lng)
                setMapsPaste('')
              })
            }}
          >
            {t(lang, 'applyMapsLink')}
          </button>
          {typeof lat === 'number' ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setLat(undefined)
                setLng(undefined)
              }}
            >
              {t(lang, 'clearGps')}
            </button>
          ) : null}
        </div>
        {typeof lat === 'number' && typeof lng === 'number' ? (
          <div className="muted" style={{ marginBottom: 10 }}>
            GPS : {lat}, {lng}
          </div>
        ) : null}
          </>
        ) : null}
        <button
          className="btn block"
          disabled={!name || !phone}
          onClick={() => {
            onAdd({
              name: name.trim(),
              phone: phone.trim(),
              city: city.trim(),
              address: address.trim(),
              notes: notes.trim(),
              lat,
              lng,
            })
            setName('')
            setPhone('')
            setAddress('')
            setNotes('')
            setLat(undefined)
            setLng(undefined)
            setMapsPaste('')
          }}
        >
          {t(lang, 'addClient')}
        </button>
        <button
          type="button"
          className="btn ghost block"
          style={{ marginTop: 8 }}
          onClick={() => setShowImport((v) => !v)}
        >
          {t(lang, 'importContacts')}
        </button>
      </div>

      {showImport ? (
      <div className="card">
        <h2>{t(lang, 'importContacts')}</h2>
        <div className="notice">{t(lang, 'contactsUnsupported')}</div>
        <button
          className="btn block"
          onClick={async () => {
            try {
              const list = await importPhoneContacts()
              onImport(list)
            } catch {
              onFlash('contactsUnsupported')
            }
          }}
        >
          {t(lang, 'importContacts')}
        </button>
        <div className="field" style={{ marginTop: 12 }}>
          <label>{t(lang, 'pasteWhatsapp')}</label>
          <div className="muted">{t(lang, 'pasteHint')}</div>
          <textarea
            rows={4}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'Épicerie Amel,0555123456\nParfumerie Nour;0777987654'}
          />
        </div>
        <button
          className="btn secondary block"
          disabled={!paste.trim()}
          onClick={() => {
            onImport(importPastedContacts(paste))
            setPaste('')
          }}
        >
          {t(lang, 'importPaste')}
        </button>
      </div>
      ) : null}

      <div className="card">
        <h2>
          {t(lang, 'clientsCount')} ({filteredClients.length}/{state.clients.length})
        </h2>
        <SmartSearchBar
          lang={lang}
          value={query}
          onChange={setQuery}
          placeholder={t(lang, 'searchClientsHint')}
          suggestions={clientSuggestions}
          showCalendar
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
        />
        {filteredClients.length === 0 ? (
          <div className="empty">{t(lang, 'noClientsYet')}</div>
        ) : (
          filteredClients.map((c) => {
            const hasLoc =
              !!c.address ||
              (typeof c.lat === 'number' && typeof c.lng === 'number')
            const debt = clientCreditDa(state, c.id)
            return (
              <div className="list-item client-row" key={c.id}>
                <button
                  type="button"
                  className="client-open"
                  onClick={() => {
                    setSelectedId(c.id)
                    setEditing(false)
                  }}
                >
                  <strong>{c.name}</strong>
                  <div className="muted">
                    {c.phone}
                    {c.city ? ` · ${c.city}` : ''}
                    {c.address ? ` · ${c.address}` : ''}
                  </div>
                  {debt > 0 ? (
                    <div className="warn-text" style={{ marginTop: 4 }}>
                      {t(lang, 'clientBalance')} : {formatDa(debt)}
                    </div>
                  ) : null}
                  {hasLoc ? (
                    <span className="badge" style={{ marginTop: 6 }}>
                      {t(lang, 'locationOk')}
                    </span>
                  ) : (
                    <span className="muted" style={{ display: 'block', marginTop: 4 }}>
                      {t(lang, 'noLocation')}
                    </span>
                  )}
                </button>
                <div className="btn-row client-row-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setSelectedId(c.id)
                      setEditing(true)
                    }}
                  >
                    {t(lang, 'editClient')}
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => onDelete(c.id)}
                  >
                    {t(lang, 'delete')}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function ClientEditCard({
  lang,
  countryCode,
  client,
  showCreditLimit,
  onCancel,
  onSave,
  onGps,
  onPasteMaps,
  onClearGps,
}: {
  lang: Language
  countryCode: string
  client: Client
  showCreditLimit?: boolean
  onCancel: () => void
  onSave: (patch: Partial<Omit<Client, 'id' | 'createdAt'>>) => void
  onGps: () => void
  onPasteMaps: (raw: string) => void
  onClearGps: () => void
}) {
  const [name, setName] = useState(client.name)
  const [phone, setPhone] = useState(client.phone)
  const [city, setCity] = useState(client.city)
  const [address, setAddress] = useState(client.address ?? '')
  const [notes, setNotes] = useState(client.notes ?? '')
  const [creditLimitDa, setCreditLimitDa] = useState(
    client.creditLimitDa ? String(client.creditLimitDa) : '',
  )
  const [mapsPaste, setMapsPaste] = useState('')

  return (
    <div className="card">
      <button className="btn ghost" onClick={onCancel}>
        ← {t(lang, 'backToClients')}
      </button>
      <h2>{t(lang, 'editClient')}</h2>
      <div className="field">
        <label>{t(lang, 'clientName')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>WhatsApp</label>
        <DzPhoneInput
          value={phone}
          onChange={setPhone}
          countryCode={countryCode}
          placeholder={countryByCode(countryCode).phoneHint}
        />
        <div className="muted">{countryByCode(countryCode).phoneHint}</div>
      </div>
      <div className="grid-2">
        <CityField
          lang={lang}
          countryCode={countryCode}
          value={city}
          onChange={setCity}
        />
        <div className="field">
          <label>{t(lang, 'clientAddress')}</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>{t(lang, 'clientNotes')}</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {showCreditLimit ? (
        <div className="field">
          <label>{t(lang, 'clientCreditLimit')}</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={creditLimitDa}
            onChange={(e) => setCreditLimitDa(e.target.value)}
            placeholder="50000"
          />
          <div className="muted">{t(lang, 'clientCreditLimitHint')}</div>
        </div>
      ) : null}
      <div className="field">
        <label>{t(lang, 'pasteMapsLink')}</label>
        <input
          value={mapsPaste}
          onChange={(e) => setMapsPaste(e.target.value)}
          placeholder={t(lang, 'pasteMapsHint')}
        />
      </div>
      <div className="btn-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn secondary" onClick={onGps}>
          {t(lang, 'useGps')}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={!mapsPaste.trim()}
          onClick={() => {
            onPasteMaps(mapsPaste)
            setMapsPaste('')
          }}
        >
          {t(lang, 'applyMapsLink')}
        </button>
        {typeof client.lat === 'number' ? (
          <button type="button" className="btn ghost" onClick={onClearGps}>
            {t(lang, 'clearGps')}
          </button>
        ) : null}
      </div>
      {typeof client.lat === 'number' && typeof client.lng === 'number' ? (
        <>
          <div className="muted" style={{ marginBottom: 10 }}>
            GPS : {client.lat}, {client.lng}
          </div>
          <div className="map-embed" style={{ marginBottom: 12 }}>
            <iframe
              title={t(lang, 'mapPreview')}
              src={mapsEmbedUrl(client.lat, client.lng)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </>
      ) : null}
      <button
        className="btn block"
        disabled={!name.trim() || !phone.trim()}
        onClick={() => {
          const lim = Number(String(creditLimitDa).replace(',', '.'))
          onSave({
            name: name.trim(),
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim(),
            notes: notes.trim(),
            creditLimitDa:
              showCreditLimit && Number.isFinite(lim) && lim > 0
                ? lim
                : undefined,
          })
        }}
      >
        {t(lang, 'saveClient')}
      </button>
    </div>
  )
}

function OrderPage({
  state,
  lang,
  seedProductId,
  onSeedConsumed,
  seedHeldId,
  onSeedHeldConsumed,
  onCreate,
  onWhatsapp,
  onPrint,
  onBoth,
  onInvoice,
  onGo,
  onFlash,
  onUpdateProduct,
  onHoldSale,
  onRemoveHeld,
}: {
  state: AppState
  lang: Language
  seedProductId?: string | null
  onSeedConsumed?: () => void
  seedHeldId?: string | null
  onSeedHeldConsumed?: () => void
  onCreate: (
    order: Omit<Order, 'id' | 'createdAt' | 'whatsappSent' | 'invoiceNumber'>,
  ) => Order
  onWhatsapp: (order: Order, customText?: string) => void
  onPrint: (order: Order, customText?: string) => Promise<void>
  onBoth: (order: Order, customText?: string) => Promise<void>
  onInvoice: (order: Order, customText?: string) => void
  onGo: (s: Screen, spokenLabel?: string) => void
  onFlash: (key: string) => void
  onUpdateProduct: (id: string, patch: Partial<Product>) => void
  onHoldSale: (
    input: Omit<import('./types').HeldSale, 'id' | 'createdAt'>,
  ) => void
  onRemoveHeld: (id: string) => void
}) {
  const QUICK = '__quick__'
  const mode = state.settings.commerceMode
  const domainId = state.settings.domainId
  const wholesale = isWholesale(mode)
  const retail = isShopRetail(mode)
  const clientFirst = preferClientOnSale(mode, domainId)
  const [clientId, setClientId] = useState(
    clientFirst && state.clients[0] ? state.clients[0].id : QUICK,
  )
  /** clé = `${productId}::${tier}` ou `${productId}::pack:10` */
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  /** Saisie qté libre (x100) — brouillon clavier */
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({})
  /** Saisie montant DA en cours (évite de casser la frappe) */
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({})
  /** Prix unitaires modifiés en caisse */
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(
    {},
  )
  /** Ventes flash (hors stock) */
  const [flashLines, setFlashLines] = useState<FlashSaleLine[]>([])
  const [showFlash, setShowFlash] = useState(false)
  const [flashName, setFlashName] = useState('')
  const [flashPrice, setFlashPrice] = useState('')
  const [flashQty, setFlashQty] = useState('1')
  /** Total forcé avant encaissement (vide = suivre le calculé) */
  const [totalOverride, setTotalOverride] = useState('')
  /** true si le caissier a saisi un montant négocié */
  const [totalDirty, setTotalDirty] = useState(false)
  /** Montant à ajouter / retirer via − / + (saisie manuelle) */
  const [totalAdjustAmount, setTotalAdjustAmount] = useState('')
  const totalAdjustInputRef = useRef<HTMLInputElement>(null)
  const [tierMap, setTierMap] = useState<Record<string, PriceTier>>({})
  /** Pack sélectionné à la caisse (œufs ×10 / ×15 / ×30) — 0 = pièce */
  const [packSizeMap, setPackSizeMap] = useState<Record<string, number>>({})
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [clientDateFrom, setClientDateFrom] = useState('')
  const [clientDateTo, setClientDateTo] = useState('')
  const [productDateFrom, setProductDateFrom] = useState('')
  const [productDateTo, setProductDateTo] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [imeiMap, setImeiMap] = useState<Record<string, string>>({})
  const [discountPercent, setDiscountPercent] = useState('')
  const [showHeld, setShowHeld] = useState(false)
  /** Après le panier : choisir Payé / Versé */
  const [payStep, setPayStep] = useState(false)
  const [verseInput, setVerseInput] = useState('')
  const [dueDays, setDueDays] = useState(15)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [tpeStep, setTpeStep] = useState(false)
  const [invoiceDraft, setInvoiceDraft] = useState('')
  const [showClientBook, setShowClientBook] = useState(clientFirst)
  const paymentsOn = isToolEnabled(state.settings, 'payments')
  const tpeOn = isToolEnabled(state.settings, 'tpe')
  const creditLimitOn = isToolEnabled(state.settings, 'creditLimit')

  const isQuick = clientId === QUICK
  const favorites = useMemo(() => {
    /** Poids / mesure toujours en accès rapide à la caisse (+ favoris ⭐ manuels) */
    const list = state.products.filter(
      (p) => p.favorite === true || isDecimalUnit(p.unit),
    )
    return [...list].sort((a, b) => {
      const aw = isDecimalUnit(a.unit) ? 0 : 1
      const bw = isDecimalUnit(b.unit) ? 0 : 1
      if (aw !== bw) return aw - bw
      return a.name.localeCompare(b.name, 'fr')
    })
  }, [state.products])
  const productSuggestions = useMemo(() => {
    const names = [
      ...state.products.map((p) => p.name),
      ...CATEGORIES.map((c) => t(lang, `cat_${c}`)),
    ]
    return suggestNames(names, productQuery, 10)
  }, [state.products, productQuery, lang])
  const clientSuggestions = useMemo(() => {
    const names = state.clients.flatMap((c) =>
      [c.name, c.phone, c.city].filter(Boolean),
    )
    return suggestNames(names, clientQuery, 10)
  }, [state.clients, clientQuery])
  const orderClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    return state.clients.filter((c) => {
      if (!inDateRange(c.createdAt, clientDateFrom, clientDateTo)) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      )
    })
  }, [state.clients, clientQuery, clientDateFrom, clientDateTo])
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    const noBarcodeOnly = categoryFilter === NO_BARCODE_FILTER
    return state.products.filter((p) => {
      if (!inDateRange(p.createdAt, productDateFrom, productDateTo)) return false
      if (noBarcodeOnly) {
        if ((p.barcode || '').trim()) return false
      } else if (categoryFilter !== 'all') {
        const aisle = p.aisleId || p.category
        if (aisle !== categoryFilter) return false
      }
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.imei || '').toLowerCase().includes(q) ||
        t(lang, `cat_${p.category}`).toLowerCase().includes(q)
      )
    })
  }, [
    state.products,
    productQuery,
    productDateFrom,
    productDateTo,
    categoryFilter,
    lang,
  ])

  const noBarcodeCount = useMemo(
    () => state.products.filter((p) => !(p.barcode || '').trim()).length,
    [state.products],
  )

  const retailRayonChips = useMemo(() => {
    if (!isShopRetail(mode)) return []
    return retailChipRayons(domainId, state.settings, lang)
  }, [mode, domainId, state.settings, lang])

  function lineKey(productId: string, tier: PriceTier, packSize?: number) {
    if (packSize && packSize > 1) return `${productId}::pack:${packSize}`
    return `${productId}::${tier}`
  }

  function tierOf(productId: string): PriceTier {
    return tierMap[productId] ?? 'piece'
  }

  function packOf(productId: string): number {
    return packSizeMap[productId] ?? 0
  }

  function parseLineKey(key: string): {
    productId: string
    tier: PriceTier
    packSize?: number
  } {
    const [productId, mode] = key.split('::')
    if (mode?.startsWith('pack:')) {
      const packSize = Number(mode.slice(5))
      return {
        productId,
        tier: 'piece',
        packSize: Number.isFinite(packSize) ? packSize : undefined,
      }
    }
    return { productId, tier: (mode as PriceTier) || 'piece' }
  }

  const catalogLines: OrderLine[] = Object.entries(qtyMap)
    .filter(([, qty]) => qty > 0)
    .flatMap(([key, qty]) => {
      const { productId, tier, packSize } = parseLineKey(key)
      const p = state.products.find((x) => x.id === productId)
      if (!p) return []
      const catalogPrice =
        packSize && packSize > 1
          ? priceForPackSize(p, packSize)
          : priceForTier(p, tier)
      if (catalogPrice == null) return []
      const unitPrice =
        priceOverrides[key] !== undefined ? priceOverrides[key] : catalogPrice
      const lineImei = imeiMap[key] || p.imei
      return [
        {
          productId: p.id,
          name: p.name,
          unit:
            packSize && packSize > 1
              ? 'carton'
              : isCartonTier(tier)
                ? 'carton'
                : isDecimalUnit(p.unit)
                  ? p.unit
                  : sellUnitForTier(tier),
          qty,
          unitPriceDa: unitPrice,
          unitCostDa: costForTier(p, tier, packSize),
          lineTotalDa: +(qty * unitPrice).toFixed(2),
          priceTier: packSize && packSize > 1 ? 'gros' : tier,
          packSize: packSize && packSize > 1 ? packSize : undefined,
          imei: lineImei,
        },
      ]
    })

  const flashOrderLines: OrderLine[] = flashLines
    .filter((f) => f.qty > 0 && f.unitPriceDa >= 0 && f.name.trim())
    .map((f) => ({
      productId: f.id,
      name: f.name.trim(),
      unit: f.unit,
      qty: f.qty,
      unitPriceDa: f.unitPriceDa,
      unitCostDa: 0,
      lineTotalDa: +(f.qty * f.unitPriceDa).toFixed(2),
      priceTier: 'piece' as PriceTier,
      flash: true,
    }))

  const lines: OrderLine[] = [...catalogLines, ...flashOrderLines]

  const subtotal = lines.reduce((s, l) => s + l.lineTotalDa, 0)
  const discPct = Math.min(
    100,
    Math.max(0, Number(String(discountPercent).replace(',', '.')) || 0),
  )
  const discountDa = discPct > 0 ? +((subtotal * discPct) / 100).toFixed(2) : 0
  const computedTotal = Math.max(0, +(subtotal - discountDa).toFixed(2))
  const overrideParsed = Number(String(totalOverride).replace(',', '.'))
  const hasTotalOverride =
    totalDirty &&
    totalOverride.trim() !== '' &&
    Number.isFinite(overrideParsed) &&
    overrideParsed >= 0
  const total = hasTotalOverride ? +overrideParsed.toFixed(2) : computedTotal
  /** Valeur affichée : calculée (toujours visible) ou saisie en cours / négociée */
  const totalFieldValue = totalDirty
    ? totalOverride
    : lines.length > 0
      ? String(computedTotal)
      : ''
  const client = state.clients.find((c) => c.id === clientId)
  const clientDebt = client ? clientCreditDa(state, client.id) : 0
  const canValidate = lines.length > 0 && (isQuick || !!client)
  const verseParsed = Number(String(verseInput).replace(',', '.'))
  const verseOk =
    Number.isFinite(verseParsed) && verseParsed >= 0 && verseParsed <= total
  const verseRemaining = verseOk ? Math.max(0, +(total - verseParsed).toFixed(2)) : 0

  function clearCart() {
    setQtyMap({})
    setQtyDraft({})
    setAmountDraft({})
    setPriceOverrides({})
    setFlashLines([])
    setShowFlash(false)
    setFlashName('')
    setFlashPrice('')
    setFlashQty('1')
    setTotalOverride('')
    setTotalDirty(false)
    setTierMap({})
    setPackSizeMap({})
    setImeiMap({})
    setDiscountPercent('')
    setPayStep(false)
    setVerseInput('')
    setDueDays(15)
  }

  function resetTotalOverride() {
    setTotalOverride('')
    setTotalDirty(false)
  }

  function applyTotalAdjust(sign: 1 | -1) {
    const delta = Number(String(totalAdjustAmount).replace(',', '.'))
    if (!Number.isFinite(delta) || delta <= 0) {
      totalAdjustInputRef.current?.focus()
      totalAdjustInputRef.current?.select()
      return
    }
    const base = hasTotalOverride ? overrideParsed : computedTotal
    const next = Math.max(0, +(base + sign * delta).toFixed(2))
    setTotalDirty(true)
    setTotalOverride(String(next))
  }

  function addFlashLine() {
    const name = flashName.trim() || t(lang, 'flashDefaultName')
    const price = Number(String(flashPrice).replace(',', '.'))
    const qty = Number(String(flashQty).replace(',', '.')) || 1
    if (!Number.isFinite(price) || price < 0) {
      onFlash('flashNeedPrice')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) return
    setFlashLines((prev) => [
      ...prev,
      {
        id: uid('flash'),
        name,
        qty,
        unitPriceDa: price,
        unit: 'piece',
      },
    ])
    setFlashName('')
    setFlashPrice('')
    setFlashQty('1')
    setShowFlash(false)
    onFlash('flashAdded')
  }

  function parkCurrentSale() {
    if (lines.length === 0) return
    const clientName = isQuick
      ? t(lang, 'walkInClient')
      : state.clients.find((c) => c.id === clientId)?.name || '—'
    onHoldSale({
      label: `${clientName} · ${formatDa(total)}`,
      clientId: isQuick ? '' : clientId,
      qtyMap: { ...qtyMap },
      tierMap: { ...tierMap },
      imeiMap: { ...imeiMap },
      discountPercent: discPct > 0 ? discPct : undefined,
      priceOverrides: { ...priceOverrides },
      flashLines: flashLines.map((f) => ({ ...f })),
      totalOverrideDa: hasTotalOverride ? total : undefined,
    })
    clearCart()
    onFlash('holdSaleDone')
  }

  function resumeHeld(id: string) {
    const h = (state.heldSales || []).find((x) => x.id === id)
    if (!h) return
    setQtyMap({ ...h.qtyMap })
    setTierMap({ ...h.tierMap })
    setImeiMap({ ...(h.imeiMap || {}) })
    setDiscountPercent(h.discountPercent ? String(h.discountPercent) : '')
    setPriceOverrides({ ...(h.priceOverrides || {}) })
    setFlashLines([...(h.flashLines || [])])
    const restoredOverride =
      typeof h.totalOverrideDa === 'number' ? String(h.totalOverrideDa) : ''
    setTotalOverride(restoredOverride)
    setTotalDirty(restoredOverride !== '')
    setClientId(h.clientId || QUICK)
    setShowClientBook(!!h.clientId)
    setPayStep(false)
    onRemoveHeld(id)
    setShowHeld(false)
  }

  function bump(product: Product, tier: PriceTier, delta: number, packSize?: number) {
    const key = lineKey(product.id, tier, packSize)
    const max = maxQtyForTier(
      product,
      tier,
      displayStock(state, product),
      packSize,
    )
    const needsImei =
      showImeiTracking(domainId) &&
      (product.aisleId === 'smartphones' ||
        /smartphone|iphone|samsung|xiaomi|infinix|oppo|phone/i.test(product.name))
    if (delta > 0 && needsImei && !(imeiMap[key] || product.imei)) {
      const entered = window.prompt(t(lang, 'imeiPrompt'), '')
      if (!entered || !entered.trim()) {
        speak(t(lang, 'imeiRequired'), lang)
        return
      }
      setImeiMap((m) => ({ ...m, [key]: entered.trim() }))
    }
    setQtyMap((m) => {
      const current = m[key] ?? 0
      const next = Math.max(0, Math.min(max, +(current + delta).toFixed(3)))
      const copy = { ...m }
      if (next <= 0) {
        delete copy[key]
        setImeiMap((im) => {
          const n = { ...im }
          delete n[key]
          return n
        })
        setQtyDraft((d) => {
          const n = { ...d }
          delete n[key]
          return n
        })
      } else copy[key] = next
      return copy
    })
  }

  /** Fixe la quantité (saisie directe x100 ou calcul depuis un montant DA). */
  function setQtyAbsolute(
    product: Product,
    tier: PriceTier,
    rawQty: number,
    packSize?: number,
  ) {
    const key = lineKey(product.id, tier, packSize)
    const max = maxQtyForTier(
      product,
      tier,
      displayStock(state, product),
      packSize,
    )
    const next = Math.max(0, Math.min(max, +rawQty.toFixed(3)))
    setQtyMap((m) => {
      const copy = { ...m }
      if (next <= 0) {
        delete copy[key]
        setImeiMap((im) => {
          const n = { ...im }
          delete n[key]
          return n
        })
      } else {
        copy[key] = next
      }
      return copy
    })
  }

  function clearProductQtyKeys(productId: string) {
    setQtyMap((m) => {
      const next = { ...m }
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${productId}::`)) delete next[k]
      }
      return next
    })
    setQtyDraft((d) => {
      const next = { ...d }
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${productId}::`)) delete next[k]
      }
      return next
    })
  }

  function setProductTier(productId: string, tier: PriceTier) {
    setTierMap((m) => ({ ...m, [productId]: tier }))
    setPackSizeMap((m) => {
      const next = { ...m }
      delete next[productId]
      return next
    })
    clearProductQtyKeys(productId)
  }

  function setProductPack(productId: string, size: number) {
    setPackSizeMap((m) => {
      const next = { ...m }
      if (size > 1) next[productId] = size
      else delete next[productId]
      return next
    })
    setTierMap((m) => ({ ...m, [productId]: 'piece' }))
    clearProductQtyKeys(productId)
  }

  useEffect(() => {
    if (!seedProductId) return
    const p = state.products.find((x) => x.id === seedProductId)
    if (p) bump(p, 'piece', qtyStep(p.unit))
    onSeedConsumed?.()
  }, [seedProductId])

  useEffect(() => {
    if (!seedHeldId) return
    resumeHeld(seedHeldId)
    onSeedHeldConsumed?.()
  }, [seedHeldId])

  function finishSale(paidDa: number, methodOverride?: PaymentMethod) {
    if (!canValidate) return
    if (paidDa < total - 0.001 && isQuick) {
      speak(lang === 'ar' ? 'اختَر زبوناً للدين' : 'Choisis un client pour le reste', lang)
      return
    }
    const method = methodOverride ?? payMethod
    const pay = buildPaymentFields(total, paidDa)
    if (creditLimitOn && !isQuick && client && pay.remainingDa > 0.001) {
      const limit = client.creditLimitDa
      if (typeof limit === 'number' && limit > 0) {
        const nextDebt = clientDebt + pay.remainingDa
        if (nextDebt > limit + 0.001) {
          const msg =
            lang === 'ar'
              ? `تجاوز سقف الدين (${Math.round(limit)} دج)`
              : `Plafond crédit dépassé (${Math.round(limit)} DA)`
          onFlash(msg)
          speak(msg, lang)
          return
        }
      }
    }
    const forcedDiscount = hasTotalOverride
      ? Math.max(0, +(subtotal - total).toFixed(2))
      : discountDa
    const created = onCreate({
      clientId: isQuick ? '' : client!.id,
      clientName: isQuick ? t(lang, 'walkInClient') : client!.name,
      clientPhone: isQuick ? '' : client!.phone,
      lines,
      totalDa: total,
      subtotalDa: subtotal,
      discountPercent:
        hasTotalOverride || discPct <= 0 ? undefined : discPct,
      discountDa: forcedDiscount > 0 ? forcedDiscount : undefined,
      note: hasTotalOverride
        ? `${t(lang, 'totalOverrideNote')}: ${Math.round(total)} DA`
        : undefined,
      ...pay,
      paymentMethod:
        paymentsOn || tpeOn || methodOverride
          ? method
          : undefined,
      dueDate:
        pay.remainingDa > 0.001 ? dueDateFromDays(dueDays) : undefined,
    })
    setLastOrder(created)
    setInvoiceDraft(buildInvoiceText(created, state.settings))
    clearCart()
    setTpeStep(false)
    speak(
      lang === 'ar'
        ? `تم. ${Math.round(total)} دينار`
        : `OK. ${Math.round(total)} dinars`,
      lang,
    )
  }

  return (
    <>
      <div className="pos-shell">
        <div className="pos-main">
      <div className="card">
        {wholesale || showClientBook ? (
        <>
        <div className="choice-grid">
          <button
            type="button"
            className={`choice-card ${isQuick ? 'active' : ''}`}
            onClick={() => {
              setClientId(QUICK)
              setPayStep(false)
            }}
            aria-label={mt(state.settings.commerceMode, lang, 'quickSale')}
          >
            <span className="choice-emoji">⚡</span>
          </button>
          <button
            type="button"
            className={`choice-card ${!isQuick ? 'active' : ''}`}
            onClick={() => {
              if (isQuick && state.clients[0]) setClientId(state.clients[0].id)
            }}
            aria-label={t(lang, 'client')}
          >
            <span className="choice-emoji">👤</span>
          </button>
        </div>

        {!isQuick ? (
          <div className="client-pick-grid">
            <SmartSearchBar
              lang={lang}
              value={clientQuery}
              onChange={setClientQuery}
              placeholder={t(lang, 'searchClientsHint')}
              suggestions={clientSuggestions}
              showCalendar
              dateFrom={clientDateFrom}
              dateTo={clientDateTo}
              onDateFrom={setClientDateFrom}
              onDateTo={setClientDateTo}
            />
            {orderClients.length === 0 ? (
              <div className="empty">{t(lang, 'noClientsYet')}</div>
            ) : (
              orderClients.map((c) => {
                const debt = clientCreditDa(state, c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`client-pick ${clientId === c.id ? 'active' : ''}`}
                    onClick={() => setClientId(c.id)}
                  >
                    <span className="client-avatar">{c.name.slice(0, 1).toUpperCase()}</span>
                    <span className="client-pick-text">
                      <strong>{c.name}</strong>
                      {debt > 0 ? (
                        <span className="warn-text">{formatDa(debt)}</span>
                      ) : null}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        ) : null}

        {!isQuick && client && clientDebt > 0 ? (
          <div className="notice warn">
            <strong>{formatDa(clientDebt)}</strong>
          </div>
        ) : null}
        </>
        ) : (
          <button
            type="button"
            className="btn ghost block"
            onClick={() => setShowClientBook(true)}
            aria-label={t(lang, 'retailClientBook')}
          >
            👤
          </button>
        )}
      </div>

      <div className="card">
        {!isQuick && client ? (
          <div className="muted" style={{ marginBottom: 10 }}>
            <strong>{client.name}</strong>
          </div>
        ) : null}
        {showHomeScan(mode, domainId) ? (
        <BarcodeScanInput
          lang={lang}
          onEmpty={() => onFlash('barcodeNeedCode')}
          onScan={(code) => {
            const r = bumpProductFromBarcode(
              state.products,
              code,
              (p, tier, delta) => {
                // Scan caisse : ajoute même si stock 0 (sinon « Ajouter » semble mort)
                const key = lineKey(p.id, tier)
                setQtyMap((m) => {
                  const current = m[key] ?? 0
                  const next = Math.max(0, +(current + delta).toFixed(3))
                  if (next <= 0) {
                    const copy = { ...m }
                    delete copy[key]
                    return copy
                  }
                  return { ...m, [key]: next }
                })
              },
              (p) => displayStock(state, p),
            )
            if (r === 'missing') {
              playBarcodeError()
              onFlash('barcodeMissing')
              speak(
                lang === 'ar' ? 'باركود غير موجود' : 'Code-barres inconnu',
                lang,
              )
              return
            }
            playBarcodeOk()
            onFlash(r === 'ok-nostock' ? 'barcodeNoStock' : 'barcodeOk')
            setProductQuery('')
            setCategoryFilter('all')
          }}
        />
        ) : null}
        <SmartSearchBar
          lang={lang}
          value={productQuery}
          onChange={setProductQuery}
          placeholder={t(lang, 'searchProductsSmartHint')}
          suggestions={productSuggestions}
          showCalendar
          dateFrom={productDateFrom}
          dateTo={productDateTo}
          onDateFrom={setProductDateFrom}
          onDateTo={setProductDateTo}
        />
        <div className="btn-row" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className={`btn ${categoryFilter === NO_BARCODE_FILTER ? '' : 'secondary'}`}
            onClick={() => {
              setCategoryFilter(NO_BARCODE_FILTER)
              setProductQuery('')
              setShowFlash(false)
            }}
          >
            🏷️ {t(lang, 'noBarcodeBtn')}
            {noBarcodeCount > 0 ? ` (${noBarcodeCount})` : ''}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setShowFlash((v) => !v)}
          >
            ✨ {t(lang, 'flashSaleBtn')}
          </button>
        </div>
        {showFlash ? (
          <div className="card" style={{ marginBottom: 12 }}>
            <h3>{t(lang, 'flashSaleTitle')}</h3>
            <p className="muted">{t(lang, 'flashSaleHint')}</p>
            <div className="field">
              <label>{t(lang, 'name')}</label>
              <input
                value={flashName}
                onChange={(e) => setFlashName(e.target.value)}
                placeholder={t(lang, 'flashDefaultName')}
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>{t(lang, 'flashPrice')}</label>
                <input
                  inputMode="decimal"
                  value={flashPrice}
                  onChange={(e) => setFlashPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label>{t(lang, 'qty')}</label>
                <input
                  inputMode="decimal"
                  value={flashQty}
                  onChange={(e) => setFlashQty(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn block"
              onClick={addFlashLine}
            >
              + {t(lang, 'flashAddLine')}
            </button>
          </div>
        ) : null}
        {favorites.length > 0 ? (
          <div className="chip-row retail-fav-chips" aria-label={t(lang, 'retailFavorites')}>
            <span className="muted" style={{ alignSelf: 'center', marginInlineEnd: 4 }} aria-hidden>
              ⭐
            </span>
            {favorites.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip fav-chip"
                onClick={() => bump(p, tierOf(p.id), qtyStep(p.unit))}
              >
                {p.name}
                {isDecimalUnit(p.unit) ? (
                  <span className="muted"> · {unitLabel(lang, p.unit)}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
        {(isShopRetail(mode) && retailRayonChips.length > 0) ||
        noBarcodeCount > 0 ||
        categoryFilter === NO_BARCODE_FILTER ? (
          <div className="chip-row retail-cat-chips" role="tablist" aria-label={t(lang, 'retailCategories')}>
            <button
              type="button"
              className={`chip ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              {t(lang, 'cat_all')}
            </button>
            <button
              type="button"
              className={`chip ${categoryFilter === NO_BARCODE_FILTER ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(NO_BARCODE_FILTER)
                setProductQuery('')
              }}
            >
              🏷️ {t(lang, 'noBarcodeRayon')}
              {noBarcodeCount > 0 ? ` (${noBarcodeCount})` : ''}
            </button>
            {isShopRetail(mode)
              ? retailRayonChips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip ${categoryFilter === c.id ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(c.id)}
                  >
                    {c.emoji ? `${c.emoji} ` : ''}
                    {c.label}
                  </button>
                ))
              : null}
          </div>
        ) : null}
        {filteredProducts.length === 0 ? (
          <div className="empty">
            <div>
              {state.products.length === 0
                ? mt(state.settings.commerceMode, lang, 'emptyCatalogHint')
                : categoryFilter === NO_BARCODE_FILTER
                  ? t(lang, 'noBarcodeEmpty')
                  : t(lang, 'noProductFound')}
            </div>
            {state.products.length === 0 ? (
              <button
                type="button"
                className="btn block"
                style={{ marginTop: 12 }}
                onClick={() => onGo('products', t(lang, 'newProduct'))}
              >
                ➕ {t(lang, 'newProduct')}
              </button>
            ) : categoryFilter === NO_BARCODE_FILTER ? (
              <button
                type="button"
                className="btn secondary block"
                style={{ marginTop: 12 }}
                onClick={() => setCategoryFilter('all')}
              >
                {t(lang, 'cat_all')}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="product-catalog">
            {filteredProducts.map((p) => {
              const packs = sellablePackOptions(p)
              const tiers = availableTiers(p, state.settings.commerceMode)
              const selectedPack = packOf(p.id)
              const tier = selectedPack > 1 ? 'piece' : tierOf(p.id)
              const key = lineKey(p.id, tier, selectedPack || undefined)
              const qty = qtyMap[key] ?? 0
              const unitPrice =
                selectedPack > 1
                  ? (priceForPackSize(p, selectedPack) ?? p.priceDa)
                  : (priceForTier(p, tier) ?? p.priceDa)
              const step =
                selectedPack > 1 || isCartonTier(tier) ? 1 : qtyStep(p.unit)
              const tierIcon =
                selectedPack > 1
                  ? '📦'
                  : tier === 'piece'
                    ? '1️⃣'
                    : tier === 'demi_gros'
                      ? '📦'
                      : tier === 'gros'
                        ? '📦📦'
                        : '🏭'
              const stockNow = displayStock(state, p)
              const low = stockNow <= (p.lowStockAt || 0)
              const showPackChips = !wholesale && packs.length > 0
              return (
                <div
                  className={`product-card ${qty > 0 ? 'selected' : ''} ${low ? 'low-stock' : ''}`}
                  key={p.id}
                >
                  {retail ? (
                    <button
                      type="button"
                      className={`fav-toggle ${p.favorite ? 'on' : ''}`}
                      title={t(lang, 'productFavorite')}
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateProduct(p.id, { favorite: !p.favorite })
                      }}
                    >
                      {p.favorite ? '⭐' : '☆'}
                    </button>
                  ) : null}
                  {low ? (
                    <span className="stock-low-badge">{t(lang, 'lowStockBadge')}</span>
                  ) : null}
                  <img
                    className="product-card-img"
                    src={productDisplaySrc(p.name, p.category, p.imageDataUrl)}
                    alt={p.name}
                  />
                  <div className="product-card-body">
                    <strong>{p.name}</strong>
                    {p.barcode ? (
                      <div className="muted">⬛ {p.barcode}</div>
                    ) : null}
                    {p.oemRef ? (
                      <div className="muted">🔧 {p.oemRef}</div>
                    ) : null}
                    {p.imei ? (
                      <div className="muted">📱 IMEI {p.imei}</div>
                    ) : null}
                    {(p.size || p.color) && (
                      <div className="muted">
                        {[p.size, p.color].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {showPackChips ? (
                      <div className="tier-row">
                        <button
                          type="button"
                          className={`tier-chip ${selectedPack <= 1 ? 'active' : ''}`}
                          onClick={() => setProductPack(p.id, 0)}
                        >
                          1️⃣ {t(lang, 'sellAsPiece')}
                        </button>
                        {packs.map((opt) => (
                          <button
                            key={opt.size}
                            type="button"
                            className={`tier-chip ${selectedPack === opt.size ? 'active' : ''}`}
                            onClick={() => setProductPack(p.id, opt.size)}
                          >
                            📦 {t(lang, 'packOf')}
                            {opt.size}
                          </button>
                        ))}
                      </div>
                    ) : tiers.length > 1 ? (
                      <div className="tier-row">
                        {tiers.map((tr) => (
                          <button
                            key={tr}
                            type="button"
                            className={`tier-chip ${tier === tr && selectedPack <= 1 ? 'active' : ''}`}
                            onClick={() => setProductTier(p.id, tr)}
                          >
                            {tr === 'piece'
                              ? '1️⃣'
                              : tr === 'demi_gros'
                                ? '📦'
                                : tr === 'gros'
                                  ? '📦📦'
                                  : '🏭'}{' '}
                            {t(lang, `tier_${tr}`)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="price-big">
                      {tierIcon} {formatDa(unitPrice)}
                    </div>
                    <div className={`muted ${low ? 'warn-text' : ''}`}>
                      {selectedPack > 1
                        ? `${t(lang, 'sellAsPack')} ${packSizeLabel(selectedPack)}`
                        : unitLabel(
                            lang,
                            isDecimalUnit(p.unit) && !isCartonTier(tier)
                              ? p.unit
                              : sellUnitForTier(tier),
                          )}
                      {isCartonTier(tier) && p.piecesPerPack
                        ? ` · ${p.piecesPerPack}×`
                        : ''}
                      {selectedPack > 1 ? ` · ${t(lang, 'packUnitHint')}` : ''}
                      {' · '}
                      {t(lang, 'stockQty')} {formatQty(stockNow)}{' '}
                      {unitLabel(lang, 'piece')}
                      {state.settings.multiLocationEnabled
                        ? ` (${t(lang, 'stockTotal')} ${formatQty(p.stock)})`
                        : ''}
                    </div>
                    <div className="qty-row catalog-qty big-qty">
                      <button
                        type="button"
                        onClick={() =>
                          bump(p, tier, -step, packOf(p.id) || undefined)
                        }
                      >
                        −
                      </button>
                      <input
                        className="qty-display qty-input"
                        inputMode="text"
                        enterKeyHint="done"
                        value={
                          qtyDraft[key] !== undefined
                            ? qtyDraft[key]
                            : qty > 0
                              ? String(qty)
                              : ''
                        }
                        placeholder="x…"
                        aria-label={t(lang, 'qty')}
                        title={t(lang, 'qtyTypeHint')}
                        onFocus={() => {
                          setQtyDraft((d) => ({
                            ...d,
                            [key]: qty > 0 ? String(qty) : '',
                          }))
                        }}
                        onBlur={() => {
                          setQtyDraft((d) => {
                            const n = { ...d }
                            delete n[key]
                            return n
                          })
                        }}
                        onChange={(e) => {
                          const raw = e.target.value
                          setQtyDraft((d) => ({ ...d, [key]: raw }))
                          const n = parseQtyInput(raw)
                          if (n == null) return
                          setQtyAbsolute(
                            p,
                            tier,
                            n,
                            packOf(p.id) || undefined,
                          )
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          bump(p, tier, step, packOf(p.id) || undefined)
                        }
                      >
                        +
                      </button>
                    </div>
                    <div
                      className="muted"
                      style={{ fontSize: '0.75rem', marginTop: 4 }}
                    >
                      {t(lang, 'qtyTypeHint')}
                    </div>
                    {isDecimalUnit(p.unit) && !isCartonTier(tier) ? (
                      <div className="field amount-qty-field" style={{ marginTop: 8 }}>
                        <label>{t(lang, 'sellByAmount')}</label>
                        <input
                          inputMode="decimal"
                          placeholder={t(lang, 'sellByAmountHint')}
                          value={
                            amountDraft[key] !== undefined
                              ? amountDraft[key]
                              : qty > 0
                                ? String(amountFromQtyDa(qty, unitPrice))
                                : ''
                          }
                          onFocus={() => {
                            setAmountDraft((d) => ({
                              ...d,
                              [key]:
                                qty > 0
                                  ? String(amountFromQtyDa(qty, unitPrice))
                                  : '',
                            }))
                          }}
                          onBlur={() => {
                            setAmountDraft((d) => {
                              const n = { ...d }
                              delete n[key]
                              return n
                            })
                          }}
                          onChange={(e) => {
                            const raw = e.target.value
                            setAmountDraft((d) => ({ ...d, [key]: raw }))
                            const cleaned = String(raw).replace(',', '.').trim()
                            if (!cleaned) {
                              setQtyAbsolute(p, tier, 0)
                              return
                            }
                            const amount = Number(cleaned)
                            if (!Number.isFinite(amount) || amount < 0) return
                            if (amount === 0) {
                              setQtyAbsolute(p, tier, 0)
                              return
                            }
                            setQtyAbsolute(
                              p,
                              tier,
                              qtyFromAmountDa(amount, unitPrice),
                            )
                          }}
                        />
                        {qty > 0 ? (
                          <div className="muted" style={{ marginTop: 4 }}>
                            ≈ {formatQty(qty)} {unitLabel(lang, p.unit)} →{' '}
                            {formatDa(amountFromQtyDa(qty, unitPrice))}
                            {qty >=
                            maxQtyForTier(p, tier, stockNow) - 0.0001 ? (
                              <> · {t(lang, 'sellByAmountStockCap')}</>
                            ) : null}
                          </div>
                        ) : (
                          <div className="muted" style={{ marginTop: 4 }}>
                            {t(lang, 'sellByAmountExample')}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
        </div>

      <aside className="pos-cart">
      <div className="card sticky-validate">
        <div className="total-pay">
          <span className="total-pay-label">{t(lang, 'totalToPay')}</span>
          <h2 className="total-big">{formatDa(total)}</h2>
        </div>
        {hasTotalOverride ? (
          <div className="muted" style={{ marginBottom: 8 }}>
            {t(lang, 'totalOverrideActive')} ({t(lang, 'subtotal')}{' '}
            {formatDa(computedTotal)})
          </div>
        ) : discountDa > 0 ? (
          <div className="muted" style={{ marginBottom: 8 }}>
            {t(lang, 'subtotal')} {formatDa(subtotal)} − {t(lang, 'discountAmount')}{' '}
            {formatDa(discountDa)} ({discPct}%)
          </div>
        ) : null}
        {lines.length > 0 ? (
          <ul className="line-preview cart-edit-lines">
            {lines.map((l) => {
              const key = l.flash
                ? l.productId
                : lineKey(
                    l.productId,
                    l.priceTier || 'piece',
                    l.packSize,
                  )
              return (
                <li key={`${l.productId}-${l.priceTier || 'flash'}-${l.packSize || 0}`}>
                  <div>
                    <strong>
                      {l.flash ? '✨ ' : ''}
                      {l.name}
                    </strong>
                    {l.packSize && l.packSize > 1
                      ? ` (${t(lang, 'packOf')}${l.packSize})`
                      : l.priceTier && l.priceTier !== 'piece' && !l.flash
                        ? ` (${t(lang, `tier_${l.priceTier}`)})`
                        : ''}
                    {l.flash ? (
                      <span className="muted"> · {t(lang, 'flashBadge')}</span>
                    ) : null}
                  </div>
                  <div className="grid-2" style={{ gap: 6, marginTop: 4 }}>
                    <label className="muted" style={{ fontSize: '0.8rem' }}>
                      {t(lang, 'qty')}
                      <input
                        inputMode="text"
                        value={String(l.qty)}
                        placeholder="x…"
                        title={t(lang, 'qtyTypeHint')}
                        onChange={(e) => {
                          const n = parseQtyInput(e.target.value)
                          if (n == null) return
                          if (l.flash) {
                            setFlashLines((prev) =>
                              prev
                                .map((f) =>
                                  f.id === l.productId
                                    ? { ...f, qty: Math.max(0, n) }
                                    : f,
                                )
                                .filter((f) => f.qty > 0),
                            )
                          } else {
                            const p = state.products.find(
                              (x) => x.id === l.productId,
                            )
                            if (p) {
                              setQtyAbsolute(
                                p,
                                l.priceTier || 'piece',
                                n,
                                l.packSize,
                              )
                            }
                          }
                        }}
                      />
                    </label>
                    <label className="muted" style={{ fontSize: '0.8rem' }}>
                      {t(lang, 'unitPriceEdit')}
                      <input
                        inputMode="decimal"
                        value={String(l.unitPriceDa)}
                        onChange={(e) => {
                          const n = Number(
                            String(e.target.value).replace(',', '.'),
                          )
                          if (!Number.isFinite(n) || n < 0) return
                          if (l.flash) {
                            setFlashLines((prev) =>
                              prev.map((f) =>
                                f.id === l.productId
                                  ? { ...f, unitPriceDa: n }
                                  : f,
                              ),
                            )
                          } else {
                            setPriceOverrides((m) => ({ ...m, [key]: n }))
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="muted" style={{ marginTop: 2 }}>
                    = {formatDa(l.lineTotalDa)}
                  </div>
                  {l.imei ? (
                    <div className="muted" style={{ fontSize: '0.85em' }}>
                      IMEI {l.imei}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}

        <div className="field total-override-field" style={{ marginTop: 8 }}>
          <label className="sr-only">{t(lang, 'totalOverrideLabel')}</label>
          <div className="total-override-row">
            <input
              inputMode="decimal"
              value={totalFieldValue}
              onChange={(e) => {
                setTotalDirty(true)
                setTotalOverride(e.target.value)
              }}
              onFocus={(e) => {
                requestAnimationFrame(() => e.target.select())
              }}
              onBlur={() => {
                if (!totalDirty) return
                if (totalOverride.trim() === '') {
                  resetTotalOverride()
                  return
                }
                const n = Number(String(totalOverride).replace(',', '.'))
                if (
                  Number.isFinite(n) &&
                  Math.abs(n - computedTotal) < 0.001
                ) {
                  resetTotalOverride()
                }
              }}
              placeholder={t(lang, 'totalOverridePlaceholder')}
            />
            <div className="total-override-step-btns">
              <button
                type="button"
                className="btn ghost total-override-dec"
                title={t(lang, 'totalOverrideDec')}
                aria-label={t(lang, 'totalOverrideDec')}
                disabled={lines.length === 0 && !hasTotalOverride}
                onClick={() => applyTotalAdjust(-1)}
              >
                −
              </button>
              <input
                ref={totalAdjustInputRef}
                className="total-override-adjust"
                inputMode="decimal"
                value={totalAdjustAmount}
                onChange={(e) => setTotalAdjustAmount(e.target.value)}
                onFocus={(e) => {
                  requestAnimationFrame(() => e.target.select())
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyTotalAdjust(1)
                  }
                }}
                placeholder={t(lang, 'totalOverrideAdjustPlaceholder')}
                title={t(lang, 'totalOverrideAdjustLabel')}
                aria-label={t(lang, 'totalOverrideAdjustLabel')}
                disabled={lines.length === 0 && !hasTotalOverride}
              />
              <button
                type="button"
                className="btn ghost total-override-add"
                title={t(lang, 'totalOverrideAdd')}
                aria-label={t(lang, 'totalOverrideAdd')}
                disabled={lines.length === 0 && !hasTotalOverride}
                onClick={() => applyTotalAdjust(1)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {retail ? (
          <div className="field" style={{ marginTop: 8 }}>
            <label>{t(lang, 'discountPercent')}</label>
            <input
              inputMode="decimal"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="0"
              disabled={hasTotalOverride}
            />
          </div>
        ) : null}

        {retail ? (
          <div className="btn-row" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
            <button
              type="button"
              className="btn secondary"
              disabled={lines.length === 0}
              onClick={parkCurrentSale}
            >
              ⏸️ {t(lang, 'holdSale')}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setShowHeld((v) => !v)}
            >
              📋 {t(lang, 'heldSalesTitle')}
              {(state.heldSales || []).length
                ? ` (${(state.heldSales || []).length})`
                : ''}
            </button>
          </div>
        ) : null}

        {retail && showHeld ? (
          <div className="held-sales-panel" style={{ marginBottom: 10 }}>
            {(state.heldSales || []).length === 0 ? (
              <div className="muted">{t(lang, 'heldSalesEmpty')}</div>
            ) : (
              (state.heldSales || []).map((h) => (
                <div className="list-item" key={h.id} style={{ gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{h.label}</strong>
                    <div className="muted">
                      {new Date(h.createdAt).toLocaleString(
                        lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => resumeHeld(h.id)}
                  >
                    {t(lang, 'resumeHeldSale')}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => onRemoveHeld(h.id)}
                  >
                    {t(lang, 'deleteHeldSale')}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : null}

        {!payStep ? (
          <button
            className="btn block btn-ok"
            disabled={!canValidate}
            onClick={() => {
              if (!canValidate) return
              setPayStep(true)
              setVerseInput(String(Math.round(total)))
            }}
          >
            ✅ {t(lang, 'goToPayment')}
          </button>
        ) : (
          <div className="pay-final">
            <div className="notice">{t(lang, 'payBeforePrint')}</div>
            {tpeStep ? (
              <div className="card" style={{ marginBottom: 12, textAlign: 'center' }}>
                <h2>🏦 {t(lang, 'tpeTitle')}</h2>
                <p className="muted">{t(lang, 'tpeHint')}</p>
                <div
                  style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    margin: '16px 0',
                    letterSpacing: 1,
                  }}
                >
                  {formatDa(total)}
                </div>
                <p className="muted">{t(lang, 'tpeEnterAmount')}</p>
                <button
                  type="button"
                  className="btn block btn-ok"
                  data-sfx-cash
                  style={{ marginTop: 12 }}
                  onClick={() => finishSale(total, 'card')}
                >
                  ✅ {t(lang, 'tpeAccepted')}
                </button>
                <button
                  type="button"
                  className="btn ghost block"
                  style={{ marginTop: 8 }}
                  onClick={() => setTpeStep(false)}
                >
                  ← {t(lang, 'tpeCancel')}
                </button>
              </div>
            ) : (
              <>
            {paymentsOn ? (
              <div className="btn-row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`tier-chip ${payMethod === m ? 'active' : ''}`}
                    onClick={() => setPayMethod(m)}
                  >
                    {paymentMethodEmoji(m)} {paymentMethodLabel(m, lang)}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="choice-grid pay-choice">
              <button
                type="button"
                className="choice-card pay-cash"
                data-sfx-cash
                onClick={() => {
                  if (paymentsOn && payMethod === 'card') {
                    setTpeStep(true)
                    return
                  }
                  if (paymentsOn && payMethod !== 'cash') {
                    finishSale(total)
                    return
                  }
                  setPayMethod('cash')
                  finishSale(total)
                }}
              >
                <span className="choice-emoji">
                  {paymentsOn && payMethod !== 'cash'
                    ? paymentMethodEmoji(payMethod)
                    : '💵'}
                </span>
                <strong>
                  {paymentsOn && payMethod !== 'cash'
                    ? paymentMethodLabel(payMethod, lang)
                    : t(lang, 'paidFull')}
                </strong>
                <span className="muted">{formatDa(total)}</span>
              </button>
              {tpeOn || paymentsOn ? (
                <button
                  type="button"
                  className="choice-card"
                  onClick={() => {
                    setPayMethod('card')
                    setTpeStep(true)
                  }}
                >
                  <span className="choice-emoji">🏦</span>
                  <strong>{t(lang, 'tpePayBtn')}</strong>
                  <span className="muted">{t(lang, 'tpePayHint')}</span>
                </button>
              ) : null}
              <button
                type="button"
                className="choice-card pay-credit"
                disabled={isQuick}
                onClick={() => {
                  if (isQuick) return
                  setVerseInput('')
                }}
              >
                <span className="choice-emoji">✍️</span>
                <strong>{t(lang, 'paidPartial')}</strong>
                <span className="muted">{t(lang, 'paidPartialHint')}</span>
              </button>
            </div>
            {isQuick ? (
              <div className="muted">{t(lang, 'verseNeedsClient')}</div>
            ) : (
              <>
                <div className="field">
                  <label>{t(lang, 'amountGiven')}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={total}
                    value={verseInput}
                    onChange={(e) => setVerseInput(e.target.value)}
                    placeholder="0"
                  />
                  <div className="muted" style={{ marginTop: 6 }}>
                    {t(lang, 'cashQuick')}
                  </div>
                  <div className="tier-row" style={{ marginTop: 6 }}>
                    {cashChipsFor(state.settings.countryCode || 'DZ').map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="tier-chip"
                        onClick={() => setVerseInput(String(Math.min(n, Math.round(total))))}
                      >
                        {formatDa(n)}
                      </button>
                    ))}
                  </div>
                </div>
                {verseOk ? (
                  <div className="notice">
                    {t(lang, 'cashIn')} : <strong>{formatDa(verseParsed)}</strong>
                    {' · '}
                    {t(lang, 'stillOwes')} : <strong>{formatDa(verseRemaining)}</strong>
                  </div>
                ) : null}
                {verseOk && verseRemaining > 0.001 ? (
                  <div className="field" style={{ marginTop: 10 }}>
                    <label>📅 {t(lang, 'dueInLabel')}</label>
                    <div className="tier-row">
                      {[7, 15, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`tier-chip ${dueDays === d ? 'active' : ''}`}
                          onClick={() => setDueDays(d)}
                        >
                          {d} {t(lang, 'dueDaysUnit')}
                        </button>
                      ))}
                    </div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {t(lang, 'dueOn')} :{' '}
                      <strong>
                        {formatDueDateLabel(dueDateFromDays(dueDays), lang)}
                      </strong>
                    </div>
                  </div>
                ) : null}
                <button
                  className="btn block"
                  data-sfx-cash
                  disabled={!verseOk}
                  onClick={() => finishSale(verseParsed)}
                >
                  ✅ {t(lang, 'confirmVerse')}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn ghost block"
              style={{ marginTop: 8 }}
              onClick={() => setPayStep(false)}
            >
              ← {t(lang, 'back')}
            </button>
              </>
            )}
          </div>
        )}
      </div>
      </aside>
      </div>

      {lastOrder ? (
        <div className="card">
          <h2>{mt(state.settings.commerceMode, lang, 'orderReady')}</h2>
          <div className="notice">{t(lang, 'editInvoiceBeforePrint')}</div>
          <textarea
            className="ticket-edit"
            rows={12}
            value={invoiceDraft}
            onChange={(e) => setInvoiceDraft(e.target.value)}
          />
          <div className="btn-row" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                setInvoiceDraft(buildInvoiceText(lastOrder, state.settings))
              }
            >
              {t(lang, 'resetInvoice')}
            </button>
          </div>
          <OrderShareButtons
            mode={state.settings.commerceMode}
            lang={lang}
            stacked
            hasPhone={!!lastOrder.clientPhone}
            onWhatsapp={() => onWhatsapp(lastOrder, invoiceDraft)}
            onPrint={() => onPrint(lastOrder, invoiceDraft)}
            onBoth={() => onBoth(lastOrder, invoiceDraft)}
            onInvoice={() => onInvoice(lastOrder, invoiceDraft)}
          />
        </div>
      ) : null}
    </>
  )
}

function ProfitsPage({ state, lang }: { state: AppState; lang: Language }) {
  const presets = rangePresets()
  const [mode, setMode] = useState<'today' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom'>(
    'today',
  )
  const [fromStr, setFromStr] = useState(() => toDateInput(presets.today.from))
  const [toStr, setToStr] = useState(() => toDateInput(presets.today.to))

  const { from, to } = useMemo(() => {
    if (mode === 'custom') {
      return {
        from: parseDateInput(fromStr) ?? presets.today.from,
        to: parseDateInput(toStr) ?? presets.today.to,
      }
    }
    return presets[mode]
  }, [mode, fromStr, toStr, presets])

  const stats = useMemo(() => profitInRange(state, from, to), [state, from, to])

  function applyPreset(id: typeof mode) {
    setMode(id)
    if (id === 'custom') return
    const r = presets[id]
    setFromStr(toDateInput(r.from))
    setToStr(toDateInput(r.to))
  }

  return (
    <div className="page">
      <div className="card">
        <h2>💰 {t(lang, 'profitsTitle')}</h2>
        <p className="muted">{t(lang, 'profitsHint')}</p>
        {state.settings.multiLocationEnabled ? (
          <p className="muted">{t(lang, 'profitsLocationFilter')}</p>
        ) : null}
        <div className="btn-row" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
          {(
            [
              ['today', 'profitToday'],
              ['lastMonth', 'profitLastMonth'],
              ['thisYear', 'profitThisYear'],
              ['lastYear', 'profitLastYear'],
              ['custom', 'profitCustom'],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              className={`btn ${mode === id ? '' : 'secondary'}`}
              onClick={() => applyPreset(id)}
            >
              {t(lang, key)}
            </button>
          ))}
        </div>
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'dateFrom')}</label>
            <input
              type="date"
              value={fromStr}
              onChange={(e) => {
                setMode('custom')
                setFromStr(e.target.value)
              }}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'dateTo')}</label>
            <input
              type="date"
              value={toStr}
              onChange={(e) => {
                setMode('custom')
                setToStr(e.target.value)
              }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="list-item">
          <span>{mt(state.settings.commerceMode, lang, 'profitOrders')}</span>
          <strong>{stats.orderCount}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'todaySales')}</span>
          <strong>{formatDa(stats.salesTotalDa)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'cashToday')}</span>
          <strong>{formatDa(stats.cashInDa)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'todayProfit')}</span>
          <strong>{formatDa(stats.salesProfitDa)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'yearExpenses')}</span>
          <strong>{formatDa(stats.expensesDa)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'yearNetProfit')}</span>
          <strong>{formatDa(stats.netDa)}</strong>
        </div>
      </div>
    </div>
  )
}

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateInput(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function ExpensesPage({
  state,
  lang,
  onAdd,
  onDelete,
}: {
  state: AppState
  lang: Language
  onAdd: (e: {
    category: ExpenseCategory
    amountDa: number
    note: string
    date: string
  }) => void
  onDelete: (id: string) => void
}) {
  const todayIso = new Date().toISOString().slice(0, 10)
  const year = new Date().getFullYear()
  const [category, setCategory] = useState<ExpenseCategory>('personnel')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayIso)

  const todayList = expensesOnDate(state)
  const monthList = expensesInMonth(state)
  const todayTotal = sumExpensesDa(todayList)
  const monthTotal = sumExpensesDa(monthList)
  const monthByCat = expensesByCategory(monthList)
  const annual = annualNetProfitDa(state, year)

  return (
    <>
      <div className="card">
        <h2>{t(lang, 'expensesTitle')}</h2>
        <div className="muted">{t(lang, 'expensesHint')}</div>
      </div>

      <div className="grid-2">
        <div className="stat">
          <div className="muted">{t(lang, 'todayExpenses')}</div>
          <strong>{formatDa(todayTotal)}</strong>
        </div>
        <div className="stat">
          <div className="muted">{t(lang, 'monthExpenses')}</div>
          <strong>{formatDa(monthTotal)}</strong>
        </div>
        <div className="stat">
          <div className="muted">{t(lang, 'yearExpenses')}</div>
          <strong>{formatDa(annual.expensesDa)}</strong>
        </div>
        <div className="stat">
          <div className="muted">{t(lang, 'yearNetProfit')}</div>
          <strong>{formatDa(annual.netDa)}</strong>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h2>{t(lang, 'newExpense')}</h2>
        <div className="field">
          <label>{t(lang, 'category')}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(lang, `exp_${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'expenseAmount')}</label>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label>{t(lang, 'expenseNote')}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(lang, 'expenseNoteHint')}
            />
          </div>
        </div>
        <div className="muted" style={{ marginBottom: 10 }}>
          {t(lang, 'expenseNoteRequired')}
        </div>
        <div className="field">
          <label>{t(lang, 'expenseDate')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button
          className="btn block"
          disabled={!amount || Number(amount) <= 0 || !note.trim()}
          onClick={() => {
            onAdd({
              category,
              amountDa: Number(amount) || 0,
              note: note.trim(),
              date: date || todayIso,
            })
            setAmount('')
            setNote('')
          }}
        >
          {t(lang, 'addExpense')}
        </button>
      </div>

      <div className="card">
        <h2>
          {t(lang, 'yearSummary')} {year}
        </h2>
        <div className="list-item">
          <span>{t(lang, 'yearSalesProfit')}</span>
          <strong>{formatDa(annual.salesProfitDa)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'yearExpenses')}</span>
          <strong>{formatDa(annual.expensesDa)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'yearNetProfit')}</span>
          <strong>{formatDa(annual.netDa)}</strong>
        </div>
      </div>

      <div className="card">
        <h2>{t(lang, 'byCategory')}</h2>
        {monthTotal === 0 ? (
          <div className="empty">{t(lang, 'noExpenses')}</div>
        ) : (
          EXPENSE_CATEGORIES.filter((c) => monthByCat[c] > 0).map((c) => (
            <div className="list-item" key={c}>
              <span>{t(lang, `exp_${c}`)}</span>
              <strong>{formatDa(monthByCat[c])}</strong>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>
          {t(lang, 'expenses')} ({state.expenses.length})
        </h2>
        {state.expenses.length === 0 ? (
          <div className="empty">{t(lang, 'noExpenses')}</div>
        ) : (
          state.expenses.slice(0, 50).map((e) => (
            <div className="list-item" key={e.id}>
              <div>
                <strong>{t(lang, `exp_${e.category}`)}</strong>
                <div className="muted">
                  {new Date(e.date).toLocaleDateString(
                    lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                  )}
                  {e.note ? ` · ${e.note}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <strong>{formatDa(e.amountDa)}</strong>
                <div>
                  <button className="btn danger" onClick={() => onDelete(e.id)}>
                    {t(lang, 'delete')}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function StockPage({
  state,
  stats,
  lang,
  showCosts = true,
}: {
  state: AppState
  stats: {
    stockValue: number
    stockCost: number
    stockMargin: number
    credits: number
  }
  lang: Language
  showCosts?: boolean
}) {
  return (
    <>
      <div className="grid-2">
        <div className="stat">
          <div className="muted">{t(lang, 'stockValue')}</div>
          <strong>{formatDa(stats.stockValue)}</strong>
        </div>
        {showCosts ? (
          <>
        <div className="stat">
          <div className="muted">{t(lang, 'stockCost')}</div>
          <strong>{formatDa(stats.stockCost)}</strong>
        </div>
        <div className="stat">
          <div className="muted">{t(lang, 'stockMargin')}</div>
          <strong>{formatDa(stats.stockMargin)}</strong>
        </div>
          </>
        ) : null}
        <div className="stat">
          <div className="muted">{t(lang, 'openCredits')}</div>
          <strong>{formatDa(stats.credits)}</strong>
        </div>
      </div>
      {showCosts ? (
      <div className="muted" style={{ margin: '8px 4px 0' }}>
        {mt(state.settings.commerceMode, lang, 'profitHint')}
      </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <h2>{t(lang, 'stockDetail')}</h2>
        {state.settings.multiLocationEnabled && activeLocation(state) ? (
          <div className="notice" style={{ marginBottom: 8 }}>
            🏪 {t(lang, 'activeLocation')} : <strong>{activeLocation(state)?.name}</strong>
          </div>
        ) : null}
        {state.products.map((p) => {
          const here = displayStock(state, p)
          const margin = (p.priceDa - (p.costDa || 0)) * p.stock
          return (
            <div className="list-item" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <div className="muted">
                  {state.settings.multiLocationEnabled
                    ? `${t(lang, 'stockHere')} ${formatQty(here)} · ${t(lang, 'stockTotal')} ${formatQty(p.stock)}`
                    : `${formatQty(p.stock)} ${unitLabel(lang, p.unit)}`}
                  {showCosts ? (
                    <>
                      {' '}
                      · {t(lang, 'buyPriceShort')} {formatDa(p.costDa || 0)} →{' '}
                      {mt(state.settings.commerceMode, lang, 'sellPriceShort')}{' '}
                      {formatDa(p.priceDa)}
                    </>
                  ) : (
                    <>
                      {' '}
                      · {mt(state.settings.commerceMode, lang, 'sellPriceShort')}{' '}
                      {formatDa(p.priceDa)}
                    </>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <strong>{formatDa(p.stock * p.priceDa)}</strong>
                {showCosts ? (
                <div className="muted">
                  {t(lang, 'margin')} {formatDa(margin)}
                </div>
                ) : null}
                {here <= p.lowStockAt ? (
                  <div className="badge warn">{t(lang, 'lowStock')}</div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function ZakatPage({
  state,
  lang,
  onCalculate,
  onMarkPaid,
}: {
  state: AppState
  lang: Language
  onCalculate: (includeCredits: boolean) => void
  onMarkPaid: (calculatedAt: string) => void
}) {
  const [includeCredits, setIncludeCredits] = useState(true)
  const year = new Date().getFullYear()
  const stock = stockValueDa(state)
  const cost = stockCostDa(state)
  const credits = openCreditsDa(state)
  const base = stock + (includeCredits ? credits : 0)
  const estimate = Math.round(base * 0.025)
  const last = state.zakatHistory[0]
  const annual = annualNetProfitDa(state, year)

  return (
    <>
      <div className="notice">{t(lang, 'zakatOnce')}</div>
      <div className="notice">{t(lang, 'zakatExplain')}</div>
      <div className="notice">{t(lang, 'zakatAndProfit')}</div>

      <div className="card">
        <h2>
          {t(lang, 'yearSummary')} {year}
        </h2>
        <div className="list-item">
          <span>{t(lang, 'yearSalesProfit')}</span>
          <strong>{formatDa(annual.salesProfitDa)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'yearExpenses')}</span>
          <strong>{formatDa(annual.expensesDa)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'yearNetProfit')}</span>
          <strong>{formatDa(annual.netDa)}</strong>
        </div>
      </div>

      {annual.expenses.length > 0 ? (
        <div className="card">
          <h2>{t(lang, 'yearExpensesList')}</h2>
          {annual.expenses.slice(0, 30).map((e) => (
            <div className="list-item" key={e.id}>
              <div>
                <strong>{t(lang, `exp_${e.category}`)}</strong>
                <div className="muted">
                  {new Date(e.date).toLocaleDateString(
                    lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                  )}
                  {e.note ? ` · ${e.note}` : ''}
                </div>
              </div>
              <strong>{formatDa(e.amountDa)}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div className="card">
        <h2>{t(lang, 'annualZakat')}</h2>
        <div className="list-item">
          <span>{t(lang, 'stockValue')}</span>
          <strong>{formatDa(stock)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'stockCost')}</span>
          <strong>{formatDa(cost)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'openCredits')}</span>
          <strong>{formatDa(credits)}</strong>
        </div>
        <label className="field check-row">
          <input
            type="checkbox"
            checked={includeCredits}
            onChange={(e) => setIncludeCredits(e.target.checked)}
          />
          {t(lang, 'includeCredits')}
        </label>
        <div className="list-item">
          <span>{t(lang, 'base')}</span>
          <strong>{formatDa(base)}</strong>
        </div>
        <div className="list-item">
          <span>{t(lang, 'zakatEstimate')}</span>
          <strong>{formatDa(estimate)}</strong>
        </div>
        <button className="btn block" onClick={() => onCalculate(includeCredits)}>
          {t(lang, 'calculateZakat')}
        </button>
      </div>

      <div className="card">
        <h2>{mt(state.settings.commerceMode, lang, 'history')}</h2>
        {!last ? (
          <div className="empty">{t(lang, 'noCalcYet')}</div>
        ) : (
          state.zakatHistory.map((z) => (
            <div className="list-item" key={z.calculatedAt}>
              <div>
                <strong>{formatDa(z.amountDa)}</strong>
                <div className="muted">
                  {new Date(z.calculatedAt).toLocaleDateString(
                    lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                  )}{' '}
                  · {t(lang, 'base')} {formatDa(z.baseDa)}
                </div>
                {z.paidAt ? (
                  <span className="badge">{t(lang, 'markedPaid')}</span>
                ) : (
                  <button
                    className="btn secondary"
                    style={{ marginTop: 8 }}
                    onClick={() => onMarkPaid(z.calculatedAt)}
                  >
                    {t(lang, 'markPaid')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
