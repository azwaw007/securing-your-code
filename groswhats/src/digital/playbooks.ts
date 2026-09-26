/**
 * Playbooks marketing, pubs (Meta / Google / TikTok / AdSense / organique)
 * et recherche « produits gagnants » — heuristiques locales, sans API payante.
 */
import type { Language } from '../types'

export type AdsChannelId =
  | 'meta'
  | 'google_ads'
  | 'adsense'
  | 'tiktok'
  | 'organic'
  | 'whatsapp'

export type AdsChannelGuide = {
  id: AdsChannelId
  titleFr: string
  titleAr: string
  summaryFr: string
  summaryAr: string
  stepsFr: string[]
  stepsAr: string[]
  freeTipFr: string
  freeTipAr: string
}

export const ADS_CHANNELS: AdsChannelGuide[] = [
  {
    id: 'meta',
    titleFr: 'Facebook & Instagram Ads',
    titleAr: 'إعلانات فيسبوك وإنستغرام',
    summaryFr: 'Audience magasin / logicielle · pixel · créas courtes',
    summaryAr: 'جمهور محل / برمجيات · بكسل · إبداعات قصيرة',
    stepsFr: [
      'Créer Business Manager + Page + compte pub',
      'Installer pixel (ou API conversions) sur la landing',
      'Campagne « Messages » ou « Conversions » selon l’offre',
      'Budget test 500–2000 DA/j · 3 créas · 2 textes',
      'Couper ce qui a CPA > 2× marge après 48–72 h',
    ],
    stepsAr: [
      'أنشئ Business Manager + صفحة + حساب إعلانات',
      'ثبّت البكسل على صفحة الهبوط',
      'حملة رسائل أو تحويلات حسب العرض',
      'ميزانية تجريبية 500–2000 دج/يوم · 3 إبداعات · نصّان',
      'أوقف ما يتجاوز ضعف الهامش بعد 48–72 ساعة',
    ],
    freeTipFr: 'Organique d’abord : stories + WhatsApp Status gratuits via le cockpit.',
    freeTipAr: 'ابدأ مجاناً: ستوري + حالات واتساب من اللوحة.',
  },
  {
    id: 'google_ads',
    titleFr: 'Google Ads (Search / YouTube)',
    titleAr: 'إعلانات جوجل (بحث / يوتيوب)',
    summaryFr: 'Intent fort (« caisse enregistreuse Algérie », « logiciel stock »)',
    summaryAr: 'نية شراء (« برنامج صندوق الجزائر »، « مخزون »)',
    stepsFr: [
      'Liste 20 mots-clés exacts + exclusions',
      'Annonces RSA avec prix + wilaya',
      'Landing claire : prix, démo, WhatsApp',
      'Budget test · suivi conversions WhatsApp/clics',
    ],
    stepsAr: [
      '20 كلمة مفتاحية دقيقة + استثناءات',
      'إعلانات RSA مع السعر والولاية',
      'صفحة واضحة: سعر، تجربة، واتساب',
      'ميزانية تجريبية · تتبع النقرات/الواتساب',
    ],
    freeTipFr: 'Sans budget : fiche Google Business + SEO local (gratuit).',
    freeTipAr: 'بدون ميزانية: ملف Google Business + SEO محلي مجاني.',
  },
  {
    id: 'adsense',
    titleFr: 'Google AdSense',
    titleAr: 'جوجل أدسنس',
    summaryFr: 'Monétiser un blog / tutoriel / comparateur (trafic organique)',
    summaryAr: 'ربح من مدونة / شروحات / مقارنة (زيارات عضوية)',
    stepsFr: [
      'Site avec contenu original (FR/AR) · HTTPS',
      'Demande AdSense · respecter politiques',
      'Pages utiles : guides produit digital, comparatifs, tutoriels',
      'Combiner AdSense + vente de ton produit en CTA',
    ],
    stepsAr: [
      'موقع بمحتوى أصلي · HTTPS',
      'طلب AdSense · احترام السياسات',
      'صفحات مفيدة: أدلة منتجك الرقمي',
      'ادمج AdSense مع زر شراء منتجك',
    ],
    freeTipFr: 'AdSense = revenu passif ; ce n’est pas une pub pour vendre ton logiciel.',
    freeTipAr: 'أدسنس دخل سلبي؛ ليس إعلاناً لبيع برنامجك.',
  },
  {
    id: 'tiktok',
    titleFr: 'TikTok Ads & organique',
    titleAr: 'تيك توك إعلانات وعضوي',
    summaryFr: 'Hooks 3 s · démo caisse · avant/après magasin',
    summaryAr: 'خطاف 3 ثوانٍ · عرض الصندوق · قبل/بعد المحل',
    stepsFr: [
      'Compte Business · 5 vidéos organiques/semaine',
      'Spark Ads sur les organiques qui marchent',
      'CTA WhatsApp / lien bio',
      'Éviter claims mensongers (prix, licences)',
    ],
    stepsAr: [
      'حساب أعمال · 5 فيديوهات عضوية/أسبوع',
      'Spark Ads على الفيديوهات الناجحة',
      'زر واتساب / رابط البايو',
      'تجنّب ادعاءات كاذبة (سعر، تراخيص)',
    ],
    freeTipFr: '90 % du ROI TikTok vient de l’organique bien monté, pas du boost.',
    freeTipAr: '90٪ من النتيجة من المحتوى العضوي الجيد لا من الدفع.',
  },
  {
    id: 'organic',
    titleFr: 'Organique (SEO, groupes, WhatsApp)',
    titleAr: 'عضوي (SEO، مجموعات، واتساب)',
    summaryFr: 'Zéro budget pub · prospects + stories + groupes métiers',
    summaryAr: 'بدون ميزانية · زبائن محتملون + ستوري + مجموعات',
    stepsFr: [
      'Importer prospects (CSV / colle)',
      'Story du jour + post du jour',
      'Relance WhatsApp max ~20/jour',
      'Groupes Facebook métiers (épicerie, garage…)',
      'Réponses auto aux leads',
    ],
    stepsAr: [
      'استورد prospects',
      'ستوري اليوم + منشور اليوم',
      'واتساب ≈20/يوم كحد',
      'مجموعات فيسبوك حسب المهنة',
      'رد آلي على الرسائل',
    ],
    freeTipFr: 'C’est le cœur gratuit d’AZ Digital — boutons ci-dessous.',
    freeTipAr: 'هذا قلب AZ Digital المجاني — الأزرار بالأسفل.',
  },
  {
    id: 'whatsapp',
    titleFr: 'WhatsApp Business',
    titleAr: 'واتساب أعمال',
    summaryFr: 'Canal #1 en Algérie pour closer une vente digitale',
    summaryAr: 'القناة الأولى في الجزائر لإغلاق البيع الرقمي',
    stepsFr: [
      'Catalogue WhatsApp + étiquettes',
      'Message d’accueil + liens démo',
      'Statuts quotidiens (story pack)',
      'Broadcast listes soigneusement (opt-in)',
    ],
    stepsAr: [
      'كتالوج واتساب + تسميات',
      'رسالة ترحيب + روابط تجربة',
      'حالات يومية',
      'قوائم بث بحذر (موافقة)',
    ],
    freeTipFr: 'Chaque produit digital a un pitch WhatsApp en 1 clic.',
    freeTipAr: 'كل منتج رقمي له رسالة واتساب بضغطة.',
  },
]

export type WinningIdea = {
  id: string
  nicheFr: string
  nicheAr: string
  type: 'physical' | 'digital'
  score: number
  whyFr: string
  whyAr: string
  strategyFr: string[]
  strategyAr: string[]
}

/** Niches « gagnantes » heuristiques marché DZ / digital — pas une garantie de profit */
export const WINNING_IDEAS: WinningIdea[] = [
  {
    id: 'pos-soft',
    nicheFr: 'Logiciel / SaaS digital (caisse, stock, abonnement)',
    nicheAr: 'برمجيات / SaaS رقمي (صندوق، مخزون، اشتراك)',
    type: 'digital',
    score: 92,
    whyFr: 'Demande locale forte, paiement DA, support WhatsApp',
    whyAr: 'طلب محلي قوي، دفع بالدينار، دعم واتساب',
    strategyFr: [
      'Démo gratuite + essai 14 j',
      'Ads Meta messages + organique groupes métiers',
      'Upsell offre Pro multi-postes',
    ],
    strategyAr: [
      'تجربة مجانية 14 يوماً',
      'إعلانات رسائل + مجموعات مهنية',
      'ترقية Pro متعدد المناصب',
    ],
  },
  {
    id: 'templates',
    nicheFr: 'Templates landing + factures',
    nicheAr: 'قوالب صفحات هبوط وفواتير',
    type: 'digital',
    score: 78,
    whyFr: 'Faible coût de livraison, marge haute',
    whyAr: 'تكلفة تسليم منخفضة وهامش عالٍ',
    strategyFr: ['Pack Canva/HTML', 'Upsell installation', 'AdSense sur tutoriels'],
    strategyAr: ['باقة Canva/HTML', 'بيع تركيب', 'أدسنس على الشروحات'],
  },
  {
    id: 'epicerie-pack',
    nicheFr: 'Pack démarrage épicerie (physique + digital)',
    nicheAr: 'باقة انطلاق بقالة (مادي + رقمي)',
    type: 'physical',
    score: 85,
    whyFr: 'Besoin récurrent + upsell logiciel / catalogue digital',
    whyAr: 'حاجة متكررة + ترقية برمجيات / كتالوج رقمي',
    strategyFr: ['Liste produits gagnants rayons', 'Crédit client + rappels', 'Pub locale wilaya'],
    strategyAr: ['قائمة منتجات رابحة', 'دين زبون + تذكير', 'إعلان محلي'],
  },
  {
    id: 'formation',
    nicheFr: 'Formation en ligne compta / stock / digital',
    nicheAr: 'دورة أونلاين محاسبة / مخزون / رقمي',
    type: 'digital',
    score: 74,
    whyFr: 'Contenu réutilisable + AdSense + vente de ton offre',
    whyAr: 'محتوى يُعاد بيعه + أدسنس + بيع عرضك',
    strategyFr: ['YouTube organique', 'PDF payant', 'Webinaire WhatsApp'],
    strategyAr: ['يوتيوب عضوي', 'PDF مدفوع', 'ندوة واتساب'],
  },
  {
    id: 'print-on-demand',
    nicheFr: 'Visuels pub magasin (print / digital)',
    nicheAr: 'تصاميم إعلان للمحلات',
    type: 'digital',
    score: 70,
    whyFr: 'Service rapide, clients locaux',
    whyAr: 'خدمة سريعة وعملاء محليون',
    strategyFr: ['Portfolio IG', 'Packs prix fixes', 'Cross-sell AZ Digital'],
    strategyAr: ['معرض إنستغرام', 'أسعار ثابتة', 'بيع متقاطع AZ Digital'],
  },
]

export function channelTitle(c: AdsChannelGuide, lang: Language): string {
  return lang === 'ar' ? c.titleAr : c.titleFr
}

export function ideaNiche(i: WinningIdea, lang: Language): string {
  return lang === 'ar' ? i.nicheAr : i.nicheFr
}

export type ActionButton = {
  id: string
  labelFr: string
  labelAr: string
  /** Phrase envoyée à runCampaignCommand / agent */
  command: string
  tone: 'primary' | 'secondary' | 'accent'
}

/** Boutons one-tap — organique + campagne */
export const ORGANIC_ACTIONS: ActionButton[] = [
  {
    id: 'launch',
    labelFr: 'Lancer campagne 7 j',
    labelAr: 'ابدأ حملة 7 أيام',
    command: 'lance campagne',
    tone: 'primary',
  },
  {
    id: 'status',
    labelFr: 'Statut campagne',
    labelAr: 'حالة الحملة',
    command: 'statut campagne',
    tone: 'secondary',
  },
  {
    id: 'story',
    labelFr: 'Story du jour',
    labelAr: 'ستوري اليوم',
    command: 'story du jour',
    tone: 'accent',
  },
  {
    id: 'post',
    labelFr: 'Post du jour',
    labelAr: 'منشور اليوم',
    command: 'post du jour',
    tone: 'accent',
  },
  {
    id: 'relance',
    labelFr: 'Relancer 5 prospects',
    labelAr: 'راسل 5 prospects',
    command: 'relance prospects 5',
    tone: 'primary',
  },
  {
    id: 'stats',
    labelFr: 'Stats prospects',
    labelAr: 'إحصاء prospects',
    command: 'prospects statut',
    tone: 'secondary',
  },
  {
    id: 'strategy',
    labelFr: 'Plan marketing',
    labelAr: 'خطة تسويق',
    command: 'strategie',
    tone: 'secondary',
  },
  {
    id: 'meta',
    labelFr: 'Setup Meta',
    labelAr: 'إعداد ميتا',
    command: 'meta setup',
    tone: 'secondary',
  },
]

export function actionLabel(a: ActionButton, lang: Language): string {
  return lang === 'ar' ? a.labelAr : a.labelFr
}
