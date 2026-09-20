import { useMemo, useState } from 'react'
import type {
  AppState,
  Client,
  Language,
  Order,
  Product,
  Purchase,
  ShopSettings,
} from './types'
import { t, unitLabel } from './i18n'
import { formatDa, formatQty } from './utils/format'
import {
  openWhatsappText,
  buildDebtReminder,
  buildMembershipReminder,
} from './utils/whatsapp'
import {
  activeLocationId,
  adjustStockAt,
  clientCreditDa,
  daysUntilDue,
  displayStock,
  formatDueDateLabel,
  orderRemainingDa,
  overdueCreditOrders,
  profitInRange,
  updateProduct,
  updateSettings,
} from './store'
import {
  type OptionalToolId,
  type PaymentMethod,
  OPTIONAL_TOOLS,
  PAYMENT_METHODS,
  isToolEnabled,
  paymentMethodEmoji,
  paymentMethodLabel,
  setCashierUnlocked,
  toolHint,
  toolLabel,
} from './data/optionalTools'

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (c: string) => `"${String(c).replace(/"/g, '""')}"`
  const body = rows.map((r) => r.map(esc).join(';')).join('\n')
  const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function daysUntilMembership(end?: string): number | null {
  if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${end}T12:00:00`)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function supplierOpenPurchases(state: AppState): Purchase[] {
  return state.purchases.filter((p) => p.totalDa - (p.paidDa || 0) > 0.001)
}

function productsExpiring(state: AppState, withinDays = 30): Product[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return state.products
    .filter((p) => p.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(p.expiryDate))
    .map((p) => {
      const d = new Date(`${p.expiryDate}T12:00:00`)
      const left = Math.round((d.getTime() - today.getTime()) / 86400000)
      return { p, left }
    })
    .filter(({ left }) => left <= withinDays)
    .sort((a, b) => a.left - b.left)
    .map(({ p }) => p)
}

function membershipSoon(state: AppState, withinDays = 7): Client[] {
  return state.clients
    .filter((c) => {
      const left = daysUntilMembership(c.membershipEnd)
      return left != null && left <= withinDays
    })
    .sort((a, b) => {
      const la = daysUntilMembership(a.membershipEnd) ?? 999
      const lb = daysUntilMembership(b.membershipEnd) ?? 999
      return la - lb
    })
}

function clientsNearCreditLimit(state: AppState): Array<{
  client: Client
  debt: number
  limit: number
}> {
  return state.clients
    .filter((c) => typeof c.creditLimitDa === 'number' && c.creditLimitDa > 0)
    .map((c) => ({
      client: c,
      debt: clientCreditDa(state, c.id),
      limit: c.creditLimitDa!,
    }))
    .filter(({ debt, limit }) => debt >= limit * 0.7)
    .sort((a, b) => b.debt / b.limit - a.debt / a.limit)
}

export function OptionalToolPage({
  toolId,
  state,
  lang,
  onState,
  onFlash,
  onFocusClient,
  onFocusProduct,
}: {
  toolId: OptionalToolId
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  onFocusClient?: (id: string) => void
  onFocusProduct?: (id: string) => void
}) {
  const def = OPTIONAL_TOOLS.find((x) => x.id === toolId)
  if (!def) return null

  return (
    <div className="page">
      <div className="card">
        <h2>
          {def.icon} {toolLabel(def, lang)}
        </h2>
        <p className="muted">{toolHint(def, lang)}</p>
      </div>
      {toolId === 'payments' ? (
        <PaymentsTool state={state} lang={lang} />
      ) : null}
      {toolId === 'tpe' ? <TpeTool state={state} lang={lang} /> : null}
      {toolId === 'debtRemind' ? (
        <DebtRemindTool state={state} lang={lang} />
      ) : null}
      {toolId === 'supplierDebts' ? (
        <SupplierDebtsTool
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}
      {toolId === 'inventory' ? (
        <InventoryTool
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}
      {toolId === 'expiry' ? (
        <ExpiryTool
          state={state}
          lang={lang}
          onFocusProduct={onFocusProduct}
        />
      ) : null}
      {toolId === 'membership' ? (
        <MembershipTool
          state={state}
          lang={lang}
          onFocusClient={onFocusClient}
        />
      ) : null}
      {toolId === 'exportCompta' ? (
        <ExportComptaTool state={state} lang={lang} onFlash={onFlash} />
      ) : null}
      {toolId === 'cashierPin' ? (
        <CashierPinTool
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}
      {toolId === 'creditLimit' ? (
        <CreditLimitTool
          state={state}
          lang={lang}
          onFocusClient={onFocusClient}
        />
      ) : null}
      {toolId === 'fiscal' ? (
        <FiscalTool
          state={state}
          lang={lang}
          onState={onState}
          onFlash={onFlash}
        />
      ) : null}
    </div>
  )
}

function PaymentsTool({ state, lang }: { state: AppState; lang: Language }) {
  const today = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return state.orders.filter((o) => {
      const t0 = new Date(o.createdAt).getTime()
      return t0 >= start.getTime() && t0 <= end.getTime()
    })
  }, [state.orders])

  const byMethod = useMemo(() => {
    const map: Record<PaymentMethod, number> = {
      cash: 0,
      baridimob: 0,
      ccp: 0,
      card: 0,
      cheque: 0,
    }
    for (const o of today) {
      const m = (o.paymentMethod || 'cash') as PaymentMethod
      if (map[m] != null) map[m] += o.paidDa || 0
      else map.cash += o.paidDa || 0
    }
    return map
  }, [today])

  return (
    <div className="card">
      <h2>{lang === 'ar' ? 'اليوم حسب طريقة الدفع' : 'Aujourd’hui par mode'}</h2>
      {PAYMENT_METHODS.map((m) => (
        <div className="list-item" key={m}>
          <div>
            <strong>
              {paymentMethodEmoji(m)} {paymentMethodLabel(m, lang)}
            </strong>
          </div>
          <strong>{formatDa(byMethod[m])}</strong>
        </div>
      ))}
      <div className="notice" style={{ marginTop: 12 }}>
        {lang === 'ar'
          ? 'عند الدفع في الصندوق اختر الطريقة (نقد، بريدي موب…).'
          : 'À la caisse, choisis le mode (espèce, BaridiMob…).'}
      </div>
    </div>
  )
}

/** Aide + total carte du jour (le TPE reste un appareil séparé) */
function TpeTool({ state, lang }: { state: AppState; lang: Language }) {
  const cardToday = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return state.orders
      .filter((o) => {
        const t0 = new Date(o.createdAt).getTime()
        return (
          t0 >= start.getTime() &&
          t0 <= end.getTime() &&
          o.paymentMethod === 'card'
        )
      })
      .reduce((s, o) => s + (o.paidDa || 0), 0)
  }, [state.orders])

  return (
    <>
      <div className="card">
        <h2>{lang === 'ar' ? 'كيف تستعمل TPE' : 'Comment utiliser le TPE'}</h2>
        <ol style={{ margin: '8px 0 0', paddingInlineStart: 20, lineHeight: 1.5 }}>
          <li>
            {lang === 'ar'
              ? 'في الصندوق اضغط « TPE / بطاقة »'
              : 'À la caisse, appuie sur « TPE / Carte »'}
          </li>
          <li>
            {lang === 'ar'
              ? 'أدخل نفس المبلغ على جهاز TPE'
              : 'Tape le même montant sur le lecteur TPE'}
          </li>
          <li>
            {lang === 'ar'
              ? 'الزبون يمرّر البطاقة / يدخل الرمز'
              : 'Le client passe la carte / tape son code'}
          </li>
          <li>
            {lang === 'ar'
              ? 'إذا نجح الدفع اضغط « بطاقة مقبولة » في التطبيق'
              : 'Si OK sur le TPE, appuie « Carte acceptée » dans l’app'}
          </li>
        </ol>
        <div className="notice" style={{ marginTop: 12 }}>
          {lang === 'ar'
            ? 'الجهاز منفصل (CIB / Satim…). التطبيق يسجّل الدفع فقط.'
            : 'Le terminal reste séparé (CIB / Satim…). L’app enregistre seulement le paiement.'}
        </div>
      </div>
      <div className="card">
        <h2>{lang === 'ar' ? 'بطاقة اليوم' : 'Cartes aujourd’hui'}</h2>
        <div className="list-item">
          <strong>💳 TPE / CIB</strong>
          <strong>{formatDa(cardToday)}</strong>
        </div>
      </div>
    </>
  )
}

function DebtRemindTool({ state, lang }: { state: AppState; lang: Language }) {
  const overdue = useMemo(() => overdueCreditOrders(state), [state])

  function remindOne(o: Order) {
    const msg = buildDebtReminder(state.settings, o)
    openWhatsappText(o.clientPhone, msg)
  }

  function remindAll() {
    overdue.forEach((o, i) => {
      window.setTimeout(() => remindOne(o), i * 700)
    })
  }

  return (
    <div className="card">
      <h2>
        {lang === 'ar' ? 'متأخرون' : 'En retard'} ({overdue.length})
      </h2>
      {overdue.length === 0 ? (
        <div className="empty">
          {lang === 'ar' ? 'لا ديون متأخرة' : 'Aucune dette en retard'}
        </div>
      ) : (
        <>
          <button type="button" className="btn block" onClick={remindAll}>
            📲 {lang === 'ar' ? 'واتساب للجميع' : 'WhatsApp à tous'}
          </button>
          {overdue.map((o) => (
            <div className="list-item" key={o.id} style={{ gap: 8 }}>
              <div style={{ flex: 1 }}>
                <strong>{o.clientName}</strong>
                <div className="muted">
                  {formatDa(orderRemainingDa(o))}
                  {o.dueDate
                    ? ` · ${formatDueDateLabel(o.dueDate, lang)}`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn secondary"
                disabled={!o.clientPhone}
                onClick={() => remindOne(o)}
              >
                📲 WA
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function SupplierDebtsTool({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const open = useMemo(() => supplierOpenPurchases(state), [state])
  const total = open.reduce((s, p) => s + (p.totalDa - (p.paidDa || 0)), 0)

  function markPaid(id: string) {
    onState({
      ...state,
      purchases: state.purchases.map((p) =>
        p.id === id ? { ...p, paidDa: p.totalDa } : p,
      ),
    })
    onFlash(lang === 'ar' ? 'تم التسديد' : 'Fournisseur payé')
  }

  return (
    <div className="card">
      <h2>
        {lang === 'ar' ? 'المستحق للموردين' : 'Dû aux fournisseurs'} :{' '}
        {formatDa(total)}
      </h2>
      {open.length === 0 ? (
        <div className="empty">
          {lang === 'ar' ? 'لا ديون موردين' : 'Aucune dette fournisseur'}
        </div>
      ) : (
        open.map((p) => {
          const rest = +(p.totalDa - (p.paidDa || 0)).toFixed(2)
          return (
            <div className="list-item" key={p.id} style={{ gap: 8 }}>
              <div style={{ flex: 1 }}>
                <strong>{p.supplierName}</strong>
                <div className="muted">
                  {formatDa(rest)}
                  {p.dueDate
                    ? ` · ${formatDueDateLabel(p.dueDate, lang)}`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn secondary"
                onClick={() => markPaid(p.id)}
              >
                ✅ {lang === 'ar' ? 'سدّد' : 'Payé'}
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

function InventoryTool({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const [counts, setCounts] = useState<Record<string, string>>({})
  const locId = activeLocationId(state)

  function applyAll() {
    let next = state
    let n = 0
    for (const p of state.products) {
      const raw = counts[p.id]
      if (raw == null || raw === '') continue
      const counted = Number(String(raw).replace(',', '.'))
      if (!Number.isFinite(counted) || counted < 0) continue
      const current = displayStock(next, p)
      const delta = +(counted - current).toFixed(3)
      if (Math.abs(delta) < 0.0001) continue
      const cur = next.products.find((x) => x.id === p.id)
      if (!cur) continue
      const updated = adjustStockAt(cur, locId, delta)
      next = updateProduct(next, p.id, {
        stock: updated.stock,
        stockByLocation: updated.stockByLocation,
      })
      n += 1
    }
    onState(next)
    setCounts({})
    onFlash(
      lang === 'ar'
        ? `تم تحديث ${n} منتج`
        : `${n} produit(s) mis à jour`,
    )
  }

  return (
    <div className="card">
      <h2>{lang === 'ar' ? 'عدّ المخزون' : 'Comptage stock'}</h2>
      <p className="muted">
        {lang === 'ar'
          ? 'أدخل الكمية المعدودة ثم طبّق'
          : 'Saisis la qté comptée puis applique'}
      </p>
      <button type="button" className="btn block" onClick={applyAll}>
        ✅ {lang === 'ar' ? 'تطبيق الفروقات' : 'Appliquer les écarts'}
      </button>
      {state.products.length === 0 ? (
        <div className="empty">{t(lang, 'noProductFound')}</div>
      ) : (
        state.products.map((p) => {
          const stock = displayStock(state, p)
          return (
            <div className="list-item" key={p.id} style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <strong>{p.name}</strong>
                <div className="muted">
                  {lang === 'ar' ? 'في النظام' : 'Système'} : {formatQty(stock)}{' '}
                  {unitLabel(lang, p.unit)}
                </div>
              </div>
              <input
                type="number"
                inputMode="decimal"
                style={{ width: 90 }}
                placeholder={String(stock)}
                value={counts[p.id] ?? ''}
                onChange={(e) =>
                  setCounts((c) => ({ ...c, [p.id]: e.target.value }))
                }
              />
            </div>
          )
        })
      )}
    </div>
  )
}

function ExpiryTool({
  state,
  lang,
  onFocusProduct,
}: {
  state: AppState
  lang: Language
  onFocusProduct?: (id: string) => void
}) {
  const list = useMemo(() => productsExpiring(state, 45), [state])

  return (
    <div className="card">
      <h2>
        {lang === 'ar' ? 'قرب الانتهاء (45 يوم)' : 'Bientôt périmé (45 j)'}
      </h2>
      <p className="muted">
        {lang === 'ar'
          ? 'أضف تاريخ الصلاحية في بطاقة المنتج'
          : 'Ajoute la DLC dans la fiche produit'}
      </p>
      {list.length === 0 ? (
        <div className="empty">
          {lang === 'ar' ? 'لا منتجات قريبة من الانتهاء' : 'Rien à signaler'}
        </div>
      ) : (
        list.map((p) => {
          const left = daysUntilDue(p.expiryDate!)
          return (
            <button
              type="button"
              className="list-item due-alert-row"
              key={p.id}
              onClick={() => onFocusProduct?.(p.id)}
            >
              <div>
                <strong>{p.name}</strong>
                <div className="muted">
                  {p.expiryDate}
                  {p.lotNumber ? ` · lot ${p.lotNumber}` : ''}
                </div>
              </div>
              <span className={`badge ${left < 0 ? 'warn' : ''}`}>
                {left < 0
                  ? lang === 'ar'
                    ? 'منتهية'
                    : 'Périmé'
                  : `${left} j`}
              </span>
            </button>
          )
        })
      )}
    </div>
  )
}

function MembershipTool({
  state,
  lang,
  onFocusClient,
}: {
  state: AppState
  lang: Language
  onFocusClient?: (id: string) => void
}) {
  const list = useMemo(() => membershipSoon(state, 7), [state])

  function remindOne(c: Client) {
    openWhatsappText(c.phone, buildMembershipReminder(state.settings, c))
  }

  function remindAll() {
    list.forEach((c, i) => {
      if (!c.phone) return
      window.setTimeout(() => remindOne(c), i * 700)
    })
  }

  return (
    <div className="card">
      <h2>
        {lang === 'ar' ? 'اشتراكات تنتهي' : 'Abonnements à renouveler'} (
        {list.length})
      </h2>
      {list.length === 0 ? (
        <div className="empty">
          {lang === 'ar' ? 'لا تجديد قريب' : 'Rien à renouveler'}
        </div>
      ) : (
        <>
          <button type="button" className="btn block" onClick={remindAll}>
            📲 {lang === 'ar' ? 'واتساب للجميع' : 'WhatsApp à tous'}
          </button>
          {list.map((c) => {
            const left = daysUntilMembership(c.membershipEnd) ?? 0
            return (
              <div className="list-item" key={c.id} style={{ gap: 8 }}>
                <button
                  type="button"
                  className="due-alert-row"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'start',
                    padding: 0,
                  }}
                  onClick={() => onFocusClient?.(c.id)}
                >
                  <strong>{c.name}</strong>
                  <div className="muted">
                    {c.membershipEnd}
                    {left < 0
                      ? lang === 'ar'
                        ? ' · منتهٍ'
                        : ' · expiré'
                      : ` · ${left} j`}
                  </div>
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={!c.phone}
                  onClick={() => remindOne(c)}
                >
                  📲 WA
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function ExportComptaTool({
  state,
  lang,
  onFlash,
}: {
  state: AppState
  lang: Language
  onFlash: (msg: string) => void
}) {
  const year = new Date().getFullYear()
  const from = new Date(year, 0, 1)
  const to = new Date(year, 11, 31, 23, 59, 59)

  function exportSales() {
    const rows: string[][] = [
      ['date', 'client', 'total', 'paid', 'remaining', 'payment', 'method', 'invoice'],
    ]
    for (const o of state.orders) {
      rows.push([
        o.createdAt,
        o.clientName,
        String(o.totalDa),
        String(o.paidDa ?? 0),
        String(o.remainingDa ?? 0),
        o.payment,
        o.paymentMethod || '',
        o.invoiceNumber || '',
      ])
    }
    downloadCsv(`azpos-ventes-${year}.csv`, rows)
    onFlash(lang === 'ar' ? 'تم تصدير المبيعات' : 'Ventes exportées')
  }

  function exportExpenses() {
    const rows: string[][] = [['date', 'category', 'amount', 'note']]
    for (const e of state.expenses) {
      rows.push([e.date, e.category, String(e.amountDa), e.note || ''])
    }
    downloadCsv(`azpos-depenses-${year}.csv`, rows)
    onFlash(lang === 'ar' ? 'تم تصدير المصاريف' : 'Dépenses exportées')
  }

  function exportCredits() {
    const rows: string[][] = [['client', 'phone', 'debt']]
    for (const c of state.clients) {
      const debt = clientCreditDa(state, c.id)
      if (debt <= 0) continue
      rows.push([c.name, c.phone, String(debt)])
    }
    downloadCsv(`azpos-credits.csv`, rows)
    onFlash(lang === 'ar' ? 'تم تصدير الديون' : 'Crédits exportés')
  }

  function exportStock() {
    const rows: string[][] = [
      ['name', 'stock', 'unit', 'cost', 'price', 'expiry', 'lot'],
    ]
    for (const p of state.products) {
      rows.push([
        p.name,
        String(p.stock),
        p.unit,
        String(p.costDa),
        String(p.priceDa),
        p.expiryDate || '',
        p.lotNumber || '',
      ])
    }
    downloadCsv(`azpos-stock.csv`, rows)
    onFlash(lang === 'ar' ? 'تم تصدير المخزون' : 'Stock exporté')
  }

  const stats = profitInRange(state, from, to)

  return (
    <div className="card">
      <h2>{lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}</h2>
      <p className="muted">
        {lang === 'ar'
          ? `ملخص ${year} : مبيعات ${formatDa(stats.salesTotalDa)}`
          : `Résumé ${year} : ventes ${formatDa(stats.salesTotalDa)}`}
      </p>
      <div className="btn-row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="btn" onClick={exportSales}>
          📤 {lang === 'ar' ? 'مبيعات' : 'Ventes'}
        </button>
        <button type="button" className="btn secondary" onClick={exportExpenses}>
          📤 {lang === 'ar' ? 'مصاريف' : 'Dépenses'}
        </button>
        <button type="button" className="btn secondary" onClick={exportCredits}>
          📤 {lang === 'ar' ? 'ديون' : 'Crédits'}
        </button>
        <button type="button" className="btn secondary" onClick={exportStock}>
          📤 {lang === 'ar' ? 'مخزون' : 'Stock'}
        </button>
      </div>
    </div>
  )
}

function CashierPinTool({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const [pin, setPin] = useState(state.settings.cashierPin || '')
  const [confirm, setConfirm] = useState('')

  function save() {
    const p = pin.trim()
    if (p && !/^\d{4,6}$/.test(p)) {
      onFlash(lang === 'ar' ? 'رمز من 4 إلى 6 أرقام' : 'PIN 4 à 6 chiffres')
      return
    }
    if (p && p !== confirm.trim()) {
      onFlash(lang === 'ar' ? 'التأكيد غير مطابق' : 'Confirmation différente')
      return
    }
    onState(updateSettings(state, { cashierPin: p || undefined }))
    if (p) setCashierUnlocked(false)
    onFlash(lang === 'ar' ? 'تم حفظ الرمز' : 'PIN enregistré')
  }

  return (
    <div className="card">
      <h2>{lang === 'ar' ? 'رمز الصندوق' : 'Code caissier'}</h2>
      <p className="muted">
        {lang === 'ar'
          ? 'يُطلب الرمز لفتح التطبيق (جلسة الهاتف)'
          : 'Demandé pour déverrouiller l’app (session)'}
      </p>
      <div className="field">
        <label>PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
        />
      </div>
      <div className="field">
        <label>{lang === 'ar' ? 'تأكيد' : 'Confirmer'}</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
        />
      </div>
      <button type="button" className="btn block" onClick={save}>
        💾 {lang === 'ar' ? 'حفظ' : 'Enregistrer'}
      </button>
      {state.settings.cashierPin ? (
        <button
          type="button"
          className="btn ghost block"
          style={{ marginTop: 8 }}
          onClick={() => {
            setCashierUnlocked(false)
            onFlash(lang === 'ar' ? 'تم القفل' : 'Verrouillé')
          }}
        >
          🔒 {lang === 'ar' ? 'قفل الآن' : 'Verrouiller maintenant'}
        </button>
      ) : null}
    </div>
  )
}

function CreditLimitTool({
  state,
  lang,
  onFocusClient,
}: {
  state: AppState
  lang: Language
  onFocusClient?: (id: string) => void
}) {
  const list = useMemo(() => clientsNearCreditLimit(state), [state])

  return (
    <div className="card">
      <h2>
        {lang === 'ar' ? 'قرب سقف الدين' : 'Proches du plafond'} ({list.length})
      </h2>
      <p className="muted">
        {lang === 'ar'
          ? 'حدّد السقف في بطاقة الزبون'
          : 'Fixe le plafond dans la fiche client'}
      </p>
      {list.length === 0 ? (
        <div className="empty">
          {lang === 'ar' ? 'لا تنبيهات' : 'Aucune alerte'}
        </div>
      ) : (
        list.map(({ client, debt, limit }) => (
          <button
            type="button"
            className="list-item due-alert-row"
            key={client.id}
            onClick={() => onFocusClient?.(client.id)}
          >
            <div>
              <strong>{client.name}</strong>
              <div className="muted">
                {formatDa(debt)} / {formatDa(limit)}
              </div>
            </div>
            <span className={`badge ${debt >= limit ? 'warn' : ''}`}>
              {Math.round((debt / limit) * 100)}%
            </span>
          </button>
        ))
      )}
    </div>
  )
}

function FiscalTool({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const [nif, setNif] = useState(state.settings.fiscalNif || '')
  const [rc, setRc] = useState(state.settings.fiscalRc || '')
  const [ai, setAi] = useState(state.settings.fiscalAi || '')

  function save() {
    const patch: Partial<ShopSettings> = {
      fiscalNif: nif.trim() || undefined,
      fiscalRc: rc.trim() || undefined,
      fiscalAi: ai.trim() || undefined,
    }
    onState(updateSettings(state, patch))
    onFlash(lang === 'ar' ? 'تم الحفظ' : 'Enregistré')
  }

  return (
    <div className="card">
      <h2>{lang === 'ar' ? 'هوية جبائية' : 'Identité fiscale'}</h2>
      <p className="muted">
        {lang === 'ar'
          ? 'تظهر على التذكرة والفاتورة'
          : 'Affiché sur ticket et facture'}
      </p>
      <div className="field">
        <label>NIF</label>
        <input value={nif} onChange={(e) => setNif(e.target.value)} />
      </div>
      <div className="field">
        <label>RC</label>
        <input value={rc} onChange={(e) => setRc(e.target.value)} />
      </div>
      <div className="field">
        <label>AI</label>
        <input value={ai} onChange={(e) => setAi(e.target.value)} />
      </div>
      <button type="button" className="btn block" onClick={save}>
        💾 {lang === 'ar' ? 'حفظ' : 'Enregistrer'}
      </button>
    </div>
  )
}

/** Overlay déverrouillage PIN caissier */
export function CashierPinGate({
  settings,
  lang,
  onUnlock,
}: {
  settings: ShopSettings
  lang: Language
  onUnlock: () => void
}) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)

  if (!isToolEnabled(settings, 'cashierPin') || !settings.cashierPin) {
    return null
  }

  function tryUnlock() {
    if (pin === settings.cashierPin) {
      setCashierUnlocked(true)
      onUnlock()
      setErr(false)
      setPin('')
    } else {
      setErr(true)
    }
  }

  return (
    <div className="barcode-cam-overlay" role="dialog" aria-modal="true">
      <div className="barcode-cam-card" style={{ maxWidth: 360 }}>
        <h2>🔐 {lang === 'ar' ? 'رمز الصندوق' : 'Code caissier'}</h2>
        <div className="field">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''))
              setErr(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') tryUnlock()
            }}
            placeholder="****"
          />
        </div>
        {err ? (
          <div className="notice warn">
            {lang === 'ar' ? 'رمز خاطئ' : 'Code incorrect'}
          </div>
        ) : null}
        <button type="button" className="btn block" onClick={tryUnlock}>
          ✅ {lang === 'ar' ? 'فتح' : 'Déverrouiller'}
        </button>
      </div>
    </div>
  )
}

export { isToolEnabled }
