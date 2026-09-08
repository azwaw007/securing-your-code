import type { Order, ShopSettings } from '../types'
import { unitLabel } from '../i18n'
import { formatDa, formatQty, normalizePhone } from './format'
import { paymentSummaryLines } from './paymentText'

export function buildWhatsappMessage(order: Order, settings: ShopSettings): string {
  const lang = settings.language
  const lines = order.lines
    .map(
      (l) =>
        `- ${formatQty(l.qty)} ${unitLabel(lang, l.unit)} ${l.name} — ${formatDa(l.lineTotalDa)}`,
    )
    .join('\n')
  const pay = paymentSummaryLines(order, lang)

  if (lang === 'ar') {
    return [
      `السلام، هذا طلبكم — ${settings.shopName}`,
      '',
      `الزبون : ${order.clientName}`,
      lines,
      '',
      `المجموع : ${formatDa(order.totalDa)}`,
      ...pay,
      '',
      'شكراً',
    ].join('\n')
  }

  return [
    `Salam, voici votre commande — ${settings.shopName}`,
    '',
    `Client : ${order.clientName}`,
    lines,
    '',
    `Total : ${formatDa(order.totalDa)}`,
    ...pay,
    '',
    'Merci 🙏',
  ].join('\n')
}

export function openWhatsapp(
  order: Order,
  settings: ShopSettings,
  customText?: string,
): void {
  const text = encodeURIComponent(
    customText?.trim() || buildWhatsappMessage(order, settings),
  )
  const phone = normalizePhone(order.clientPhone)
  const url = phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`
  window.open(url, '_blank')
}

export function openWhatsappText(phone: string, message: string): void {
  const text = encodeURIComponent(message)
  const normalized = normalizePhone(phone)
  const url = normalized
    ? `https://wa.me/${normalized}?text=${text}`
    : `https://wa.me/?text=${text}`
  window.open(url, '_blank')
}

export function buildArrivalsMessage(
  settings: ShopSettings,
  productNames: string[],
  extraNote: string,
): string {
  const list = productNames.map((n) => `- ${n}`).join('\n')
  if (settings.language === 'ar') {
    return [
      `🆕 وصول جديد — ${settings.shopName}`,
      '',
      list,
      extraNote ? `\n${extraNote}` : '',
      '',
      `للطلب واتساب: ${settings.phone}`,
      'مرحبا بكم',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    `🆕 Nouveaux arrivages — ${settings.shopName}`,
    '',
    list,
    extraNote ? `\n${extraNote}` : '',
    '',
    `Commandez sur WhatsApp: ${settings.phone}`,
    'Bienvenue',
  ]
    .filter(Boolean)
    .join('\n')
}
