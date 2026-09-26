/**
 * Packs de réservation agentique par famille métier —
 * créneaux, capacité, segments tarifaires et options combinables.
 */
import type { MetierFamily } from '../locale/metierPacks'
import type { Language } from '../types'

export type BookingSegment = 'weekday' | 'weekend' | 'peak' | 'offpeak'

export type BookingOption = {
  id: string
  labelFr: string
  labelAr: string
  /** Prix de base (DA) avant multiplicateur de segment */
  priceDa: number
  /** Minutes ajoutées à la durée si coché */
  extraMin?: number
  /** Incompatible avec ces option ids */
  conflictsWith?: string[]
}

export type BookingPack = {
  family: MetierFamily
  /** Libellé ressource (salle, fauteuil, atelier…) */
  resourceFr: string
  resourceAr: string
  /** Durée par défaut (min) */
  defaultDurationMin: number
  /** Durées proposées */
  durationPresets: number[]
  /** Capacité simultanée (1 = exclusif) */
  capacity: number
  /** Buffer entre deux RDV (min) */
  bufferMin: number
  openHour: number
  closeHour: number
  /** 0=dim … 6=sam — jours fermés */
  closedWeekdays: number[]
  /** Prix de base du créneau (DA) */
  basePriceDa: number
  /** Multiplicateurs par segment */
  segmentMult: Record<BookingSegment, number>
  /** Heures « peak » (ex. 18–22) */
  peakHours?: { start: number; end: number }
  options: BookingOption[]
}

function opt(
  id: string,
  labelFr: string,
  labelAr: string,
  priceDa: number,
  extraMin?: number,
  conflictsWith?: string[],
): BookingOption {
  return { id, labelFr, labelAr, priceDa, extraMin, conflictsWith }
}

const CLINIC: BookingPack = {
  family: 'medical',
  resourceFr: 'Cabinet',
  resourceAr: 'العيادة',
  defaultDurationMin: 30,
  durationPresets: [15, 30, 45, 60],
  capacity: 1,
  bufferMin: 5,
  openHour: 8,
  closeHour: 18,
  closedWeekdays: [5], // vendredi
  basePriceDa: 2000,
  segmentMult: { weekday: 1, weekend: 1.15, peak: 1.1, offpeak: 0.9 },
  peakHours: { start: 16, end: 18 },
  options: [
    opt('controle', 'Contrôle', 'فحص', 0, 0),
    opt('urgence', 'Urgence', 'استعجالي', 1500, 15),
    opt('ordo', 'Ordonnance / suivi', 'وصفة / متابعة', 500, 10),
  ],
}

const EVENTS: BookingPack = {
  family: 'events',
  resourceFr: 'Salle',
  resourceAr: 'القاعة',
  defaultDurationMin: 240,
  durationPresets: [120, 180, 240, 360, 480],
  capacity: 1,
  bufferMin: 60,
  openHour: 10,
  closeHour: 2, // wrap midnight → treated specially if close < open
  closedWeekdays: [],
  basePriceDa: 40000,
  segmentMult: { weekday: 0.85, weekend: 1.25, peak: 1.4, offpeak: 0.75 },
  peakHours: { start: 18, end: 23 },
  options: [
    opt('dj', 'DJ / animation', 'دي جي / تنشيط', 15000, 0),
    opt('cuisine', 'Cuisine / traiteur', 'مطبخ / تموين', 25000, 60),
    opt('materiel', 'Matériel (chaises, tables…)', 'معدات (كراسي، طاولات…)', 8000, 30),
    opt('sono', 'Sono + éclairage', 'صوت وإضاءة', 12000, 0),
    opt('deco', 'Décoration', 'ديكور', 15000, 60),
    opt('photo', 'Photographe / vidéo', 'تصوير / فيديو', 20000, 0),
    opt('heure_supp', 'Heure supplémentaire', 'ساعة إضافية', 5000, 60),
    opt('gateau', 'Gâteau / pièce montée', 'كعكة / قطعة', 8000, 0),
  ],
}

const SALON: BookingPack = {
  family: 'salon',
  resourceFr: 'Poste coiffure',
  resourceAr: 'منصب حلاقة',
  defaultDurationMin: 45,
  durationPresets: [30, 45, 60, 90, 120],
  capacity: 3,
  bufferMin: 10,
  openHour: 9,
  closeHour: 20,
  closedWeekdays: [],
  basePriceDa: 800,
  segmentMult: { weekday: 1, weekend: 1.2, peak: 1.15, offpeak: 0.85 },
  peakHours: { start: 17, end: 20 },
  options: [
    opt('coupe', 'Coupe', 'قص', 0, 0),
    opt('couleur', 'Couleur', 'صبغة', 2500, 45),
    opt('brushing', 'Brushing', 'تمليس', 800, 20),
    opt('soin', 'Soin / masque', 'عناية', 1200, 15),
    opt('mariage', 'Coiffure mariage', 'تسريحة زفاف', 5000, 60),
  ],
}

const HOTEL: BookingPack = {
  family: 'hotel',
  resourceFr: 'Chambre / salle',
  resourceAr: 'غرفة / قاعة',
  defaultDurationMin: 1440,
  durationPresets: [1440, 2880, 4320],
  capacity: 8,
  bufferMin: 120,
  openHour: 14,
  closeHour: 12,
  closedWeekdays: [],
  basePriceDa: 6000,
  segmentMult: { weekday: 0.9, weekend: 1.3, peak: 1.5, offpeak: 0.8 },
  options: [
    opt('petit_dej', 'Petit-déjeuner', 'فطور', 800, 0),
    opt('demi_pension', 'Demi-pension', 'نصف إقامة', 2500, 0, ['pension_complete']),
    opt('pension_complete', 'Pension complète', 'إقامة كاملة', 4500, 0, ['demi_pension']),
    opt('salle_reunion', 'Salle réunion', 'قاعة اجتماع', 8000, 0),
  ],
}

const GARAGE: BookingPack = {
  family: 'garage',
  resourceFr: 'Atelier',
  resourceAr: 'الورشة',
  defaultDurationMin: 60,
  durationPresets: [30, 60, 120, 240],
  capacity: 2,
  bufferMin: 15,
  openHour: 8,
  closeHour: 18,
  closedWeekdays: [5],
  basePriceDa: 1500,
  segmentMult: { weekday: 1, weekend: 1.2, peak: 1.1, offpeak: 0.9 },
  options: [
    opt('diag', 'Diagnostic', 'تشخيص', 0, 0),
    opt('vidange', 'Vidange', 'تغيير زيت', 2000, 30),
    opt('freins', 'Freins', 'فرامل', 3500, 60),
    opt('urgent', 'Dépannage urgent', 'إصلاح مستعجل', 2000, 0),
  ],
}

const GYM: BookingPack = {
  family: 'gym',
  resourceFr: 'Séance / coach',
  resourceAr: 'حصة / مدرب',
  defaultDurationMin: 60,
  durationPresets: [45, 60, 90],
  capacity: 12,
  bufferMin: 0,
  openHour: 7,
  closeHour: 22,
  closedWeekdays: [],
  basePriceDa: 500,
  segmentMult: { weekday: 1, weekend: 1.1, peak: 1.2, offpeak: 0.85 },
  peakHours: { start: 18, end: 21 },
  options: [
    opt('coach', 'Coach personnel', 'مدرب شخصي', 1500, 0),
    opt('groupe', 'Cours collectif', 'حصة جماعية', 0, 0),
    opt('eval', 'Évaluation physique', 'تقييم بدني', 1000, 15),
  ],
}

const GENERIC_SERVICE: BookingPack = {
  family: 'generic_service',
  resourceFr: 'Créneau',
  resourceAr: 'موعد',
  defaultDurationMin: 60,
  durationPresets: [30, 60, 90, 120],
  capacity: 2,
  bufferMin: 10,
  openHour: 9,
  closeHour: 18,
  closedWeekdays: [],
  basePriceDa: 2000,
  segmentMult: { weekday: 1, weekend: 1.15, peak: 1.1, offpeak: 0.9 },
  options: [
    opt('standard', 'Prestation standard', 'خدمة عادية', 0, 0),
    opt('premium', 'Formule premium', 'باقة مميزة', 3000, 30),
    opt('deplacement', 'Déplacement', 'تنقل', 800, 0),
  ],
}

const RETAIL_LIGHT: BookingPack = {
  family: 'retail',
  resourceFr: 'RDV client',
  resourceAr: 'موعد زبون',
  defaultDurationMin: 30,
  durationPresets: [15, 30, 45, 60],
  capacity: 4,
  bufferMin: 5,
  openHour: 9,
  closeHour: 19,
  closedWeekdays: [],
  basePriceDa: 0,
  segmentMult: { weekday: 1, weekend: 1, peak: 1, offpeak: 1 },
  options: [
    opt('essai', 'Essayage / conseil', 'تجربة / استشارة', 0, 0),
    opt('commande', 'Commande spéciale', 'طلب خاص', 0, 15),
    opt('livraison', 'Créneau livraison', 'موعد توصيل', 0, 0),
  ],
}

/** Mapping famille → pack (avec alias) */
const BY_FAMILY: Partial<Record<MetierFamily, BookingPack>> = {
  medical: CLINIC,
  dental: { ...CLINIC, family: 'dental', resourceFr: 'Fauteuil', resourceAr: 'كرسي أسنان', basePriceDa: 2500 },
  lab: { ...CLINIC, family: 'lab', defaultDurationMin: 20, durationPresets: [15, 20, 30], capacity: 4, basePriceDa: 1500 },
  radio: { ...CLINIC, family: 'radio', defaultDurationMin: 30, capacity: 2, basePriceDa: 3000 },
  vet: { ...CLINIC, family: 'vet', resourceFr: 'Consultation', resourceAr: 'استشارة', basePriceDa: 1500 },
  kine: { ...CLINIC, family: 'kine', defaultDurationMin: 45, basePriceDa: 2000 },
  optic: { ...CLINIC, family: 'optic', defaultDurationMin: 30, capacity: 2, basePriceDa: 0 },
  events: EVENTS,
  salon: SALON,
  spa: {
    ...SALON,
    family: 'spa',
    resourceFr: 'Cabine',
    resourceAr: 'كابينة',
    defaultDurationMin: 60,
    basePriceDa: 3500,
    options: [
      opt('massage', 'Massage', 'مساج', 0, 0),
      opt('hammam', 'Hammam', 'حمام', 2000, 30),
      opt('soin_visage', 'Soin visage', 'عناية وجه', 2500, 45),
      opt('duo', 'Formule duo', 'باقة ثنائية', 4000, 0),
    ],
  },
  pressing: {
    ...GENERIC_SERVICE,
    family: 'pressing',
    defaultDurationMin: 30,
    capacity: 6,
    basePriceDa: 0,
    options: [
      opt('retrait', 'Retrait commande', 'استلام طلب', 0, 0),
      opt('urgent', 'Express 2 h', 'مستعجل ساعتان', 500, 0),
    ],
  },
  hotel: HOTEL,
  travel: {
    ...GENERIC_SERVICE,
    family: 'travel',
    resourceFr: 'RDV agence',
    resourceAr: 'موعد وكالة',
    basePriceDa: 0,
    options: [
      opt('devis', 'Devis voyage', 'عرض سفر', 0, 30),
      opt('visa', 'Dossier visa', 'ملف فيزا', 0, 45),
      opt('billet', 'Émission billet', 'إصدار تذكرة', 0, 20),
    ],
  },
  garage: GARAGE,
  car_rental: {
    ...GARAGE,
    family: 'car_rental',
    resourceFr: 'Véhicule',
    resourceAr: 'سيارة',
    defaultDurationMin: 60,
    capacity: 5,
    basePriceDa: 4000,
    options: [
      opt('jour', 'Location journée', 'كراء يومي', 0, 0),
      opt('chauffeur', 'Avec chauffeur', 'مع سائق', 3000, 0),
      opt('assurance', 'Assurance tous risques', 'تأمين شامل', 1500, 0),
    ],
  },
  car_wash: {
    ...GARAGE,
    family: 'car_wash',
    defaultDurationMin: 30,
    capacity: 3,
    basePriceDa: 400,
    closedWeekdays: [],
    options: [
      opt('ext', 'Extérieur', 'خارجي', 0, 0),
      opt('int', 'Intérieur', 'داخلي', 300, 15),
      opt('complet', 'Complet', 'كامل', 500, 20),
    ],
  },
  parts: { ...GARAGE, family: 'parts', capacity: 4, basePriceDa: 0, options: [opt('commande', 'Retrait pièce', 'استلام قطعة', 0, 0)] },
  legal: {
    ...GENERIC_SERVICE,
    family: 'legal',
    resourceFr: 'Consultation',
    resourceAr: 'استشارة',
    defaultDurationMin: 45,
    capacity: 1,
    basePriceDa: 5000,
    options: [
      opt('consult', 'Consultation', 'استشارة', 0, 0),
      opt('acte', 'Acte / dossier', 'عقد / ملف', 8000, 60),
      opt('urgence', 'Urgence', 'استعجالي', 3000, 0),
    ],
  },
  accounting: {
    ...GENERIC_SERVICE,
    family: 'accounting',
    basePriceDa: 3000,
    options: [
      opt('bilan', 'Bilan / liasse', 'ميزانية', 0, 60),
      opt('paie', 'Paie', 'أجور', 2000, 30),
      opt('fiscal', 'Déclaration fiscale', 'تصريح جبائي', 2500, 45),
    ],
  },
  notary: {
    ...GENERIC_SERVICE,
    family: 'notary',
    capacity: 1,
    basePriceDa: 8000,
    options: [
      opt('signature', 'Signature acte', 'توقيع عقد', 0, 30),
      opt('rdv_prep', 'Préparation dossier', 'تحضير ملف', 0, 45),
    ],
  },
  realty: {
    ...GENERIC_SERVICE,
    family: 'realty',
    basePriceDa: 0,
    options: [
      opt('visite', 'Visite bien', 'معاينة عقار', 0, 45),
      opt('estimation', 'Estimation', 'تقييم', 0, 60),
      opt('compromis', 'Compromis', 'وعد بالبيع', 0, 90),
    ],
  },
  school: {
    ...GENERIC_SERVICE,
    family: 'school',
    capacity: 1,
    basePriceDa: 0,
    options: [
      opt('inscription', 'Inscription', 'تسجيل', 0, 30),
      opt('parent', 'RDV parents', 'موعد أولياء', 0, 30),
      opt('cours', 'Cours particulier', 'درس خصوصي', 1500, 60),
    ],
  },
  creche: {
    ...GENERIC_SERVICE,
    family: 'creche',
    capacity: 1,
    basePriceDa: 0,
    options: [
      opt('visite', 'Visite structure', 'زيارة', 0, 30),
      opt('inscription', 'Inscription', 'تسجيل', 0, 45),
    ],
  },
  gym: GYM,
  boxing: { ...GYM, family: 'boxing' },
  football: { ...GYM, family: 'football', capacity: 22 },
  yoga: { ...GYM, family: 'yoga', capacity: 15 },
  crossfit: { ...GYM, family: 'crossfit', capacity: 16 },
  martial: { ...GYM, family: 'martial' },
  swim: { ...GYM, family: 'swim', capacity: 20 },
  tennis: { ...GYM, family: 'tennis', capacity: 4, defaultDurationMin: 60 },
  danse: { ...GYM, family: 'danse', capacity: 20 },
  musculation: { ...GYM, family: 'musculation' },
  photo: {
    ...GENERIC_SERVICE,
    family: 'photo',
    defaultDurationMin: 90,
    capacity: 1,
    basePriceDa: 4000,
    options: [
      opt('studio', 'Studio', 'استوديو', 0, 0),
      opt('exterieur', 'Extérieur', 'خارجي', 2000, 30),
      opt('mariage', 'Mariage journée', 'زفاف يوم كامل', 20000, 360),
      opt('album', 'Album', 'ألبوم', 6000, 0),
    ],
  },
  print: {
    ...RETAIL_LIGHT,
    family: 'print',
    options: [
      opt('devis', 'Devis impression', 'عرض طباعة', 0, 15),
      opt('retrait', 'Retrait commande', 'استلام', 0, 10),
    ],
  },
  artisan: {
    ...GENERIC_SERVICE,
    family: 'artisan',
    openHour: 8,
    closeHour: 17,
    basePriceDa: 1500,
    options: [
      opt('devis', 'Devis sur place', 'عرض في الموقع', 0, 45),
      opt('intervention', 'Intervention', 'تدخل', 0, 60),
      opt('urgent', 'Urgence', 'استعجالي', 2000, 0),
    ],
  },
  transport: {
    ...GENERIC_SERVICE,
    family: 'transport',
    capacity: 3,
    basePriceDa: 400,
    options: [
      opt('course', 'Course', 'مشوار', 0, 30),
      opt('demenagement', 'Déménagement', 'نقل أثاث', 8000, 240),
    ],
  },
  it_support: {
    ...GENERIC_SERVICE,
    family: 'it_support',
    basePriceDa: 2000,
    options: [
      opt('diag', 'Diagnostic', 'تشخيص', 0, 30),
      opt('intervention', 'Intervention', 'تدخل', 0, 60),
      opt('remote', 'Assistance à distance', 'دعم عن بعد', 1000, 30),
    ],
  },
  security: {
    ...GENERIC_SERVICE,
    family: 'security',
    capacity: 1,
    basePriceDa: 0,
    options: [
      opt('audit', 'Audit site', 'تدقيق موقع', 0, 60),
      opt('contrat', 'Contrat gardiennage', 'عقد حراسة', 0, 45),
    ],
  },
  restaurant: {
    ...GENERIC_SERVICE,
    family: 'restaurant',
    defaultDurationMin: 90,
    capacity: 20,
    openHour: 11,
    closeHour: 23,
    basePriceDa: 0,
    options: [
      opt('table2', 'Table 2 pers.', 'طاولة لشخصين', 0, 0),
      opt('table4', 'Table 4 pers.', 'طاولة لـ 4', 0, 0),
      opt('groupe', 'Groupe / privatisation', 'مجموعة / حجز خاص', 5000, 120),
    ],
  },
  cafe: {
    ...GENERIC_SERVICE,
    family: 'cafe',
    defaultDurationMin: 60,
    capacity: 15,
    basePriceDa: 0,
    options: [opt('table', 'Réserver table', 'حجز طاولة', 0, 0)],
  },
  game_room: {
    ...GENERIC_SERVICE,
    family: 'game_room',
    defaultDurationMin: 60,
    capacity: 8,
    openHour: 10,
    closeHour: 2,
    basePriceDa: 200,
    options: [
      opt('ps', 'Poste console', 'منصب ألعاب', 0, 0),
      opt('tournoi', 'Tournoi', 'دوري', 1000, 120),
    ],
  },
  wholesale: RETAIL_LIGHT,
  retail: RETAIL_LIGHT,
  grocery: { ...RETAIL_LIGHT, family: 'grocery' },
  bakery: { ...RETAIL_LIGHT, family: 'bakery' },
  butcher: { ...RETAIL_LIGHT, family: 'butcher' },
  car_sales: {
    ...GENERIC_SERVICE,
    family: 'car_sales',
    capacity: 2,
    basePriceDa: 0,
    options: [
      opt('essai', 'Essai route', 'تجربة قيادة', 0, 45),
      opt('visite', 'Visite showroom', 'زيارة المعرض', 0, 30),
    ],
  },
  generic_service: GENERIC_SERVICE,
}

export function bookingPackFor(family: MetierFamily | undefined): BookingPack {
  if (family && BY_FAMILY[family]) return BY_FAMILY[family]!
  return GENERIC_SERVICE
}

export function optionLabel(opt: BookingOption, lang: Language): string {
  return lang === 'ar' ? opt.labelAr : opt.labelFr
}

export function resourceLabel(pack: BookingPack, lang: Language): string {
  return lang === 'ar' ? pack.resourceAr : pack.resourceFr
}
