import type { Language, Product } from '../types'
import { unitLabel } from '../i18n'
import { formatQty } from './format'

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
    new Notification(title, { body, tag: 'groswhats-stock' })
  } catch {
    // ignore
  }
}
