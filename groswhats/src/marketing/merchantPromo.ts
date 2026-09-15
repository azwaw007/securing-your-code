/** Promos commerçant : story + WhatsApp depuis un produit */

import type { Language, Product, ShopSettings } from '../types'
import { formatDa, formatQty } from '../utils/format'
import { unitLabel } from '../i18n'

export function buildProductStory(
  product: Product,
  settings: ShopSettings,
  lang: Language,
): string {
  const shop = settings.shopName || 'Mon magasin'
  if (lang === 'ar') {
    return [
      `🆕 وصل عند ${shop}`,
      ``,
      `${product.name}`,
      `${formatDa(product.priceDa)} / ${unitLabel(lang, product.unit)}`,
      product.stock > 0 ? `المتوفر: ${formatQty(product.stock)}` : 'كمية محدودة',
      ``,
      `واتساب للمتجر 👇`,
      settings.phone || '',
    ]
      .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
      .join('\n')
      .trim()
  }
  return [
    `🆕 Arrivage chez ${shop}`,
    ``,
    `${product.name}`,
    `${formatDa(product.priceDa)} / ${unitLabel(lang, product.unit)}`,
    product.stock > 0 ? `Dispo : ${formatQty(product.stock)}` : 'Quantité limitée',
    ``,
    `WhatsApp boutique 👇`,
    settings.phone || '',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n')
    .trim()
}

export function buildProductWhatsappPromo(
  product: Product,
  settings: ShopSettings,
  lang: Language,
): string {
  const shop = settings.shopName || 'Mon magasin'
  if (lang === 'ar') {
    return [
      `السلام من ${shop} 👋`,
      `عندنا ${product.name} — ${formatDa(product.priceDa)}.`,
      product.stock > 0 ? `باقين ${formatQty(product.stock)}.` : '',
      `طلبك؟ رد على الرسالة.`,
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    `Salam de ${shop} 👋`,
    `On a ${product.name} — ${formatDa(product.priceDa)}.`,
    product.stock > 0 ? `Reste ${formatQty(product.stock)}.` : '',
    `Tu en veux ? Réponds à ce message.`,
  ]
    .filter(Boolean)
    .join('\n')
}
