/**
 * Paramétrage métier par spécialité — pas seulement le sport.
 * Chaque domaine déclare les champs dossier / réglages dont il a besoin
 * (patient, adhérent, cliente salon, dossier juridique, atelier auto…).
 */
import type { MetierFamily } from './metierPacks'

export type SpecialtyFieldKind =
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'number'

export type SpecialtyField = {
  /** Clé stockée sur Client (ex. sportGoal, membershipEnd) */
  key: string
  labelFr: string
  labelAr: string
  hintFr?: string
  hintAr?: string
  kind: SpecialtyFieldKind
  options?: Array<{ value: string; labelFr: string; labelAr: string }>
}

export type SpecialtyProfile = {
  family: MetierFamily
  /** Titre du dossier spécialisé */
  dossierTitleFr: string
  dossierTitleAr: string
  dossierHintFr: string
  dossierHintAr: string
  fields: SpecialtyField[]
  /** Réglages boutique (paramétrage métier) */
  shopParams?: SpecialtyField[]
}

const MEDICAL_FIELDS: SpecialtyField[] = [
  {
    key: 'birthDate',
    labelFr: 'Date de naissance',
    labelAr: 'تاريخ الميلاد',
    kind: 'date',
  },
  {
    key: 'sex',
    labelFr: 'Sexe',
    labelAr: 'الجنس',
    kind: 'select',
    options: [
      { value: 'M', labelFr: 'Homme', labelAr: 'ذكر' },
      { value: 'F', labelFr: 'Femme', labelAr: 'أنثى' },
      { value: 'X', labelFr: 'Autre', labelAr: 'آخر' },
    ],
  },
  {
    key: 'bloodGroup',
    labelFr: 'Groupe sanguin',
    labelAr: 'الزمرة الدموية',
    kind: 'text',
  },
  {
    key: 'allergies',
    labelFr: 'Allergies',
    labelAr: 'الحساسية',
    hintFr: 'Pénicilline, aspirine…',
    hintAr: 'بنسلين، أسبرين…',
    kind: 'textarea',
  },
  {
    key: 'antecedents',
    labelFr: 'Antécédents',
    labelAr: 'السوابق',
    kind: 'textarea',
  },
]

const MEMBERSHIP_FIELDS: SpecialtyField[] = [
  {
    key: 'membershipStart',
    labelFr: 'Début abonnement / contrat',
    labelAr: 'بداية الاشتراك / العقد',
    kind: 'date',
  },
  {
    key: 'membershipEnd',
    labelFr: 'Fin abonnement / contrat',
    labelAr: 'نهاية الاشتراك / العقد',
    kind: 'date',
  },
  {
    key: 'membershipPlan',
    labelFr: 'Formule',
    labelAr: 'الباقة',
    hintFr: 'Mensuel, trimestriel, séances…',
    hintAr: 'شهري، فصلي، حصص…',
    kind: 'text',
  },
]

const COACH_FIELDS: SpecialtyField[] = [
  ...MEMBERSHIP_FIELDS,
  {
    key: 'sportGoal',
    labelFr: 'Objectif',
    labelAr: 'الهدف',
    hintFr: 'Perte de poids, force, compétition…',
    hintAr: 'فقدان وزن، قوة، منافسة…',
    kind: 'text',
  },
  {
    key: 'trainingProgram',
    labelFr: 'Programme',
    labelAr: 'البرنامج',
    hintFr: 'Séances assignées par le coach',
    hintAr: 'حصص يضعها المدرب',
    kind: 'textarea',
  },
  {
    key: 'dietPlan',
    labelFr: 'Régime alimentaire',
    labelAr: 'النظام الغذائي',
    kind: 'textarea',
  },
  {
    key: 'coachNotes',
    labelFr: 'Notes de suivi',
    labelAr: 'ملاحظات المتابعة',
    kind: 'textarea',
  },
  {
    key: 'nfcUid',
    labelFr: 'Puce NFC / badge',
    labelAr: 'شريحة NFC / بطاقة',
    kind: 'text',
  },
]

const PROFILES: Partial<Record<MetierFamily, SpecialtyProfile>> = {
  medical: {
    family: 'medical',
    dossierTitleFr: 'Dossier patient',
    dossierTitleAr: 'ملف المريض',
    dossierHintFr: 'Antécédents, allergies, suivi clinique',
    dossierHintAr: 'سوابق، حساسية، متابعة سريرية',
    fields: MEDICAL_FIELDS,
  },
  dental: {
    family: 'dental',
    dossierTitleFr: 'Dossier dentaire',
    dossierTitleAr: 'ملف الأسنان',
    dossierHintFr: 'Plan de soins, devis, suivi',
    dossierHintAr: 'خطة علاج ومتابعة',
    fields: [
      ...MEDICAL_FIELDS,
      {
        key: 'treatmentPlan',
        labelFr: 'Plan de traitement',
        labelAr: 'خطة العلاج',
        kind: 'textarea',
      },
    ],
  },
  lab: {
    family: 'lab',
    dossierTitleFr: 'Dossier analyses',
    dossierTitleAr: 'ملف التحاليل',
    dossierHintFr: 'Analyses prescrites et résultats',
    dossierHintAr: 'تحاليل ونتائج',
    fields: MEDICAL_FIELDS,
  },
  radio: {
    family: 'radio',
    dossierTitleFr: 'Dossier imagerie',
    dossierTitleAr: 'ملف التصوير',
    dossierHintFr: 'Examens et comptes-rendus',
    dossierHintAr: 'فحوصات وتقارير',
    fields: MEDICAL_FIELDS,
  },
  vet: {
    family: 'vet',
    dossierTitleFr: 'Dossier animal',
    dossierTitleAr: 'ملف الحيوان',
    dossierHintFr: 'Espèce, vaccins, suivi',
    dossierHintAr: 'نوع، تلقيح، متابعة',
    fields: [
      {
        key: 'petSpecies',
        labelFr: 'Espèce / race',
        labelAr: 'النوع / السلالة',
        kind: 'text',
      },
      {
        key: 'allergies',
        labelFr: 'Allergies',
        labelAr: 'الحساسية',
        kind: 'textarea',
      },
      {
        key: 'antecedents',
        labelFr: 'Historique soins',
        labelAr: 'سجل العلاجات',
        kind: 'textarea',
      },
      ...MEMBERSHIP_FIELDS.map((f) =>
        f.key === 'membershipPlan'
          ? { ...f, labelFr: 'Formule suivi', labelAr: 'باقة المتابعة' }
          : f,
      ),
    ],
  },
  kine: {
    family: 'kine',
    dossierTitleFr: 'Dossier kiné',
    dossierTitleAr: 'ملف الترويض',
    dossierHintFr: 'Séances, bilans, objectifs',
    dossierHintAr: 'حصص وتقييمات',
    fields: [
      ...MEDICAL_FIELDS,
      {
        key: 'sportGoal',
        labelFr: 'Objectif rééducation',
        labelAr: 'هدف إعادة التأهيل',
        kind: 'text',
      },
      {
        key: 'trainingProgram',
        labelFr: 'Protocole séances',
        labelAr: 'بروتوكول الحصص',
        kind: 'textarea',
      },
    ],
  },
  gym: {
    family: 'gym',
    dossierTitleFr: 'Dossier adhérent',
    dossierTitleAr: 'ملف المنخرط',
    dossierHintFr: 'Abonnement, programme, régime, objectifs',
    dossierHintAr: 'اشتراك، برنامج، نظام غذائي، أهداف',
    fields: COACH_FIELDS,
    shopParams: [
      {
        key: 'defaultMembershipDays',
        labelFr: 'Durée abonnement défaut (jours)',
        labelAr: 'مدة الاشتراك الافتراضية (أيام)',
        kind: 'number',
      },
    ],
  },
  boxing: {
    family: 'boxing',
    dossierTitleFr: 'Dossier boxeur',
    dossierTitleAr: 'ملف الملاكم',
    dossierHintFr: 'Catégorie de poids, programme, abonnement',
    dossierHintAr: 'فئة الوزن، برنامج، اشتراك',
    fields: [
      ...COACH_FIELDS,
      {
        key: 'weightClass',
        labelFr: 'Catégorie de poids',
        labelAr: 'فئة الوزن',
        kind: 'select',
        options: [
          { value: 'fly', labelFr: 'Mouche', labelAr: 'ذبابة' },
          { value: 'light', labelFr: 'Léger', labelAr: 'خفيف' },
          { value: 'welter', labelFr: 'Welter', labelAr: 'ولتر' },
          { value: 'middle', labelFr: 'Moyen', labelAr: 'متوسط' },
          { value: 'heavy', labelFr: 'Lourd', labelAr: 'ثقيل' },
        ],
      },
    ],
  },
  football: {
    family: 'football',
    dossierTitleFr: 'Dossier joueur',
    dossierTitleAr: 'ملف اللاعب',
    dossierHintFr: 'Équipe, poste, licence, saison',
    dossierHintAr: 'فريق، مركز، رخصة، موسم',
    fields: [
      ...MEMBERSHIP_FIELDS,
      {
        key: 'teamName',
        labelFr: 'Équipe / catégorie',
        labelAr: 'الفريق / الفئة',
        kind: 'text',
      },
      {
        key: 'playerPosition',
        labelFr: 'Poste',
        labelAr: 'المركز',
        kind: 'text',
      },
      {
        key: 'sportGoal',
        labelFr: 'Objectif saison',
        labelAr: 'هدف الموسم',
        kind: 'text',
      },
      {
        key: 'trainingProgram',
        labelFr: 'Programme entraînement',
        labelAr: 'برنامج التدريب',
        kind: 'textarea',
      },
      {
        key: 'coachNotes',
        labelFr: 'Notes coach',
        labelAr: 'ملاحظات المدرب',
        kind: 'textarea',
      },
    ],
  },
  yoga: {
    family: 'yoga',
    dossierTitleFr: 'Dossier pratiquant',
    dossierTitleAr: 'ملف الممارس',
    dossierHintFr: 'Niveau, objectifs, abonnement cours',
    dossierHintAr: 'مستوى، أهداف، اشتراك حصص',
    fields: [
      ...MEMBERSHIP_FIELDS,
      {
        key: 'level',
        labelFr: 'Niveau',
        labelAr: 'المستوى',
        kind: 'select',
        options: [
          { value: 'debutant', labelFr: 'Débutant', labelAr: 'مبتدئ' },
          { value: 'intermediaire', labelFr: 'Intermédiaire', labelAr: 'متوسط' },
          { value: 'avance', labelFr: 'Avancé', labelAr: 'متقدم' },
        ],
      },
      {
        key: 'sportGoal',
        labelFr: 'Intention / objectif',
        labelAr: 'النية / الهدف',
        kind: 'text',
      },
      {
        key: 'dietPlan',
        labelFr: 'Conseils bien-être',
        labelAr: 'نصائح العافية',
        kind: 'textarea',
      },
    ],
  },
  crossfit: {
    family: 'crossfit',
    dossierTitleFr: 'Dossier athlète',
    dossierTitleAr: 'ملف الرياضي',
    dossierHintFr: 'WOD, scores, abonnement box',
    dossierHintAr: 'WOD، نتائج، اشتراك',
    fields: [
      ...COACH_FIELDS,
      {
        key: 'level',
        labelFr: 'Scaled / Rx',
        labelAr: 'Scaled / Rx',
        kind: 'select',
        options: [
          { value: 'scaled', labelFr: 'Scaled', labelAr: 'Scaled' },
          { value: 'rx', labelFr: 'Rx', labelAr: 'Rx' },
        ],
      },
    ],
  },
  martial: {
    family: 'martial',
    dossierTitleFr: 'Dossier pratiquant',
    dossierTitleAr: 'ملف الممارس',
    dossierHintFr: 'Grade / ceinture, programme, licence',
    dossierHintAr: 'رتبة / حزام، برنامج، رخصة',
    fields: [
      ...MEMBERSHIP_FIELDS,
      {
        key: 'beltGrade',
        labelFr: 'Grade / ceinture',
        labelAr: 'الرتبة / الحزام',
        kind: 'text',
      },
      {
        key: 'sportGoal',
        labelFr: 'Objectif',
        labelAr: 'الهدف',
        kind: 'text',
      },
      {
        key: 'trainingProgram',
        labelFr: 'Programme / kata',
        labelAr: 'البرنامج',
        kind: 'textarea',
      },
      {
        key: 'coachNotes',
        labelFr: 'Notes sensei / coach',
        labelAr: 'ملاحظات المدرب',
        kind: 'textarea',
      },
    ],
  },
  swim: {
    family: 'swim',
    dossierTitleFr: 'Dossier nageur',
    dossierTitleAr: 'ملف السباح',
    dossierHintFr: 'Niveau, créneaux, abonnement bassin',
    dossierHintAr: 'مستوى، أوقات، اشتراك المسبح',
    fields: [
      ...MEMBERSHIP_FIELDS,
      {
        key: 'level',
        labelFr: 'Niveau natation',
        labelAr: 'مستوى السباحة',
        kind: 'select',
        options: [
          { value: 'bebe', labelFr: 'Bébé nageur', labelAr: 'رضيع' },
          { value: 'debutant', labelFr: 'Débutant', labelAr: 'مبتدئ' },
          { value: 'perf', labelFr: 'Perf', labelAr: 'أداء' },
        ],
      },
      {
        key: 'trainingProgram',
        labelFr: 'Programme nage',
        labelAr: 'برنامج السباحة',
        kind: 'textarea',
      },
    ],
  },
  salon: {
    family: 'salon',
    dossierTitleFr: 'Fiche technique cliente',
    dossierTitleAr: 'بطاقة الزبونة التقنية',
    dossierHintFr: 'Formule couleur, préférences, historique',
    dossierHintAr: 'تركيبة صبغة، تفضيلات، سجل',
    fields: [
      {
        key: 'colorFormula',
        labelFr: 'Formule coloration',
        labelAr: 'تركيبة الصبغة',
        kind: 'textarea',
      },
      {
        key: 'preferences',
        labelFr: 'Préférences / allergies produits',
        labelAr: 'تفضيلات / حساسية المنتجات',
        kind: 'textarea',
      },
      {
        key: 'coachNotes',
        labelFr: 'Notes styliste',
        labelAr: 'ملاحظات المصمم',
        kind: 'textarea',
      },
    ],
  },
  spa: {
    family: 'spa',
    dossierTitleFr: 'Fiche soins',
    dossierTitleAr: 'بطاقة العناية',
    dossierHintFr: 'Protocoles, contre-indications',
    dossierHintAr: 'بروتوكولات وموانع',
    fields: [
      {
        key: 'allergies',
        labelFr: 'Contre-indications',
        labelAr: 'موانع',
        kind: 'textarea',
      },
      {
        key: 'preferences',
        labelFr: 'Préférences soins',
        labelAr: 'تفضيلات العناية',
        kind: 'textarea',
      },
      {
        key: 'treatmentPlan',
        labelFr: 'Protocole / forfait',
        labelAr: 'بروتوكول / باقة',
        kind: 'textarea',
      },
    ],
  },
  garage: {
    family: 'garage',
    dossierTitleFr: 'Fiche véhicule / client',
    dossierTitleAr: 'بطاقة المركبة / الزبون',
    dossierHintFr: 'Immat, historique OR, prochain entretien',
    dossierHintAr: 'لوحة، سجل إصلاح، صيانة قادمة',
    fields: [
      {
        key: 'vehiclePlate',
        labelFr: 'Immatriculation',
        labelAr: 'رقم اللوحة',
        kind: 'text',
      },
      {
        key: 'vehicleModel',
        labelFr: 'Marque / modèle',
        labelAr: 'العلامة / الطراز',
        kind: 'text',
      },
      {
        key: 'nextService',
        labelFr: 'Prochain entretien',
        labelAr: 'الصيانة القادمة',
        kind: 'date',
      },
      {
        key: 'coachNotes',
        labelFr: 'Notes atelier',
        labelAr: 'ملاحظات الورشة',
        kind: 'textarea',
      },
    ],
  },
  car_rental: {
    family: 'car_rental',
    dossierTitleFr: 'Fiche locataire',
    dossierTitleAr: 'بطاقة المستأجر',
    dossierHintFr: 'Permis, contrats, caution',
    dossierHintAr: 'رخصة، عقود، تأمين',
    fields: [
      ...MEMBERSHIP_FIELDS,
      {
        key: 'licenseId',
        labelFr: 'N° permis',
        labelAr: 'رقم الرخصة',
        kind: 'text',
      },
      {
        key: 'coachNotes',
        labelFr: 'Notes contrat',
        labelAr: 'ملاحظات العقد',
        kind: 'textarea',
      },
    ],
  },
  legal: {
    family: 'legal',
    dossierTitleFr: 'Dossier juridique',
    dossierTitleAr: 'الملف القانوني',
    dossierHintFr: 'Affaire, échéances, honoraires',
    dossierHintAr: 'قضية، آجال، أتعاب',
    fields: [
      {
        key: 'caseRef',
        labelFr: 'Réf. affaire',
        labelAr: 'مرجع القضية',
        kind: 'text',
      },
      {
        key: 'membershipStart',
        labelFr: 'Ouverture dossier',
        labelAr: 'فتح الملف',
        kind: 'date',
      },
      {
        key: 'membershipEnd',
        labelFr: 'Échéance / audience',
        labelAr: 'أجل / جلسة',
        kind: 'date',
      },
      {
        key: 'coachNotes',
        labelFr: 'Notes / diligences',
        labelAr: 'ملاحظات / أعمال',
        kind: 'textarea',
      },
    ],
  },
  hotel: {
    family: 'hotel',
    dossierTitleFr: 'Fiche client hôtel',
    dossierTitleAr: 'بطاقة نزيل',
    dossierHintFr: 'Séjours, préférences chambre',
    dossierHintAr: 'إقامات وتفضيلات الغرفة',
    fields: [
      ...MEMBERSHIP_FIELDS.map((f) =>
        f.key === 'membershipStart'
          ? { ...f, labelFr: 'Arrivée', labelAr: 'الوصول' }
          : f.key === 'membershipEnd'
            ? { ...f, labelFr: 'Départ', labelAr: 'المغادرة' }
            : { ...f, labelFr: 'Type chambre', labelAr: 'نوع الغرفة' },
      ),
      {
        key: 'preferences',
        labelFr: 'Préférences',
        labelAr: 'تفضيلات',
        kind: 'textarea',
      },
    ],
  },
  school: {
    family: 'school',
    dossierTitleFr: 'Dossier élève',
    dossierTitleAr: 'ملف التلميذ',
    dossierHintFr: 'Classe, niveau, scolarité',
    dossierHintAr: 'قسم، مستوى، تمدرس',
    fields: [
      ...MEMBERSHIP_FIELDS,
      {
        key: 'level',
        labelFr: 'Classe / niveau',
        labelAr: 'القسم / المستوى',
        kind: 'text',
      },
      {
        key: 'sportGoal',
        labelFr: 'Objectif pédagogique',
        labelAr: 'الهدف التربوي',
        kind: 'text',
      },
      {
        key: 'coachNotes',
        labelFr: 'Notes enseignant',
        labelAr: 'ملاحظات المعلم',
        kind: 'textarea',
      },
    ],
  },
  restaurant: {
    family: 'restaurant',
    dossierTitleFr: 'Fiche habitué',
    dossierTitleAr: 'بطاقة الزبون المعتاد',
    dossierHintFr: 'Allergies alimentaires, préférences table',
    dossierHintAr: 'حساسية غذائية وتفضيلات الطاولة',
    fields: [
      {
        key: 'allergies',
        labelFr: 'Allergies / régimes',
        labelAr: 'حساسية / أنظمة',
        kind: 'textarea',
      },
      {
        key: 'preferences',
        labelFr: 'Préférences',
        labelAr: 'تفضيلات',
        kind: 'textarea',
      },
    ],
  },
  pressing: {
    family: 'pressing',
    dossierTitleFr: 'Fiche dépôt',
    dossierTitleAr: 'بطاقة الإيداع',
    dossierHintFr: 'Préférences lessive, tickets',
    dossierHintAr: 'تفضيلات الغسيل',
    fields: [
      {
        key: 'preferences',
        labelFr: 'Préférences (amidon, délicat…)',
        labelAr: 'تفضيلات',
        kind: 'textarea',
      },
    ],
  },
  creche: {
    family: 'creche',
    dossierTitleFr: 'Dossier enfant',
    dossierTitleAr: 'ملف الطفل',
    dossierHintFr: 'Allergies, horaires, contacts',
    dossierHintAr: 'حساسية، أوقات، جهات اتصال',
    fields: [
      ...MEDICAL_FIELDS.filter((f) =>
        ['birthDate', 'allergies', 'antecedents'].includes(f.key),
      ),
      ...MEMBERSHIP_FIELDS,
      {
        key: 'preferences',
        labelFr: 'Habitudes / notes',
        labelAr: 'عادات / ملاحظات',
        kind: 'textarea',
      },
    ],
  },
}

/** Alias sport / familles étendues → profil */
const FAMILY_ALIAS: Partial<Record<string, MetierFamily>> = {
  boxing: 'boxing',
  football: 'football',
  yoga: 'yoga',
  crossfit: 'crossfit',
  martial: 'martial',
  swim: 'swim',
  tennis: 'gym',
  danse: 'yoga',
  musculation: 'gym',
}

export function specialtyProfileFor(
  family: MetierFamily | string,
): SpecialtyProfile | null {
  const key = (FAMILY_ALIAS[family] || family) as MetierFamily
  return PROFILES[key] ?? null
}

export function specialtyFieldLabel(
  field: SpecialtyField,
  lang: 'fr' | 'ar',
): string {
  return lang === 'ar' ? field.labelAr : field.labelFr
}

export function specialtyFieldHint(
  field: SpecialtyField,
  lang: 'fr' | 'ar',
): string {
  return (lang === 'ar' ? field.hintAr : field.hintFr) || ''
}
