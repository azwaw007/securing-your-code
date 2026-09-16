import type { AppState, Language } from '../types'
import { formatDa } from './format'

export type ActivityKind =
  | 'all'
  | 'order'
  | 'invoice'
  | 'client'
  | 'cash'
  | 'expense'
  | 'product'

export interface ActivityItem {
  id: string
  kind: Exclude<ActivityKind, 'all'>
  at: string
  title: string
  detail: string
  amountDa?: number
  orderId?: string
  clientId?: string
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString()
}

export function buildActivityLog(state: AppState, lang: Language): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const o of state.orders) {
    const inv = o.invoiceNumber ? `N°${o.invoiceNumber}` : o.id.slice(-6)
    const pay =
      (o.remainingDa ?? 0) > 0.001
        ? lang === 'ar'
          ? `مدفوع ${formatDa(o.paidDa ?? 0)} · باقي ${formatDa(o.remainingDa)}`
          : `Cash ${formatDa(o.paidDa ?? 0)} · reste ${formatDa(o.remainingDa)}`
        : lang === 'ar'
          ? 'مدفوع كامل'
          : 'Tout payé (cash)'
    items.push({
      id: `ord_${o.id}`,
      kind: 'order',
      at: o.createdAt,
      title: lang === 'ar' ? `طلب — ${o.clientName}` : `Commande — ${o.clientName}`,
      detail: `${o.lines.length} ${lang === 'ar' ? 'منتج' : 'ligne(s)'} · ${pay}`,
      amountDa: o.totalDa,
      orderId: o.id,
      clientId: o.clientId || undefined,
    })
    items.push({
      id: `inv_${o.id}`,
      kind: 'invoice',
      at: o.createdAt,
      title: lang === 'ar' ? `فاتورة ${inv}` : `Facture ${inv}`,
      detail: `${o.clientName} · ${pay}`,
      amountDa: o.totalDa,
      orderId: o.id,
      clientId: o.clientId || undefined,
    })
  }

  for (const c of state.clients) {
    items.push({
      id: `cli_${c.id}`,
      kind: 'client',
      at: c.createdAt,
      title: lang === 'ar' ? `زبون جديد — ${c.name}` : `Client ajouté — ${c.name}`,
      detail: [c.phone, c.city, c.address].filter(Boolean).join(' · ') || '—',
      clientId: c.id,
    })
  }

  for (const e of state.cashEntries ?? []) {
    items.push({
      id: `cash_${e.id}`,
      kind: 'cash',
      at: e.createdAt,
      title: lang === 'ar' ? 'دخول للصندوق' : 'Cash en caisse',
      detail: e.note || (lang === 'ar' ? 'دفعة' : 'Versement'),
      amountDa: e.amountDa,
      clientId: e.clientId,
    })
  }

  for (const e of state.expenses) {
    items.push({
      id: `exp_${e.id}`,
      kind: 'expense',
      at: e.createdAt || e.date,
      title: lang === 'ar' ? `مصروف — ${e.category}` : `Dépense — ${e.category}`,
      detail: e.note || e.date,
      amountDa: e.amountDa,
    })
  }

  for (const p of state.products) {
    items.push({
      id: `prod_${p.id}`,
      kind: 'product',
      at: p.createdAt,
      title: lang === 'ar' ? `منتج — ${p.name}` : `Produit — ${p.name}`,
      detail: `${formatDa(p.priceDa)} · stock ${p.stock}`,
    })
  }

  items.sort((a, b) => +new Date(b.at) - +new Date(a.at))
  return items
}

export function filterActivity(
  items: ActivityItem[],
  opts: {
    kind: ActivityKind
    query: string
    dateFrom?: string
    dateTo?: string
    dayPreset?: 'all' | 'today' | 'yesterday' | 'week' | 'month'
  },
): ActivityItem[] {
  const q = opts.query.trim().toLowerCase()
  const now = new Date()
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(now)
  endToday.setHours(23, 59, 59, 999)

  let fromMs = opts.dateFrom ? new Date(`${opts.dateFrom}T00:00:00`).getTime() : null
  let toMs = opts.dateTo ? new Date(`${opts.dateTo}T23:59:59`).getTime() : null

  if (!opts.dateFrom && !opts.dateTo && opts.dayPreset && opts.dayPreset !== 'all') {
    if (opts.dayPreset === 'today') {
      fromMs = startToday.getTime()
      toMs = endToday.getTime()
    } else if (opts.dayPreset === 'yesterday') {
      const y0 = new Date(startToday)
      y0.setDate(y0.getDate() - 1)
      const y1 = new Date(endToday)
      y1.setDate(y1.getDate() - 1)
      fromMs = y0.getTime()
      toMs = y1.getTime()
    } else if (opts.dayPreset === 'week') {
      const w = new Date(startToday)
      w.setDate(w.getDate() - 7)
      fromMs = w.getTime()
      toMs = endToday.getTime()
    } else if (opts.dayPreset === 'month') {
      const m = new Date(startToday)
      m.setDate(1)
      fromMs = m.getTime()
      toMs = endToday.getTime()
    }
  }

  return items.filter((it) => {
    if (opts.kind !== 'all' && it.kind !== opts.kind) return false
    const t = new Date(it.at).getTime()
    if (fromMs != null && t < fromMs) return false
    if (toMs != null && t > toMs) return false
    if (!q) return true
    return (
      it.title.toLowerCase().includes(q) ||
      it.detail.toLowerCase().includes(q) ||
      dayKey(it.at).toLowerCase().includes(q) ||
      (it.amountDa != null && formatDa(it.amountDa).toLowerCase().includes(q))
    )
  })
}
