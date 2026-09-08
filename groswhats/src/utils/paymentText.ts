import type { Language, Order } from '../types'
import { formatDa } from './format'

/** Lignes de paiement pour facture / ticket / WhatsApp */
export function paymentSummaryLines(order: Order, lang: Language): string[] {
  const paid = order.paidDa ?? (order.payment === 'paye' ? order.totalDa : 0)
  const remaining =
    order.remainingDa ?? (order.payment === 'credit' ? order.totalDa : 0)

  if (lang === 'ar') {
    if (remaining <= 0.001) {
      return [`الدفع: مدفوع بالكامل (${formatDa(paid)})`]
    }
    return [
      `المدفوع الآن: ${formatDa(paid)}`,
      `المتبقي (دين): ${formatDa(remaining)}`,
    ]
  }

  if (remaining <= 0.001) {
    return [`Paiement: Payé (${formatDa(paid)})`]
  }
  return [
    `Versé: ${formatDa(paid)}`,
    `Reste dû: ${formatDa(remaining)}`,
  ]
}
