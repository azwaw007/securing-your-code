/**
 * Agent campagne : planifie, répond, donne la story/post du moment.
 * Sans Meta API — ouvre WhatsApp + file locale de publication.
 */

import type { AppState, Language } from '../types'
import {
  buildPosts,
  buildSalesPitch,
  matchAutoReply,
  storyForToday,
  SELLER_BRAND,
  AUTO_REPLIES,
} from '../marketing/campaignPack'
import {
  brandFromCampaignState,
  loadCampaignState,
  markQueueItem,
  nextActionsSummary,
  pendingDue,
  saveCampaignState,
  seedWeekQueue,
} from '../marketing/scheduler'
import {
  addProspect,
  loadProspects,
  outreachMessage,
  parseProspectsCsv,
  parseProspectsPaste,
  prospectsStats,
  sampleCsv,
} from '../marketing/prospects'
import {
  loadMetaConfig,
  metaSetupHint,
  publishMetaPost,
  saveMetaConfig,
} from '../marketing/metaPublish'

export type CampaignAgentAction =
  | { type: 'open_whatsapp'; phone: string; message: string }
  | {
      type: 'broadcast_prospects'
      items: Array<{ phone: string; message: string; id: string }>
    }
  | { type: 'navigate'; screen: 'agent' | 'inbox' | 'settings' | 'clients' }
  | { type: 'none' }

export interface CampaignAgentResult {
  reply: string
  action?: CampaignAgentAction
}

function isAr(lang: Language): boolean {
  return lang === 'ar'
}

/** Aligne boutique / ville avec le magasin app si champs marque vides */
export function syncBrandFromApp(state: AppState): void {
  const camp = loadCampaignState()
  const patch: Partial<typeof camp> = {}
  if (!camp.boutiqueName.trim() && state.settings.shopName?.trim()) {
    patch.boutiqueName = state.settings.shopName.trim()
  }
  if (!camp.city.trim() && state.settings.city?.trim()) {
    patch.city = state.settings.city.trim()
  }
  if (!camp.whatsappPhone.trim() && state.settings.phone?.trim()) {
    patch.whatsappPhone = state.settings.phone.replace(/\D/g, '')
  }
  if (Object.keys(patch).length) saveCampaignState(patch)
}

/** Répond à un message prospect (collé ou inbox) */
export function autoReplyToLead(
  message: string,
  lang: Language,
): CampaignAgentResult {
  const state = loadCampaignState()
  const brand = brandFromCampaignState(state)
  if (!state.autoReplyEnabled) {
    return {
      reply: isAr(lang)
        ? 'الرد الآلي متوقف. فعّله: «active réponses auto».'
        : 'Réponses auto désactivées. Écris : « active réponses auto ».',
    }
  }
  const hit = matchAutoReply(message, isAr(lang) ? 'ar' : 'fr', brand)
  if (!hit) {
    return {
      reply: isAr(lang)
        ? `لم أجد قاعدة. رد عام:\n\nالسلام، شكرا على رسالتك بخصوص ${brand.produit}. أي عرض تريد؟ نرسل التفاصيل.\nتجربة: ${brand.demoUrl}`
        : `Pas de règle exacte. Brouillon générique :\n\nSalam, merci pour ton message sur ${brand.produit}. Quelle offre t’intéresse ? Je t’envoie les détails.\nDémo : ${brand.demoUrl}`,
      action: state.whatsappPhone
        ? {
            type: 'open_whatsapp',
            phone: state.whatsappPhone,
            message: isAr(lang)
              ? `السلام، بخصوص ${brand.produit} — أي عرض يناسبك؟`
              : `Salam, pour ${brand.produit} — quelle offre te convient ?`,
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
  const brand = brandFromCampaignState()
  const items = seedWeekQueue(isAr(lang) ? 'ar' : 'fr')
  const due = pendingDue()
  return {
    reply: isAr(lang)
      ? `🚀 حملة ${brand.boutique} (${brand.produit}) انطلقت.\n${items.length} مهمة في الطابور.\n${due.length} جاهزة الآن.\n\n${nextActionsSummary('ar')}\n\nانشر الستوري يدوياً ثم اكتب «story faite».`
      : `🚀 Campagne ${brand.boutique} (${brand.produit}) lancée.\n${items.length} tâches en file.\n${due.length} à faire maintenant.\n\n${nextActionsSummary('fr')}\n\nPublie la story à la main puis écris « story faite ».`,
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
  const brand = brandFromCampaignState()
  const story = storyForToday(undefined, 'matin', brand)
  const body = isAr(lang) ? story.ar : story.fr
  return {
    reply: isAr(lang)
      ? `📸 ستوري اليوم (${story.slot}):\n\n${body}\n\nانسخ → إنستغرام/فيسبوك ستوري → ثم «story faite».`
      : `📸 Story du moment (${story.slot}) :\n\n${body}\n\nCopie → Instagram/Facebook Story → puis « story faite ».`,
  }
}

export function todaysPost(lang: Language): CampaignAgentResult {
  const brand = brandFromCampaignState()
  const post = buildPosts(brand)[0]
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
  const brand = brandFromCampaignState()
  const text = buildSalesPitch({
    shops,
    city,
    lang: isAr(lang) ? 'ar' : 'fr',
    brand,
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
  state: AppState,
  text: string,
  lang: Language,
): CampaignAgentResult | null {
  syncBrandFromApp(state)
  const t = text.trim().toLowerCase()
  if (!t) return null

  // Marque produit : « marque MonApp » / « brand MonApp »
  const brandSet = text.match(
    /(?:marque|brand|منتج|اسم المنتج)\s*[:=]?\s+(.+)/i,
  )
  if (brandSet && !/(strategie|stratégie|خطة)/i.test(t)) {
    const name = brandSet[1].trim().slice(0, 80)
    if (name.length >= 2) {
      saveCampaignState({
        productName: name,
        productProName: `${name} Pro`,
      })
      return {
        reply: isAr(lang)
          ? `✅ اسم العلامة: ${name} (و ${name} Pro)`
          : `✅ Marque enregistrée : ${name} (et ${name} Pro)`,
      }
    }
  }
  const boutiqueSet = text.match(
    /(?:boutique|متجر)\s*[:=]?\s+(.+)/i,
  )
  if (boutiqueSet && boutiqueSet[1].trim().length >= 2) {
    saveCampaignState({ boutiqueName: boutiqueSet[1].trim().slice(0, 80) })
    return {
      reply: isAr(lang)
        ? `✅ اسم البوتيك: ${boutiqueSet[1].trim()}`
        : `✅ Boutique : ${boutiqueSet[1].trim()}`,
    }
  }
  const demoSet = text.match(/(?:demo|démo|lien)\s*[:=]?\s+(https?:\/\/\S+)/i)
  if (demoSet) {
    saveCampaignState({ demoUrl: demoSet[1].trim() })
    return { reply: `Démo URL : ${demoSet[1].trim()}` }
  }

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

  // ajoute prospect Nom,0555...,Ville
  const addPr = text.match(
    /(?:ajoute prospect|add prospect|زيد prospect)\s+(.+)/i,
  )
  if (addPr) {
    const parts = addPr[1].split(/[,;]/).map((x) => x.trim()).filter(Boolean)
    const res = addProspect({
      name: parts[0] || '',
      phone: parts[1] || '',
      city: parts[2] || '',
      email: parts[3] || '',
    })
    if (!res.ok) {
      return {
        reply: isAr(lang)
          ? `تعذّر الإضافة (${res.reason}). مثال: زيد prospect محل أمال,0555123456,الجزائر`
          : `Ajout impossible (${res.reason}). Ex. : ajoute prospect Epicerie Amel,0555123456,Alger`,
      }
    }
    const st = prospectsStats()
    return {
      reply: isAr(lang)
        ? `✅ تمت إضافة ${res.prospect?.name}. المجموع: ${st.total} prospects.`
        : `✅ ${res.prospect?.name} ajouté. Total : ${st.total} prospects.`,
    }
  }

  // colle prospects (plusieurs lignes)
  if (/(colle prospects?|paste prospects?|الصق prospects?)/i.test(t)) {
    const payload = text
      .replace(/^(colle prospects?|paste prospects?|الصق prospects?)\s*/i, '')
      .trim()
    if (payload.length < 5) {
      return {
        reply: isAr(lang)
          ? 'الصق بعد الأمر، سطر لكل محل:\nمحل أمال,0555123456,الجزائر'
          : 'Colle après la commande, 1 ligne = 1 magasin :\nEpicerie Amel,0555123456,Alger',
      }
    }
    const res = parseProspectsPaste(payload)
    return {
      reply: isAr(lang)
        ? `✅ استيراد: +${res.added} · تجاهل ${res.skipped}. اكتب «relance prospects 5».`
        : `✅ Import : +${res.added} · ignorés ${res.skipped}. Écris « relance prospects 5 ».`,
    }
  }

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
    const brand = brandFromCampaignState()
    return {
      reply: isAr(lang)
        ? [
            `🏪 البوتيك: ${brand.boutique}`,
            `المنتج: ${brand.produit} / ${brand.produitPro}`,
            'غيّر الاسم: «marque MonProduit» أو من AZ Digital',
            '1) بلا CSV: «زيد prospect اسم,0555…,ولاية» أو «الصق prospects»',
            '2) يومياً: ستوري (story du jour)',
            '3) «relance prospects 5» — واتساب (≈20/يوم كحد)',
            '4) رد آلي: «رد → رسالة»',
            '5) اربط الشبكات في AZ Digital → منشور / إعلان',
          ].join('\n')
        : [
            `🏪 Boutique : ${brand.boutique}`,
            `Produit : ${brand.produit} / ${brand.produitPro}`,
            'Change le nom : « marque MonProduit » ou dans AZ Digital',
            '1) Sans CSV : « ajoute prospect Nom,0555…,Ville » ou « colle prospects »',
            '2) Chaque jour : story (« story du jour »)',
            '3) « relance prospects 5 » — WhatsApp (max ~20/jour)',
            '4) Réponses : « réponds → message »',
            '5) Connecte tes réseaux dans AZ Digital → publier / pubs',
          ].join('\n'),
    }
  }

  if (/(prospects|audience|mes leads|قائمة|المستوردين)/i.test(t) &&
      /(combien|statut|liste|شحال|عدد|stats)/i.test(t)) {
    const st = prospectsStats()
    return {
      reply: isAr(lang)
        ? `👥 Prospects: ${st.total} · جدد ${st.neu} · تم التواصل ${st.contacted} · بإيميل ${st.withEmail}`
        : `👥 Prospects : ${st.total} · nouveaux ${st.neu} · contactés ${st.contacted} · avec e-mail ${st.withEmail}`,
    }
  }

  if (/(modele csv|modèle csv|sample csv|نموذج csv)/i.test(t)) {
    return {
      reply:
        (isAr(lang) ? '📄 نموذج CSV:\n\n' : '📄 Modèle CSV :\n\n') + sampleCsv(),
      action: { type: 'navigate', screen: 'clients' },
    }
  }

  const relance = t.match(
    /(?:relance prospects?|lance prospects?|whatsapp prospects?|راسل prospects?|راسل الجمهور)\s*(\d{1,3})?/i,
  )
  if (relance) {
    const limit = Math.min(30, Math.max(1, Number(relance[1] || 10)))
    const list = loadProspects()
      .filter((p) => p.status === 'new' && p.phone)
      .slice(0, limit)
    if (list.length === 0) {
      return {
        reply: isAr(lang)
          ? 'لا يوجد prospects جدد. استورد CSV أولاً (صفحة الحملة أو Clients).'
          : 'Aucun prospect nouveau. Importe d’abord un CSV (page campagne ou Clients).',
        action: { type: 'navigate', screen: 'clients' },
      }
    }
    const items = list.map((p) => ({
      id: p.id,
      phone: p.phone,
      message: outreachMessage(p, isAr(lang) ? 'ar' : 'fr'),
    }))
    return {
      reply: isAr(lang)
        ? `📤 سأفتح واتساب لـ ${items.length} prospect (تأخير بين الرسائل).\nلا ترسل لأكثر من ~20/يوم.\nاكتب «prospects statut» للمتابعة.`
        : `📤 J’ouvre WhatsApp pour ${items.length} prospects (délai entre chaque).\nMax conseillé ~20 / jour.\nÉcris « prospects statut » pour suivre.`,
      action: { type: 'broadcast_prospects', items },
    }
  }

  if (/(meta setup|setup meta|اعداد meta|إعداد meta)/i.test(t)) {
    return { reply: metaSetupHint(isAr(lang) ? 'ar' : 'fr') }
  }
  if (/^meta on$/i.test(t.trim()) || /(active meta|فعّل meta)/i.test(t)) {
    saveMetaConfig({ enabled: true })
    return {
      reply: isAr(lang) ? '✅ Meta مفعّل.' : '✅ Meta activé.',
    }
  }
  if (/^meta off$/i.test(t.trim()) || /(coupe meta|أوقف meta)/i.test(t)) {
    saveMetaConfig({ enabled: false })
    return {
      reply: isAr(lang) ? '⏹️ Meta متوقف.' : '⏹️ Meta arrêté.',
    }
  }
  const metaPage = text.match(/meta page\s+(\S+)/i)
  if (metaPage) {
    saveMetaConfig({ pageId: metaPage[1].trim() })
    return { reply: `Page ID : ${metaPage[1].trim()}` }
  }
  const metaIg = text.match(/meta ig\s+(\S+)/i)
  if (metaIg) {
    saveMetaConfig({ igUserId: metaIg[1].trim() })
    return { reply: `IG User ID : ${metaIg[1].trim()}` }
  }
  const metaToken = text.match(/meta token\s+(\S+)/i)
  if (metaToken) {
    saveMetaConfig({ accessToken: metaToken[1].trim(), enabled: true })
    return {
      reply: isAr(lang)
        ? '✅ تم حفظ التوكن (محلياً على الجهاز).'
        : '✅ Token enregistré (localement sur cet appareil).',
    }
  }
  const metaImg = text.match(/meta image\s+(https?:\/\/\S+)/i)
  if (metaImg) {
    saveMetaConfig({ defaultImageUrl: metaImg[1].trim() })
    return { reply: `Image IG : ${metaImg[1].trim()}` }
  }
  if (/(meta statut|statut meta|حالة meta)/i.test(t)) {
    const m = loadMetaConfig()
    return {
      reply: [
        `Meta : ${m.enabled ? 'ON' : 'OFF'}`,
        `Page : ${m.pageId || '—'}`,
        `IG : ${m.igUserId || '—'}`,
        `Token : ${m.accessToken ? '••••' + m.accessToken.slice(-4) : '—'}`,
        `Image : ${m.defaultImageUrl || '—'}`,
      ].join('\n'),
    }
  }

  return null
}

/** Commandes async Meta (publication) — appelées depuis AgentPage si besoin */
export async function runMetaPublishCommand(
  text: string,
  lang: Language,
): Promise<CampaignAgentResult | null> {
  const t = text.trim().toLowerCase()
  const isIg = /(publie instagram|publish instagram|انشر انستا)/i.test(t)
  const isFb = /(publie facebook|publish facebook|انشر فيسبوك|publie meta)/i.test(t)
  if (!isIg && !isFb) return null

  const brand = brandFromCampaignState()
  const post = buildPosts(brand)[0]
  const message = isAr(lang) ? post.bodyAr : post.bodyFr
  const channel = isIg ? 'instagram' : 'facebook'
  const res = await publishMetaPost({ channel, message })
  if (!res.ok) {
    return {
      reply:
        (isAr(lang) ? '❌ فشل النشر: ' : '❌ Publication échouée : ') +
        (res.error || '') +
        '\n\n' +
        metaSetupHint(isAr(lang) ? 'ar' : 'fr'),
    }
  }
  return {
    reply: isAr(lang)
      ? `✅ تم النشر على ${channel}${res.id ? ` (${res.id})` : ''}.${res.note ? '\n' + res.note : ''}`
      : `✅ Publié sur ${channel}${res.id ? ` (${res.id})` : ''}.${res.note ? '\n' + res.note : ''}`,
  }
}

export { SELLER_BRAND, AUTO_REPLIES, parseProspectsCsv, loadProspects, prospectsStats }
