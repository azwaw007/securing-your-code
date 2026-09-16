import { wikiAnswer } from './wiki'
import type { AppState } from '../types'
import { formatDa } from '../utils/format'
import {
  clientCreditDa,
  lowStockProducts,
  openCreditsDa,
  overdueCreditOrders,
  stockValueDa,
  todayCashDa,
  todayOrders,
} from '../store'

export type ChatLang = 'fr' | 'ar' | 'en' | 'es'

export function detectChatLang(text: string, fallback: ChatLang = 'fr'): ChatLang {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'
  const t = text.toLowerCase()
  if (
    /\b(hola|gracias|precio|vender|clientes|inventario|ayuda|cuanto|negocio)\b/.test(t)
  ) {
    return 'es'
  }
  if (
    /\b(c['’]?est|quoi|qui est|quelle|comment|pourquoi|explique)\b/.test(t)
  ) {
    return 'fr'
  }
  if (
    /\b(hello|hi|please|thanks|how|what|inventory|profit|customers|who is)\b/.test(t) &&
    !/\b(wesh|chhal|labas|rbe7|yekhlas|na9es)\b/.test(t)
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

function tryMath(raw: string): number | null {
  const expr = raw
    .replace(/,/g, '.')
    .replace(/[x×]/gi, '*')
    .replace(/÷/g, '/')
    .trim()
  if (!/^[\d\s.+\-*/()]+$/.test(expr) || !/[+\-*/]/.test(expr)) return null
  try {
    const n = Function(`"use strict"; return (${expr})`)() as unknown
    return typeof n === 'number' && Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function findLooseProduct(state: AppState, t: string) {
  const words = t.split(/\s+/).filter((w) => w.length > 2)
  return state.products.find((p) => {
    const n = p.name.toLowerCase()
    return t.includes(n) || words.some((w) => n.includes(w))
  })
}

function findLooseClient(state: AppState, t: string) {
  return state.clients.find((c) => {
    const n = c.name.toLowerCase()
    return n.length > 1 && (t.includes(n) || n.split(' ').some((w) => w.length > 2 && t.includes(w)))
  })
}

function topDebtors(state: AppState): string[] {
  return state.clients
    .map((c) => ({ name: c.name, da: clientCreditDa(state, c.id) }))
    .filter((x) => x.da > 0)
    .sort((a, b) => b.da - a.da)
    .slice(0, 5)
    .map((x) => `• ${x.name} : ${formatDa(x.da)}`)
}

function say(
  lang: ChatLang,
  pack: { fr: string; ar: string; en?: string; es?: string },
): string {
  if (lang === 'ar') return pack.ar
  if (lang === 'en') return pack.en ?? pack.fr
  if (lang === 'es') return pack.es ?? pack.fr
  return pack.fr
}

/** Réponse toujours utile — jamais « je n’ai pas compris ». Gratuit, local. */
export function chatReply(state: AppState, raw: string): string {
  const fallback: ChatLang = state.settings.language === 'ar' ? 'ar' : 'fr'
  const lang = detectChatLang(raw, fallback)
  const t = raw.toLowerCase()
  const brief = shopBrief(state, lang)

  const math = tryMath(raw.replace(/da|دج|dinars?/gi, '').trim())
  if (math !== null) {
    return say(lang, {
      fr: `Résultat : ${formatDa(math)}`,
      ar: `الحساب: ${formatDa(math)}`,
      en: `Result: ${formatDa(math)}`,
    })
  }

  if (
    /^(salam|salem|salut|bonjour|bonsoir|hello|hi|hey|hola|ciao|coucou|wesh|wech|labas|ça va|ca va|أهلا|سلام|مرحبا|واش|لاباس)/i.test(
      raw.trim(),
    )
  ) {
    return say(lang, {
      fr: `Salam 👋 Je suis l’agent AZ POS (gratuit, dans l’app).\n\n${brief}\n\nDis : vendre · stock na9es · chkoune yekhlas · rbe7`,
      ar: `وعليكم السلام 👋 أنا وكيل AZ POS مجاني.\n\n${brief}\n\nقول: بيع · مخزون ناقص · شكون يخلص · ربح`,
      en: `Hi 👋 Free AZ POS assistant.\n\n${brief}`,
    })
  }

  if (/merci|thanks|thank you|gracias|شكرا|يعطيك|sahit|sa7it/i.test(t)) {
    return say(lang, {
      fr: 'Avec plaisir. Encore un truc ? Vente, stock, dettes, zakat…',
      ar: 'العفو. واش تزيد؟ بيع، مخزون، ديون، زكاة…',
      en: 'You’re welcome. Sell, stock, credit, zakat…',
    })
  }

  if (/zakat|زكاة|زكاه|zekat/i.test(t)) {
    return say(lang, {
      fr: `Zakat : ouvre 🌙 Zakat dans Plus. Base ≈ stock + crédits. Valeur stock ${formatDa(stockValueDa(state))}, crédits ${formatDa(openCreditsDa(state))}.`,
      ar: `الزكاة من «المزيد». القاعدة ≈ المخزون + الديون. مخزون ${formatDa(stockValueDa(state))} · ديون ${formatDa(openCreditsDa(state))}.`,
    })
  }

  if (/type de commerce|changer commerce|domaine|نوع التجارة|بدل التجارة/i.test(t)) {
    return say(lang, {
      fr: 'Réglages (⚙️) → « Type de commerce » → Gros / Détail / Santé / Auto / Services, puis le domaine.',
      ar: 'الإعدادات ⚙️ → نوع التجارة → جملة / تجزئة / صحة / سيارات / خدمات.',
    })
  }

  if (/comment (vendre|utiliser|ajouter un produit|ca marche)|كيفاش نبيع|كيف نبيع|زيد منتج|ajouter produit/i.test(t)) {
    return say(lang, {
      fr: 'Vendre : bouton Vendre → vente rapide ou client → + produits → valider.\nProduit : Stock → Ajouter (nom, prix, photo).',
      ar: 'البيع: زر بيع → سريع أو زبون → المنتجات → صح. منتج جديد: مخزون → إضافة.',
    })
  }

  if (/licence|license|مفتاح|gd z|gdz1/i.test(t)) {
    return say(lang, {
      fr: 'Licence : Réglages → colle la clé GDZ1… Essai gratuit quelques jours, puis clé annuelle.',
      ar: 'الرخصة: الإعدادات → مفتاح GDZ1. تجربة مجانية ثم رخصة سنوية.',
    })
  }

  if (/caisse|صندوق|cash|drawer|ferme?r caisse/i.test(t)) {
    return say(lang, {
      fr: `Caisse aujourd’hui : ${formatDa(todayCashDa(state))}. Accueil → Caisse pour ouvrir/fermer le tiroir.`,
      ar: `الصندوق اليوم: ${formatDa(todayCashDa(state))}. الرئيسية → الصندوق.`,
    })
  }

  if (/stock bas|rupture|na9es|naqes|ناقص|نفاد|fini|khlas/i.test(t)) {
    const low = lowStockProducts(state).slice(0, 8)
    if (!low.length) {
      return say(lang, { fr: 'Aucun stock bas. Tout est OK.', ar: 'ماكانش مخزون ناقص.' })
    }
    const lines = low.map((p) => `• ${p.name} : ${p.stock}`).join('\n')
    return say(lang, {
      fr: `Stock bas :\n${lines}`,
      ar: `مخزون ناقص:\n${lines}`,
    })
  }

  if (/credit|dette|yekhlas|diyoune|شكون|ديون|qui doit|impay/i.test(t)) {
    const list = topDebtors(state)
    const late = overdueCreditOrders(state).length
    if (!list.length) {
      return say(lang, { fr: 'Personne ne te doit. Crédits = 0.', ar: 'ماكانش ديون.' })
    }
    return say(lang, {
      fr: `Qui doit (${formatDa(openCreditsDa(state))})${late ? ` · ${late} en retard` : ''} :\n${list.join('\n')}`,
      ar: `شكون يخلّص (${formatDa(openCreditsDa(state))}) :\n${list.join('\n')}`,
    })
  }

  if (/resume|dashboard|chiffre|situation|ملخص|lyoum|اليوم|how is|wesh kayen/i.test(t)) {
    return brief
  }

  const hit = findLooseProduct(state, t)
  if (hit) {
    return say(lang, {
      fr: `${hit.name}\nStock ${hit.stock} · vente ${formatDa(hit.priceDa)} · achat ${formatDa(hit.costDa)}\nDis « vendre » pour l’encaisser.`,
      ar: `${hit.name}\nمخزون ${hit.stock} · بيع ${formatDa(hit.priceDa)} · شراء ${formatDa(hit.costDa)}`,
    })
  }

  const client = findLooseClient(state, t)
  if (client) {
    const due = clientCreditDa(state, client.id)
    return `${client.name}\nWhatsApp : ${client.phone || '—'}\n${client.city || ''}${due ? `\nCrédit : ${formatDa(due)}` : ''}`
  }

  const lowN = lowStockProducts(state).length
  const tip =
    lowN > 0
      ? say(lang, {
          fr: `Conseil : ${lowN} produit(s) bas — remplis avant de perdre des ventes.`,
          ar: `نصيحة: ${lowN} منتج ناقص — عبّئ قبل ما تخسر البيع.`,
        })
      : say(lang, {
          fr: 'Conseil : note les dépenses du jour, les gains seront justes.',
          ar: 'نصيحة: سجّل مصاريف اليوم باش الربح يكون صحيح.',
        })

  return `${brief}\n\n${tip}`
}

const SHOP_HINT =
  /stock|vendre|caisse|zakat|dette|facture|commande|rbe7|yekhlas|na9es|مخزون|زبون|صندوق|زكاة|دين|فاتورة|az pos|benefice|chiffre d.?affaires|stock bas/i

export function isShopQuestion(raw: string): boolean {
  return SHOP_HINT.test(raw)
}

function mentionsShopEntity(state: AppState, raw: string): boolean {
  return Boolean(findLooseProduct(state, raw.toLowerCase()) || findLooseClient(state, raw.toLowerCase()))
}

function wikiLang(lang: ChatLang, raw: string): 'fr' | 'ar' | 'en' {
  if (/[\u0600-\u06FF]/.test(raw)) return 'ar'
  if (lang === 'en') return 'en'
  return 'fr'
}

function nowReply(lang: ChatLang): string {
  const d = new Date()
  const loc = lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-DZ'
  return d.toLocaleString(loc, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function localGeneral(raw: string, lang: ChatLang): string | null {
  const t = raw.toLowerCase()
  if (
    /qui es[- ]tu|t['’]es qui|who are you|شنو نتا|واش نتا|من أنت|من انت/i.test(t)
  ) {
    return lang === 'ar'
      ? 'أنا وكيل AZ POS مجاني داخل التطبيق. نجاوب على المحل وعلى الأسئلة العامة (ويكيبيديا). ماشي ChatGPT مدفوع.'
      : 'Je suis l’agent AZ POS, gratuit dans l’app. Magasin + questions générales (Wikipédia). Pas ChatGPT payant.'
  }
  if (/quelle heure|what time|الوقت|ساعة|chhal f sa3a|wesh lwe9t/i.test(t)) {
    return nowReply(lang)
  }
  if (/quelle date|aujourd.?hui on est|what date|التاريخ|اليوم شحال/i.test(t)) {
    return nowReply(lang)
  }
  if (/meteo|météo|weather|طقس|شتا/i.test(t)) {
    return lang === 'ar'
      ? 'ما عنديش الطقس المباشر (مجاني بدون خدمة مدفوعة). شوف تطبيق الطقس في تلفونك.'
      : 'Je n’ai pas la météo en direct (outil gratuit, pas de service payant). Ouvre la météo de ton téléphone.'
  }
  if (/blague|joke|نكتة|d7ak/i.test(t)) {
    return lang === 'ar'
      ? 'علاه السردين ما يدخلش للكاشير؟ لأنو كاين غير بالكرتون. 😄'
      : 'Pourquoi le stock est jamais à 0 chez un optimiste ? Parce qu’il compte aussi les commandes… pas encore payées. 😄'
  }
  return null
}

/** Questions générales (comme un chat) — Wikipédia gratuit + réponses locales. */
export async function answerAnything(state: AppState, raw: string): Promise<string> {
  const fallback: ChatLang = state.settings.language === 'ar' ? 'ar' : 'fr'
  const lang = detectChatLang(raw, fallback)

  if (
    isShopQuestion(raw) ||
    mentionsShopEntity(state, raw) ||
    /^(salam|salem|wesh|labas|salut|bonjour|hello|hi|أهلا|سلام)/i.test(raw.trim())
  ) {
    return chatReply(state, raw)
  }

  const local = localGeneral(raw, lang)
  if (local) return local

  const math = raw.replace(/da|دج|dinars?/gi, '').trim()
  if (/^[\d\s.,+\-*/x×÷()]+$/i.test(math) && /[+\-*/x×÷]/.test(math)) {
    return chatReply(state, raw)
  }

  const wiki = await wikiAnswer(raw, wikiLang(lang, raw))
  if (wiki) {
    const foot =
      lang === 'ar'
        ? '\n\n(ويكيبيديا، مجاني. اسأل أيضاً على محلك: بيع، مخزون، ديون.)'
        : '\n\n(Wikipédia, gratuit. Tu peux aussi me parler de ton magasin.)'
    return wiki + foot
  }

  if (lang === 'ar') {
    return `على «${raw}»: ما لقيتش مقال ويكيبيديا. جرّب اسم أوضح (شخص، بلد، كلمة)، أو اسأل على البيع / المخزون / الديون.`
  }
  return `Sur «${raw}» : je n’ai pas trouvé d’article, mais je peux en parler.\nReformule avec un nom précis (personne, pays, mot), ou parle-moi de ton magasin (vente, stock, dettes).`
}
