import { useEffect, useMemo, useState } from 'react'
import type {
  AppState,
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
} from './types'
import { ALL_UNITS, EXPENSE_CATEGORIES } from './types'
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
} from './store'
import { isDecimalUnit, qtyStep, t, unitLabel } from './i18n'
import { formatDa, formatQty } from './utils/format'
import { applyUiTheme, themeLabel, THEME_PRESETS } from './utils/theme'
import {
  DEFAULT_AGENT_PERMISSIONS,
  type AgentPermissions,
} from './agent/permissions'
import { openWhatsapp, openWhatsappText } from './utils/whatsapp'
import { compressImageFile } from './utils/image'
import {
  availableTiers,
  costForTier,
  isCartonTier,
  maxQtyForTier,
  priceForTier,
  sellUnitForTier,
} from './utils/pricing'
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
import { CalculatorPage } from './CalculatorPage'
import { DeliveryMapPage } from './DeliveryMapPage'
import { MissionsPage } from './MissionsPage'
import { AgentPage } from './AgentPage'
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
import { ClientQrCard } from './ClientQrCard'
import { classifyHomeScan } from './utils/clientQr'
import { APP_BRAND } from './brand'
import { APP_VERSION, activateLicense, getAccessStatus } from './license/license'

const NAV_IDS: Screen[] = ['home', 'order', 'agent', 'clients', 'inbox', 'products']
const NAV_ICONS: Record<Screen, string> = {
  home: '🏠',
  order: '🛒',
  products: '📦',
  clients: '👥',
  stock: '📈',
  zakat: '🌙',
  settings: '⚙️',
  inbox: '📥',
  arrivages: '🆕',
  agent: '🤖',
  expenses: '💸',
  calculator: '🧮',
  gallery: '🖼️',
  delivery: '🗺️',
  missions: '🚚',
  history: '📜',
  profits: '💰',
  caisse: '💵',
  returns: '↩️',
  purchases: '🏭',
}

const CATEGORIES: ProductCategory[] = [
  'alimentaire',
  'cosmetique',
  'consommable',
  'quincaillerie',
  'textile',
  'autre',
]

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
  const [seedClientNotes, setSeedClientNotes] = useState<string | null>(null)
  const [historySeed, setHistorySeed] = useState<{
    from: string
    to: string
  } | null>(null)
  const [agentSeed, setAgentSeed] = useState<string | null>(null)
  const lang = state.settings.language

  useEffect(() => {
    registerMuteAskHandler(null)
    stopSpeaking()
    return () => registerMuteAskHandler(null)
  }, [])

  function keepAlive(id: Screen) {
    setAliveScreens((list) => (list.includes(id) ? list : [...list, id]))
  }

  function goTo(next: Screen, _spokenLabel?: string) {
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
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  useEffect(() => {
    applyUiTheme(state.settings.themePreset, state.settings.fontScale)
    document.documentElement.classList.toggle(
      'easy-mode',
      state.settings.easyMode !== false,
    )
  }, [state.settings.themePreset, state.settings.fontScale, state.settings.easyMode])

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
  const needRolePick =
    state.team.multiPosteEnabled && !state.team.hasChosenRole

  useEffect(() => {
    if (isDriverMode && screen !== 'missions') goTo('missions')
  }, [isDriverMode, screen])

  /** Voix agent / TTS désactivée */
  useEffect(() => {
    stopSpeaking()
  }, [])

  return (
    <div
      className={`app-shell ${screen === 'delivery' ? 'map-mode' : ''} ${
        state.settings.easyMode !== false ? 'easy-ui' : ''
      } ${isDriverMode ? 'driver-mode' : ''}`}
    >
      {needRolePick ? (
        <RolePickGate
          lang={lang}
          onPick={(role) => {
            setState((s) =>
              updateTeam(s, {
                role,
                hasChosenRole: true,
                currentDriverId: role === 'owner' ? null : s.team.currentDriverId,
              }),
            )
            goTo('missions')
          }}
        />
      ) : null}

      {!needRolePick && screen !== 'delivery' && !isDriverMode ? (
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
            <div className="brand">
              AZ <span>POS</span>
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
          {toast ? <div className="badge">{toast}</div> : null}
          <button
            className={`settings-btn ${screen === 'settings' ? 'active' : ''}`}
            onClick={() => goTo('settings')}
            aria-label={t(lang, 'settings')}
            title={t(lang, 'settings')}
          >
            ⚙️
          </button>
        </div>
      </header>
      ) : !needRolePick && isDriverMode ? (
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
              <div className="brand">
                AZ <span>POS</span>
              </div>
              <div className="muted">🚚 {t(lang, 'driverMode')}</div>
            </div>
          </div>
          {toast ? <div className="badge">{toast}</div> : null}
        </header>
      ) : !needRolePick && toast ? (
        <div className="badge map-toast">{toast}</div>
      ) : null}

      {!needRolePick && screen === 'delivery' ? (
        <button
          type="button"
          className="back-btn map-back"
          onClick={goBack}
          aria-label={t(lang, 'back')}
        >
          ← {t(lang, 'back')}
        </button>
      ) : null}

      {!needRolePick ? (
      <>
      {isAlive('home') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'home' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'home'}
          inert={screen !== 'home' ? true : undefined}
        >
        <HomePage
          state={state}
          stats={stats}
          lang={lang}
          low={low}
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
          initialProductId={focusProductId}
          seedBarcode={seedProductBarcode}
          seedQuery={seedProductQuery}
          onSeedConsumed={() => {
            setFocusProductId(null)
            setSeedProductBarcode(null)
            setSeedProductQuery(null)
          }}
          onAdd={(p) => {
            setState((s) => addProduct(s, p))
            flash('productAdded')
          }}
          onUpdate={(id, patch) => {
            setState((s) => updateProduct(s, id, patch))
            flash('productUpdated')
          }}
          onDelete={(id) => {
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
          initialClientId={focusClientId}
          seedNotes={seedClientNotes}
          onSeedConsumed={() => {
            setFocusClientId(null)
            setSeedClientNotes(null)
          }}
          onAdd={(c) => {
            setState((s) => addClient(s, c))
            flash('clientAdded')
          }}
          onUpdate={(id, patch) => {
            setState((s) => updateClient(s, id, patch))
            flash('clientUpdated')
          }}
          onPayDebt={(id, amount) => {
            setState((s) => applyClientPayment(s, id, amount))
            flash('debtPaymentSaved')
          }}
          onSetBalance={(id, balance) => {
            setState((s) => setClientDisplayedBalance(s, id, balance))
            flash('balanceUpdated')
          }}
          onImport={(list) => {
            const { state: next, added } = addClientsBulk(state, list)
            setState(next)
            if (added > 0) flash('contactsImported')
          }}
          onDelete={(id) => {
            setState((s) => deleteClient(s, id))
            flash('clientDeleted')
          }}
          onFlash={flash}
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
          onCreate={(order) => {
            const next = createOrder(state, order)
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
          <StockPage state={state} stats={stats} lang={lang} />
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
      {isAlive('settings') && !isDriverMode ? (
        <div
          className={`screen-pane ${screen === 'settings' ? 'is-active' : 'is-cached'}`}
          aria-hidden={screen !== 'settings'}
          inert={screen !== 'settings' ? true : undefined}
        >
        <SettingsPage
          state={state}
          lang={lang}
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
          onGo={goTo}
        />
        </div>
      ) : null}
      </>
      ) : null}

      {!needRolePick && !isDriverMode ? (
      <nav className="bottom-nav" aria-label="Navigation">
        {NAV_IDS.map((id) => (
          <button
            key={id}
            className={`nav-btn ${screen === id ? 'active' : ''}`}
            onClick={() => goTo(id, t(lang, id))}
          >
            <span className="nav-emoji">{NAV_ICONS[id]}</span>
            <span className="nav-text">{t(lang, id)}</span>
          </button>
        ))}
      </nav>
      ) : null}
    </div>
  )
}

function RolePickGate({
  lang,
  onPick,
}: {
  lang: Language
  onPick: (role: 'owner' | 'driver') => void
}) {
  return (
    <div className="page role-pick">
      <div className="card">
        <h2>🚚 {t(lang, 'rolePickTitle')}</h2>
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

function SettingsPage({
  state,
  lang,
  onSave,
  onToggleMultiPoste,
  onGo,
}: {
  state: AppState
  lang: Language
  onSave: (patch: Partial<AppState['settings']>) => void
  onToggleMultiPoste: (enabled: boolean) => void
  onGo: (s: Screen) => void
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
  const [agentPerms, setAgentPerms] = useState<AgentPermissions>(() => ({
    ...DEFAULT_AGENT_PERMISSIONS,
    ...state.settings.agentPermissions,
  }))
  const [useBt, setUseBt] = useState(getPreferBluetoothPrinter())
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseInfo, setLicenseInfo] = useState('')

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
      fontScale,
      showZakat,
      showCalculator,
      showGallery,
      agentPermissions: agentPerms,
      ...extra,
    })
  }

  return (
    <>
      <div className="card">
        <h2>{t(lang, 'settingsTitle')}</h2>
        <div className="notice">{t(lang, 'oneAppHint')}</div>
        <div className="muted">{APP_BRAND.name} v{APP_VERSION}</div>
        <div className="notice" style={{ marginTop: 8 }}>
          {licenseInfo || '…'}
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
          <div className="btn-row">
            <button
              className={`btn ${language === 'fr' ? '' : 'ghost'}`}
              onClick={() => setLanguage('fr')}
            >
              {t(lang, 'french')}
            </button>
            <button
              className={`btn ${language === 'ar' ? '' : 'ghost'}`}
              onClick={() => setLanguage('ar')}
            >
              {t(lang, 'arabic')}
            </button>
          </div>
        </div>

        <div className="field">
          <label>{t(lang, 'themeTitle')}</label>
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((id) => (
              <button
                key={id}
                type="button"
                className={`btn ${themePreset === id ? '' : 'ghost'}`}
                onClick={() => {
                  setThemePreset(id)
                  applyUiTheme(id, fontScale)
                }}
              >
                {themeLabel(lang, id)}
              </button>
            ))}
          </div>
        </div>

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
        </div>

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
          {ALL_UNITS.map((u) => unitLabel(language, u)).join(' · ')}
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
        <h2>{t(lang, 'shopInfo')}</h2>
        <div className="field">
          <label>{t(lang, 'shopName')}</label>
          <input value={shopName} onChange={(e) => setShopName(e.target.value)} />
        </div>
        <div className="field">
          <label>{t(lang, 'phone')}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label>{t(lang, 'city')}</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
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
  onGo,
  onFocusClient,
  onFocusProduct,
  onSeedNewProduct,
  onSeedProductSearch,
  onSeedNewClient,
  onOpenHistoryDates,
  onEnableAlerts,
  onWhatsapp,
  onPrint,
  onBoth,
  onInvoice,
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
  onGo: (s: Screen, spokenLabel?: string) => void
  onFocusClient: (id: string) => void
  onFocusProduct: (id: string) => void
  onSeedNewProduct: (barcode: string) => void
  onSeedProductSearch: (query: string) => void
  onSeedNewClient: (note: string) => void
  onOpenHistoryDates: (from: string, to: string) => void
  onEnableAlerts: () => void
  onWhatsapp: (order: Order) => void
  onPrint: (order: Order) => Promise<void>
  onBoth: (order: Order) => Promise<void>
  onInvoice: (order: Order) => void
}) {
  const recent = (todayOrders(state).length > 0 ? todayOrders(state) : state.orders).slice(0, 4)
  const [scanOpen, setScanOpen] = useState(false)
  const [unknownCode, setUnknownCode] = useState<string | null>(null)
  const overdue = useMemo(() => overdueCreditOrders(state), [state])
  const soon = useMemo(() => dueSoonCreditOrders(state, 3), [state])

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
    if (hit.kind === 'product' && hit.productId) {
      onFocusProduct(hit.productId)
      onGo('products', t(lang, 'appStock'))
      return
    }
    playBarcodeError()
    setUnknownCode(hit.code)
  }

  const dockApps: Array<{
    id: Screen
    label: string
    icon: string
    tone: string
    badge?: number
  }> = [
    { id: 'order', label: t(lang, 'appQuick'), icon: '⚡', tone: 'amber' },
    { id: 'order', label: t(lang, 'appOrder'), icon: '🛒', tone: 'green' },
    { id: 'calculator', label: t(lang, 'appCalc'), icon: '🧮', tone: 'steel' },
    {
      id: 'products',
      label: t(lang, 'appStock'),
      icon: '📦',
      tone: 'blue',
      badge: stats.lowStock,
    },
  ]

  const gridApps: Array<{
    id: Screen
    label: string
    icon: string
    tone: string
    badge?: number
  }> = [
    { id: 'delivery', label: t(lang, 'appMaps'), icon: '🗺️', tone: 'teal' },
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
    { id: 'gallery', label: t(lang, 'appGallery'), icon: '🖼️', tone: 'blue' },
    { id: 'clients', label: t(lang, 'appClients'), icon: '👥', tone: 'navy' },
    { id: 'history', label: t(lang, 'appHistory'), icon: '📜', tone: 'slate' },
    { id: 'caisse', label: t(lang, 'appCaisse'), icon: '💵', tone: 'amber' },
    { id: 'returns', label: t(lang, 'appReturns'), icon: '↩️', tone: 'coral' },
    { id: 'purchases', label: t(lang, 'appPurchases'), icon: '🏭', tone: 'steel' },
    {
      id: 'inbox',
      label: t(lang, 'appInbox'),
      icon: '📥',
      tone: 'coral',
      badge: stats.pendingInbox,
    },
    { id: 'arrivages', label: t(lang, 'appArrivals'), icon: '🆕', tone: 'lime' },
    { id: 'agent', label: t(lang, 'appAgent'), icon: '🤖', tone: 'slate' },
    { id: 'expenses', label: t(lang, 'appExpenses'), icon: '💸', tone: 'rose' },
    { id: 'profits', label: t(lang, 'appProfits'), icon: '💰', tone: 'amber' },
    { id: 'stock', label: t(lang, 'appValue'), icon: '📈', tone: 'emerald' },
    { id: 'zakat', label: t(lang, 'appZakat'), icon: '🌙', tone: 'forest' },
    { id: 'settings', label: t(lang, 'appSettings'), icon: '⚙️', tone: 'charcoal' },
  ]

  return (
    <div className="home-screen">
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

      <section className="home-hero">
        <div className="home-hero-text">
          <div className="muted">{t(lang, 'todayStrip')}</div>
          <h2 className="home-shop">{state.settings.shopName || APP_BRAND.defaultShopName}</h2>
        </div>
        <GlobalSmartSearch
          state={state}
          lang={lang}
          onHit={handleHit}
          onOpenHistory={onOpenHistoryDates}
        />
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
        >
          <span className="sell-cta-emoji">📷</span>
          <span>
            <strong>{t(lang, 'homeScanTitle')}</strong>
            <small>{t(lang, 'homeScanHint')}</small>
          </span>
        </button>
        <button type="button" className="sell-cta" onClick={() => onGo('order', t(lang, 'sellNow'))}>
          <span className="sell-cta-emoji">🛒</span>
          <span>
            <strong>{t(lang, 'sellNow')}</strong>
            <small>{t(lang, 'sellNowHint')}</small>
          </span>
        </button>
        <button
          type="button"
          className="history-cta"
          onClick={() => onGo('history', t(lang, 'appHistory'))}
        >
          <span className="cal">📅</span>
          <span>📜 {t(lang, 'salesHistoryBtn')}</span>
        </button>
        <div className="home-chips">
          <div className="home-chip">
            <span>🧾 {t(lang, 'todayOrders')}</span>
            <strong>{stats.todayCount}</strong>
          </div>
          <div className="home-chip accent">
            <span>💵 {t(lang, 'cashToday')}</span>
            <strong>{formatDa(stats.todayCash)}</strong>
          </div>
          <div className="home-chip">
            <span>📊 {t(lang, 'todaySales')}</span>
            <strong>{formatDa(stats.todayTotal)}</strong>
          </div>
          <div className="home-chip">
            <span>✅ {t(lang, 'netToday')}</span>
            <strong>{formatDa(stats.netToday)}</strong>
          </div>
          {stats.credits > 0 ? (
            <div className="home-chip warn">
              <span>📝 {t(lang, 'openCredits')}</span>
              <strong>{formatDa(stats.credits)}</strong>
            </div>
          ) : null}
          {stats.overdueCount > 0 ? (
            <div className="home-chip warn">
              <span>⏰ {t(lang, 'dueOverdue')}</span>
              <strong>{stats.overdueCount}</strong>
            </div>
          ) : null}
          {stats.pendingInbox > 0 ? (
            <div className="home-chip warn">
              <span>📥 {t(lang, 'pendingIncoming')}</span>
              <strong>{stats.pendingInbox}</strong>
            </div>
          ) : null}
        </div>
      </section>

      <section className="home-apps" aria-label={t(lang, 'appMenu')}>
        <div className="app-grid">
          {gridApps.map((app) => (
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

        <div className="home-dock" aria-label={t(lang, 'quickActions')}>
          {dockApps.map((app, index) => (
            <button
              key={`dock-${app.label}-${index}`}
              type="button"
              className="app-tile dock"
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
      </section>

      <div className="card home-recent">
        <div className="list-item" style={{ borderBottom: 'none', paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>{t(lang, 'lastOrders')}</h2>
          <button type="button" className="btn secondary" onClick={() => onGo('history', t(lang, 'history'))}>
            📜 {t(lang, 'history')}
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="empty">{t(lang, 'noOrdersToday')}</div>
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
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ActivityKind>('all')
  const [dayPreset, setDayPreset] = useState<
    'all' | 'today' | 'yesterday' | 'week' | 'month'
  >('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
      t(lang, 'act_order'),
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

  return (
    <div className="page">
      <div className="card">
        <h2>📜 {t(lang, 'history')}</h2>
        <p className="muted">{t(lang, 'historyActivityHint')}</p>

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
            <option value="order">{t(lang, 'act_order')}</option>
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
          <h3>{t(lang, 'ordersInPeriod')}</h3>
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
                lang={lang}
                hasPhone={!!o.clientPhone}
                onWhatsapp={() => onWhatsapp(o)}
                onPrint={() => onPrint(o)}
                onBoth={() => onBoth(o)}
                onInvoice={() => onInvoice(o)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function OrderShareButtons({
  lang,
  onWhatsapp,
  onPrint,
  onBoth,
  onInvoice,
  stacked = false,
  hasPhone = true,
}: {
  lang: Language
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
        <div className="muted">{t(lang, 'noWhatsappQuick')}</div>
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
              {p.imageDataUrl ? (
                <img src={p.imageDataUrl} alt={p.name} />
              ) : (
                <div className="gallery-tile-ph">{t(lang, 'noPhoto')}</div>
              )}
              <div className="gallery-tile-meta">
                <strong>{p.name}</strong>
                <span>
                  {formatDa(p.priceDa)} / {unitLabel(lang, p.unit)}
                </span>
                <span className="muted">
                  {t(lang, 'stockQty')} : {formatQty(p.stock)}
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
            {preview.imageDataUrl ? (
              <img src={preview.imageDataUrl} alt={preview.name} />
            ) : (
              <div className="gallery-tile-ph large">{t(lang, 'noPhoto')}</div>
            )}
            <div className="gallery-lightbox-body">
              <h3>{preview.name}</h3>
              <p className="muted">
                {t(lang, `cat_${preview.category}`)} ·{' '}
                {formatDa(preview.priceDa)} / {unitLabel(lang, preview.unit)}
              </p>
              <p>
                {t(lang, 'stockQty')} : {formatQty(preview.stock)}{' '}
                {unitLabel(lang, preview.unit)}
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
  stock,
  setStock,
  showLowStock,
  lowStockAt,
  setLowStockAt,
}: {
  lang: Language
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
  stock: string
  setStock: (v: string) => void
  showLowStock?: boolean
  lowStockAt?: string
  setLowStockAt?: (v: string) => void
}) {
  const ppp = Number(piecesPerPack) || 0
  const gros = Number(grosPriceDa) || 0
  const superG = Number(superGrosPriceDa) || 0

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
        <h3 className="pricing-board-title">💰 {t(lang, 'pricingBoardTitle')}</h3>
        <p className="muted pricing-board-hint">{t(lang, 'pricingBoardHint')}</p>

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
      </div>

      <div className={showLowStock ? 'grid-2' : undefined}>
        <div className="field">
          <label>{t(lang, 'stockInPieces')}</label>
          <input
            inputMode="decimal"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <div className="muted">{t(lang, 'packStockHint')}</div>
          {ppp > 0 && Number(stock) > 0 ? (
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
  const [category, setCategory] = useState<ProductCategory>('alimentaire')
  const [unit, setUnit] = useState<Unit>('piece')
  const [costDa, setCostDa] = useState('')
  const [priceDa, setPriceDa] = useState('')
  const [demiGrosPriceDa, setDemiGrosPriceDa] = useState('')
  const [grosPriceDa, setGrosPriceDa] = useState('')
  const [superGrosPriceDa, setSuperGrosPriceDa] = useState('')
  const [stock, setStock] = useState('')
  const [piecesPerPack, setPiecesPerPack] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>()
  const [photoBusy, setPhotoBusy] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [barcode, setBarcode] = useState('')

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
    return (
      <ProductEditCard
        lang={lang}
        product={editing}
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
      <div className="card">
        <h2>{t(lang, 'newProduct')}</h2>
        <div className="muted" style={{ marginBottom: 10 }}>
          {t(lang, 'profitHint')}
        </div>
        <div className="product-photo-field">
          {imageDataUrl ? (
            <img className="product-thumb" src={imageDataUrl} alt="" />
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
              {ALL_UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(lang, `unit_${u}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ProductPricingFields
          lang={lang}
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
            onAdd({
              name: name.trim(),
              category,
              unit,
              costDa: Number(costDa) || 0,
              priceDa: Number(priceDa) || 0,
              stock: Number(stock) || 0,
              lowStockAt: isDecimalUnit(unit) ? qtyStep(unit) * 2 : 5,
              piecesPerPack: ppp > 0 ? ppp : undefined,
              demiGrosPriceDa: demi > 0 ? demi : undefined,
              grosPriceDa: ppp > 0 && gros > 0 ? gros : undefined,
              superGrosPriceDa: ppp > 0 && superG > 0 ? superG : undefined,
              packPriceDa: ppp > 0 && gros > 0 ? gros : undefined,
              imageDataUrl,
              barcode: barcode.trim() || undefined,
            })
            setName('')
            setBarcode('')
            setCostDa('')
            setPriceDa('')
            setDemiGrosPriceDa('')
            setGrosPriceDa('')
            setSuperGrosPriceDa('')
            setStock('')
            setPiecesPerPack('')
            setImageDataUrl(undefined)
          }}
        >
          {t(lang, 'addToStock')}
        </button>
      </div>

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
              {p.imageDataUrl ? (
                <img className="product-thumb" src={p.imageDataUrl} alt="" />
              ) : (
                <div className="product-thumb placeholder">{t(lang, 'noPhoto')}</div>
              )}
              <div className="product-main">
                <strong>{p.name}</strong>
                <div className="muted">
                  {t(lang, `cat_${p.category}`)} · {unitLabel(lang, p.unit)}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {t(lang, 'buyPriceShort')} {formatDa(p.costDa || 0)} →{' '}
                  {t(lang, 'tier_piece')} {formatDa(p.priceDa)}
                  {p.demiGrosPriceDa
                    ? ` · ${t(lang, 'tier_demi_gros')} ${formatDa(p.demiGrosPriceDa)}`
                    : ''}
                  {p.piecesPerPack
                    ? ` · ${t(lang, 'packOf')}${p.piecesPerPack}`
                    : ''}
                  {(p.grosPriceDa || p.packPriceDa)
                    ? ` · ${t(lang, 'tier_gros')} ${formatDa(p.grosPriceDa || p.packPriceDa || 0)}`
                    : ''}
                  {p.superGrosPriceDa
                    ? ` · ${t(lang, 'tier_super_gros')} ${formatDa(p.superGrosPriceDa)}`
                    : ''}
                </div>
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <span className={`badge ${p.stock <= p.lowStockAt ? 'warn' : ''}`}>
                    {formatQty(p.stock)} {unitLabel(lang, 'piece')}
                    {p.piecesPerPack
                      ? ` · ${Math.floor(p.stock / p.piecesPerPack)} ${t(lang, 'cartonsLeft')}`
                      : ''}
                  </span>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      onUpdate(p.id, {
                        stock: +(p.stock + qtyStep(p.unit)).toFixed(3),
                      })
                    }
                  >
                    +{qtyStep(p.unit)}
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      onUpdate(p.id, {
                        stock: Math.max(0, +(p.stock - qtyStep(p.unit)).toFixed(3)),
                      })
                    }
                  >
                    -{qtyStep(p.unit)}
                  </button>
                  <button className="btn secondary" onClick={() => setEditId(p.id)}>
                    {t(lang, 'editProduct')}
                  </button>
                  <button className="btn danger" onClick={() => onDelete(p.id)}>
                    {t(lang, 'delete')}
                  </button>
                </div>
              </div>
              <strong>{formatDa(p.priceDa * p.stock)}</strong>
            </div>
          )
          })
        )}
      </div>
    </>
  )
}

function ProductEditCard({
  lang,
  product,
  photoBusy,
  onPickPhoto,
  onRemovePhoto,
  onCancel,
  onSave,
  onDelete,
}: {
  lang: Language
  product: Product
  photoBusy: boolean
  onPickPhoto: (file: File | null | undefined) => void
  onRemovePhoto: () => void
  onCancel: () => void
  onSave: (patch: Partial<Omit<Product, 'id' | 'createdAt'>>) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(product.name)
  const [category, setCategory] = useState<ProductCategory>(product.category)
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
  const [stock, setStock] = useState(String(product.stock))
  const [lowStockAt, setLowStockAt] = useState(String(product.lowStockAt))
  const [barcode, setBarcode] = useState(product.barcode || '')

  return (
    <div className="card">
      <button className="btn ghost" onClick={onCancel}>
        ← {t(lang, 'cancelEdit')}
      </button>
      <h2>{t(lang, 'editProduct')}</h2>

      <div className="product-photo-field">
        {product.imageDataUrl ? (
          <img className="product-thumb" src={product.imageDataUrl} alt="" />
        ) : (
          <div className="product-thumb placeholder">{t(lang, 'noPhoto')}</div>
        )}
        <PhotoPickControls
          lang={lang}
          busy={photoBusy}
          hasPhoto={!!product.imageDataUrl}
          onPick={onPickPhoto}
          onRemove={onRemovePhoto}
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
            {ALL_UNITS.map((u) => (
              <option key={u} value={u}>
                {t(lang, `unit_${u}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ProductPricingFields
        lang={lang}
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
          onSave({
            name: name.trim(),
            category,
            unit,
            costDa: Number(costDa) || 0,
            priceDa: Number(priceDa) || 0,
            stock: Number(stock) || 0,
            lowStockAt: Number(lowStockAt) || 0,
            piecesPerPack: ppp > 0 ? ppp : undefined,
            demiGrosPriceDa: demi > 0 ? demi : undefined,
            grosPriceDa: ppp > 0 && gros > 0 ? gros : undefined,
            superGrosPriceDa: ppp > 0 && superG > 0 ? superG : undefined,
            packPriceDa: ppp > 0 && gros > 0 ? gros : undefined,
            barcode: barcode.trim() || undefined,
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
  initialClientId,
  seedNotes,
  onSeedConsumed,
  onAdd,
  onUpdate,
  onPayDebt,
  onSetBalance,
  onImport,
  onDelete,
  onFlash,
}: {
  state: AppState
  lang: Language
  initialClientId?: string | null
  seedNotes?: string | null
  onSeedConsumed?: () => void
  onAdd: (c: Omit<Client, 'id' | 'createdAt'>) => void
  onUpdate: (id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>) => void
  onPayDebt: (id: string, amount: number) => void
  onSetBalance: (id: string, balance: number) => void
  onImport: (list: Array<Pick<Client, 'name' | 'phone'>>) => void
  onDelete: (id: string) => void
  onFlash: (key: string) => void
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
          client={selected}
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
          </div>

          <ClientQrCard client={selected} lang={lang} />
        </div>
      </>
    )
  }

  return (
    <>
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

      <div className="card">
        <h2>{t(lang, 'newClient')}</h2>
        <div className="field">
          <label>{t(lang, 'clientName')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>WhatsApp</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'city')}</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="field">
            <label>{t(lang, 'clientAddress')}</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t(lang, 'clientAddressHint')}
            />
          </div>
        </div>
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
      </div>

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
  client,
  onCancel,
  onSave,
  onGps,
  onPasteMaps,
  onClearGps,
}: {
  lang: Language
  client: Client
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
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label>{t(lang, 'city')}</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label>{t(lang, 'clientAddress')}</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>{t(lang, 'clientNotes')}</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
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
        <div className="muted" style={{ marginBottom: 10 }}>
          GPS : {client.lat}, {client.lng}
        </div>
      ) : null}
      <button
        className="btn block"
        disabled={!name.trim() || !phone.trim()}
        onClick={() =>
          onSave({
            name: name.trim(),
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim(),
            notes: notes.trim(),
          })
        }
      >
        {t(lang, 'saveClient')}
      </button>
    </div>
  )
}

function OrderPage({
  state,
  lang,
  onCreate,
  onWhatsapp,
  onPrint,
  onBoth,
  onInvoice,
}: {
  state: AppState
  lang: Language
  onCreate: (
    order: Omit<Order, 'id' | 'createdAt' | 'whatsappSent' | 'invoiceNumber'>,
  ) => Order
  onWhatsapp: (order: Order, customText?: string) => void
  onPrint: (order: Order, customText?: string) => Promise<void>
  onBoth: (order: Order, customText?: string) => Promise<void>
  onInvoice: (order: Order, customText?: string) => void
}) {
  const QUICK = '__quick__'
  const [clientId, setClientId] = useState(QUICK)
  /** clé = `${productId}::${tier}` */
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  const [tierMap, setTierMap] = useState<Record<string, PriceTier>>({})
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [clientDateFrom, setClientDateFrom] = useState('')
  const [clientDateTo, setClientDateTo] = useState('')
  const [productDateFrom, setProductDateFrom] = useState('')
  const [productDateTo, setProductDateTo] = useState('')
  /** Après le panier : choisir Payé / Versé */
  const [payStep, setPayStep] = useState(false)
  const [verseInput, setVerseInput] = useState('')
  const [dueDays, setDueDays] = useState(15)
  const [invoiceDraft, setInvoiceDraft] = useState('')

  const isQuick = clientId === QUICK
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
    return state.products.filter((p) => {
      if (!inDateRange(p.createdAt, productDateFrom, productDateTo)) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        t(lang, `cat_${p.category}`).toLowerCase().includes(q)
      )
    })
  }, [state.products, productQuery, productDateFrom, productDateTo, lang])

  function lineKey(productId: string, tier: PriceTier) {
    return `${productId}::${tier}`
  }

  function tierOf(productId: string): PriceTier {
    return tierMap[productId] ?? 'piece'
  }

  const lines: OrderLine[] = Object.entries(qtyMap)
    .filter(([, qty]) => qty > 0)
    .flatMap(([key, qty]) => {
      const [productId, tierRaw] = key.split('::')
      const tier = (tierRaw as PriceTier) || 'piece'
      const p = state.products.find((x) => x.id === productId)
      if (!p) return []
      const unitPrice = priceForTier(p, tier)
      if (unitPrice == null) return []
      return [
        {
          productId: p.id,
          name: p.name,
          unit: sellUnitForTier(tier),
          qty,
          unitPriceDa: unitPrice,
          unitCostDa: costForTier(p, tier),
          lineTotalDa: +(qty * unitPrice).toFixed(2),
          priceTier: tier,
        },
      ]
    })

  const total = lines.reduce((s, l) => s + l.lineTotalDa, 0)
  const client = state.clients.find((c) => c.id === clientId)
  const clientDebt = client ? clientCreditDa(state, client.id) : 0
  const canValidate = lines.length > 0 && (isQuick || !!client)
  const verseParsed = Number(String(verseInput).replace(',', '.'))
  const verseOk =
    Number.isFinite(verseParsed) && verseParsed >= 0 && verseParsed <= total
  const verseRemaining = verseOk ? Math.max(0, +(total - verseParsed).toFixed(2)) : 0

  function bump(product: Product, tier: PriceTier, delta: number) {
    const key = lineKey(product.id, tier)
    const max = maxQtyForTier(product, tier)
    setQtyMap((m) => {
      const current = m[key] ?? 0
      const next = Math.max(0, Math.min(max, +(current + delta).toFixed(3)))
      const copy = { ...m }
      if (next <= 0) delete copy[key]
      else copy[key] = next
      return copy
    })
  }

  function setProductTier(productId: string, tier: PriceTier) {
    setTierMap((m) => ({ ...m, [productId]: tier }))
    setQtyMap((m) => {
      const next = { ...m }
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${productId}::`) && !k.endsWith(`::${tier}`)) {
          delete next[k]
        }
      }
      return next
    })
  }

  function finishSale(paidDa: number) {
    if (!canValidate) return
    if (paidDa < total - 0.001 && isQuick) {
      speak(lang === 'ar' ? 'اختَر زبوناً للدين' : 'Choisis un client pour le reste', lang)
      return
    }
    const pay = buildPaymentFields(total, paidDa)
    const created = onCreate({
      clientId: isQuick ? '' : client!.id,
      clientName: isQuick ? t(lang, 'walkInClient') : client!.name,
      clientPhone: isQuick ? '' : client!.phone,
      lines,
      totalDa: total,
      ...pay,
      dueDate:
        pay.remainingDa > 0.001 ? dueDateFromDays(dueDays) : undefined,
    })
    setLastOrder(created)
    setInvoiceDraft(buildInvoiceText(created, state.settings))
    setQtyMap({})
    setTierMap({})
    setPayStep(false)
    setVerseInput('')
    setDueDays(15)
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
        <h2>🛒 {t(lang, 'newOrder')}</h2>
        <div className="choice-grid">
          <button
            type="button"
            className={`choice-card ${isQuick ? 'active' : ''}`}
            onClick={() => {
              setClientId(QUICK)
              setPayStep(false)
            }}
          >
            <span className="choice-emoji">⚡</span>
            <strong>{t(lang, 'quickSale')}</strong>
            <span className="muted">{t(lang, 'quickSaleHintShort')}</span>
          </button>
          <button
            type="button"
            className={`choice-card ${!isQuick ? 'active' : ''}`}
            onClick={() => {
              if (isQuick && state.clients[0]) setClientId(state.clients[0].id)
            }}
          >
            <span className="choice-emoji">👤</span>
            <strong>{t(lang, 'client')}</strong>
            <span className="muted">{t(lang, 'pickClientHint')}</span>
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
                      <span className="muted">{c.phone || c.city || '—'}</span>
                      {debt > 0 ? (
                        <span className="warn-text">{formatDa(debt)}</span>
                      ) : null}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        ) : (
          <div className="notice">{t(lang, 'quickSaleHint')}</div>
        )}

        {!isQuick && client && clientDebt > 0 ? (
          <div className="notice warn">
            ⚠️ {t(lang, 'clientBalance')} : <strong>{formatDa(clientDebt)}</strong>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2>📦 {t(lang, 'productCatalog')}</h2>
        {!isQuick && client ? (
          <div className="muted" style={{ marginBottom: 10 }}>
            {t(lang, 'catalogForClient')} : <strong>{client.name}</strong>
          </div>
        ) : null}
        <BarcodeScanInput
          lang={lang}
          onScan={(code) => {
            const r = bumpProductFromBarcode(state.products, code, bump)
            if (r === 'missing') {
              playBarcodeError()
              speak(
                lang === 'ar' ? 'باركود غير موجود' : 'Code-barres inconnu',
                lang,
              )
            } else {
              playBarcodeOk()
            }
          }}
        />
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
        {filteredProducts.length === 0 ? (
          <div className="empty">{t(lang, 'noProductFound')}</div>
        ) : (
          <div className="product-catalog">
            {filteredProducts.map((p) => {
              const tiers = availableTiers(p)
              const tier = tierOf(p.id)
              const key = lineKey(p.id, tier)
              const qty = qtyMap[key] ?? 0
              const unitPrice = priceForTier(p, tier) ?? p.priceDa
              const step = isCartonTier(tier) ? 1 : qtyStep(p.unit)
              const tierIcon =
                tier === 'piece'
                  ? '1️⃣'
                  : tier === 'demi_gros'
                    ? '📦'
                    : tier === 'gros'
                      ? '📦📦'
                      : '🏭'
              return (
                <div
                  className={`product-card ${qty > 0 ? 'selected' : ''}`}
                  key={p.id}
                >
                  {p.imageDataUrl ? (
                    <img className="product-card-img" src={p.imageDataUrl} alt={p.name} />
                  ) : (
                    <div className="product-card-img placeholder">📷</div>
                  )}
                  <div className="product-card-body">
                    <strong>{p.name}</strong>
                    {p.barcode ? (
                      <div className="muted">⬛ {p.barcode}</div>
                    ) : null}
                    {tiers.length > 1 ? (
                      <div className="tier-row">
                        {tiers.map((tr) => (
                          <button
                            key={tr}
                            type="button"
                            className={`tier-chip ${tier === tr ? 'active' : ''}`}
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
                    <div className="muted">
                      {unitLabel(lang, sellUnitForTier(tier))}
                      {isCartonTier(tier) && p.piecesPerPack
                        ? ` · ${p.piecesPerPack}×`
                        : ''}
                      {' · '}
                      {t(lang, 'stockQty')} {formatQty(p.stock)}
                    </div>
                    <div className="qty-row catalog-qty big-qty">
                      <button type="button" onClick={() => bump(p, tier, -step)}>
                        −
                      </button>
                      <strong className="qty-display">{formatQty(qty)}</strong>
                      <button type="button" onClick={() => bump(p, tier, step)}>
                        +
                      </button>
                    </div>
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
        <h2 className="total-big">💰 {formatDa(total)}</h2>
        {lines.length > 0 ? (
          <ul className="line-preview">
            {lines.map((l) => (
              <li key={`${l.productId}-${l.priceTier}`}>
                {l.name}
                {l.priceTier && l.priceTier !== 'piece'
                  ? ` (${t(lang, `tier_${l.priceTier}`)})`
                  : ''}{' '}
                × {formatQty(l.qty)} = {formatDa(l.lineTotalDa)}
              </li>
            ))}
          </ul>
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
            <div className="choice-grid pay-choice">
              <button
                type="button"
                className="choice-card pay-cash"
                data-sfx-cash
                onClick={() => finishSale(total)}
              >
                <span className="choice-emoji">💵</span>
                <strong>{t(lang, 'paidFull')}</strong>
                <span className="muted">{formatDa(total)}</span>
              </button>
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
          </div>
        )}
      </div>
      </aside>
      </div>

      {lastOrder ? (
        <div className="card">
          <h2>{t(lang, 'orderReady')}</h2>
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
          <span>{t(lang, 'profitOrders')}</span>
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
}: {
  state: AppState
  stats: {
    stockValue: number
    stockCost: number
    stockMargin: number
    credits: number
  }
  lang: Language
}) {
  return (
    <>
      <div className="grid-2">
        <div className="stat">
          <div className="muted">{t(lang, 'stockValue')}</div>
          <strong>{formatDa(stats.stockValue)}</strong>
        </div>
        <div className="stat">
          <div className="muted">{t(lang, 'stockCost')}</div>
          <strong>{formatDa(stats.stockCost)}</strong>
        </div>
        <div className="stat">
          <div className="muted">{t(lang, 'stockMargin')}</div>
          <strong>{formatDa(stats.stockMargin)}</strong>
        </div>
        <div className="stat">
          <div className="muted">{t(lang, 'openCredits')}</div>
          <strong>{formatDa(stats.credits)}</strong>
        </div>
      </div>
      <div className="muted" style={{ margin: '8px 4px 0' }}>
        {t(lang, 'profitHint')}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h2>{t(lang, 'stockDetail')}</h2>
        {state.products.map((p) => {
          const margin = (p.priceDa - (p.costDa || 0)) * p.stock
          return (
            <div className="list-item" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <div className="muted">
                  {formatQty(p.stock)} {unitLabel(lang, p.unit)} ·{' '}
                  {t(lang, 'buyPriceShort')} {formatDa(p.costDa || 0)} →{' '}
                  {t(lang, 'sellPriceShort')} {formatDa(p.priceDa)}
                </div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <strong>{formatDa(p.stock * p.priceDa)}</strong>
                <div className="muted">
                  {t(lang, 'margin')} {formatDa(margin)}
                </div>
                {p.stock <= p.lowStockAt ? (
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
        <h2>{t(lang, 'history')}</h2>
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
