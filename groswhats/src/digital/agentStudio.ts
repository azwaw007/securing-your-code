/**
 * Studio d’agents IA locaux — playbooks nommés que l’utilisateur crée
 * et exécute en un clic. Pas d’AGI autonome : enchaîne des étapes guidées
 * (recherche, marketing, vente digitale) stockées en localStorage.
 */
import type { Language } from '../types'
import { WINNING_IDEAS, ADS_CHANNELS } from './playbooks'
import { DIGITAL_CATALOG, productName } from './catalog'
import { SELLER_BRAND } from '../marketing/campaignPack'

export type MicroAgentStep = {
  id: string
  titleFr: string
  titleAr: string
  detailFr: string
  detailAr: string
}

export type MicroAgent = {
  id: string
  name: string
  goal: string
  kind: 'research' | 'marketing' | 'dev' | 'sales' | 'custom'
  steps: MicroAgentStep[]
  createdAt: string
  /** Commande campagne optionnelle à enchaîner */
  campaignCommand?: string
}

const AGENTS_KEY = 'az-digital-agents-v1'

export function loadMicroAgents(): MicroAgent[] {
  try {
    const raw = localStorage.getItem(AGENTS_KEY)
    if (!raw) return defaultAgents()
    const list = JSON.parse(raw) as MicroAgent[]
    return Array.isArray(list) && list.length ? list : defaultAgents()
  } catch {
    return defaultAgents()
  }
}

export function saveMicroAgents(list: MicroAgent[]): void {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(list.slice(0, 40)))
}

export function defaultAgents(): MicroAgent[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'ag_research',
      name: 'Chercheur produits gagnants',
      goal: 'Trouver niches digitales / physiques + stratégie',
      kind: 'research',
      createdAt: now,
      steps: WINNING_IDEAS.slice(0, 3).map((w, i) => ({
        id: `r${i}`,
        titleFr: w.nicheFr,
        titleAr: w.nicheAr,
        detailFr: `${w.whyFr}\n→ ${w.strategyFr.join(' · ')}`,
        detailAr: `${w.whyAr}\n→ ${w.strategyAr.join(' · ')}`,
      })),
    },
    {
      id: 'ag_ads',
      name: 'Stratège pubs multi-canal',
      goal: 'Check-lists Meta, Google, TikTok, AdSense, organique',
      kind: 'marketing',
      createdAt: now,
      campaignCommand: 'strategie',
      steps: ADS_CHANNELS.map((c, i) => ({
        id: `a${i}`,
        titleFr: c.titleFr,
        titleAr: c.titleAr,
        detailFr: `${c.summaryFr}\n1. ${c.stepsFr[0]}\n💡 ${c.freeTipFr}`,
        detailAr: `${c.summaryAr}\n1. ${c.stepsAr[0]}\n💡 ${c.freeTipAr}`,
      })),
    },
    {
      id: 'ag_sales',
      name: 'Closer ventes digitales',
      goal: 'Pitchs WhatsApp + upsell offre Pro',
      kind: 'sales',
      createdAt: now,
      campaignCommand: 'devis 3 magasins',
      steps: DIGITAL_CATALOG.filter((p) => p.firstParty && p.kind === 'license').map(
        (p, i) => ({
          id: `s${i}`,
          titleFr: p.nameFr,
          titleAr: p.nameAr,
          detailFr: `${p.descFr} — ${p.priceDa} DA/an\nDémo ${SELLER_BRAND.demoUrl}`,
          detailAr: `${p.descAr} — ${p.priceDa} دج/سنة\nتجربة ${SELLER_BRAND.demoUrl}`,
        }),
      ),
    },
    {
      id: 'ag_dev',
      name: 'Assistant R&D local',
      goal: 'Planifier landing, marketplace légère, automatisations',
      kind: 'dev',
      createdAt: now,
      steps: [
        {
          id: 'd1',
          titleFr: 'Landing 1 page',
          titleAr: 'صفحة هبوط',
          detailFr:
            'Hero marque + prix + CTA WhatsApp + démo. Héberger sur Vercel ou ton domaine.',
          detailAr:
            'عنوان + سعر + واتساب + تجربة. استضافة Vercel أو نطاقك.',
        },
        {
          id: 'd2',
          titleFr: 'Mini marketplace',
          titleAr: 'سوق مصغّر',
          detailFr:
            'Catalogue digital (ce cockpit) → pitch WhatsApp → licence. Paiement : CCP / BaridiMob / cash magasin.',
          detailAr:
            'كتالوج رقمي → واتساب → ترخيص. دفع: CCP / بريدي موب / نقداً.',
        },
        {
          id: 'd3',
          titleFr: 'Créer un sous-agent',
          titleAr: 'إنشاء وكيل فرعي',
          detailFr:
            'Utilise « Nouveau agent » ci-dessous : nom + objectif → étapes générées. Chaîne marketing → vente → suivi.',
          detailAr:
            '« وكيل جديد »: اسم + هدف → خطوات. سلسلة تسويق → بيع → متابعة.',
        },
      ],
    },
  ]
}

export function createMicroAgent(input: {
  name: string
  goal: string
  kind?: MicroAgent['kind']
}): MicroAgent {
  const goal = input.goal.trim()
  const name = input.name.trim() || 'Agent'
  const kind = input.kind || detectKind(goal)
  const steps = generateSteps(goal, kind)
  const agent: MicroAgent = {
    id: `ag_${Date.now().toString(36)}`,
    name,
    goal,
    kind,
    steps,
    createdAt: new Date().toISOString(),
    campaignCommand:
      kind === 'marketing'
        ? 'lance campagne'
        : kind === 'sales'
          ? 'story du jour'
          : undefined,
  }
  const merged = [agent, ...loadMicroAgents().filter((a) => a.id !== agent.id)].slice(
    0,
    40,
  )
  saveMicroAgents(merged)
  return agent
}

function detectKind(goal: string): MicroAgent['kind'] {
  const g = goal.toLowerCase()
  if (/(pub|ads|meta|tiktok|google|campagne|تسويق|إعلان)/i.test(g)) return 'marketing'
  if (/(vend|licence|pos|abo|بيع|ترخيص)/i.test(g)) return 'sales'
  if (/(site|app|code|dev|logiciel|موقع|تطبيق)/i.test(g)) return 'dev'
  if (/(produit|niche|gagnant|recherch|منتج|رابح)/i.test(g)) return 'research'
  return 'custom'
}

function generateSteps(goal: string, kind: MicroAgent['kind']): MicroAgentStep[] {
  if (kind === 'research') {
    return WINNING_IDEAS.slice(0, 4).map((w, i) => ({
      id: `g${i}`,
      titleFr: w.nicheFr,
      titleAr: w.nicheAr,
      detailFr: `Objectif : ${goal}\nScore ${w.score}/100 — ${w.whyFr}`,
      detailAr: `الهدف: ${goal}\nنقاط ${w.score}/100 — ${w.whyAr}`,
    }))
  }
  if (kind === 'marketing') {
    return ADS_CHANNELS.slice(0, 4).map((c, i) => ({
      id: `g${i}`,
      titleFr: c.titleFr,
      titleAr: c.titleAr,
      detailFr: `Pour « ${goal} » : ${c.stepsFr.slice(0, 3).join(' → ')}`,
      detailAr: `لـ « ${goal} »: ${c.stepsAr.slice(0, 3).join(' → ')}`,
    }))
  }
  if (kind === 'sales') {
    return DIGITAL_CATALOG.filter((p) => p.firstParty).slice(0, 4).map((p, i) => ({
      id: `g${i}`,
      titleFr: p.nameFr,
      titleAr: p.nameAr,
      detailFr: `Pitch : ${p.descFr} (${p.priceDa} DA)`,
      detailAr: `عرض: ${p.descAr} (${p.priceDa} دج)`,
    }))
  }
  return [
    {
      id: 'g0',
      titleFr: 'Clarifier le livrable',
      titleAr: 'حدد المخرجات',
      detailFr: `Objectif : ${goal}. Découpe en 3 livrables testables cette semaine.`,
      detailAr: `الهدف: ${goal}. قسّم إلى 3 مخرجات قابلة للتجربة هذا الأسبوع.`,
    },
    {
      id: 'g1',
      titleFr: 'Prototype minimal',
      titleAr: 'نموذج أولي',
      detailFr:
        'Landing ou écran AZ Digital + CTA WhatsApp. Pas d’AGI : automatise les boutons existants.',
      detailAr:
        'صفحة أو شاشة AZ Digital + واتساب. بلا AGI: فعّل الأزرار الموجودة.',
    },
    {
      id: 'g2',
      titleFr: 'Mesurer & itérer',
      titleAr: 'قس وطوّر',
      detailFr: 'Suivre prospects, ventes digitales, stories faites. Créer un sous-agent pour la suite.',
      detailAr: 'تابع prospects والمبيعات والستوري. أنشئ وكيلاً فرعياً للمتابعة.',
    },
  ]
}

export function runMicroAgent(
  agent: MicroAgent,
  lang: Language,
): { report: string; campaignCommand?: string } {
  const lines =
    lang === 'ar'
      ? [
          `🤖 الوكيل: ${agent.name}`,
          `🎯 الهدف: ${agent.goal}`,
          '',
          ...agent.steps.map(
            (s, i) => `${i + 1}. ${s.titleAr}\n${s.detailAr}`,
          ),
          '',
          '✅ نفّذ خطوة بخطوة. يمكنك إنشاء وكيل فرعي لجزء أدق.',
        ]
      : [
          `🤖 Agent : ${agent.name}`,
          `🎯 Objectif : ${agent.goal}`,
          '',
          ...agent.steps.map(
            (s, i) => `${i + 1}. ${s.titleFr}\n${s.detailFr}`,
          ),
          '',
          '✅ Exécute étape par étape. Crée un sous-agent pour affiner.',
        ]
  return { report: lines.join('\n'), campaignCommand: agent.campaignCommand }
}

export function spawnChildAgent(
  parent: MicroAgent,
  focus: string,
): MicroAgent {
  return createMicroAgent({
    name: `${parent.name} → ${focus.slice(0, 40)}`,
    goal: focus,
    kind: parent.kind,
  })
}

/** Utilisé pour afficher un résumé catalogue dans l’agent */
export function catalogBlurb(lang: Language): string {
  return DIGITAL_CATALOG.filter((p) => p.firstParty)
    .slice(0, 5)
    .map((p) => `• ${productName(p, lang)} — ${p.priceDa} DA`)
    .join('\n')
}
