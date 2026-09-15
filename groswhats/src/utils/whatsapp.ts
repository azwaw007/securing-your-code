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

export function buildAppointmentReminder(
  settings: ShopSettings,
  apt: {
    clientName: string
    at: string
    note?: string
  },
  stage: '24h' | '2h' | 'manual',
): string {
  const when = formatAppointmentWhen(apt.at, settings.language)
  const shop = settings.shopName || 'Cabinet'
  if (settings.language === 'ar') {
    const head =
      stage === '2h'
        ? `تذكير: موعدك بعد قليل — ${shop}`
        : stage === '24h'
          ? `تذكير: موعدك غداً / خلال 24 ساعة — ${shop}`
          : `تذكير بموعدك — ${shop}`
    return [
      head,
      '',
      `المريض : ${apt.clientName}`,
      `الموعد : ${when}`,
      apt.note ? `ملاحظة : ${apt.note}` : '',
      settings.phone ? `للتواصل : ${settings.phone}` : '',
      '',
      'ننتظركم 🙏',
    ]
      .filter(Boolean)
      .join('\n')
  }
  const head =
    stage === '2h'
      ? `Rappel : votre RDV approche — ${shop}`
      : stage === '24h'
        ? `Rappel : votre RDV dans les 24 h — ${shop}`
        : `Rappel de rendez-vous — ${shop}`
  return [
    head,
    '',
    `Patient : ${apt.clientName}`,
    `Quand : ${when}`,
    apt.note ? `Note : ${apt.note}` : '',
    settings.phone ? `Contact : ${settings.phone}` : '',
    '',
    'À bientôt 🙏',
  ]
    .filter(Boolean)
    .join('\n')
}

function formatAppointmentWhen(iso: string, lang: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
