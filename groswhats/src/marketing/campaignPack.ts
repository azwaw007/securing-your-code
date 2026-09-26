/**
 * Pack campagne marketing digital (FR + AR).
 * La marque (boutique / produit) est choisie par l’utilisateur — pas de nom figé.
 */

export type SellerBrand = {
  boutique: string
  produit: string
  produitPro: string
  slogan: string
  sloganPro: string
  demoUrl: string
  proUrl: string
  campagneUrl: string
  defaultWhatsapp: string
  prixDetail: string
  prixPro: string
}

/** Valeurs par défaut génériques — l’utilisateur les remplace dans AZ Digital. */
export const DEFAULT_SELLER_BRAND: SellerBrand = {
  boutique: 'Ma boutique',
  produit: 'Mon produit',
  produitPro: 'Mon produit Pro',
  slogan: 'Ton offre digitale, claire et simple',
  sloganPro: 'Plusieurs points de vente. Une seule offre.',
  demoUrl: 'https://exemple.dz',
  proUrl: '/seller/pro.html',
  campagneUrl: '/seller/campagne.html',
  defaultWhatsapp: '',
  prixDetail: 'Prix à définir (offre standard)',
  prixPro: 'Prix Pro à définir (multi-postes / multi-offres)',
}

/** @deprecated préférer resolveSellerBrand — alias pour imports existants */
export const SELLER_BRAND = DEFAULT_SELLER_BRAND

export function resolveSellerBrand(
  partial?: Partial<SellerBrand> | null,
): SellerBrand {
  return {
    ...DEFAULT_SELLER_BRAND,
    ...(partial || {}),
    boutique: (partial?.boutique || '').trim() || DEFAULT_SELLER_BRAND.boutique,
    produit: (partial?.produit || '').trim() || DEFAULT_SELLER_BRAND.produit,
    produitPro:
      (partial?.produitPro || '').trim() ||
      ((partial?.produit || '').trim()
        ? `${(partial?.produit || '').trim()} Pro`
        : DEFAULT_SELLER_BRAND.produitPro),
    demoUrl: (partial?.demoUrl || '').trim() || DEFAULT_SELLER_BRAND.demoUrl,
  }
}

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

function storiesFor(brand: SellerBrand): StoryScript[] {
  const { produit, produitPro } = brand
  return [
    {
      id: 'd1-matin',
      day: 1,
      slot: 'matin',
      fr: `🌅 Nouveau jour, nouvelle offre.\n${produit} — simple, claire, WhatsApp.\nEssai → lien en bio`,
      ar: `🌅 يوم جديد وعرض جديد.\n${produit} — بسيط، واضح، واتساب.\nتجربة → الرابط في البايو`,
    },
    {
      id: 'd1-soir',
      day: 1,
      slot: 'soir',
      fr: `📊 Fin de journée : ton prospect a-t-il ton lien ?\nAvec ${produit}, pitch prêt en 1 tap.`,
      ar: `📊 نهاية اليوم: هل عند الزبون رابطك؟\nمع ${produit} العرض جاهز بضغطة.`,
    },
    {
      id: 'd2-matin',
      day: 2,
      slot: 'matin',
      fr: `🏪 Plusieurs points de vente ?\n${produitPro} : multi-offres + suivi.\nDemande un devis WhatsApp.`,
      ar: `🏪 عدة نقاط بيع؟\n${produitPro}: عروض متعددة + متابعة.\nاطلب عرض سعر واتساب.`,
    },
    {
      id: 'd3-midi',
      day: 3,
      slot: 'midi',
      fr: `⚡ Proposition en 10 secondes.\nClient → offre → WhatsApp.\nPas Excel. Pas cahier.`,
      ar: `⚡ عرض في ثواني.\nزبون → عرض → واتساب.\nبلا إكسيل.`,
    },
    {
      id: 'd4-soir',
      day: 4,
      slot: 'soir',
      fr: `🚚 Relance prospects sur ton téléphone.\nToi tu suis la file. Eux ils répondent.\nCampagne ${produit}.`,
      ar: `🚚 راسل prospects من هاتفك.\nأنت تتابع والطابور يرد.\nحملة ${produit}.`,
    },
    {
      id: 'd5-matin',
      day: 5,
      slot: 'matin',
      fr: `💬 « Bchhal ? »\nRéponse : selon l’offre — devis en 2 min sur WhatsApp.`,
      ar: `💬 « بصحال؟ »\nالجواب: حسب العرض — عرض في دقيقتين واتساب.`,
    },
    {
      id: 'd6-midi',
      day: 6,
      slot: 'midi',
      fr: `📱 Marche sur téléphone + PC.\nTon catalogue digital, ton CTA.`,
      ar: `📱 يخدم على التليفون والحاسوب.\nكتالوجك الرقمي وزر الشراء.`,
    },
    {
      id: 'd7-soir',
      day: 7,
      slot: 'soir',
      fr: `✅ Semaine marketing : qui veut une démo demain ?\nRéponds DÉMO — on t’envoie le lien.`,
      ar: `✅ نهاية الأسبوع: من يريد عرض غدوة؟\nرد DÉMO — نرسل الرابط.`,
    },
  ]
}

function postsFor(brand: SellerBrand): CampaignCopy[] {
  const { produit, produitPro, demoUrl, prixPro } = brand
  return [
    {
      id: 'post-lancement',
      channel: 'facebook',
      titleFr: `Lancement ${produit}`,
      bodyFr: `Les clients méritent une offre claire.

${produit} — digital, WhatsApp, suivi simple.
${produitPro} — plusieurs offres / points de vente.

Créé pour ton marché.
Essai : ${demoUrl}`,
      bodyAr: `الزبون يستاهل عرض واضح.

${produit} — رقمي، واتساب، متابعة بسيطة.
${produitPro} — عدة عروض / نقاط بيع.

مصمم لسوقك.
تجربة: ${demoUrl}`,
      ctaFr: 'Commente DÉMO ou envoie WhatsApp',
    },
    {
      id: 'post-pro',
      channel: 'instagram',
      titleFr: 'Pourquoi Pro',
      bodyFr: `Tu as plusieurs canaux ou points de vente ?

${produitPro} :
• offres séparées
• suivi prospects
• relances WhatsApp

Prix : ${prixPro}`,
      bodyAr: `${produitPro}:
• عروض منفصلة
• متابعة prospects
• رسائل واتساب

السعر: ${prixPro}`,
      ctaFr: 'Lien Pro en bio / story',
    },
    {
      id: 'wa-groupe',
      channel: 'whatsapp_groupe',
      titleFr: 'Message groupe',
      bodyFr: `Salam 👋
Je propose ${produit} — offre digitale + WhatsApp.

Version Pro = multi-offres.
Démo : ${demoUrl}
Réponds PRO si tu veux un devis.`,
      bodyAr: `السلام 👋
نقترح ${produit} — عرض رقمي + واتساب.

النسخة Pro = عروض متعددة.
تجربة: ${demoUrl}
رد PRO للعرض.`,
      ctaFr: 'Envoyer dans 2–3 groupes max / jour',
    },
  ]
}

function autoRepliesFor(brand: SellerBrand): AutoReplyRule[] {
  const { produit, produitPro, demoUrl, prixDetail, prixPro } = brand
  return [
    {
      id: 'prix',
      match: /(prix|tarif|bchhal|بصحال|كم السعر|سعر|devis|عرض)/i,
      replyFr: `Salam 👋 Merci pour ton message.
${produit} (offre standard) : ${prixDetail}.
${produitPro} (multi) : ${prixPro}.

Dis-moi : quelle offre te convient ?
Démo : ${demoUrl}`,
      replyAr: `السلام 👋 شكرا على الرسالة.
${produit} (عرض عادي): ${prixDetail}.
${produitPro} (متعدد): ${prixPro}.

قولي: أي عرض يناسبك؟
تجربة: ${demoUrl}`,
    },
    {
      id: 'demo',
      match: /(demo|démo|essai|تجربة|رابط|link)/i,
      replyFr: `Voici la démo ${produit} :
${demoUrl}

Tu peux tester tout de suite.
Si tu as plusieurs points de vente → ${produitPro}.`,
      replyAr: `رابط التجربة ${produit}:
${demoUrl}

جرّب مباشرة.
إذا عندك عدة نقاط بيع → ${produitPro}.`,
    },
    {
      id: 'multi',
      match: /(multi|magasin|d[eé]p[oô]t|عدة|محلات|مخزن|usine|pro)/i,
      replyFr: `${produitPro} gère plusieurs offres / points de vente :
• suivi séparé
• relances WhatsApp
• pitchs prêts

Dis-moi ton besoin → devis WhatsApp.`,
      replyAr: `${produitPro} يدير عدة عروض / نقاط بيع:
• متابعة منفصلة
• رسائل واتساب
• عروض جاهزة

قول احتياجك → نرسل العرض.`,
    },
    {
      id: 'whatsapp',
      match: /(whatsapp|واتس|واتساب)/i,
      replyFr: `Oui — ${produit} envoie offres et relances sur WhatsApp (wa.me).
Tes prospects restent chez toi.`,
      replyAr: `نعم — ${produit} يرسل العروض والتذكير عبر واتساب.
الـ prospects تبقى عندك.`,
    },
  ]
}

/** Calendrier 7 jours — stories / statuts (marque utilisateur) */
export function buildStoryWeek(brand?: Partial<SellerBrand> | null): StoryScript[] {
  return storiesFor(resolveSellerBrand(brand))
}

export function buildPosts(brand?: Partial<SellerBrand> | null): CampaignCopy[] {
  return postsFor(resolveSellerBrand(brand))
}

export function buildAutoReplies(
  brand?: Partial<SellerBrand> | null,
): AutoReplyRule[] {
  return autoRepliesFor(resolveSellerBrand(brand))
}

/** Compat : snapshots avec marque par défaut (éviter crash imports) */
export const STORY_WEEK: StoryScript[] = buildStoryWeek()
export const POSTS: CampaignCopy[] = buildPosts()
export const AUTO_REPLIES: AutoReplyRule[] = buildAutoReplies()

export function storyForToday(
  dayOfCampaign = ((Math.floor(Date.now() / 86400000) % 7) + 1) as number,
  slot: StorySlot = 'matin',
  brand?: Partial<SellerBrand> | null,
): StoryScript {
  const week = buildStoryWeek(brand)
  const list = week.filter((s) => s.day === dayOfCampaign && s.slot === slot)
  return list[0] || week[0]
}

export function matchAutoReply(
  message: string,
  lang: 'fr' | 'ar' = 'fr',
  brand?: Partial<SellerBrand> | null,
): { ruleId: string; reply: string } | null {
  for (const rule of buildAutoReplies(brand)) {
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
  brand?: Partial<SellerBrand> | null
}): string {
  const brand = resolveSellerBrand(opts.brand)
  const shops = opts.shops && opts.shops > 1 ? opts.shops : 1
  const city = opts.city?.trim() || 'Algérie'
  if (opts.lang === 'ar') {
    return shops > 1
      ? `عرض ${brand.produitPro} لـ ${shops} نقاط (${city}). تجربة: ${brand.demoUrl}`
      : `عرض ${brand.produit} (${city}). تجربة: ${brand.demoUrl}`
  }
  return shops > 1
    ? `Offre ${brand.produitPro} pour ${shops} points (${city}). Démo : ${brand.demoUrl}`
    : `Offre ${brand.produit} (${city}). Démo : ${brand.demoUrl}`
}
