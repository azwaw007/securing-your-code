import type { Language, Order } from '../types'
import { formatDa } from './format'
import { formatDueDateLabel } from '../store'
import { paymentMethodLabel } from '../data/optionalTools'

/** Lignes de paiement pour facture / ticket / WhatsApp */
export function paymentSummaryLines(order: Order, lang: Language): string[] {
  const paid = order.paidDa ?? (order.payment === 'paye' ? order.totalDa : 0)
  const remaining =
    order.remainingDa ?? (order.payment === 'credit' ? order.totalDa : 0)
  const methodLine = order.paymentMethod
    ? lang === 'ar'
      ? `طريقة الدفع: ${paymentMethodLabel(order.paymentMethod, lang)}`
      : `Mode: ${paymentMethodLabel(order.paymentMethod, lang)}`
    : null

  if (lang === 'ar') {
    if (remaining <= 0.001) {
      return [
        `الدفع: مدفوع بالكامل (${formatDa(paid)})`,
        ...(methodLine ? [methodLine] : []),
      ]
    }
    const lines = [
      `المدفوع الآن: ${formatDa(paid)}`,
      `المتبقي (دين): ${formatDa(remaining)}`,
      ...(methodLine ? [methodLine] : []),
    ]
    if (order.dueDate) {
      lines.push(`الاستحقاق: ${formatDueDateLabel(order.dueDate, 'ar')}`)
    }
    return lines
  }

  if (remaining <= 0.001) {
    return [
      `Paiement: Payé (${formatDa(paid)})`,
      ...(methodLine ? [methodLine] : []),
    ]
  }
  const lines = [
    `Versé: ${formatDa(paid)}`,
    `Reste dû: ${formatDa(remaining)}`,
    ...(methodLine ? [methodLine] : []),
  ]
  if (order.dueDate) {
    lines.push(`Échéance: ${formatDueDateLabel(order.dueDate, 'fr')}`)
  }
  return lines
}
