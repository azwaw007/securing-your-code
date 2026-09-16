import type { AppState, Client, Language, Screen } from '../types'
import {
  addClient,
  addIncomingOrder,
  addZakatRecord,
  annualNetProfitDa,
  lowStockProducts,
  openCreditsDa,
  pendingIncoming,
  stockValueDa,
  todayOrders,
} from '../store'
import { formatDa, formatQty } from '../utils/format'
import { unitLabel } from '../i18n'
import { buildArrivalsMessage, openWhatsappText } from '../utils/whatsapp'
import { openInvoiceWhatsapp } from '../utils/invoice'
import { normalizeDarjaHints } from '../utils/voice'
import {
  applyLearnedAliases,
  learnAlias,
  learnIntent,
  matchLearnedIntent,
  memoryStats,
  type AgentIntentId,
} from './memory'
import { expertAdvice } from './expertise'
import { executeTool } from './tools'

import { runAgentic } from './orchestrator'
import { answerAnything } from './chat'
import { runCampaignCommand, runMetaPublishCommand } from './campaignManager'

export type AgentAction =
  | { type: 'none' }
  | { type: 'navigate'; screen: Screen }
  | { type: 'open_whatsapp'; phone: string; message: string }
  | { type: 'send_invoice_last' }
  | { type: 'broadcast_arrivages'; message: string }
  | {
      type: 'broadcast_prospects'
      items: Array<{ phone: string; message: string; id: string }>
    }

export interface AgentResult {
  reply: string
  nextState?: AppState
  action?: AgentAction
  /** Intention reconnue (pour auto-apprentissage) */
  intent?: AgentIntentId
  /** Phrase à enseigner si pas compris */
  needsTeach?: boolean
  pendingPhrase?: string
  learned?: boolean
  /** Trace agentic (outils exécutés) */
  agentic?: boolean
  agenticThought?: string
}

function norm(s: string): string {
  return applyLearnedAliases(
    normalizeDarjaHints(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s+]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(norm(w)) || text.includes(w.toLowerCase()))
}

function findClient(state: AppState, text: string): Client | undefined {
  const n = norm(text)
  return state.clients.find(
    (c) => n.includes(norm(c.name)) || (c.phone && n.includes(c.phone.replace(/\s/g, ''))),
  )
}

function findProducts(state: AppState, text: string) {
  const n = norm(text)
  return state.products.filter(
    (p) =>
      n.includes(norm(p.name)) ||
      norm(p.name)
        .split(' ')
        .some((w) => w.length > 3 && n.includes(w)),
  )
}

function help(lang: Language): string {
  const stats = memoryStats()
  if (lang === 'ar') {
    return [
      'أنا وكيل AZ POS (agentic + خبير + تعلّم) — نص فقط.',
      '• مخزون ناقص / قيمة المخزون / الديون / ملخص اليوم',
      '• نظّم التطبيق / ثيم الليل / خط كبير / وضع سهل',
      '• خبير مبيعات · خبير محاسبة · خبير تسويق · خبير تسيير',
      '• حملة: ابدأ حملة · ستوري اليوم · منشور اليوم · حالة الحملة',
      '• رد آلي: «رد → رسالة الزبون» · devis 3 magasin',
      '• افتح زبائن / بيع / أرباح / صندوق / إعدادات',
      '• أضف زبون / احسب الزكاة / مصاريف',
      '• تعلّم: «apprend X = stock bas» أو اختر بعد سوء الفهم',
      `📚 تعلّمت: ${stats.intents} عبارة، ${stats.aliases} مرادف`,
    ].join('\n')
  }
  return [
    'Je suis l’agent AZ POS (agentic + expert + apprentissage) — texte seul.',
    '• stock bas / valeur stock / crédits / résumé du jour',
    '• organise l’app / thème nuit / gros texte / mode facile',
    '• conseil vente · conseil compta · marketing · gestion',
    '• campagne : lance campagne · story du jour · ajoute prospect Nom,0555…,Ville',
    '• prospects : colle prospects · relance prospects 5 · prospects statut',
    '• meta setup (plus tard, si tu as un compte Facebook Business)',
    '• réponses : « réponds → message client » · devis 3 magasin',
    '• ouvre clients / ventes / gains / caisse / paramètres',
    '• ajoute client / calcule zakat / dépenses',
    '• enseigne : « apprend khlass = stock bas »',
    `📚 Mémoire : ${stats.intents} phrases, ${stats.aliases} synonymes`,
  ].join('\n')
}

function extractPhone(text: string): string | null {
  const m = text.match(/(?:\+?213|0)\s*\d(?:[\s-]?\d){8,}/)
  return m ? m[0].replace(/[\s-]/g, '') : null
}

function withLearn(
  phrase: string,
  intent: AgentIntentId,
  result: AgentResult,
  reinforce = true,
): AgentResult {
  if (reinforce) learnIntent(phrase, intent)
  return { ...result, intent }
}

/** Exécute une intention connue (après enseignement ou règle). */
export function runIntent(
  state: AppState,
  intent: AgentIntentId,
  raw = '',
): AgentResult {
  const lang = state.settings.language
  const text = norm(raw)

  switch (intent) {
    case 'help':
      return { reply: help(lang), intent }

    case 'nav_order':
      return {
        reply:
          lang === 'ar'
            ? 'حسناً، أفتح الطلب. يمكنك البيع السريع بدون زبون.'
            : 'OK, j’ouvre les commandes. Tu peux faire une vente rapide sans client.',
        action: { type: 'navigate', screen: 'order' },
        intent,
      }
    case 'nav_clients':
      return {
        reply: lang === 'ar' ? 'أفتح الزبائن.' : 'OK, j’ouvre les clients.',
        action: { type: 'navigate', screen: 'clients' },
        intent,
      }
    case 'nav_products':
      return {
        reply: lang === 'ar' ? 'أفتح المخزون.' : 'OK, j’ouvre le stock.',
        action: { type: 'navigate', screen: 'products' },
        intent,
      }
    case 'nav_arrivages': {
      if (includesAny(text, ['prepare', 'message', 'envoie', 'envoyer', 'حضر', 'ارسل', 'رسالة'])) {
        const names = state.products.slice(0, 5).map((p) => p.name)
        const message = buildArrivalsMessage(state.settings, names, '')
        return {
          reply:
            (lang === 'ar'
              ? 'رسالة الوصول جاهزة. أفتح الإرسال.\n\n'
              : 'Message arrivages prêt. J’ouvre l’envoi.\n\n') + message,
          action: { type: 'navigate', screen: 'arrivages' },
          intent,
        }
      }
      return {
        reply: lang === 'ar' ? 'أفتح الوصول الجديد.' : 'OK, j’ouvre les arrivages.',
        action: { type: 'navigate', screen: 'arrivages' },
        intent,
      }
    }
    case 'nav_inbox':
    case 'inbox_pending': {
      const n = pendingIncoming(state).length
      return {
        reply:
          lang === 'ar'
            ? `أفتح الوارد. هناك ${n} قيد الانتظار.`
            : `J’ouvre l’inbox. ${n} en attente.`,
        action: { type: 'navigate', screen: 'inbox' },
        intent,
      }
    }
    case 'nav_settings':
      return {
        reply: lang === 'ar' ? 'أفتح الإعدادات.' : 'OK, j’ouvre les réglages.',
        action: { type: 'navigate', screen: 'settings' },
        intent,
      }
    case 'nav_expenses':
    case 'depenses':
      return {
        reply: lang === 'ar' ? 'أفتح المصاريف.' : 'OK, j’ouvre les dépenses.',
        action: { type: 'navigate', screen: 'expenses' },
        intent,
      }
    case 'nav_calculator':
      return {
        reply: lang === 'ar' ? 'أفتح الآلة الحاسبة.' : 'OK, j’ouvre la calculatrice.',
        action: { type: 'navigate', screen: 'calculator' },
        intent,
      }
    case 'nav_zakat':
      return {
        reply: lang === 'ar' ? 'أفتح الزكاة.' : 'OK, j’ouvre la zakat.',
        action: { type: 'navigate', screen: 'zakat' },
        intent,
      }
    case 'nav_stock':
      return {
        reply: lang === 'ar' ? 'أفتح قيمة المخزون.' : 'OK, j’ouvre la valeur stock.',
        action: { type: 'navigate', screen: 'stock' },
        intent,
      }
    case 'nav_home':
      return {
        reply: lang === 'ar' ? 'أفتح الرئيسية.' : 'OK, retour à l’accueil.',
        action: { type: 'navigate', screen: 'home' },
        intent,
      }

    case 'stock_bas': {
      const low = lowStockProducts(state)
      if (low.length === 0) {
        return {
          reply:
            lang === 'ar'
              ? 'لا يوجد منتج في حالة نفاد حالياً.'
              : 'Aucun produit en rupture pour le moment.',
          intent,
        }
      }
      const lines = low
        .map((p) => `• ${p.name} : ${formatQty(p.stock)} ${unitLabel(lang, p.unit)}`)
        .join('\n')
      return {
        reply:
          (lang === 'ar'
            ? `⚠️ ${low.length} منتج ناقص:\n`
            : `⚠️ ${low.length} produit(s) en stock bas :\n`) + lines,
        action: { type: 'navigate', screen: 'home' },
        intent,
      }
    }

    case 'valeur_stock':
      return {
        reply:
          lang === 'ar'
            ? `قيمة المخزون: ${formatDa(stockValueDa(state))}`
            : `Valeur du stock : ${formatDa(stockValueDa(state))}`,
        action: { type: 'navigate', screen: 'stock' },
        intent,
      }

    case 'credits': {
      const total = openCreditsDa(state)
      const creditOrders = state.orders.filter((o) => o.payment === 'credit').slice(0, 8)
      const lines = creditOrders
        .map((o) => `• ${o.clientName} : ${formatDa(o.totalDa)}`)
        .join('\n')
      return {
        reply:
          (lang === 'ar'
            ? `الديون المفتوحة: ${formatDa(total)}\n`
            : `Crédits ouverts : ${formatDa(total)}\n`) +
          (lines || (lang === 'ar' ? 'لا تفاصيل.' : 'Aucun détail.')),
        intent,
      }
    }

    case 'commandes_jour': {
      const list = todayOrders(state)
      if (list.length === 0) {
        return {
          reply: lang === 'ar' ? 'لا طلبات اليوم.' : 'Aucune commande aujourd’hui.',
          intent,
        }
      }
      const lines = list
        .map((o) => `• ${o.clientName} — ${formatDa(o.totalDa)}`)
        .join('\n')
      return {
        reply:
          (lang === 'ar'
            ? `طلبات اليوم (${list.length}):\n`
            : `Commandes du jour (${list.length}) :\n`) + lines,
        intent,
      }
    }

    case 'zakat': {
      const stock = stockValueDa(state)
      const credits = openCreditsDa(state)
      const base = stock + credits
      const amount = Math.round(base * 0.025)
      const next = addZakatRecord(state, {
        yearLabel: new Date().getFullYear().toString(),
        calculatedAt: new Date().toISOString(),
        stockValueDa: stock,
        includeCredits: true,
        creditsValueDa: credits,
        baseDa: base,
        rate: 0.025,
        amountDa: amount,
      })
      return {
        reply:
          lang === 'ar'
            ? `الزكاة التقديرية (2.5%): ${formatDa(amount)}\nالأساس: ${formatDa(base)}. تم التسجيل.`
            : `Zakat estimée (2,5 %) : ${formatDa(amount)}\nBase : ${formatDa(base)}. Calcul enregistré.`,
        nextState: next,
        action: { type: 'navigate', screen: 'zakat' },
        intent,
      }
    }

    case 'benefice': {
      const annual = annualNetProfitDa(state)
      return {
        reply:
          lang === 'ar'
            ? `ربح ${annual.year}: مبيعات ${formatDa(annual.salesProfitDa)} − مصاريف ${formatDa(annual.expensesDa)} = صافي ${formatDa(annual.netDa)}`
            : `Bénéfice ${annual.year} : ventes ${formatDa(annual.salesProfitDa)} − dépenses ${formatDa(annual.expensesDa)} = net ${formatDa(annual.netDa)}`,
        action: { type: 'navigate', screen: 'expenses' },
        intent,
      }
    }

    case 'add_client': {
      const phone = extractPhone(raw)
      let name = raw
        .replace(/(ajoute|ajouter|nouveau)\s+client/gi, '')
        .replace(/(اضف|أضف|زبون جديد|زبون|zid|client)/gi, '')
        .replace(phone ?? '', '')
        .replace(/[,;]/g, ' ')
        .trim()
      name = name.replace(/\s+/g, ' ').trim() || 'Client'
      if (!phone) {
        return {
          reply:
            lang === 'ar'
              ? 'أكتب: أضف زبون الاسم 0555...'
              : 'Écris : ajoute client Nom 0555…',
          intent,
        }
      }
      const next = addClient(state, {
        name,
        phone,
        city: state.settings.city,
        address: '',
        notes: '',
      })
      const added = next.clients.length > state.clients.length
      return {
        reply: added
          ? lang === 'ar'
            ? `تمت إضافة الزبون ${name} (${phone}).`
            : `Client ajouté : ${name} (${phone}).`
          : lang === 'ar'
            ? 'هذا الرقم موجود مسبقاً.'
            : 'Ce numéro existe déjà.',
        nextState: added ? next : undefined,
        action: { type: 'navigate', screen: 'clients' },
        intent,
      }
    }

    case 'commande_recue': {
      const phone = extractPhone(raw) ?? ''
      const client = findClient(state, raw)
      const noteMatch = raw.split(/:|：|\n/).slice(1).join(':').trim()
      const note =
        noteMatch ||
        raw
          .replace(
            /commande reçue|commande recue|enregistre?r? commande|طلب وارد|سجّ?ل طلب/gi,
            '',
          )
          .trim()
      const clientName =
        client?.name ?? (lang === 'ar' ? 'زبون واتساب' : 'Client WhatsApp')
      const next = addIncomingOrder(state, {
        clientName,
        clientPhone: phone || client?.phone || '',
        note: note || raw,
      })
      return {
        reply:
          lang === 'ar'
            ? `تم تسجيل الطلب الوارد لـ ${clientName}.`
            : `Commande reçue enregistrée pour ${clientName}.`,
        nextState: next,
        action: { type: 'navigate', screen: 'inbox' },
        intent,
      }
    }

    case 'facture': {
      const last = state.orders[0]
      if (!last) {
        return {
          reply: lang === 'ar' ? 'لا توجد فاتورة بعد.' : 'Aucune commande/facture encore.',
          intent,
        }
      }
      return {
        reply:
          lang === 'ar'
            ? `سأرسل فاتورة ${last.invoiceNumber ?? ''} لـ ${last.clientName}.`
            : `J’envoie la facture N°${last.invoiceNumber ?? ''} à ${last.clientName}.`,
        action: { type: 'send_invoice_last' },
        intent,
      }
    }

    case 'expert_sales':
      return { reply: expertAdvice(state, 'sales', lang), intent }
    case 'expert_accounting':
      return { reply: expertAdvice(state, 'accounting', lang), intent }
    case 'expert_marketing':
      return { reply: expertAdvice(state, 'marketing', lang), intent }
    case 'expert_management':
      return { reply: expertAdvice(state, 'management', lang), intent }
    case 'expert_it':
      return { reply: expertAdvice(state, 'it', lang), intent }
    case 'expert_dev':
      return { reply: expertAdvice(state, 'dev', lang), intent }

    case 'organize_ui': {
      const res = executeTool(state, { name: 'organize_easy' }, lang)
      return {
        reply: res.message,
        nextState: res.nextState,
        intent,
      }
    }

    default:
      return { reply: help(lang), intent: 'help' }
  }
}

/** Enseigne une phrase : « apprend X = stock bas » / « يعني » */
function tryTeachCommand(state: AppState, raw: string, lang: Language): AgentResult | null {
  const m =
    raw.match(
      /^(?:apprend|apprendre|learn|يعني|يعني:|ya3ni|yaani)\s*[:\s]+(.+?)\s*(?:=|=>|→|يعني|=)\s*(.+)$/i,
    ) ||
    raw.match(/^(?:apprend|apprendre|learn)\s+(.+?)\s*=\s*(.+)$/i)

  if (!m) return null
  const phrase = m[1].trim()
  const target = m[2].trim()
  const targetNorm = norm(target)

  const mapTarget = (): AgentIntentId | null => {
    if (includesAny(targetNorm, ['stock bas', 'rupture', 'ناقص'])) return 'stock_bas'
    if (includesAny(targetNorm, ['valeur', 'stock value'])) return 'valeur_stock'
    if (includesAny(targetNorm, ['credit', 'dette', 'دين'])) return 'credits'
    if (includesAny(targetNorm, ['commande', 'order', 'طلب']) && !includesAny(targetNorm, ['recue', 'وارد']))
      return 'nav_order'
    if (includesAny(targetNorm, ['client', 'زبون'])) return 'nav_clients'
    if (includesAny(targetNorm, ['produit', 'مخزون'])) return 'nav_products'
    if (includesAny(targetNorm, ['depense', 'gasoil', 'personnel', 'مصاريف'])) return 'nav_expenses'
    if (includesAny(targetNorm, ['calculat', 'حاسبة'])) return 'nav_calculator'
    if (includesAny(targetNorm, ['zakat', 'زكاة'])) return 'zakat'
    if (includesAny(targetNorm, ['facture'])) return 'facture'
    if (includesAny(targetNorm, ['arrivage', 'وصول'])) return 'nav_arrivages'
    if (includesAny(targetNorm, ['inbox', 'وارد'])) return 'nav_inbox'
    if (includesAny(targetNorm, ['benefice', 'gain', 'ربح'])) return 'benefice'
    if (includesAny(targetNorm, ['aide', 'help'])) return 'help'
    if (includesAny(targetNorm, ['conseil vente', 'expert vente', 'مبيعات']))
      return 'expert_sales'
    if (includesAny(targetNorm, ['conseil compta', 'compta', 'محاسبة']))
      return 'expert_accounting'
    if (includesAny(targetNorm, ['marketing', 'تسويق'])) return 'expert_marketing'
    if (includesAny(targetNorm, ['gestion', 'تسيير'])) return 'expert_management'
    if (includesAny(targetNorm, ['informatique', 'معلومات'])) return 'expert_it'
    if (includesAny(targetNorm, ['developpeur', 'مطور'])) return 'expert_dev'
    if (includesAny(targetNorm, ['organise', 'organize', 'نظم', 'رتب'])) return 'organize_ui'
    return null
  }

  const intent = mapTarget()
  if (!intent) {
    learnAlias(phrase, target)
    return {
      reply:
        lang === 'ar'
          ? `حفظت المرادف: «${phrase}» = «${target}».`
          : `Synonyme appris : «${phrase}» = «${target}».`,
      learned: true,
    }
  }

  learnIntent(phrase, intent)
  learnAlias(phrase, target)
  const result = runIntent(state, intent, raw)
  return {
    ...result,
    learned: true,
    reply:
      (lang === 'ar'
        ? `✅ تعلّمت: «${phrase}» → ${intent}\n\n`
        : `✅ J’ai appris : «${phrase}» → ${intent}\n\n`) + result.reply,
  }
}

/**
 * Agent local + auto-apprentissage + boucle agentic (outils + permissions).
 */
export async function runAgent(state: AppState, userText: string): Promise<AgentResult> {
  const lang = state.settings.language
  const raw = userText.trim()
  if (!raw) {
    return { reply: lang === 'ar' ? 'اكتب طلبك...' : 'Écris ce que tu veux…' }
  }

  const taught = tryTeachCommand(state, raw, lang)
  if (taught) return taught

  // Campagne vente / stories / réponses auto (AZ Soft)
  const campaign = runCampaignCommand(state, raw, lang)
  if (campaign) {
    const action =
      campaign.action && campaign.action.type === 'open_whatsapp'
        ? {
            type: 'open_whatsapp' as const,
            phone: campaign.action.phone,
            message: campaign.action.message,
          }
        : campaign.action && campaign.action.type === 'broadcast_prospects'
          ? {
              type: 'broadcast_prospects' as const,
              items: campaign.action.items,
            }
        : campaign.action && campaign.action.type === 'navigate'
          ? { type: 'navigate' as const, screen: campaign.action.screen as Screen }
          : { type: 'none' as const }
    return { reply: campaign.reply, action }
  }

  const metaPub = await runMetaPublishCommand(raw, lang)
  if (metaPub) {
    return { reply: metaPub.reply, action: { type: 'none' } }
  }

  // Système agentic d’abord (organiser / configurer / multi-outils)
  const agentic = runAgentic(state, raw)
  if (agentic) {
    return {
      reply: agentic.reply,
      nextState: agentic.nextState,
      action: agentic.navigateTo
        ? { type: 'navigate', screen: agentic.navigateTo }
        : { type: 'none' },
      agentic: true,
      agenticThought: agentic.trace.thought,
    }
  }

  const text = norm(raw)

  // Mémoire apprise en priorité
  const learned = matchLearnedIntent(text) ?? matchLearnedIntent(raw)
  if (learned) {
    return withLearn(raw, learned, runIntent(state, learned, raw))
  }

  // Règles intégrées
  if (
    includesAny(text, [
      'aide az',
      'aide moi',
      'help me',
      'ayuda',
      'que peux tu',
      'what can you',
      'ماذا تقدر',
      'ساعدني',
      'اوامر',
      '3aweni',
    ]) ||
    /^(aide|help|ساعد)$/i.test(raw.trim())
  ) {
    return withLearn(raw, 'help', runIntent(state, 'help', raw))
  }
  if (
    includesAny(text, [
      'ouvre commande',
      'nouvelle commande',
      'va commande',
      'vente rapide',
      'ouvre vente',
      'va vendre',
      'open sell',
      'افتح طلب',
      'طلب جديد',
      'افتح بيع',
    ])
  ) {
    return withLearn(raw, 'nav_order', runIntent(state, 'nav_order', raw))
  }
  if (
    includesAny(text, [
      'ouvre client',
      'va client',
      'clients',
      'customers',
      'clientes',
      'افتح زبون',
      'الزبائن',
    ])
  ) {
    return withLearn(raw, 'nav_clients', runIntent(state, 'nav_clients', raw))
  }
  if (
    includesAny(text, [
      'ouvre stock',
      'ouvre produit',
      'va stock',
      'افتح مخزون',
      'افتح المنتجات',
    ])
  ) {
    return withLearn(raw, 'nav_products', runIntent(state, 'nav_products', raw))
  }
  if (includesAny(text, ['calculat', 'حاسبة', 'حاسبه'])) {
    return withLearn(raw, 'nav_calculator', runIntent(state, 'nav_calculator', raw))
  }
  if (includesAny(text, ['depense', 'gasoil', 'personnel', 'masarif', 'مصاريف', 'مازوط'])) {
    return withLearn(raw, 'nav_expenses', runIntent(state, 'nav_expenses', raw))
  }
  if (includesAny(text, ['benefice', 'gain', 'marge', 'ربح', 'rbe7', 'rbah', 'profits'])) {
    return withLearn(raw, 'benefice', runIntent(state, 'benefice', raw))
  }
  if (includesAny(text, ['arrivage', 'وصول', 'وافد'])) {
    return withLearn(raw, 'nav_arrivages', runIntent(state, 'nav_arrivages', raw))
  }
  if (includesAny(text, ['recue', 'inbox', 'وارد', 'اوامر واردة'])) {
    return withLearn(raw, 'nav_inbox', runIntent(state, 'nav_inbox', raw))
  }
  if (includesAny(text, ['reglage', 'parametre', 'اعداد', 'إعداد'])) {
    return withLearn(raw, 'nav_settings', runIntent(state, 'nav_settings', raw))
  }
  if (includesAny(text, ['ouvre caisse', 'va caisse', 'sandou9', 'افتح صندوق'])) {
    return {
      reply: lang === 'ar' ? 'أفتح الصندوق.' : 'OK, j’ouvre la caisse.',
      action: { type: 'navigate', screen: 'caisse' },
    }
  }
  if (
    includesAny(text, [
      'stock bas',
      'rupture',
      'alerte stock',
      'نفاد',
      'ناقص',
      'منخفض',
      'na9es',
      'naqes',
    ])
  ) {
    return withLearn(raw, 'stock_bas', runIntent(state, 'stock_bas', raw))
  }
  if (
    includesAny(text, ['valeur stock', 'valeur du stock', 'combien vaut', 'قيمة المخزون', 'قيمة مخزون'])
  ) {
    return withLearn(raw, 'valeur_stock', runIntent(state, 'valeur_stock', raw))
  }
  if (
    includesAny(text, [
      'credit',
      'credits',
      'qui doit',
      'impay',
      'دين',
      'ديون',
      'yekhlas',
      'diyoune',
      'chkoune',
    ])
  ) {
    return withLearn(raw, 'credits', runIntent(state, 'credits', raw))
  }
  if (includesAny(text, ['commande du jour', 'commandes du jour', 'طلبات اليوم'])) {
    return withLearn(raw, 'commandes_jour', runIntent(state, 'commandes_jour', raw))
  }
  if (includesAny(text, ['combien recu', 'commandes recues', 'en attente', 'كم وارد', 'بالانتظار'])) {
    return withLearn(raw, 'inbox_pending', runIntent(state, 'inbox_pending', raw))
  }
  if (includesAny(text, ['zakat', 'زكاة', 'زكاه'])) {
    return withLearn(raw, 'zakat', runIntent(state, 'zakat', raw))
  }
  if (
    includesAny(text, [
      'ajoute client',
      'ajouter client',
      'nouveau client',
      'اضف زبون',
      'أضف زبون',
      'زبون جديد',
    ])
  ) {
    return withLearn(raw, 'add_client', runIntent(state, 'add_client', raw))
  }
  if (
    includesAny(text, [
      'commande recue',
      'enregistre commande',
      'enregistrer commande',
      'طلب وارد',
      'سجل طلب',
      'سجّل طلب',
    ])
  ) {
    return withLearn(raw, 'commande_recue', runIntent(state, 'commande_recue', raw))
  }
  if (
    includesAny(text, [
      'envoie facture',
      'envoyer facture',
      'send invoice',
      'أرسل فاتورة',
      'ارسل فاتورة',
    ])
  ) {
    return withLearn(raw, 'facture', runIntent(state, 'facture', raw))
  }
  if (
    includesAny(text, [
      'conseil vente',
      'expert vente',
      'خبير مبيعات',
      'كيف ابيع',
      'بيع اكثر',
    ])
  ) {
    return withLearn(raw, 'expert_sales', runIntent(state, 'expert_sales', raw))
  }
  if (includesAny(text, ['conseil compta', 'expert compta', 'خبير محاسبة'])) {
    return withLearn(raw, 'expert_accounting', runIntent(state, 'expert_accounting', raw))
  }
  if (includesAny(text, ['conseil marketing', 'expert marketing', 'خبير تسويق'])) {
    return withLearn(raw, 'expert_marketing', runIntent(state, 'expert_marketing', raw))
  }
  if (includesAny(text, ['conseil gestion', 'expert gestion', 'خبير تسيير'])) {
    return withLearn(raw, 'expert_management', runIntent(state, 'expert_management', raw))
  }

  const products = findProducts(state, raw)
  if (
    products.length > 0 &&
    includesAny(text, ['combien', 'stock', 'prix', 'reste', 'كم', 'سعر', 'باقي'])
  ) {
    const lines = products
      .slice(0, 5)
      .map(
        (p) =>
          `• ${p.name} : ${formatQty(p.stock)} ${unitLabel(lang, p.unit)} — ${formatDa(p.priceDa)}`,
      )
      .join('\n')
    return { reply: lines }
  }

  const client = findClient(state, raw)
  if (client && includesAny(text, ['client', 'tel', 'whatsapp', 'telephone', 'رقم', 'زبون'])) {
    return {
      reply: [
        client.name,
        `WhatsApp : ${client.phone}`,
        client.city ? client.city : null,
        client.address ? client.address : null,
        typeof client.lat === 'number' && typeof client.lng === 'number'
          ? `GPS : ${client.lat}, ${client.lng}`
          : null,
        client.notes ? client.notes : null,
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }

  return {
    reply: await answerAnything(state, raw),
    intent: undefined,
  }
}

/** Enseigne une phrase échouée → intention, puis exécute */
export function teachAndRun(
  state: AppState,
  phrase: string,
  intent: AgentIntentId,
): AgentResult {
  learnIntent(phrase, intent)
  const result = runIntent(state, intent, phrase)
  const lang = state.settings.language
  return {
    ...result,
    learned: true,
    reply:
      (lang === 'ar'
        ? `✅ حفظت «${phrase}».\n\n`
        : `✅ J’ai mémorisé «${phrase}».\n\n`) + result.reply,
  }
}

export function applyAgentSideEffect(
  state: AppState,
  action: AgentAction | undefined,
): void {
  if (!action) return
  if (action.type === 'open_whatsapp') {
    openWhatsappText(action.phone, action.message)
  }
  if (action.type === 'send_invoice_last') {
    const last = state.orders[0]
    if (last) openInvoiceWhatsapp(last, state.settings)
  }
  if (action.type === 'broadcast_arrivages') {
    state.clients.forEach((c, i) => {
      window.setTimeout(() => openWhatsappText(c.phone, action.message), i * 600)
    })
  }
  if (action.type === 'broadcast_prospects') {
    action.items.forEach((item, i) => {
      window.setTimeout(() => {
        openWhatsappText(item.phone, item.message)
        try {
          const raw = localStorage.getItem('az-pos-prospects-v1')
          if (!raw) return
          const list = JSON.parse(raw) as Array<{
            id: string
            status: string
            lastContactAt?: string
          }>
          const next = list.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  status: 'contacted',
                  lastContactAt: new Date().toISOString(),
                }
              : p,
          )
          localStorage.setItem('az-pos-prospects-v1', JSON.stringify(next))
        } catch {
          /* ignore */
        }
      }, i * 900)
    })
  }
}
