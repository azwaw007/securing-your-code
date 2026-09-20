import type { Order, ShopSettings } from '../types'
import { APP_BRAND } from '../brand'
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

/** Relance dette client (WhatsApp) */
export function buildDebtReminder(
  settings: ShopSettings,
  order: Pick<Order, 'clientName' | 'totalDa' | 'paidDa' | 'remainingDa' | 'dueDate' | 'payment'>,
): string {
  const lang = settings.language
  const remaining =
    order.remainingDa ??
    (order.payment === 'credit' ? order.totalDa : 0)
  const shop = settings.shopName || 'AZ POS'
  if (lang === 'ar') {
    return [
      `تذكير بالدين — ${shop}`,
      '',
      `الزبون : ${order.clientName}`,
      `المتبقي : ${formatDa(remaining)}`,
      order.dueDate ? `الاستحقاق : ${order.dueDate}` : '',
      settings.phone ? `للتواصل : ${settings.phone}` : '',
      '',
      'شكراً لتعاونكم',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    `Rappel de dette — ${shop}`,
    '',
    `Client : ${order.clientName}`,
    `Reste dû : ${formatDa(remaining)}`,
    order.dueDate ? `Échéance : ${order.dueDate}` : '',
    settings.phone ? `Contact : ${settings.phone}` : '',
    '',
    'Merci pour votre collaboration',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Rappel renouvellement abonnement gym */
export function buildMembershipReminder(
  settings: ShopSettings,
  client: { name: string; membershipEnd?: string; membershipPlan?: string },
): string {
  const lang = settings.language
  const shop = settings.shopName || 'Club'
  if (lang === 'ar') {
    return [
      `تذكير تجديد الاشتراك — ${shop}`,
      '',
      `العضو : ${client.name}`,
      client.membershipPlan ? `الصيغة : ${client.membershipPlan}` : '',
      client.membershipEnd ? `ينتهي : ${client.membershipEnd}` : '',
      settings.phone ? `للتجديد : ${settings.phone}` : '',
      '',
      'ننتظركم 💪',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    `Rappel renouvellement — ${shop}`,
    '',
    `Membre : ${client.name}`,
    client.membershipPlan ? `Formule : ${client.membershipPlan}` : '',
    client.membershipEnd ? `Fin : ${client.membershipEnd}` : '',
    settings.phone ? `Pour renouveler : ${settings.phone}` : '',
    '',
    'À bientôt 💪',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Message SAV prérempli vers le support AZ Soft. */
export function buildSupportWhatsappMessage(input?: {
  language?: 'fr' | 'ar'
  shopName?: string
  version?: string
}): string {
  const lang = input?.language === 'ar' ? 'ar' : 'fr'
  const shop = input?.shopName?.trim() || ''
  const ver = input?.version?.trim() || ''
  if (lang === 'ar') {
    return [
      'السلام، أحتاج مساعدة على AZ POS.',
      shop ? `المحل: ${shop}` : '',
      ver ? `الإصدار: ${ver}` : '',
      '',
      'المشكلة:',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    'Salam, j’ai besoin d’aide sur AZ POS.',
    shop ? `Magasin : ${shop}` : '',
    ver ? `Version : ${ver}` : '',
    '',
    'Problème :',
  ]
    .filter(Boolean)
    .join('\n')
}

export function openSupportWhatsapp(input?: {
  language?: 'fr' | 'ar'
  shopName?: string
  version?: string
  phone?: string
}): void {
  openWhatsappText(
    input?.phone || APP_BRAND.supportWhatsapp,
    buildSupportWhatsappMessage(input),
  )
}

