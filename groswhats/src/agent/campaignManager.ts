/**
 * Agent campagne : planifie, répond, donne la story/post du moment.
 * Sans Meta API — ouvre WhatsApp + file locale de publication.
 */

import type { AppState, Language } from '../types'
import {
  AUTO_REPLIES,
  SELLER_BRAND,
  buildSalesPitch,
  matchAutoReply,
  storyForToday,
  POSTS,
} from '../marketing/campaignPack'
import {
  loadCampaignState,
  markQueueItem,
  nextActionsSummary,
  pendingDue,
  saveCampaignState,
  seedWeekQueue,
} from '../marketing/scheduler'

export type CampaignAgentAction =
  | { type: 'open_whatsapp'; phone: string; message: string }
  | { type: 'navigate'; screen: 'agent' | 'inbox' | 'settings' }
  | { type: 'none' }

export interface CampaignAgentResult {
  reply: string
  action?: CampaignAgentAction
}

function isAr(lang: Language): boolean {
  return lang === 'ar' || lang === 'darja'
}

/** Répond à un message prospect (collé ou inbox) */
export function autoReplyToLead(
  message: string,
  lang: Language,
): CampaignAgentResult {
  const state = loadCampaignState()
  if (!state.autoReplyEnabled) {
    return {
      reply: isAr(lang)
        ? 'الرد الآلي متوقف. فعّله: «active réponses auto».'
        : 'Réponses auto désactivées. Écris : « active réponses auto ».',
    }
  }
  const hit = matchAutoReply(message, isAr(lang) ? 'ar' : 'fr')
  if (!hit) {
    return {
      reply: isAr(lang)
        ? `لم أجد قاعدة. رد عام:\n\nالسلام، شكرا على رسالتك بخصوص ${SELLER_BRAND.produit}. شحال من محل عندك؟ نرسل العرض.\nتجربة: ${SELLER_BRAND.demoUrl}`
        : `Pas de règle exacte. Brouillon générique :\n\nSalam, merci pour ton message sur ${SELLER_BRAND.produit}. Combien de magasins as-tu ? Je t’envoie un devis.\nDémo : ${SELLER_BRAND.demoUrl}`,
      action: state.whatsappPhone
        ? {
            type: 'open_whatsapp',
            phone: state.whatsappPhone,
            message: isAr(lang)
              ? `السلام، بخصوص ${SELLER_BRAND.produit} — شحال من محل؟`
              : `Salam, pour ${SELLER_BRAND.produit} — combien de magasins ?`,
          }
        : { type: 'none' },
    }
  }
  return {
    reply: (isAr(lang) ? '✅ رد جاهز:\n\n' : '✅ Réponse prête :\n\n') + hit.reply,
    action: state.whatsappPhone
      ? { type: 'open_whatsapp', phone: state.whatsappPhone, message: hit.reply }
      : { type: 'none' },
  }
}

export function launchCampaignWeek(lang: Language): CampaignAgentResult {
  const items = seedWeekQueue(isAr(lang) ? 'ar' : 'fr')
  const due = pendingDue()
  return {
    reply: isAr(lang)
      ? `🚀 حملة ${SELLER_BRAND.boutique} انطلقت.\n${items.length} مهمة في الطابور.\n${due.length} جاهزة الآن.\n\n${nextActionsSummary('ar')}\n\nانشر الستوري يدوياً ثم اكتب «story faite».`
      : `🚀 Campagne ${SELLER_BRAND.boutique} lancée.\n${items.length} tâches en file.\n${due.length} à faire maintenant.\n\n${nextActionsSummary('fr')}\n\nPublie la story à la main puis écris « story faite ».`,
  }
}

export function campaignStatus(lang: Language): CampaignAgentResult {
  const st = loadCampaignState()
  return {
    reply: isAr(lang)
      ? [
          `🏪 البوتيك: ${st.boutiqueName}`,
          `📍 ${st.city}`,
          `واتساب: ${st.whatsappPhone || 'غير مضبوط'}`,
          `رد آلي: ${st.autoReplyEnabled ? 'نعم' : 'لا'}`,
          '',
          nextActionsSummary('ar'),
        ].join('\n')
      : [
          `🏪 Boutique : ${st.boutiqueName}`,
          `📍 ${st.city}`,
          `WhatsApp : ${st.whatsappPhone || 'non défini'}`,
          `Réponses auto : ${st.autoReplyEnabled ? 'oui' : 'non'}`,
          '',
          nextActionsSummary('fr'),
        ].join('\n'),
  }
}

export function todaysStory(lang: Language): CampaignAgentResult {
  const story = storyForToday()
  const body = isAr(lang) ? story.ar : story.fr
  return {
    reply: isAr(lang)
      ? `📸 ستوري اليوم (${story.slot}):\n\n${body}\n\nانسخ → إنستغرام/فيسبوك ستوري → ثم «story faite».`
      : `📸 Story du moment (${story.slot}) :\n\n${body}\n\nCopie → Instagram/Facebook Story → puis « story faite ».`,
  }
}

export function todaysPost(lang: Language): CampaignAgentResult {
  const post = POSTS[0]
  const body = isAr(lang) ? post.bodyAr : post.bodyFr
  return {
    reply: isAr(lang)
      ? `📝 منشور:\n\n${body}\n\n${post.ctaFr}`
      : `📝 Post prêt :\n\n${body}\n\nCTA : ${post.ctaFr}`,
  }
}

export function markStoryDone(lang: Language): CampaignAgentResult {
  const due = pendingDue().filter((q) => q.kind === 'story')
  if (due[0]) markQueueItem(due[0].id, 'done')
  return {
    reply: isAr(lang)
      ? `✅ تم تعليم الستوري كمنشورة.\n${nextActionsSummary('ar')}`
      : `✅ Story marquée publiée.\n${nextActionsSummary('fr')}`,
  }
}

export function setSellerWhatsapp(
  phone: string,
  lang: Language,
): CampaignAgentResult {
  const digits = phone.replace(/\D/g, '')
  saveCampaignState({ whatsappPhone: digits })
  return {
    reply: isAr(lang)
      ? `تم حفظ واتساب البائع: ${digits}`
      : `WhatsApp vendeur enregistré : ${digits}`,
  }
}

export function pitchForShops(
  shops: number,
  city: string,
  lang: Language,
): CampaignAgentResult {
  const text = buildSalesPitch({
    shops,
    city,
    lang: isAr(lang) ? 'ar' : 'fr',
  })
  const st = loadCampaignState()
  return {
    reply: text,
    action: st.whatsappPhone
      ? { type: 'open_whatsapp', phone: st.whatsappPhone, message: text }
      : { type: 'none' },
  }
}

/** Routeur texte → actions campagne */
export function runCampaignCommand(
  _state: AppState,
  text: string,
  lang: Language,
): CampaignAgentResult | null {
  const t = text.trim().toLowerCase()
  if (!t) return null

  if (
    /(lance campagne|démarrer campagne|ابدأ حملة|شغّل حملة|start campaign)/i.test(
      t,
    )
  ) {
    return launchCampaignWeek(lang)
  }
  if (/(statut campagne|état campagne|حالة الحملة|campaign status)/i.test(t)) {
    return campaignStatus(lang)
  }
  if (/(story du jour|story aujourd|ستوري اليوم|story now)/i.test(t)) {
    return todaysStory(lang)
  }
  if (/(post du jour|publication|منشور اليوم)/i.test(t)) {
    return todaysPost(lang)
  }
  if (/(story faite|story ok|ستوري تم|story done)/i.test(t)) {
    return markStoryDone(lang)
  }
  if (/(active r[eé]ponses auto|فعّل الرد)/i.test(t)) {
    saveCampaignState({ autoReplyEnabled: true })
    return {
      reply: isAr(lang) ? '✅ الرد الآلي مفعّل.' : '✅ Réponses auto activées.',
    }
  }
  if (/(coupe r[eé]ponses auto|أوقف الرد)/i.test(t)) {
    saveCampaignState({ autoReplyEnabled: false })
    return {
      reply: isAr(lang) ? '⏹️ الرد الآلي متوقف.' : '⏹️ Réponses auto arrêtées.',
    }
  }

  const waSet = t.match(
    /(?:whatsapp vendeur|واتساب بائع|set wa)\s*[:=]?\s*(\+?\d[\d\s-]{7,})/i,
  )
  if (waSet) return setSellerWhatsapp(waSet[1], lang)

  const shops = t.match(
    /(?:devis|عرض|pitch)\s*(\d{1,2})\s*(?:magasin|محل|shop)?/i,
  )
  if (shops) {
    return pitchForShops(Number(shops[1]), loadCampaignState().city, lang)
  }

  if (
    /(r[eé]ponds?|جواب|auto reply|r[eé]ponse (au )?client)/i.test(t) ||
    t.includes('→') ||
    t.startsWith('msg:')
  ) {
    const payload = text
      .replace(/^(réponds?|جواب|auto reply|réponse client|msg:)\s*/i, '')
      .replace(/^→\s*/, '')
      .trim()
    if (payload.length > 2) return autoReplyToLead(payload, lang)
  }

  if (/(strat[eé]gie|خطة تسويق|marketing plan)/i.test(t)) {
    return {
      reply: isAr(lang)
        ? [
            `🏪 البوتيك: ${SELLER_BRAND.boutique}`,
            `المنتج: ${SELLER_BRAND.produit} / ${SELLER_BRAND.produitPro}`,
            '1) يومياً: ستوري جاهزة (اكتب story du jour)',
            '2) واتساب: رد آلي على السعر/تجربة/Pro',
            '3) مجموعات: رسالة واحدة / يوم كحد أقصى',
            '4) هدف الأسبوع: 10 تجار يجربون الديمو',
            `صفحة الحملة: ${SELLER_BRAND.campagneUrl}`,
          ].join('\n')
        : [
            `🏪 Boutique : ${SELLER_BRAND.boutique}`,
            `Produit : ${SELLER_BRAND.produit} / ${SELLER_BRAND.produitPro}`,
            '1) Chaque jour : story prête (« story du jour »)',
            '2) WhatsApp : réponses auto prix / démo / Pro',
            '3) Groupes : 1 message / jour max',
            '4) Objectif semaine : 10 commerçants testent la démo',
            `Page campagne : ${SELLER_BRAND.campagneUrl}`,
          ].join('\n'),
    }
  }

  return null
}

export { SELLER_BRAND, AUTO_REPLIES }
