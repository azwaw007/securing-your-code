import type { AppState } from '../types'
import { formatDa } from '../utils/format'
import {
  lowStockProducts,
  openCreditsDa,
  stockValueDa,
  todayCashDa,
  todayOrders,
} from '../store'

export type ChatLang = 'fr' | 'ar' | 'en' | 'es'

export function detectChatLang(text: string, fallback: ChatLang = 'fr'): ChatLang {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'
  const t = text.toLowerCase()
  if (
    /\b(hola|gracias|precio|vender|clientes|inventario|ayuda|cuanto|negocio)\b/.test(
      t,
    )
  ) {
    return 'es'
  }
  if (
    /\b(hello|hi|please|thanks|how|what|stock|sell|client|profit|help|open|today)\b/.test(
      t,
    )
  ) {
    return 'en'
  }
  return fallback
}

function shopBrief(state: AppState, lang: ChatLang): string {
  const today = todayOrders(state)
  const sales = today.reduce((s, o) => s + o.totalDa, 0)
  const cash = todayCashDa(state)
  const low = lowStockProducts(state).length
  const credits = openCreditsDa(state)
  const stock = stockValueDa(state)
  const shop = state.settings.shopName
  if (lang === 'ar') {
    return [
      `المحل: ${shop}`,
      `اليوم: ${today.length} بيع · ${formatDa(sales)} · صندوق ${formatDa(cash)}`,
      `مخزون: ${state.products.length} منتج · قيمة ${formatDa(stock)} · ناقص ${low}`,
      `زبائن: ${state.clients.length} · ديون ${formatDa(credits)}`,
    ].join('\n')
  }
  if (lang === 'en') {
    return [
      `Shop: ${shop}`,
      `Today: ${today.length} sales · ${formatDa(sales)} · cash ${formatDa(cash)}`,
      `Stock: ${state.products.length} items · value ${formatDa(stock)} · low ${low}`,
      `Clients: ${state.clients.length} · credit ${formatDa(credits)}`,
    ].join('\n')
  }
  if (lang === 'es') {
    return [
      `Tienda: ${shop}`,
      `Hoy: ${today.length} ventas · ${formatDa(sales)} · caja ${formatDa(cash)}`,
      `Stock: ${state.products.length} · valor ${formatDa(stock)} · bajo ${low}`,
      `Clientes: ${state.clients.length} · crédito ${formatDa(credits)}`,
    ].join('\n')
  }
  return [
    `Magasin : ${shop}`,
    `Aujourd’hui : ${today.length} ventes · ${formatDa(sales)} · caisse ${formatDa(cash)}`,
    `Stock : ${state.products.length} produits · valeur ${formatDa(stock)} · bas ${low}`,
    `Clients : ${state.clients.length} · crédits ${formatDa(credits)}`,
  ].join('\n')
}

function guide(lang: ChatLang): string {
  if (lang === 'ar') {
    return [
      'أقدر نعاونك في كل شيء على AZ POS:',
      '• بيع / زبائن / مخزون / صندوق / أرباح / ديون',
      '• نصائح تجارة، أسعار، واتساب، توصيل',
      '• غيّر الثيم، اللغة، نوع التجارة من الإعدادات',
      'اكتب أو احكي: «بيع»، «مخزون ناقص»، «شنو ربح اليوم»…',
    ].join('\n')
  }
  if (lang === 'en') {
    return [
      'I can help with everything in AZ POS:',
      '• Sell / clients / stock / cash / profits / credit',
      '• Business tips, prices, WhatsApp, delivery',
      '• Change theme, language, business type in Settings',
      'Type or speak: “sell”, “low stock”, “today profit”…',
    ].join('\n')
  }
  if (lang === 'es') {
    return [
      'Puedo ayudarte con todo en AZ POS:',
      '• Vender / clientes / stock / caja / ganancias / crédito',
      '• Consejos, precios, WhatsApp, entrega',
      '• Cambia tema, idioma y tipo de comercio en Ajustes',
    ].join('\n')
  }
  return [
    'Je peux t’aider sur tout AZ POS :',
    '• Vendre / clients / stock / caisse / gains / crédits',
    '• Conseils commerce, prix, WhatsApp, livraison',
    '• Thème, langue, type de commerce dans Réglages',
    'Écris ou parle : « vendre », « stock bas », « gain du jour »…',
  ].join('\n')
}

/** Réponse toujours utile — jamais « je n’ai pas compris ». */
export function chatReply(state: AppState, raw: string): string {
  const fallback: ChatLang = state.settings.language === 'ar' ? 'ar' : 'fr'
  const lang = detectChatLang(raw, fallback)
  const t = raw.toLowerCase()
  const brief = shopBrief(state, lang)

  if (
    /^(salam|salem|salut|bonjour|bonsoir|hello|hi|hey|hola|ciao|coucou|أهلا|سلام|مرحبا)/i.test(
      raw.trim(),
    )
  ) {
    if (lang === 'ar') return `وعليكم السلام 👋\nأنا وكيل AZ POS.\n\n${brief}\n\n${guide(lang)}`
    if (lang === 'en') return `Hi 👋 I’m the AZ POS assistant.\n\n${brief}\n\n${guide(lang)}`
    if (lang === 'es') return `Hola 👋 Soy el asistente AZ POS.\n\n${brief}\n\n${guide(lang)}`
    return `Salam 👋 Je suis l’agent AZ POS.\n\n${brief}\n\n${guide(lang)}`
  }

  if (/merci|thanks|thank you|gracias|شكرا|يعطيك/i.test(t)) {
    if (lang === 'ar') return 'العفو. قولّي واش تحتاج: بيع، مخزون، زبون، أو أي سؤال.'
    if (lang === 'en') return 'You’re welcome. Ask me anything: sell, stock, client, or any question.'
    if (lang === 'es') return 'De nada. Pregúntame lo que quieras: venta, stock, cliente…'
    return 'Avec plaisir. Demande-moi n’importe quoi : vente, stock, client, ou autre.'
  }

  if (/comment (vendre|utiliser|ca marche)|how (do i|to)|كيف|كيفاش|كيف نبيع|como (vendo|uso)/i.test(t)) {
    if (lang === 'ar')
      return 'للبيع: اضغط «بيع» تحت → اختار زبون أو بيع سريع → زيد المنتجات → صحّح. تقدر تحكي «افتح البيع».'
    if (lang === 'en')
      return 'To sell: tap Sell → pick a client or quick sale → add products → confirm. You can also say “open sell”.'
    if (lang === 'es')
      return 'Para vender: toca Vender → cliente o venta rápida → productos → confirmar.'
    return 'Pour vendre : bouton Vendre en bas → client ou vente rapide → produits → valider. Tu peux aussi dire « ouvre vente ».'
  }

  if (/resume|dashboard|chiffre|situation|ملخص|حالتي|how is (my )?(shop|business)|como va/i.test(t)) {
    return brief
  }

  const hit = state.products.find((p) => t.includes(p.name.toLowerCase()))
  if (hit) {
    const line = `${hit.name} : ${hit.stock} · ${formatDa(hit.priceDa)}`
    if (lang === 'ar') return `لقيت المنتج:\n${line}\nزيد «بيع» باش تبيعه.`
    if (lang === 'en') return `Found:\n${line}\nSay “sell” to open the register.`
    return `Trouvé :\n${line}\nDis « vendre » pour l’encaisser.`
  }

  const client = state.clients.find((c) => t.includes(c.name.toLowerCase()))
  if (client) {
    return `${client.name}\nWhatsApp : ${client.phone || '—'}\n${client.city || ''}`
  }

  return [
    lang === 'ar'
      ? 'فهمت طلبك. هذا وضع محلك، وأنا معاك:'
      : lang === 'en'
        ? 'Got it. Here’s your shop — I can act on it:'
        : lang === 'es'
          ? 'Entendido. Así está tu negocio:'
          : 'OK, je te réponds avec les chiffres de ton magasin :',
    brief,
    '',
    guide(lang),
  ].join('\n')
}
