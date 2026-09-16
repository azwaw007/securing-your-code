import type { Language, Order, Product } from '../types'
import { unitLabel } from '../i18n'
import { formatDa, formatQty } from './format'
import { formatDueDateLabel } from '../store'

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function notifyStockRuptures(products: Product[], lang: Language): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (products.length === 0) return

  const names = products
    .slice(0, 5)
    .map((p) => `${p.name} (${formatQty(p.stock)} ${unitLabel(lang, p.unit)})`)
    .join(', ')

  const title = lang === 'ar' ? 'تنبيه نفاد المخزون' : 'Alerte rupture de stock'
  const body =
    lang === 'ar'
      ? `${products.length} منتج بحاجة للتزويد: ${names}`
      : `${products.length} produit(s) en rupture / stock bas : ${names}`

  try {
    new Notification(title, { body, tag: 'az-pos-stock' })
  } catch {
    // ignore
  }
}

export function notifyDueAlerts(
  overdue: Order[],
  soon: Order[],
  lang: Language,
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (overdue.length === 0 && soon.length === 0) return

  const title =
    lang === 'ar' ? 'تنبيه استحقاق الديون' : 'Alerte échéances dettes'
  const parts: string[] = []
  if (overdue.length > 0) {
    parts.push(
      lang === 'ar' ? `${overdue.length} متأخر` : `${overdue.length} en retard`,
    )
  }
  if (soon.length > 0) {
    parts.push(
      lang === 'ar'
        ? `${soon.length} قريب`
        : `${soon.length} bientôt dues`,
    )
  }
  const sample = [...overdue, ...soon].slice(0, 3).map((o) => {
    const due = o.dueDate ? formatDueDateLabel(o.dueDate, lang) : ''
    return `${o.clientName} ${formatDa(o.remainingDa ?? 0)}${due ? ` (${due})` : ''}`
  })
  const body = `${parts.join(' · ')} — ${sample.join(' · ')}`

  try {
    new Notification(title, { body, tag: 'az-pos-dues' })
  } catch {
    // ignore
  }
}
