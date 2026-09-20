import type { Order, ShopSettings } from '../types'
import { unitLabel } from '../i18n'
import { formatDa, formatQty, normalizePhone } from './format'
import { paymentSummaryLines } from './paymentText'

function discountLine(order: Order, lang: string): string | null {
  if (!order.discountDa || order.discountDa <= 0) return null
  const pct = order.discountPercent ? ` (${order.discountPercent}%)` : ''
  return lang === 'ar'
    ? `خصم: -${formatDa(order.discountDa)}${pct}`
    : `Remise: -${formatDa(order.discountDa)}${pct}`
}

function fiscalHeaderLines(settings: ShopSettings, lang: string): string[] {
  const lines: string[] = []
  if (settings.fiscalNif) {
    lines.push(lang === 'ar' ? `NIF: ${settings.fiscalNif}` : `NIF: ${settings.fiscalNif}`)
  }
  if (settings.fiscalRc) {
    lines.push(lang === 'ar' ? `RC: ${settings.fiscalRc}` : `RC: ${settings.fiscalRc}`)
  }
  if (settings.fiscalAi) {
    lines.push(lang === 'ar' ? `AI: ${settings.fiscalAi}` : `AI: ${settings.fiscalAi}`)
  }
  return lines
}

export function buildInvoiceText(order: Order, settings: ShopSettings): string {
  const lang = settings.language
  const invoiceNo = order.invoiceNumber ?? order.id.slice(-6).toUpperCase()
  const date = new Date(order.createdAt).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')
  const lines = order.lines
    .map((l) => {
      const base = `${formatQty(l.qty)} ${unitLabel(lang, l.unit)} ${l.name} — ${formatDa(l.lineTotalDa)}`
      return l.imei ? `${base}\n  IMEI ${l.imei}` : base
    })
    .join('\n')
  const pay = paymentSummaryLines(order, lang)
  const disc = discountLine(order, lang)
  const fiscal = fiscalHeaderLines(settings, lang)

  if (lang === 'ar') {
    return [
      `فاتورة رقم ${invoiceNo}`,
      settings.shopName,
      settings.city,
      settings.phone,
      ...fiscal,
      '------------------------',
      `التاريخ: ${date}`,
      `الزبون: ${order.clientName}`,
      '------------------------',
      lines,
      '------------------------',
      disc,
      `المجموع: ${formatDa(order.totalDa)}`,
      ...pay,
      '------------------------',
      'شكرا لثقتكم',
    ]
      .filter((x) => x != null && x !== '')
      .join('\n')
  }

  return [
    `FACTURE N° ${invoiceNo}`,
    settings.shopName,
    settings.city,
    settings.phone,
    ...fiscal,
    '------------------------',
    `Date: ${date}`,
    `Client: ${order.clientName}`,
    '------------------------',
    lines,
    '------------------------',
    disc,
    `TOTAL: ${formatDa(order.totalDa)}`,
    ...pay,
    '------------------------',
    'Merci pour votre confiance',
  ]
    .filter((x) => x != null && x !== '')
    .join('\n')
}

export function openInvoiceWhatsapp(
  order: Order,
  settings: ShopSettings,
  customText?: string,
): void {
  const text = encodeURIComponent(
    customText?.trim() || buildInvoiceText(order, settings),
  )
  const phone = normalizePhone(order.clientPhone)
  const url = phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`
  window.open(url, '_blank')
}
