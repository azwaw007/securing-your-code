/**
 * Packs métier par domaine — thème, orthographe, vocabulaire et fonctionnalités.
 * Sources : pratiques logicielles cabinet médical / dentaire, POS resto, gym NFC,
 * DMS garage (OR/devis), salon coiffure, cabinet avocat, PMS hôtel.
 */
import type { DomainVocab } from '../data/domains'
import { domainById } from '../data/domains'
import type { CommerceMode, Language } from '../types'

export type MetierFamily =
  | 'wholesale'
  | 'retail'
  | 'grocery'
  | 'bakery'
  | 'butcher'
  | 'restaurant'
  | 'cafe'
  | 'salon'
  | 'pressing'
  | 'medical'
  | 'dental'
  | 'lab'
  | 'radio'
  | 'vet'
  | 'kine'
  | 'optic'
  | 'garage'
  | 'car_rental'
  | 'car_sales'
  | 'car_wash'
  | 'parts'
  | 'legal'
  | 'accounting'
  | 'notary'
  | 'realty'
  | 'travel'
  | 'hotel'
  | 'school'
  | 'gym'
  | 'boxing'
  | 'football'
  | 'yoga'
  | 'crossfit'
  | 'martial'
  | 'swim'
  | 'tennis'
  | 'danse'
  | 'musculation'
  | 'creche'
  | 'events'
  | 'photo'
  | 'print'
  | 'artisan'
  | 'transport'
  | 'it_support'
  | 'security'
  | 'spa'
  | 'generic_service'

export type MetierTheme = {
  labelFr: string
  labelAr: string
  vars: Record<string, string>
  /** Ambiance fond (clair | sombre | clinique) */
  mood: 'light' | 'dim' | 'clinical'
}

export type MetierFeatures = {
  /** Dossier patient / animal */
  medicalDossier: boolean
  /** Agenda RDV cabinet */
  clinicAgenda: boolean
  /** Partage médecin ↔ réception */
  clinicShare: boolean
  /** Check-in NFC / badge adhérent */
  gymCheckin: boolean
  /** Plan de salle / tables (resto) */
  tableService: boolean
  /** Ordre de réparation / devis atelier */
  repairOrder: boolean
  /** Preférer client obligatoire à l’encaissement */
  requireClient: boolean
  /** Afficher scan code-barres accueil */
  homeScan: boolean
  /** Retours / avoirs */
  returns: boolean
  /** Galerie photos */
  gallery: boolean
  /** Outils dépôt (arrivages, tournées) */
  depot: boolean
  /** Tarifs gros / demi-gros */
  wholesaleTiers: boolean
  /** Vocabulaire sans « vente » */
  noSaleWording: boolean
  /** Masquer caisse pour poste médecin */
  doctorNoCash: boolean
  /**
   * Dossier RH : contrat, congés, assurance, paie, avances, dettes.
   * Activé pour presque tous les métiers (commerçant ↔ employeur).
   */
  staffHr: boolean
  /**
   * Dossier client paramétré (véhicule, élève, animal…) —
   * hors fiches dédiées patient (medicalDossier) et athlète (gymCheckin).
   */
  specialtyDossier: boolean
}

export type MetierCopy = DomainVocab & {
  /** Titre d’accueil métier */
  homeTitle: string
  homeHint: string
  /** Libellé historique */
  historyLabel: string
  /** CTA principal long */
  primaryCta: string
}

export type MetierPack = {
  family: MetierFamily
  theme: MetierTheme
  features: MetierFeatures
  copy: { fr: MetierCopy; ar: MetierCopy }
}

const FEAT = {
  shop: {
    medicalDossier: false,
    clinicAgenda: false,
    clinicShare: false,
    gymCheckin: false,
    tableService: false,
    repairOrder: false,
    requireClient: false,
    homeScan: true,
    returns: true,
    gallery: true,
    depot: false,
    wholesaleTiers: false,
    noSaleWording: false,
    doctorNoCash: false,
    staffHr: true,
    specialtyDossier: false,
  } satisfies MetierFeatures,
  depot: {
    medicalDossier: false,
    clinicAgenda: false,
    clinicShare: false,
    gymCheckin: false,
    tableService: false,
    repairOrder: false,
    requireClient: false,
    homeScan: true,
    returns: true,
    gallery: true,
    depot: true,
    wholesaleTiers: true,
    noSaleWording: false,
    doctorNoCash: false,
    staffHr: true,
    specialtyDossier: false,
  } satisfies MetierFeatures,
  clinic: {
    medicalDossier: true,
    clinicAgenda: true,
    clinicShare: true,
    gymCheckin: false,
    tableService: false,
    repairOrder: false,
    requireClient: true,
    homeScan: false,
    returns: false,
    gallery: false,
    depot: false,
    wholesaleTiers: false,
    noSaleWording: true,
    doctorNoCash: true,
    staffHr: true,
    specialtyDossier: true,
  } satisfies MetierFeatures,
  service: {
    medicalDossier: false,
    clinicAgenda: false,
    clinicShare: false,
    gymCheckin: false,
    tableService: false,
    repairOrder: false,
    requireClient: true,
    homeScan: false,
    returns: false,
    gallery: false,
    depot: false,
    wholesaleTiers: false,
    noSaleWording: true,
    doctorNoCash: false,
    staffHr: true,
    specialtyDossier: true,
  } satisfies MetierFeatures,
}

function theme(
  labelFr: string,
  labelAr: string,
  vars: Record<string, string>,
  mood: MetierTheme['mood'] = 'light',
): MetierTheme {
  return { labelFr, labelAr, vars, mood }
}

function pack(
  family: MetierFamily,
  th: MetierTheme,
  features: MetierFeatures,
  fr: MetierCopy,
  ar: MetierCopy,
): MetierPack {
  return { family, theme: th, features, copy: { fr, ar } }
}

/** Clinique — teal stérile (pas violet) */
const THEME_MEDICAL = theme(
  'Cabinet médical',
  'عيادة طبية',
  {
    '--bg': '#eef6f5',
    '--bg-2': '#d9ebe8',
    '--ink': '#0f2a2a',
    '--muted': '#5a7370',
    '--card': '#f7fcfb',
    '--line': '#c5dbd7',
    '--brand': '#0d7377',
    '--brand-2': '#14919b',
    '--glow': 'rgba(13, 115, 119, 0.14)',
  },
  'clinical',
)

const THEME_DENTAL = theme(
  'Cabinet dentaire',
  'عيادة أسنان',
  {
    '--bg': '#eef7fa',
    '--bg-2': '#d6ebf2',
    '--ink': '#123038',
    '--muted': '#5a7480',
    '--card': '#f6fcfe',
    '--line': '#c2dbe4',
    '--brand': '#1a7a8c',
    '--brand-2': '#2a9aad',
    '--glow': 'rgba(26, 122, 140, 0.14)',
  },
  'clinical',
)

const THEME_LAB = theme(
  'Laboratoire',
  'مخبر',
  {
    '--bg': '#f0f4f8',
    '--bg-2': '#dde6ef',
    '--ink': '#1a2433',
    '--muted': '#5e6d80',
    '--card': '#f8fafc',
    '--line': '#c8d4e0',
    '--brand': '#365f7a',
    '--brand-2': '#4a7a9b',
    '--glow': 'rgba(54, 95, 122, 0.14)',
  },
  'clinical',
)

const THEME_VET = theme(
  'Vétérinaire',
  'بيطرة',
  {
    '--bg': '#eef6ee',
    '--bg-2': '#d9ead9',
    '--ink': '#1a2e1a',
    '--muted': '#5c735c',
    '--card': '#f6fbf6',
    '--line': '#c5d8c5',
    '--brand': '#3d7a4a',
    '--brand-2': '#529e5f',
    '--glow': 'rgba(61, 122, 74, 0.14)',
  },
  'clinical',
)

const THEME_RESTO = theme(
  'Restaurant',
  'مطعم',
  {
    '--bg': '#f3efe8',
    '--bg-2': '#e5dccf',
    '--ink': '#1c1612',
    '--muted': '#6e6258',
    '--card': '#fbf8f3',
    '--line': '#d8cec0',
    '--brand': '#8b3a2a',
    '--brand-2': '#a84a36',
    '--glow': 'rgba(139, 58, 42, 0.14)',
  },
)

const THEME_CAFE = theme(
  'Café',
  'مقهى',
  {
    '--bg': '#f4efe8',
    '--bg-2': '#e6d9c8',
    '--ink': '#2a1f16',
    '--muted': '#746556',
    '--card': '#fbf7f1',
    '--line': '#d9ccba',
    '--brand': '#6b4226',
    '--brand-2': '#8a5632',
    '--glow': 'rgba(107, 66, 38, 0.14)',
  },
)

const THEME_BAKERY = theme(
  'Boulangerie',
  'مخبزة',
  {
    '--bg': '#f7f1e4',
    '--bg-2': '#eadcbd',
    '--ink': '#2a2114',
    '--muted': '#7a6a4e',
    '--card': '#fffaf0',
    '--line': '#e0d2b4',
    '--brand': '#b07a28',
    '--brand-2': '#c9943a',
    '--glow': 'rgba(176, 122, 40, 0.16)',
  },
)

const THEME_SALON = theme(
  'Salon',
  'صالون',
  {
    '--bg': '#f6f0ef',
    '--bg-2': '#e8dcda',
    '--ink': '#2a1c1c',
    '--muted': '#746060',
    '--card': '#fcf8f7',
    '--line': '#ddcfcd',
    '--brand': '#8a4f55',
    '--brand-2': '#a86269',
    '--glow': 'rgba(138, 79, 85, 0.14)',
  },
)

const THEME_GYM = theme(
  'Salle de sport',
  'قاعة رياضة',
  {
    '--bg': '#eef1f0',
    '--bg-2': '#dce3e0',
    '--ink': '#121816',
    '--muted': '#5a6863',
    '--card': '#f6f9f7',
    '--line': '#c5d0cb',
    '--brand': '#1f7a4c',
    '--brand-2': '#2a9a62',
    '--glow': 'rgba(31, 122, 76, 0.16)',
  },
)

const THEME_GARAGE = theme(
  'Garage',
  'ورشة',
  {
    '--bg': '#eceff2',
    '--bg-2': '#d5dbe3',
    '--ink': '#161b22',
    '--muted': '#5c6670',
    '--card': '#f5f7f9',
    '--line': '#c5cdd6',
    '--brand': '#c47a12',
    '--brand-2': '#db931f',
    '--glow': 'rgba(196, 122, 18, 0.16)',
  },
)

const THEME_LEGAL = theme(
  'Cabinet juridique',
  'مكتب محاماة',
  {
    '--bg': '#eef1f5',
    '--bg-2': '#dce2eb',
    '--ink': '#141a24',
    '--muted': '#5a6575',
    '--card': '#f7f8fb',
    '--line': '#c5cdd9',
    '--brand': '#1e3a5f',
    '--brand-2': '#2c5282',
    '--glow': 'rgba(30, 58, 95, 0.14)',
  },
)

const THEME_HOTEL = theme(
  'Hôtel',
  'فندق',
  {
    '--bg': '#f0f2f0',
    '--bg-2': '#dde3de',
    '--ink': '#1a2420',
    '--muted': '#5e6b64',
    '--card': '#f7f9f7',
    '--line': '#c8d2cb',
    '--brand': '#2f5d50',
    '--brand-2': '#3d7a69',
    '--glow': 'rgba(47, 93, 80, 0.14)',
  },
)

const THEME_WHOLESALE = theme(
  'Dépôt gros',
  'مستودع جملة',
  {
    '--bg': '#f3efe6',
    '--bg-2': '#e8e0d2',
    '--ink': '#1c1914',
    '--muted': '#6b6458',
    '--card': '#fffdf8',
    '--line': '#d9d0c0',
    '--brand': '#0f6b4c',
    '--brand-2': '#148f66',
    '--glow': 'rgba(20, 143, 102, 0.14)',
  },
)

const THEME_RETAIL = theme(
  'Boutique',
  'محل',
  {
    '--bg': '#f5f0ea',
    '--bg-2': '#e8ddd2',
    '--ink': '#1f1814',
    '--muted': '#6e6258',
    '--card': '#fffaf6',
    '--line': '#d9cec2',
    '--brand': '#c05621',
    '--brand-2': '#dd6b20',
    '--glow': 'rgba(192, 86, 33, 0.14)',
  },
)

const THEME_AUTO = theme(
  'Automobile',
  'سيارات',
  {
    '--bg': '#eef1f4',
    '--bg-2': '#dce3ea',
    '--ink': '#141a22',
    '--muted': '#5a6674',
    '--card': '#f6f8fb',
    '--line': '#c5cfd9',
    '--brand': '#334155',
    '--brand-2': '#475569',
    '--glow': 'rgba(51, 65, 85, 0.16)',
  },
)

const THEME_SCHOOL = theme(
  'Formation',
  'تكوين',
  {
    '--bg': '#eef3f8',
    '--bg-2': '#d9e4ef',
    '--ink': '#122033',
    '--muted': '#5a6b7d',
    '--card': '#f7fbff',
    '--line': '#c5d4e3',
    '--brand': '#0b5cab',
    '--brand-2': '#1a7ad4',
    '--glow': 'rgba(26, 122, 212, 0.14)',
  },
)

const THEME_SERVICE = theme(
  'Services',
  'خدمات',
  {
    '--bg': '#f2f0ec',
    '--bg-2': '#e4dfd6',
    '--ink': '#1c1914',
    '--muted': '#6b6458',
    '--card': '#faf8f4',
    '--line': '#d4cec4',
    '--brand': '#5b4a3a',
    '--brand-2': '#7a634e',
    '--glow': 'rgba(91, 74, 58, 0.14)',
  },
)


const THEME_BOXING = theme(
  'Boxe',
  'ملاكمة',
  {
    '--bg': '#f2efec',
    '--bg-2': '#e2d9d2',
    '--ink': '#1a1210',
    '--muted': '#6e5c54',
    '--card': '#faf7f4',
    '--line': '#d4c8c0',
    '--brand': '#8b1e1e',
    '--brand-2': '#b83232',
    '--glow': 'rgba(139, 30, 30, 0.16)',
  },
)

const THEME_FOOTBALL = theme(
  'Football',
  'كرة القدم',
  {
    '--bg': '#eef5ef',
    '--bg-2': '#d9e8db',
    '--ink': '#122016',
    '--muted': '#5a6e5c',
    '--card': '#f6fbf6',
    '--line': '#c5d8c8',
    '--brand': '#1f6b3a',
    '--brand-2': '#2d8f4e',
    '--glow': 'rgba(31, 107, 58, 0.16)',
  },
)

const THEME_YOGA = theme(
  'Yoga',
  'يوغا',
  {
    '--bg': '#f3f0f4',
    '--bg-2': '#e4dce8',
    '--ink': '#1e1622',
    '--muted': '#6a5c70',
    '--card': '#faf7fb',
    '--line': '#d6ccd8',
    '--brand': '#5c4a6e',
    '--brand-2': '#7a628f',
    '--glow': 'rgba(92, 74, 110, 0.14)',
  },
)

const THEME_SWIM = theme(
  'Natation',
  'سباحة',
  {
    '--bg': '#eef5f8',
    '--bg-2': '#d6e8f0',
    '--ink': '#102028',
    '--muted': '#5a6e78',
    '--card': '#f5fafc',
    '--line': '#c2d6e0',
    '--brand': '#0e7490',
    '--brand-2': '#0891b2',
    '--glow': 'rgba(14, 116, 144, 0.16)',
  },
)

const PACKS: Record<MetierFamily, MetierPack> = {
  wholesale: pack(
    'wholesale',
    THEME_WHOLESALE,
    FEAT.depot,
    {
      client: 'Client',
      product: 'Stock',
      sell: 'Commande',
      sellHint: 'Carton, tarif, livraison',
      homeTitle: 'Dépôt',
      homeHint: 'Commandes carton, arrivages, tournées',
      historyLabel: 'Historique commandes',
      primaryCta: 'Nouvelle commande',
    },
    {
      client: 'زبون',
      product: 'مخزون',
      sell: 'طلب',
      sellHint: 'كرتون، سعر، توصيل',
      homeTitle: 'المستودع',
      homeHint: 'طلبات كرتون، وصولات، جولات',
      historyLabel: 'سجل الطلبات',
      primaryCta: 'طلب جديد',
    },
  ),
  retail: pack(
    'retail',
    THEME_RETAIL,
    FEAT.shop,
    {
      client: 'Client',
      product: 'Rayon',
      sell: 'Caisse',
      sellHint: 'Scanner et encaisser',
      homeTitle: 'Boutique',
      homeHint: 'Caisse rapide et ticket',
      historyLabel: 'Historique ventes',
      primaryCta: 'Ouvrir la caisse',
    },
    {
      client: 'زبون',
      product: 'رف',
      sell: 'صندوق',
      sellHint: 'مسح ودفع',
      homeTitle: 'المحل',
      homeHint: 'صندوق سريع وتذكرة',
      historyLabel: 'سجل المبيعات',
      primaryCta: 'فتح الصندوق',
    },
  ),
  grocery: pack(
    'grocery',
    THEME_RETAIL,
    FEAT.shop,
    {
      client: 'Client',
      product: 'Rayon',
      sell: 'Caisse',
      sellHint: 'Scanner le code-barres',
      homeTitle: 'Épicerie',
      homeHint: 'Caisse, rayons, fidélité',
      historyLabel: 'Tickets du jour',
      primaryCta: 'Encaisser',
    },
    {
      client: 'زبون',
      product: 'رف',
      sell: 'صندوق',
      sellHint: 'امسح الباركود',
      homeTitle: 'البقالة',
      homeHint: 'صندوق ورفوف',
      historyLabel: 'تذاكر اليوم',
      primaryCta: 'تحصيل',
    },
  ),
  bakery: pack(
    'bakery',
    THEME_BAKERY,
    { ...FEAT.shop, gallery: true },
    {
      client: 'Client',
      product: 'Produit',
      sell: 'Caisse',
      sellHint: 'Pain, viennoiserie, commande',
      homeTitle: 'Boulangerie',
      homeHint: 'Caisse du fournil',
      historyLabel: 'Tickets',
      primaryCta: 'Encaisser',
    },
    {
      client: 'زبون',
      product: 'منتج',
      sell: 'صندوق',
      sellHint: 'خبز، معجنات، طلب',
      homeTitle: 'المخبزة',
      homeHint: 'صندوق الفرن',
      historyLabel: 'التذاكر',
      primaryCta: 'تحصيل',
    },
  ),
  butcher: pack(
    'butcher',
    theme(
      'Boucherie',
      'جزارة',
      {
        '--bg': '#f6f0ee',
        '--bg-2': '#ead9d4',
        '--ink': '#2a1612',
        '--muted': '#7a5a52',
        '--card': '#fff8f6',
        '--line': '#e5cfc8',
        '--brand': '#9b2c2c',
        '--brand-2': '#c53030',
        '--glow': 'rgba(155, 44, 44, 0.14)',
      },
    ),
    FEAT.shop,
    {
      client: 'Client',
      product: 'Coupe',
      sell: 'Caisse',
      sellHint: 'Pesée et ticket',
      homeTitle: 'Boucherie',
      homeHint: 'Pesée, coupe, caisse',
      historyLabel: 'Tickets',
      primaryCta: 'Encaisser',
    },
    {
      client: 'زبون',
      product: 'قطعة',
      sell: 'صندوق',
      sellHint: 'وزن وتذكرة',
      homeTitle: 'الجزارة',
      homeHint: 'وزن وقطع وصندوق',
      historyLabel: 'التذاكر',
      primaryCta: 'تحصيل',
    },
  ),
  restaurant: pack(
    'restaurant',
    THEME_RESTO,
    {
      ...FEAT.shop,
      tableService: true,
      requireClient: false,
      gallery: true,
      noSaleWording: true,
      specialtyDossier: true,
    },
    {
      client: 'Client',
      product: 'Carte',
      sell: 'Commande',
      sellHint: 'Table, addition, cuisine',
      homeTitle: 'Salle',
      homeHint: 'Prise de commande et addition',
      historyLabel: 'Additions',
      primaryCta: 'Nouvelle commande',
    },
    {
      client: 'زبون',
      product: 'قائمة',
      sell: 'طلب',
      sellHint: 'طاولة، فاتورة، مطبخ',
      homeTitle: 'القاعة',
      homeHint: 'أخذ الطلب والحساب',
      historyLabel: 'الحسابات',
      primaryCta: 'طلب جديد',
    },
  ),
  cafe: pack(
    'cafe',
    THEME_CAFE,
    { ...FEAT.shop, noSaleWording: true },
    {
      client: 'Client',
      product: 'Carte',
      sell: 'Commande',
      sellHint: 'Boisson, snack, table',
      homeTitle: 'Café',
      homeHint: 'Commandes au comptoir',
      historyLabel: 'Tickets',
      primaryCta: 'Prendre commande',
    },
    {
      client: 'زبون',
      product: 'قائمة',
      sell: 'طلب',
      sellHint: 'مشروب، وجبة خفيفة',
      homeTitle: 'المقهى',
      homeHint: 'طلبات الكاونتر',
      historyLabel: 'التذاكر',
      primaryCta: 'أخذ طلب',
    },
  ),
  salon: pack(
    'salon',
    THEME_SALON,
    {
      ...FEAT.service,
      gallery: true,
      clinicAgenda: true,
      specialtyDossier: true,
    },
    {
      client: 'Cliente',
      product: 'Prestation',
      sell: 'Encaisser',
      sellHint: 'Coupe, couleur, soin',
      homeTitle: 'Salon',
      homeHint: 'Agenda, fiche cliente, encaissement',
      historyLabel: 'Historique prestations',
      primaryCta: 'Encaisser une prestation',
    },
    {
      client: 'زبونة',
      product: 'خدمة',
      sell: 'تحصيل',
      sellHint: 'قص، صبغة، عناية',
      homeTitle: 'الصالون',
      homeHint: 'مواعيد، بطاقة زبونة، تحصيل',
      historyLabel: 'سجل الخدمات',
      primaryCta: 'تحصيل خدمة',
    },
  ),
  pressing: pack(
    'pressing',
    theme(
      'Pressing',
      'مصبغة',
      {
        '--bg': '#eef3f6',
        '--bg-2': '#dce7ee',
        '--ink': '#152028',
        '--muted': '#5a6b75',
        '--card': '#f6fafc',
        '--line': '#c5d4dd',
        '--brand': '#2c6e8a',
        '--brand-2': '#3a8aad',
        '--glow': 'rgba(44, 110, 138, 0.14)',
      },
    ),
    FEAT.service,
    {
      client: 'Client',
      product: 'Article',
      sell: 'Réception',
      sellHint: 'Dépôt, ticket, restitution',
      homeTitle: 'Pressing',
      homeHint: 'Dépôt et restitution',
      historyLabel: 'Tickets pressing',
      primaryCta: 'Nouveau dépôt',
    },
    {
      client: 'زبون',
      product: 'قطعة',
      sell: 'استلام',
      sellHint: 'إيداع، تذكرة، تسليم',
      homeTitle: 'المصبغة',
      homeHint: 'إيداع وتسليم',
      historyLabel: 'تذاكر المصبغة',
      primaryCta: 'إيداع جديد',
    },
  ),
  medical: pack(
    'medical',
    THEME_MEDICAL,
    FEAT.clinic,
    {
      client: 'Patient',
      product: 'Acte',
      sell: 'Facturer l’acte',
      sellHint: 'Consultation, actes, honoraires',
      homeTitle: 'Cabinet',
      homeHint: 'Dossier patient, ordonnances, agenda',
      historyLabel: 'Historique des actes',
      primaryCta: 'Ouvrir un dossier',
    },
    {
      client: 'مريض',
      product: 'عمل',
      sell: 'فوترة العمل',
      sellHint: 'استشارة، أعمال، أتعاب',
      homeTitle: 'العيادة',
      homeHint: 'ملف المريض، وصفات، مواعيد',
      historyLabel: 'سجل الأعمال',
      primaryCta: 'فتح ملف',
    },
  ),
  dental: pack(
    'dental',
    THEME_DENTAL,
    FEAT.clinic,
    {
      client: 'Patient',
      product: 'Soin',
      sell: 'Facturer le soin',
      sellHint: 'Plan de traitement, devis, actes',
      homeTitle: 'Cabinet dentaire',
      homeHint: 'Dossier, devis, soins',
      historyLabel: 'Historique des soins',
      primaryCta: 'Nouveau soin',
    },
    {
      client: 'مريض',
      product: 'علاج',
      sell: 'فوترة العلاج',
      sellHint: 'خطة علاج، عرض سعر، أعمال',
      homeTitle: 'عيادة الأسنان',
      homeHint: 'ملف، عرض سعر، علاجات',
      historyLabel: 'سجل العلاجات',
      primaryCta: 'علاج جديد',
    },
  ),
  lab: pack(
    'lab',
    THEME_LAB,
    { ...FEAT.clinic, medicalDossier: true, doctorNoCash: false },
    {
      client: 'Patient',
      product: 'Analyse',
      sell: 'Enregistrer',
      sellHint: 'Prélèvement, résultats, facturation',
      homeTitle: 'Laboratoire',
      homeHint: 'Analyses et résultats',
      historyLabel: 'Analyses',
      primaryCta: 'Nouvelle analyse',
    },
    {
      client: 'مريض',
      product: 'تحليل',
      sell: 'تسجيل',
      sellHint: 'سحب، نتائج، فوترة',
      homeTitle: 'المخبر',
      homeHint: 'تحاليل ونتائج',
      historyLabel: 'التحاليل',
      primaryCta: 'تحليل جديد',
    },
  ),
  radio: pack(
    'radio',
    THEME_LAB,
    FEAT.clinic,
    {
      client: 'Patient',
      product: 'Examen',
      sell: 'Facturer l’examen',
      sellHint: 'Radio, échographie, compte-rendu',
      homeTitle: 'Imagerie',
      homeHint: 'Examens et comptes-rendus',
      historyLabel: 'Examens',
      primaryCta: 'Nouvel examen',
    },
    {
      client: 'مريض',
      product: 'فحص',
      sell: 'فوترة الفحص',
      sellHint: 'أشعة، تصوير، تقرير',
      homeTitle: 'التصوير',
      homeHint: 'فحوصات وتقارير',
      historyLabel: 'الفحوصات',
      primaryCta: 'فحص جديد',
    },
  ),
  vet: pack(
    'vet',
    THEME_VET,
    FEAT.clinic,
    {
      client: 'Propriétaire',
      product: 'Acte',
      sell: 'Facturer l’acte',
      sellHint: 'Consultation, vaccin, chirurgie',
      homeTitle: 'Clinique vétérinaire',
      homeHint: 'Dossier animal et actes',
      historyLabel: 'Historique des actes',
      primaryCta: 'Ouvrir un dossier',
    },
    {
      client: 'مالك',
      product: 'عمل',
      sell: 'فوترة العمل',
      sellHint: 'استشارة، تلقيح، جراحة',
      homeTitle: 'العيادة البيطرية',
      homeHint: 'ملف الحيوان والأعمال',
      historyLabel: 'سجل الأعمال',
      primaryCta: 'فتح ملف',
    },
  ),
  kine: pack(
    'kine',
    THEME_MEDICAL,
    FEAT.clinic,
    {
      client: 'Patient',
      product: 'Séance',
      sell: 'Facturer la séance',
      sellHint: 'Séances, bilan, suivi',
      homeTitle: 'Cabinet de kiné',
      homeHint: 'Séances et suivi',
      historyLabel: 'Séances',
      primaryCta: 'Nouvelle séance',
    },
    {
      client: 'مريض',
      product: 'حصة',
      sell: 'فوترة الحصة',
      sellHint: 'حصص، تقييم، متابعة',
      homeTitle: 'عيادة الترويض',
      homeHint: 'حصص ومتابعة',
      historyLabel: 'الحصص',
      primaryCta: 'حصة جديدة',
    },
  ),
  optic: pack(
    'optic',
    THEME_DENTAL,
    { ...FEAT.shop, requireClient: true, noSaleWording: true, clinicAgenda: true },
    {
      client: 'Client',
      product: 'Monture / verre',
      sell: 'Facturer',
      sellHint: 'Ordonnance optique, essai, livraison',
      homeTitle: 'Optique',
      homeHint: 'Montures, verres, facturation',
      historyLabel: 'Commandes optiques',
      primaryCta: 'Nouvelle commande',
    },
    {
      client: 'زبون',
      product: 'إطار / زجاج',
      sell: 'فوترة',
      sellHint: 'وصفة نظارة، تجربة، تسليم',
      homeTitle: 'البصريات',
      homeHint: 'إطارات، زجاج، فوترة',
      historyLabel: 'طلبات البصريات',
      primaryCta: 'طلب جديد',
    },
  ),
  garage: pack(
    'garage',
    THEME_GARAGE,
    {
      ...FEAT.service,
      repairOrder: true,
      homeScan: true,
      returns: true,
      gallery: true,
      specialtyDossier: true,
    },
    {
      client: 'Client',
      product: 'Pièce / main-d’œuvre',
      sell: 'Ordre de réparation',
      sellHint: 'Devis → OR → facture',
      homeTitle: 'Atelier',
      homeHint: 'Devis, OR, planning atelier',
      historyLabel: 'Dossiers atelier',
      primaryCta: 'Nouvel OR',
    },
    {
      client: 'زبون',
      product: 'قطعة / يد عاملة',
      sell: 'أمر إصلاح',
      sellHint: 'عرض سعر ← أمر ← فاتورة',
      homeTitle: 'الورشة',
      homeHint: 'عروض، أوامر إصلاح، تخطيط',
      historyLabel: 'ملفات الورشة',
      primaryCta: 'أمر إصلاح جديد',
    },
  ),
  car_rental: pack(
    'car_rental',
    THEME_AUTO,
    { ...FEAT.service, homeScan: true, gallery: true, specialtyDossier: true },
    {
      client: 'Locataire',
      product: 'Véhicule',
      sell: 'Contrat',
      sellHint: 'Réservation, contrat, restitution',
      homeTitle: 'Location',
      homeHint: 'Parc et contrats',
      historyLabel: 'Contrats',
      primaryCta: 'Nouveau contrat',
    },
    {
      client: 'مستأجر',
      product: 'مركبة',
      sell: 'عقد',
      sellHint: 'حجز، عقد، إرجاع',
      homeTitle: 'الكراء',
      homeHint: 'الأسطول والعقود',
      historyLabel: 'العقود',
      primaryCta: 'عقد جديد',
    },
  ),
  car_sales: pack(
    'car_sales',
    THEME_AUTO,
    { ...FEAT.shop, requireClient: true, gallery: true, noSaleWording: false },
    {
      client: 'Acheteur',
      product: 'Véhicule',
      sell: 'Vendre',
      sellHint: 'VN / VO, essai, dossier',
      homeTitle: 'Showroom',
      homeHint: 'Stock véhicules et dossiers',
      historyLabel: 'Ventes',
      primaryCta: 'Nouvelle vente',
    },
    {
      client: 'مشتري',
      product: 'مركبة',
      sell: 'بيع',
      sellHint: 'جديد / مستعمل، تجربة، ملف',
      homeTitle: 'المعرض',
      homeHint: 'مخزون المركبات والملفات',
      historyLabel: 'المبيعات',
      primaryCta: 'بيع جديد',
    },
  ),
  car_wash: pack(
    'car_wash',
    THEME_AUTO,
    { ...FEAT.service, homeScan: true },
    {
      client: 'Client',
      product: 'Formule',
      sell: 'Encaisser',
      sellHint: 'Lavage, detailing',
      homeTitle: 'Lavage',
      homeHint: 'Formules et passage',
      historyLabel: 'Passages',
      primaryCta: 'Nouveau passage',
    },
    {
      client: 'زبون',
      product: 'باقة',
      sell: 'تحصيل',
      sellHint: 'غسيل، تلميع',
      homeTitle: 'الغسيل',
      homeHint: 'باقات ومرور',
      historyLabel: 'المرور',
      primaryCta: 'مرور جديد',
    },
  ),
  parts: pack(
    'parts',
    THEME_AUTO,
    { ...FEAT.shop, wholesaleTiers: false, depot: false },
    {
      client: 'Client',
      product: 'Référence',
      sell: 'Caisse',
      sellHint: 'Réf. constructeur, stock',
      homeTitle: 'Pièces auto',
      homeHint: 'Références et stock',
      historyLabel: 'Ventes pièces',
      primaryCta: 'Vendre une pièce',
    },
    {
      client: 'زبون',
      product: 'مرجع',
      sell: 'صندوق',
      sellHint: 'مرجع المصنع، مخزون',
      homeTitle: 'قطع الغيار',
      homeHint: 'مراجع ومخزون',
      historyLabel: 'مبيعات القطع',
      primaryCta: 'بيع قطعة',
    },
  ),
  legal: pack(
    'legal',
    THEME_LEGAL,
    { ...FEAT.service, specialtyDossier: true },
    {
      client: 'Client',
      product: 'Dossier',
      sell: 'Note d’honoraires',
      sellHint: 'Dossiers, diligences, honoraires',
      homeTitle: 'Cabinet',
      homeHint: 'Dossiers et honoraires',
      historyLabel: 'Notes d’honoraires',
      primaryCta: 'Nouvelle note',
    },
    {
      client: 'موكل',
      product: 'ملف',
      sell: 'أتعاب',
      sellHint: 'ملفات، أعمال، أتعاب',
      homeTitle: 'المكتب',
      homeHint: 'ملفات وأتعاب',
      historyLabel: 'مذكرات الأتعاب',
      primaryCta: 'مذكرة جديدة',
    },
  ),
  accounting: pack(
    'accounting',
    THEME_LEGAL,
    FEAT.service,
    {
      client: 'Client',
      product: 'Mission',
      sell: 'Facturer',
      sellHint: 'Honoraires, déclarations, suivi',
      homeTitle: 'Cabinet comptable',
      homeHint: 'Missions et facturation',
      historyLabel: 'Factures',
      primaryCta: 'Nouvelle facture',
    },
    {
      client: 'زبون',
      product: 'مهمة',
      sell: 'فوترة',
      sellHint: 'أتعاب، تصريحات، متابعة',
      homeTitle: 'مكتب المحاسبة',
      homeHint: 'مهام وفوترة',
      historyLabel: 'الفواتير',
      primaryCta: 'فاتورة جديدة',
    },
  ),
  notary: pack(
    'notary',
    THEME_LEGAL,
    FEAT.service,
    {
      client: 'Client',
      product: 'Acte',
      sell: 'Émoluments',
      sellHint: 'Actes, formalités, émoluments',
      homeTitle: 'Étude',
      homeHint: 'Actes et formalités',
      historyLabel: 'Actes',
      primaryCta: 'Nouvel acte',
    },
    {
      client: 'زبون',
      product: 'عقد',
      sell: 'أتعاب',
      sellHint: 'عقود، شكليات، أتعاب',
      homeTitle: 'المكتب',
      homeHint: 'عقود وشكليات',
      historyLabel: 'العقود',
      primaryCta: 'عقد جديد',
    },
  ),
  realty: pack(
    'realty',
    THEME_HOTEL,
    { ...FEAT.service, gallery: true },
    {
      client: 'Client',
      product: 'Bien / mandat',
      sell: 'Honoraires',
      sellHint: 'Visites, mandats, commission',
      homeTitle: 'Agence',
      homeHint: 'Biens et mandats',
      historyLabel: 'Honoraires',
      primaryCta: 'Nouveau dossier',
    },
    {
      client: 'زبون',
      product: 'عقار / وكالة',
      sell: 'عمولة',
      sellHint: 'زيارات، وكالات، عمولة',
      homeTitle: 'الوكالة',
      homeHint: 'عقارات ووكالات',
      historyLabel: 'العمولات',
      primaryCta: 'ملف جديد',
    },
  ),
  travel: pack(
    'travel',
    THEME_SCHOOL,
    FEAT.service,
    {
      client: 'Voyageur',
      product: 'Prestation',
      sell: 'Réserver',
      sellHint: 'Billets, packages, acomptes',
      homeTitle: 'Agence de voyage',
      homeHint: 'Réservations et dossiers',
      historyLabel: 'Dossiers voyage',
      primaryCta: 'Nouvelle réservation',
    },
    {
      client: 'مسافر',
      product: 'خدمة',
      sell: 'حجز',
      sellHint: 'تذاكر، باقات، عربون',
      homeTitle: 'وكالة السفر',
      homeHint: 'حجوزات وملفات',
      historyLabel: 'ملفات السفر',
      primaryCta: 'حجز جديد',
    },
  ),
  hotel: pack(
    'hotel',
    THEME_HOTEL,
    { ...FEAT.service, gallery: true, specialtyDossier: true },
    {
      client: 'Client',
      product: 'Chambre / forfait',
      sell: 'Check-in',
      sellHint: 'Réservation, séjour, facture',
      homeTitle: 'Réception',
      homeHint: 'Chambres et séjours',
      historyLabel: 'Séjours',
      primaryCta: 'Nouveau séjour',
    },
    {
      client: 'نزيل',
      product: 'غرفة / باقة',
      sell: 'تسجيل وصول',
      sellHint: 'حجز، إقامة، فاتورة',
      homeTitle: 'الاستقبال',
      homeHint: 'غرف وإقامات',
      historyLabel: 'الإقامات',
      primaryCta: 'إقامة جديدة',
    },
  ),
  school: pack(
    'school',
    THEME_SCHOOL,
    { ...FEAT.service, specialtyDossier: true },
    {
      client: 'Élève / parent',
      product: 'Formation',
      sell: 'Inscrire',
      sellHint: 'Inscription, scolarité, séances',
      homeTitle: 'Établissement',
      homeHint: 'Inscriptions et formations',
      historyLabel: 'Inscriptions',
      primaryCta: 'Nouvelle inscription',
    },
    {
      client: 'تلميذ / ولي',
      product: 'تكوين',
      sell: 'تسجيل',
      sellHint: 'تسجيل، رسوم، حصص',
      homeTitle: 'المؤسسة',
      homeHint: 'تسجيلات وتكوين',
      historyLabel: 'التسجيلات',
      primaryCta: 'تسجيل جديد',
    },
  ),
  gym: pack(
    'gym',
    THEME_GYM,
    {
      ...FEAT.service,
      gymCheckin: true,
      homeScan: true,
      /** Fiche athlète dédiée (AthleteDossierPanel), pas Specialty */
      specialtyDossier: false,
    },
    {
      client: 'Adhérent',
      product: 'Abonnement',
      sell: 'Encaisser',
      sellHint: 'Abonnement, check-in NFC, cours',
      homeTitle: 'Club',
      homeHint: 'Adhérents, abonnements, accès',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'منخرط',
      product: 'اشتراك',
      sell: 'تحصيل',
      sellHint: 'اشتراك، دخول NFC، حصص',
      homeTitle: 'النادي',
      homeHint: 'منخرطون، اشتراكات، دخول',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  boxing: pack(
    'boxing',
    THEME_BOXING,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Boxeur',
      product: 'Abonnement',
      sell: 'Encaisser',
      sellHint: 'Séances, compétition, abonnement',
      homeTitle: 'Boxe',
      homeHint: 'Athlètes et check-in',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'ملاكم',
      product: 'اشتراك',
      sell: 'تحصيل',
      sellHint: 'حصص، منافسة، اشتراك',
      homeTitle: 'الملاكمة',
      homeHint: 'رياضيون ودخول',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  football: pack(
    'football',
    THEME_FOOTBALL,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Joueur',
      product: 'Licence / forfait',
      sell: 'Encaisser',
      sellHint: 'Équipe, licence, cotisation',
      homeTitle: 'Football',
      homeHint: 'Joueurs et check-in',
      historyLabel: 'Cotisations',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'لاعب',
      product: 'رخصة / باقة',
      sell: 'تحصيل',
      sellHint: 'فريق، رخصة، اشتراك',
      homeTitle: 'كرة القدم',
      homeHint: 'لاعبون ودخول',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  yoga: pack(
    'yoga',
    THEME_YOGA,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Élève',
      product: 'Cours / abonnement',
      sell: 'Encaisser',
      sellHint: 'Cours, forfaits, check-in',
      homeTitle: 'Yoga',
      homeHint: 'Élèves et séances',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'تلميذ',
      product: 'حصة / اشتراك',
      sell: 'تحصيل',
      sellHint: 'حصص، باقات، دخول',
      homeTitle: 'يوغا',
      homeHint: 'تلاميذ وحصص',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  crossfit: pack(
    'crossfit',
    THEME_BOXING,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Athlète',
      product: 'Abonnement',
      sell: 'Encaisser',
      sellHint: 'WOD, box, check-in',
      homeTitle: 'CrossFit',
      homeHint: 'Athlètes et accès',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'رياضي',
      product: 'اشتراك',
      sell: 'تحصيل',
      sellHint: 'تمارين، بوكس، دخول',
      homeTitle: 'كروس فت',
      homeHint: 'رياضيون ودخول',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  martial: pack(
    'martial',
    THEME_GYM,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Pratiquant',
      product: 'Abonnement',
      sell: 'Encaisser',
      sellHint: 'Grades, cours, check-in',
      homeTitle: 'Arts martiaux',
      homeHint: 'Pratiquants et dojo',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'ممارس',
      product: 'اشتراك',
      sell: 'تحصيل',
      sellHint: 'درجات، حصص، دخول',
      homeTitle: 'فنون قتالية',
      homeHint: 'ممارسون ودخول',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  swim: pack(
    'swim',
    THEME_SWIM,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Nageur',
      product: 'Abonnement',
      sell: 'Encaisser',
      sellHint: 'Cours, forfaits, accès bassin',
      homeTitle: 'Natation',
      homeHint: 'Nageurs et check-in',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'سباح',
      product: 'اشتراك',
      sell: 'تحصيل',
      sellHint: 'حصص، باقات، دخول المسبح',
      homeTitle: 'السباحة',
      homeHint: 'سباحون ودخول',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  tennis: pack(
    'tennis',
    THEME_GYM,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Joueur',
      product: 'Abonnement / court',
      sell: 'Encaisser',
      sellHint: 'Réservation court, abonnement',
      homeTitle: 'Tennis',
      homeHint: 'Joueurs et courts',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'لاعب',
      product: 'اشتراك / ملعب',
      sell: 'تحصيل',
      sellHint: 'حجز ملعب، اشتراك',
      homeTitle: 'التنس',
      homeHint: 'لاعبون وملاعب',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  danse: pack(
    'danse',
    THEME_YOGA,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Élève',
      product: 'Cours / abonnement',
      sell: 'Encaisser',
      sellHint: 'Cours, forfaits, check-in',
      homeTitle: 'Danse',
      homeHint: 'Élèves et séances',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'تلميذ',
      product: 'حصة / اشتراك',
      sell: 'تحصيل',
      sellHint: 'حصص، باقات، دخول',
      homeTitle: 'الرقص',
      homeHint: 'تلاميذ وحصص',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  musculation: pack(
    'musculation',
    THEME_GYM,
    { ...FEAT.service, gymCheckin: true, homeScan: true, specialtyDossier: false },
    {
      client: 'Adhérent',
      product: 'Abonnement',
      sell: 'Encaisser',
      sellHint: 'Musculation, coach, check-in',
      homeTitle: 'Musculation',
      homeHint: 'Adhérents et accès salle',
      historyLabel: 'Abonnements',
      primaryCta: 'Check-in / encaisser',
    },
    {
      client: 'منخرط',
      product: 'اشتراك',
      sell: 'تحصيل',
      sellHint: 'كمال أجسام، مدرب، دخول',
      homeTitle: 'كمال الأجسام',
      homeHint: 'منخرطون ودخول القاعة',
      historyLabel: 'الاشتراكات',
      primaryCta: 'دخول / تحصيل',
    },
  ),
  creche: pack(
    'creche',
    THEME_SCHOOL,
    { ...FEAT.service, specialtyDossier: true },
    {
      client: 'Parent',
      product: 'Accueil',
      sell: 'Facturer',
      sellHint: 'Présences, forfaits, facturation',
      homeTitle: 'Crèche',
      homeHint: 'Accueil et facturation parents',
      historyLabel: 'Factures',
      primaryCta: 'Nouvelle facture',
    },
    {
      client: 'ولي',
      product: 'استقبال',
      sell: 'فوترة',
      sellHint: 'حضور، باقات، فوترة',
      homeTitle: 'الحضانة',
      homeHint: 'استقبال وفوترة الأولياء',
      historyLabel: 'الفواتير',
      primaryCta: 'فاتورة جديدة',
    },
  ),
  events: pack(
    'events',
    theme(
      'Événements',
      'حفلات',
      {
        '--bg': '#f4f0f2',
        '--bg-2': '#e6dce2',
        '--ink': '#241820',
        '--muted': '#6e5c68',
        '--card': '#fbf7f9',
        '--line': '#d8ccd3',
        '--brand': '#7a3e5c',
        '--brand-2': '#9a5074',
        '--glow': 'rgba(122, 62, 92, 0.14)',
      },
    ),
    { ...FEAT.service, gallery: true },
    {
      client: 'Client',
      product: 'Formule',
      sell: 'Réserver',
      sellHint: 'Date, forfait, acompte',
      homeTitle: 'Salle des fêtes',
      homeHint: 'Réservations et acomptes',
      historyLabel: 'Réservations',
      primaryCta: 'Nouvelle réservation',
    },
    {
      client: 'زبون',
      product: 'باقة',
      sell: 'حجز',
      sellHint: 'تاريخ، باقة، عربون',
      homeTitle: 'قاعة الأفراح',
      homeHint: 'حجوزات وعربون',
      historyLabel: 'الحجوزات',
      primaryCta: 'حجز جديد',
    },
  ),
  photo: pack(
    'photo',
    THEME_SERVICE,
    { ...FEAT.service, gallery: true },
    {
      client: 'Client',
      product: 'Séance',
      sell: 'Facturer',
      sellHint: 'Séance, album, livraison',
      homeTitle: 'Studio',
      homeHint: 'Séances et livraisons',
      historyLabel: 'Séances',
      primaryCta: 'Nouvelle séance',
    },
    {
      client: 'زبون',
      product: 'جلسة',
      sell: 'فوترة',
      sellHint: 'جلسة، ألبوم، تسليم',
      homeTitle: 'الاستوديو',
      homeHint: 'جلسات وتسليم',
      historyLabel: 'الجلسات',
      primaryCta: 'جلسة جديدة',
    },
  ),
  print: pack(
    'print',
    THEME_SERVICE,
    { ...FEAT.service, homeScan: true },
    {
      client: 'Client',
      product: 'Travail',
      sell: 'Facturer',
      sellHint: 'Devis, tirage, livraison',
      homeTitle: 'Imprimerie',
      homeHint: 'Travaux et devis',
      historyLabel: 'Travaux',
      primaryCta: 'Nouveau travail',
    },
    {
      client: 'زبون',
      product: 'عمل',
      sell: 'فوترة',
      sellHint: 'عرض سعر، طباعة، تسليم',
      homeTitle: 'المطبعة',
      homeHint: 'أعمال وعروض',
      historyLabel: 'الأعمال',
      primaryCta: 'عمل جديد',
    },
  ),
  artisan: pack(
    'artisan',
    THEME_SERVICE,
    { ...FEAT.service, repairOrder: true, gallery: true },
    {
      client: 'Client',
      product: 'Intervention',
      sell: 'Facturer',
      sellHint: 'Devis, dépannage, facture',
      homeTitle: 'Interventions',
      homeHint: 'Devis et interventions',
      historyLabel: 'Interventions',
      primaryCta: 'Nouvelle intervention',
    },
    {
      client: 'زبون',
      product: 'تدخل',
      sell: 'فوترة',
      sellHint: 'عرض سعر، إصلاح، فاتورة',
      homeTitle: 'التدخلات',
      homeHint: 'عروض وتدخلات',
      historyLabel: 'التدخلات',
      primaryCta: 'تدخل جديد',
    },
  ),
  transport: pack(
    'transport',
    THEME_AUTO,
    { ...FEAT.service, depot: true, homeScan: true },
    {
      client: 'Client',
      product: 'Course',
      sell: 'Facturer',
      sellHint: 'Livraison, tournée, encaissement',
      homeTitle: 'Transport',
      homeHint: 'Courses et tournées',
      historyLabel: 'Courses',
      primaryCta: 'Nouvelle course',
    },
    {
      client: 'زبون',
      product: 'رحلة',
      sell: 'فوترة',
      sellHint: 'توصيل، جولة، تحصيل',
      homeTitle: 'النقل',
      homeHint: 'رحلات وجولات',
      historyLabel: 'الرحلات',
      primaryCta: 'رحلة جديدة',
    },
  ),
  it_support: pack(
    'it_support',
    THEME_SERVICE,
    FEAT.service,
    {
      client: 'Client',
      product: 'Intervention',
      sell: 'Facturer',
      sellHint: 'Diagnostic, réparation, forfait',
      homeTitle: 'Dépannage',
      homeHint: 'Tickets et interventions',
      historyLabel: 'Tickets',
      primaryCta: 'Nouveau ticket',
    },
    {
      client: 'زبون',
      product: 'تدخل',
      sell: 'فوترة',
      sellHint: 'تشخيص، إصلاح، باقة',
      homeTitle: 'الصيانة',
      homeHint: 'تذاكر وتدخلات',
      historyLabel: 'التذاكر',
      primaryCta: 'تذكرة جديدة',
    },
  ),
  security: pack(
    'security',
    THEME_LEGAL,
    FEAT.service,
    {
      client: 'Client',
      product: 'Prestation',
      sell: 'Facturer',
      sellHint: 'Gardiennage, rondes, contrats',
      homeTitle: 'Sécurité',
      homeHint: 'Contrats et prestations',
      historyLabel: 'Prestations',
      primaryCta: 'Nouvelle prestation',
    },
    {
      client: 'زبون',
      product: 'خدمة',
      sell: 'فوترة',
      sellHint: 'حراسة، دوريات، عقود',
      homeTitle: 'الأمن',
      homeHint: 'عقود وخدمات',
      historyLabel: 'الخدمات',
      primaryCta: 'خدمة جديدة',
    },
  ),
  spa: pack(
    'spa',
    THEME_SALON,
    { ...FEAT.service, clinicAgenda: true, gallery: true, specialtyDossier: true },
    {
      client: 'Cliente',
      product: 'Soin',
      sell: 'Encaisser',
      sellHint: 'Soins, forfaits, cabines',
      homeTitle: 'Spa',
      homeHint: 'Agenda soins et encaissement',
      historyLabel: 'Soins',
      primaryCta: 'Encaisser un soin',
    },
    {
      client: 'زبونة',
      product: 'عناية',
      sell: 'تحصيل',
      sellHint: 'عناية، باقات، كابينات',
      homeTitle: 'السبا',
      homeHint: 'مواعيد العناية والتحصيل',
      historyLabel: 'العنايات',
      primaryCta: 'تحصيل عناية',
    },
  ),
  generic_service: pack(
    'generic_service',
    THEME_SERVICE,
    FEAT.service,
    {
      client: 'Client',
      product: 'Prestation',
      sell: 'Facturer',
      sellHint: 'Encaisser une prestation',
      homeTitle: 'Services',
      homeHint: 'Prestations et clients',
      historyLabel: 'Prestations',
      primaryCta: 'Facturer',
    },
    {
      client: 'زبون',
      product: 'خدمة',
      sell: 'فوترة',
      sellHint: 'تحصيل الخدمة',
      homeTitle: 'الخدمات',
      homeHint: 'خدمات وزبائن',
      historyLabel: 'الخدمات',
      primaryCta: 'فوترة',
    },
  ),
}

/** Mapping domaine → famille métier */
const DOMAIN_FAMILY: Record<string, MetierFamily> = {
  'gros-alimentaire': 'wholesale',
  'gros-boissons': 'wholesale',
  'gros-cosmetique': 'wholesale',
  'gros-parapharmacie': 'wholesale',
  'gros-chaussures': 'wholesale',
  'gros-vetements': 'wholesale',
  'gros-textile': 'wholesale',
  'gros-lingerie': 'wholesale',
  'gros-animalerie': 'wholesale',
  'gros-quincaillerie': 'wholesale',
  'gros-electro': 'wholesale',
  'gros-telephone': 'wholesale',
  'gros-pieces-auto': 'wholesale',
  'gros-bureautique': 'wholesale',
  'gros-jouets': 'wholesale',
  'gros-meuble': 'wholesale',
  'gros-droguerie': 'wholesale',
  'gros-fruits': 'wholesale',
  'gros-boucherie': 'wholesale',
  'gros-confiserie': 'wholesale',
  'gros-construction': 'wholesale',
  'gros-sanitaire': 'wholesale',
  'gros-peinture': 'wholesale',
  'gros-sport': 'wholesale',
  'gros-baby': 'wholesale',
  'gros-bijoux': 'wholesale',
  'gros-emballage': 'wholesale',
  'gros-informatique': 'wholesale',

  'detail-alimentation': 'grocery',
  'detail-superette': 'grocery',
  'detail-epicerie': 'grocery',
  'detail-kiosque': 'grocery',
  'detail-cosmetique': 'retail',
  'detail-para': 'optic',
  'detail-boulangerie': 'bakery',
  'detail-patisserie': 'bakery',
  'detail-boucherie': 'butcher',
  'detail-poisson': 'butcher',
  'detail-fruits': 'grocery',
  'detail-telephone': 'retail',
  'detail-pretaporter': 'retail',
  'detail-chaussures': 'retail',
  'detail-bijouterie': 'retail',
  'detail-optique': 'optic',
  'detail-droguerie': 'retail',
  'detail-cadeaux': 'retail',
  'detail-librairie': 'retail',
  'detail-animalerie': 'retail',
  'detail-quincaillerie': 'retail',
  'detail-electro': 'retail',
  'detail-meuble': 'retail',
  'detail-jouets': 'retail',
  'detail-sport': 'retail',
  'detail-baby': 'retail',
  'detail-restaurant': 'restaurant',
  'detail-fastfood': 'restaurant',
  'detail-cafe': 'cafe',
  'detail-salon': 'salon',
  'detail-esthetique': 'salon',
  'detail-pressing': 'pressing',
  'detail-fleuriste': 'retail',

  'sante-dentaire': 'dental',
  'sante-radio': 'radio',
  'sante-esthetique': 'medical',
  'sante-dermato': 'medical',
  'sante-general': 'medical',
  'sante-pediatrie': 'medical',
  'sante-gyneco': 'medical',
  'sante-ophtalmo': 'medical',
  'sante-orl': 'medical',
  'sante-kine': 'kine',
  'sante-clinique': 'medical',
  'sante-labo': 'lab',
  'sante-veterinaire': 'vet',
  'sante-optique': 'optic',

  'auto-location': 'car_rental',
  'auto-vente': 'car_sales',
  'auto-showroom': 'car_sales',
  'auto-garage': 'garage',
  'auto-pieces': 'parts',
  'auto-pneus': 'parts',
  'auto-lavage': 'car_wash',

  'svc-avocat': 'legal',
  'svc-comptable': 'accounting',
  'svc-notaire': 'notary',
  'svc-securite': 'security',
  'svc-info': 'it_support',
  'svc-immo': 'realty',
  'svc-voyage': 'travel',
  'svc-hotel': 'hotel',
  'svc-formation': 'school',
  'svc-ecole': 'school',
  'svc-creche': 'creche',
  'svc-sport': 'gym',
  'svc-boxe': 'boxing',
  'svc-football': 'football',
  'svc-yoga': 'yoga',
  'svc-crossfit': 'crossfit',
  'svc-arts-martiaux': 'martial',
  'svc-natation': 'swim',
  'svc-tennis': 'tennis',
  'svc-danse': 'danse',
  'svc-musculation': 'musculation',
  'svc-fetes': 'events',
  'svc-photo': 'photo',
  'svc-print': 'print',
  'svc-couture': 'salon',
  'svc-spa': 'spa',
  'svc-plombier': 'artisan',
  'svc-electricien': 'artisan',
  'svc-clim': 'artisan',
  'svc-menage': 'pressing',
  'svc-transport': 'transport',
}

const MODE_FALLBACK: Record<CommerceMode, MetierFamily> = {
  gros: 'wholesale',
  detail: 'retail',
  sante: 'medical',
  auto: 'garage',
  services: 'generic_service',
}

export function metierFamilyFor(domainId: string | undefined, mode?: CommerceMode): MetierFamily {
  if (domainId && DOMAIN_FAMILY[domainId]) return DOMAIN_FAMILY[domainId]
  return MODE_FALLBACK[mode || 'gros']
}

export function metierPackFor(domainId: string | undefined, mode?: CommerceMode): MetierPack {
  const family = metierFamilyFor(domainId, mode || domainById(domainId || '').mode)
  return PACKS[family]
}

export function metierCopy(
  domainId: string | undefined,
  mode: CommerceMode | undefined,
  lang: Language,
): MetierCopy {
  const pack = metierPackFor(domainId, mode)
  return lang === 'ar' ? pack.copy.ar : pack.copy.fr
}

export function metierVocab(
  domainId: string | undefined,
  mode: CommerceMode | undefined,
  lang: Language,
): DomainVocab {
  const c = metierCopy(domainId, mode, lang)
  return {
    client: c.client,
    product: c.product,
    sell: c.sell,
    sellHint: c.sellHint,
  }
}

export function allMetierFamilies(): MetierFamily[] {
  return Object.keys(PACKS) as MetierFamily[]
}

export { PACKS as METIER_PACKS }
