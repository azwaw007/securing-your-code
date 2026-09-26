/**
 * Outils CRM — modules internes AZ POS + apps/API gratuites / freemium.
 * Affichés uniquement pour le métier / catégorie CRM.
 */
import type { Screen } from '../types'

export type CrmToolKind =
  | 'pipeline'
  | 'contacts'
  | 'comm'
  | 'support'
  | 'email'
  | 'analytics'
  | 'automation'
  | 'apps'

export type CrmTool = {
  id: string
  icon: string
  kind: CrmToolKind
  nameFr: string
  nameAr: string
  hintFr: string
  hintAr: string
  pricing: 'free' | 'freemium' | 'open_source' | 'builtin'
  url?: string
  /** Écran interne AZ POS */
  screen?: Screen
}

export const CRM_TOOL_KINDS: Array<{
  id: CrmToolKind
  labelFr: string
  labelAr: string
}> = [
  { id: 'contacts', labelFr: 'Contacts', labelAr: 'جهات اتصال' },
  { id: 'pipeline', labelFr: 'Pipeline / ventes', labelAr: 'مسار البيع' },
  { id: 'comm', labelFr: 'Communication', labelAr: 'تواصل' },
  { id: 'support', labelFr: 'Support', labelAr: 'دعم' },
  { id: 'email', labelFr: 'Email / marketing', labelAr: 'بريد / تسويق' },
  { id: 'analytics', labelFr: 'Suivi', labelAr: 'متابعة' },
  { id: 'automation', labelFr: 'Automatisation', labelAr: 'أتمتة' },
  { id: 'apps', labelFr: 'CRM externes', labelAr: 'CRM خارجي' },
]

/** Modules + outils gratuits CRM */
export const CRM_TOOLS: CrmTool[] = [
  // —— Contacts (builtin) ——
  {
    id: 'az-clients',
    icon: '👥',
    kind: 'contacts',
    nameFr: 'Fiches clients',
    nameAr: 'بطاقات الزبائن',
    hintFr: 'Carnet clients, téléphone, ville — dans l’app',
    hintAr: 'دفتر زبائن، هاتف، ولاية — داخل التطبيق',
    pricing: 'builtin',
    screen: 'clients',
  },
  {
    id: 'az-credit',
    icon: '🧾',
    kind: 'contacts',
    nameFr: 'Plafond crédit',
    nameAr: 'سقف الدين',
    hintFr: 'Limite de crédit client',
    hintAr: 'حد دين الزبون',
    pricing: 'builtin',
    screen: 'creditLimit',
  },
  {
    id: 'az-sellers',
    icon: '🧍',
    kind: 'contacts',
    nameFr: 'Équipe commerciale',
    nameAr: 'فريق المبيعات',
    hintFr: 'Vendeurs / rôles',
    hintAr: 'بائعون / أدوار',
    pricing: 'builtin',
    screen: 'sellers',
  },

  // —— Pipeline ——
  {
    id: 'az-order',
    icon: '🛒',
    kind: 'pipeline',
    nameFr: 'Vente / devis',
    nameAr: 'بيع / عرض',
    hintFr: 'Encaisser ou proposer une offre',
    hintAr: 'تحصيل أو عرض سعر',
    pricing: 'builtin',
    screen: 'order',
  },
  {
    id: 'az-history',
    icon: '📜',
    kind: 'pipeline',
    nameFr: 'Historique ventes',
    nameAr: 'سجل المبيعات',
    hintFr: 'Commandes et tickets passés',
    hintAr: 'الطلبات والتذاكر السابقة',
    pricing: 'builtin',
    screen: 'history',
  },
  {
    id: 'az-profits',
    icon: '💰',
    kind: 'pipeline',
    nameFr: 'Marge & profits',
    nameAr: 'هامش وأرباح',
    hintFr: 'Suivi commercial',
    hintAr: 'متابعة تجارية',
    pricing: 'builtin',
    screen: 'profits',
  },
  {
    id: 'hubspot-free',
    icon: '🧡',
    kind: 'pipeline',
    nameFr: 'HubSpot CRM',
    nameAr: 'هاب سبوت',
    hintFr: 'CRM cloud freemium (pipeline)',
    hintAr: 'CRM سحابي freemium',
    pricing: 'freemium',
    url: 'https://www.hubspot.com/products/crm',
  },
  {
    id: 'pipedrive',
    icon: '🔵',
    kind: 'pipeline',
    nameFr: 'Pipedrive',
    nameAr: 'بايب درايف',
    hintFr: 'Pipeline ventes (essai / freemium)',
    hintAr: 'مسار مبيعات',
    pricing: 'freemium',
    url: 'https://www.pipedrive.com/',
  },

  // —— Communication ——
  {
    id: 'az-wa-debt',
    icon: '📲',
    kind: 'comm',
    nameFr: 'Relances WhatsApp',
    nameAr: 'تذكير واتساب',
    hintFr: 'Clients en retard — dans l’app',
    hintAr: 'زبائن متأخرون — داخل التطبيق',
    pricing: 'builtin',
    screen: 'debtRemind',
  },
  {
    id: 'az-inbox',
    icon: '📥',
    kind: 'comm',
    nameFr: 'Boîte messages',
    nameAr: 'صندوق الرسائل',
    hintFr: 'Inbox commerciale',
    hintAr: 'وارد تجاري',
    pricing: 'builtin',
    screen: 'inbox',
  },
  {
    id: 'az-agent',
    icon: '🤖',
    kind: 'comm',
    nameFr: 'Agent AZ',
    nameAr: 'وكيل AZ',
    hintFr: 'Assistant vente / clients',
    hintAr: 'مساعد بيع / زبائن',
    pricing: 'builtin',
    screen: 'agent',
  },
  {
    id: 'whatsapp-biz',
    icon: '💬',
    kind: 'comm',
    nameFr: 'WhatsApp Business',
    nameAr: 'واتساب أعمال',
    hintFr: 'Catalogue + étiquettes gratuits',
    hintAr: 'كتالوج + تسميات مجانية',
    pricing: 'free',
    url: 'https://www.whatsapp.com/business/',
  },
  {
    id: 'telegram-crm',
    icon: '✈️',
    kind: 'comm',
    nameFr: 'Telegram',
    nameAr: 'تيليغرام',
    hintFr: 'Canal / bot clients gratuit',
    hintAr: 'قناة / بوت زبائن مجاني',
    pricing: 'free',
    url: 'https://telegram.org/',
  },
  {
    id: 'meta-business-crm',
    icon: '📘',
    kind: 'comm',
    nameFr: 'Meta Business Suite',
    nameAr: 'مجموعة أعمال ميتا',
    hintFr: 'Inbox FB + IG gratuite',
    hintAr: 'وارد فيسبوك + إنستا مجاني',
    pricing: 'free',
    url: 'https://business.facebook.com/',
  },

  // —— Support ——
  {
    id: 'tawk-crm',
    icon: '💚',
    kind: 'support',
    nameFr: 'Tawk.to',
    nameAr: 'توك تو',
    hintFr: 'Chat live 100 % gratuit',
    hintAr: 'دردشة مباشرة مجانية',
    pricing: 'free',
    url: 'https://www.tawk.to/',
  },
  {
    id: 'crisp-crm',
    icon: '💚',
    kind: 'support',
    nameFr: 'Crisp',
    nameAr: 'كريسب',
    hintFr: 'Chat + CRM freemium',
    hintAr: 'دردشة + CRM freemium',
    pricing: 'freemium',
    url: 'https://crisp.chat/',
  },
  {
    id: 'google-forms-crm',
    icon: '📋',
    kind: 'support',
    nameFr: 'Google Forms',
    nameAr: 'نماذج جوجل',
    hintFr: 'Leads / tickets gratuits',
    hintAr: 'عملاء محتملون / تذاكر مجاناً',
    pricing: 'free',
    url: 'https://forms.google.com/',
  },

  // —— Email ——
  {
    id: 'mailchimp-crm',
    icon: '🐵',
    kind: 'email',
    nameFr: 'Mailchimp',
    nameAr: 'ميل تشيمب',
    hintFr: 'Email marketing freemium',
    hintAr: 'تسويق بالبريد freemium',
    pricing: 'freemium',
    url: 'https://mailchimp.com/',
  },
  {
    id: 'brevo-crm',
    icon: '✉️',
    kind: 'email',
    nameFr: 'Brevo',
    nameAr: 'بريفو',
    hintFr: 'Email + SMS + CRM léger',
    hintAr: 'بريد + SMS + CRM خفيف',
    pricing: 'freemium',
    url: 'https://www.brevo.com/',
  },
  {
    id: 'substack-crm',
    icon: '📝',
    kind: 'email',
    nameFr: 'Substack',
    nameAr: 'سابستاك',
    hintFr: 'Newsletter gratuite',
    hintAr: 'نشرة مجانية',
    pricing: 'free',
    url: 'https://substack.com/',
  },

  // —— Analytics ——
  {
    id: 'az-caisse',
    icon: '💵',
    kind: 'analytics',
    nameFr: 'Caisse du jour',
    nameAr: 'صندوق اليوم',
    hintFr: 'Encaissements du jour',
    hintAr: 'تحصيلات اليوم',
    pricing: 'builtin',
    screen: 'caisse',
  },
  {
    id: 'az-expenses',
    icon: '💸',
    kind: 'analytics',
    nameFr: 'Dépenses',
    nameAr: 'مصاريف',
    hintFr: 'Coûts liés au commercial',
    hintAr: 'تكاليف مرتبطة بالمبيعات',
    pricing: 'builtin',
    screen: 'expenses',
  },
  {
    id: 'ga4-crm',
    icon: '📊',
    kind: 'analytics',
    nameFr: 'Google Analytics',
    nameAr: 'تحليلات جوجل',
    hintFr: 'Trafic & conversions',
    hintAr: 'زيارات وتحويلات',
    pricing: 'free',
    url: 'https://analytics.google.com/',
  },

  // —— Automation ——
  {
    id: 'az-digital-crm',
    icon: '🚀',
    kind: 'automation',
    nameFr: 'AZ Digital',
    nameAr: 'AZ Digital',
    hintFr: 'Pubs, prospects, campagnes',
    hintAr: 'إعلانات، prospects، حملات',
    pricing: 'builtin',
    screen: 'digital',
  },
  {
    id: 'n8n',
    icon: '🔗',
    kind: 'automation',
    nameFr: 'n8n',
    nameAr: 'إن 8 إن',
    hintFr: 'Automatisations open source',
    hintAr: 'أتمتة مفتوحة المصدر',
    pricing: 'open_source',
    url: 'https://n8n.io/',
  },
  {
    id: 'zapier',
    icon: '⚡',
    kind: 'automation',
    nameFr: 'Zapier',
    nameAr: 'زابير',
    hintFr: 'Connecteurs freemium',
    hintAr: 'ربط freemium',
    pricing: 'freemium',
    url: 'https://zapier.com/',
  },
  {
    id: 'make',
    icon: '🧩',
    kind: 'automation',
    nameFr: 'Make (Integromat)',
    nameAr: 'ميك',
    hintFr: 'Scénarios freemium',
    hintAr: 'سيناريوهات freemium',
    pricing: 'freemium',
    url: 'https://www.make.com/',
  },

  // —— Apps CRM externes ——
  {
    id: 'bitrix24',
    icon: '🟣',
    kind: 'apps',
    nameFr: 'Bitrix24',
    nameAr: 'بيتركس 24',
    hintFr: 'CRM + collab freemium',
    hintAr: 'CRM + تعاون freemium',
    pricing: 'freemium',
    url: 'https://www.bitrix24.com/',
  },
  {
    id: 'odoo-crm',
    icon: '🟤',
    kind: 'apps',
    nameFr: 'Odoo CRM',
    nameAr: 'أودو CRM',
    hintFr: 'Module CRM open source / freemium',
    hintAr: 'وحدة CRM مفتوحة / freemium',
    pricing: 'open_source',
    url: 'https://www.odoo.com/app/crm',
  },
  {
    id: 'suitecrm',
    icon: '📗',
    kind: 'apps',
    nameFr: 'SuiteCRM',
    nameAr: 'سويت CRM',
    hintFr: 'CRM open source',
    hintAr: 'CRM مفتوح المصدر',
    pricing: 'open_source',
    url: 'https://suitecrm.com/',
  },
  {
    id: 'espocrm',
    icon: '⚪',
    kind: 'apps',
    nameFr: 'EspoCRM',
    nameAr: 'إسبو CRM',
    hintFr: 'CRM open source léger',
    hintAr: 'CRM مفتوح خفيف',
    pricing: 'open_source',
    url: 'https://www.espocrm.com/',
  },
  {
    id: 'freshsales',
    icon: '🌿',
    kind: 'apps',
    nameFr: 'Freshsales',
    nameAr: 'فريش سيلز',
    hintFr: 'CRM freemium Freshworks',
    hintAr: 'CRM freemium',
    pricing: 'freemium',
    url: 'https://www.freshworks.com/crm/',
  },
]

export function crmToolName(t: CrmTool, lang: 'fr' | 'ar'): string {
  return lang === 'ar' ? t.nameAr : t.nameFr
}

export function crmToolHint(t: CrmTool, lang: 'fr' | 'ar'): string {
  return lang === 'ar' ? t.hintAr : t.hintFr
}

export function crmPricingLabel(
  p: CrmTool['pricing'],
  lang: 'fr' | 'ar',
): string {
  if (lang === 'ar') {
    if (p === 'builtin') return 'مدمج'
    if (p === 'open_source') return 'مفتوح المصدر'
    if (p === 'freemium') return 'مجاني محدود'
    return 'مجاني'
  }
  if (p === 'builtin') return 'Dans l’app'
  if (p === 'open_source') return 'Open source'
  if (p === 'freemium') return 'Freemium'
  return 'Gratuit'
}
