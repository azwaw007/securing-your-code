/**
 * Pack campagne vente AZ POS / AZ POS Pro (FR + AR).
 * Boutique vendeur : AZ Soft — produit : AZ POS.
 */

export const SELLER_BRAND = {
  boutique: 'AZ Soft',
  produit: 'AZ POS',
  produitPro: 'AZ POS Pro',
  slogan: 'La caisse simple pour l’Algérie',
  sloganPro: 'Plusieurs magasins. Un seul logiciel.',
  demoUrl: 'https://az-pos-dz.vercel.app',
  proUrl: '/seller/pro.html',
  campagneUrl: '/seller/campagne.html',
  /** WhatsApp vendeur — à personnaliser dans la campagne */
  defaultWhatsapp: '',
  prixDetail: '12 000 DA / an (1 poste)',
  prixPro:
    'Pro 3 postes 25 000 DA · Pro 10 postes 70 000 DA · Pro Max illimité 90 000 DA / an',
} as const

export type StorySlot = 'matin' | 'midi' | 'soir'
export type PostChannel = 'whatsapp_status' | 'facebook' | 'instagram' | 'whatsapp_groupe'

export interface CampaignCopy {
  id: string
  channel: PostChannel
  titleFr: string
  bodyFr: string
  bodyAr: string
  ctaFr: string
}

export interface StoryScript {
  id: string
  slot: StorySlot
  day: number
  fr: string
  ar: string
}

export interface AutoReplyRule {
  id: string
  match: RegExp
  replyFr: string
  replyAr: string
}

/** Calendrier 7 jours — stories / statuts */
export const STORY_WEEK: StoryScript[] = [
  {
    id: 'd1-matin',
    day: 1,
    slot: 'matin',
    fr: '🌅 Nouveau jour, nouvelle caisse.\nAZ POS — stock, crédit, WhatsApp.\nEssai gratuit → lien en bio',
    ar: '🌅 يوم جديد وكاش جديد.\nAZ POS — مخزون، دين، واتساب.\nتجربة مجانية',
  },
  {
    id: 'd1-soir',
    day: 1,
    slot: 'soir',
    fr: '📊 Fin de journée : tu sais ce que tu as vendu ?\nAvec AZ POS, caisse claire en 1 tap.',
    ar: '📊 نهاية اليوم: شحال بعت؟\nمع AZ POS الصندوق واضح.',
  },
  {
    id: 'd2-matin',
    day: 2,
    slot: 'matin',
    fr: '🏪 2 magasins = 2 stocks.\nAZ POS Pro : multi-dépôts + transfert.\nDemande un devis WhatsApp.',
    ar: '🏪 محلّين = مخزونين.\nAZ POS Pro: عدة مخازن + تحويل.\nاطلب عرض سعر واتساب.',
  },
  {
    id: 'd3-midi',
    day: 3,
    slot: 'midi',
    fr: '⚡ Vente en 10 secondes.\nClient → produit → cash ou crédit.\nPas Excel. Pas cahier.',
    ar: '⚡ بيع في ثواني.\nزبون → منتج → نقد أو دين.\nبلا إكسيل.',
  },
  {
    id: 'd4-soir',
    day: 4,
    slot: 'soir',
    fr: '🚚 Livreurs sur leur téléphone.\nToi tu vois la tournée. Eux ils livrent.\nMulti-poste AZ POS.',
    ar: '🚚 السائق على هاتفه.\nأنت تشوف الجولة وهو يسلّم.\nAZ POS متعدد الأجهزة.',
  },
  {
    id: 'd5-matin',
    day: 5,
    slot: 'matin',
    fr: '💬 « Bchhal Pro ? »\nRéponse : selon le nombre de magasins — devis en 2 min sur WhatsApp.',
    ar: '💬 « بصحال Pro؟ »\nالجواب: حسب عدد المحلات — عرض في دقيقتين واتساب.',
  },
  {
    id: 'd6-midi',
    day: 6,
    slot: 'midi',
    fr: '📱 Marche sur téléphone + PC.\nDonnées chez toi. Pas de clé USB.',
    ar: '📱 يخدم على التليفون والحاسوب.\nالبيانات عندك.',
  },
  {
    id: 'd7-soir',
    day: 7,
    slot: 'soir',
    fr: '✅ Semaine Pro : qui veut une démo demain ?\nRéponds DÉMO — on t’envoie le lien.',
    ar: '✅ نهاية الأسبوع: من يريد عرض غدوة؟\nرد DÉMO — نرسل الرابط.',
  },
]

export const POSTS: CampaignCopy[] = [
  {
    id: 'post-lancement',
    channel: 'facebook',
    titleFr: 'Lancement AZ POS',
    bodyFr: `Les commerçants algériens méritent une caisse simple.

${SELLER_BRAND.produit} — stock, clients, crédit, WhatsApp, caisse du jour.
${SELLER_BRAND.produitPro} — plusieurs magasins, stock séparé, transferts.

Créé pour le terrain (gros, détail, dépôt).
Essai : ${SELLER_BRAND.demoUrl}`,
    bodyAr: `التاجر الجزائري يستاهل كاش بسيط.

${SELLER_BRAND.produit} — مخزون، زبائن، دين، واتساب.
${SELLER_BRAND.produitPro} — عدة محلات ومخزون منفصل.

تجربة: ${SELLER_BRAND.demoUrl}`,
    ctaFr: 'Commente DÉMO ou envoie WhatsApp',
  },
  {
    id: 'post-pro',
    channel: 'instagram',
    titleFr: 'Pourquoi Pro',
    bodyFr: `Tu as un dépôt + un magasin ?
Ou 3 points de vente ?

${SELLER_BRAND.produitPro} :
• stock par magasin
• magasin actif à la caisse
• transfert entre dépôts

Prix : ${SELLER_BRAND.prixPro}`,
    bodyAr: `${SELLER_BRAND.produitPro}:
• مخزون لكل محل
• محل نشط في الصندوق
• تحويل بين المخازن

السعر: ${SELLER_BRAND.prixPro}`,
    ctaFr: 'Lien Pro en bio / story',
  },
  {
    id: 'wa-groupe',
    channel: 'whatsapp_groupe',
    titleFr: 'Message groupe commerçants',
    bodyFr: `Salam 👋
Je propose ${SELLER_BRAND.produit} — application caisse + stock + WhatsApp pour commerçants DZ.

Version Pro = multi-magasins.
Démo gratuite : ${SELLER_BRAND.demoUrl}
Réponds PRO si tu veux un devis.`,
    bodyAr: `السلام 👋
نقترح ${SELLER_BRAND.produit} — تطبيق كاش + مخزون + واتساب للتجار.

النسخة Pro = عدة محلات.
تجربة: ${SELLER_BRAND.demoUrl}
رد PRO للعرض.`,
    ctaFr: 'Envoyer dans 2–3 groupes max / jour',
  },
]

/** Réponses auto aux messages vente (inbox / WhatsApp collé) */
export const AUTO_REPLIES: AutoReplyRule[] = [
  {
    id: 'prix',
    match: /(prix|tarif|bchhal|بصحال|كم السعر|سعر|devis|عرض)/i,
    replyFr: `Salam 👋 Merci pour ton message.
${SELLER_BRAND.produit} (1 magasin) : ${SELLER_BRAND.prixDetail}.
${SELLER_BRAND.produitPro} (multi-magasins) : ${SELLER_BRAND.prixPro}.

Dis-moi : combien de magasins / dépôts ?
Démo : ${SELLER_BRAND.demoUrl}`,
    replyAr: `السلام 👋 شكرا على الرسالة.
${SELLER_BRAND.produit} (محل واحد): ${SELLER_BRAND.prixDetail}.
${SELLER_BRAND.produitPro} (عدة محلات): ${SELLER_BRAND.prixPro}.

قولي: شحال من محل / مخزن؟
تجربة: ${SELLER_BRAND.demoUrl}`,
  },
  {
    id: 'demo',
    match: /(demo|démo|essai|تجربة|رابط|link)/i,
    replyFr: `Voici la démo ${SELLER_BRAND.produit} :
${SELLER_BRAND.demoUrl}

Tu peux tester stock + vente tout de suite.
Si tu as 2+ magasins → regarde Pro : ${SELLER_BRAND.demoUrl.replace(/\/$/, '')}/seller/pro.html`,
    replyAr: `رابط التجربة ${SELLER_BRAND.produit}:
${SELLER_BRAND.demoUrl}

جرّب المخزون والبيع مباشرة.
إذا عندك محلّين أو أكثر → Pro.`,
  },
  {
    id: 'multi',
    match: /(multi|magasin|d[eé]p[oô]t|عدة|محلات|مخزن|usine|usine|pro)/i,
    replyFr: `${SELLER_BRAND.produitPro} gère plusieurs dépôts :
• stock séparé par magasin
• magasin actif à la caisse
• transfert A → B

Dis-moi le nombre de points de vente → devis WhatsApp.`,
    replyAr: `${SELLER_BRAND.produitPro} يدير عدة مخازن:
• مخزون منفصل
• محل نشط في الصندوق
• تحويل بين المخازن

قول عدد نقاط البيع → نرسل العرض.`,
  },
  {
    id: 'whatsapp',
    match: /(whatsapp|واتس|واتساب)/i,
    replyFr: `Oui — ${SELLER_BRAND.produit} envoie factures et arrivages sur WhatsApp (wa.me).
Les données restent sur ton téléphone.`,
    replyAr: `نعم — ${SELLER_BRAND.produit} يرسل الفواتير والوصول عبر واتساب.
البيانات تبقى على هاتفك.`,
  },
]

export function storyForToday(
  dayOfCampaign = ((Math.floor(Date.now() / 86400000) % 7) + 1) as number,
  slot: StorySlot = 'matin',
): StoryScript {
  const list = STORY_WEEK.filter((s) => s.day === dayOfCampaign && s.slot === slot)
  return list[0] || STORY_WEEK[0]
}

export function matchAutoReply(
  message: string,
  lang: 'fr' | 'ar' = 'fr',
): { ruleId: string; reply: string } | null {
  for (const rule of AUTO_REPLIES) {
    if (rule.match.test(message)) {
      return {
        ruleId: rule.id,
        reply: lang === 'ar' ? rule.replyAr : rule.replyFr,
      }
    }
  }
  return null
}

export function buildSalesPitch(opts: {
  shops?: number
  city?: string
  lang?: 'fr' | 'ar'
}): string {
  const shops = opts.shops && opts.shops > 1 ? opts.shops : 1
  const city = opts.city?.trim() || 'Algérie'
  if (opts.lang === 'ar') {
    return shops > 1
      ? `عرض ${SELLER_BRAND.produitPro} لـ ${shops} نقاط بيع (${city}). مخزون منفصل + تحويل. تجربة: ${SELLER_BRAND.demoUrl}`
      : `عرض ${SELLER_BRAND.produit} — كاش ومخزون وواتساب (${city}). تجربة: ${SELLER_BRAND.demoUrl}`
  }
  return shops > 1
    ? `Offre ${SELLER_BRAND.produitPro} pour ${shops} points de vente (${city}). Stock séparé + transferts. Démo : ${SELLER_BRAND.demoUrl}`
    : `Offre ${SELLER_BRAND.produit} — caisse, stock, WhatsApp (${city}). Démo : ${SELLER_BRAND.demoUrl}`
}
