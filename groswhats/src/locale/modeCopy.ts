import type { CommerceMode, Language } from '../types'
import { t } from '../i18n'

/** Modes sans « vente » (prestations / actes). */
export function isServiceLikeMode(mode: CommerceMode | undefined): boolean {
  return mode === 'services' || mode === 'sante'
}

type Dict = Record<string, string>

/** Libellés FR/AR sans famille « vente » pour services & santé. */
const SERVICE_FR: Dict = {
  order: 'Facturer',
  appOrder: 'Facturer',
  appQuick: 'Facturer',
  sellNow: 'FACTURER',
  sellNowHint: 'Appuie ici',
  startSell: '3. Facturer',
  startSellHint: 'Quand tu as une prestation',
  emptyCatalogHint: 'Ajoute d’abord une prestation pour facturer.',
  todayOrders: 'Prestations aujourd’hui',
  profitOrders: 'Nombre de prestations',
  newOrder: 'Nouvelle prestation',
  lastOrders: 'Dernières prestations',
  noOrdersToday: 'Aucune prestation aujourd’hui',
  price: 'Tarif (DA)',
  profitHint: 'Gain = tarif − coût',
  pricingBoardTitle: 'Tes tarifs',
  sellPriceShort: 'Tarif',
  quickSale: 'Encaissement rapide (sans client)',
  quickSaleHint: 'Pas besoin de nom ni WhatsApp — juste le ticket.',
  quickSaleHintShort: 'Sans nom',
  creditNeedsClient: 'Pour facturer à crédit, choisis un client.',
  noWhatsappQuick: 'Pas de WhatsApp : encaissement sans numéro.',
  orderReady: 'Prestation prête',
  orderReadyHint: 'Imprime le ticket, envoie WhatsApp, ou les deux.',
  history: 'Historique',
  historyHint: 'Toutes les prestations — cherche par client ou date.',
  historyActivityHint: 'Tout ce qui s’est passé : prestations, factures, clients, caisse…',
  ordersInPeriod: 'Prestations liées',
  act_order: 'Prestations',
  sellAgain: 'Facturer encore',
  salesHistoryBtn: 'Historique des prestations',
  returnsHint: 'Choisis une prestation, la quantité à reprendre, puis cash ou crédit client.',
  returnsPickOrder: 'Prestation / facture',
  catalogForClient: 'Prestation pour',
  roleOwnerHint: 'Prestations, stock, tournées',
}

const SERVICE_AR: Dict = {
  order: 'فوترة',
  appOrder: 'فوترة',
  appQuick: 'فوترة',
  sellNow: 'فوترة',
  sellNowHint: 'اضغط هنا',
  startSell: '3. فوترة',
  startSellHint: 'كي تكون عندك خدمة',
  emptyCatalogHint: 'زيد خدمة قبل الفوترة.',
  todayOrders: 'خدمات اليوم',
  profitOrders: 'عدد الخدمات',
  newOrder: 'خدمة جديدة',
  lastOrders: 'آخر الخدمات',
  noOrdersToday: 'لا خدمات اليوم',
  price: 'التعريفة (دج)',
  profitHint: 'الربح = التعريفة − التكلفة',
  pricingBoardTitle: 'تعريفاتك',
  sellPriceShort: 'تعريفة',
  quickSale: 'تحصيل سريع (بدون زبون)',
  quickSaleHint: 'بدون اسم ولا واتساب — تذكرة فقط.',
  quickSaleHintShort: 'بدون اسم',
  creditNeedsClient: 'للدين اختر زبوناً.',
  noWhatsappQuick: 'لا واتساب: تحصيل بدون رقم.',
  orderReady: 'الخدمة جاهزة',
  orderReadyHint: 'اطبع التذكرة أو أرسل واتساب.',
  history: 'السجل',
  historyHint: 'كل الخدمات — ابحث بالزبون أو التاريخ.',
  historyActivityHint: 'كل ما حصل: خدمات، فواتير، زبائن، صندوق…',
  ordersInPeriod: 'خدمات مرتبطة',
  act_order: 'خدمات',
  sellAgain: 'فوترة أخرى',
  salesHistoryBtn: 'سجل الخدمات',
  returnsHint: 'اختر خدمة ثم الكمية ثم نقداً أو دين.',
  returnsPickOrder: 'خدمة / فاتورة',
  catalogForClient: 'خدمة لـ',
  roleOwnerHint: 'خدمات، مخزون، جولات',
}

const SANTE_FR: Dict = {
  ...SERVICE_FR,
  order: 'Encaisser',
  appOrder: 'Encaisser',
  appQuick: 'Encaisser',
  sellNow: 'ENCAISSER',
  startSell: '3. Encaisser',
  startSellHint: 'Quand tu as un acte',
  emptyCatalogHint: 'Ajoute d’abord un acte pour encaisser.',
  todayOrders: 'Actes aujourd’hui',
  profitOrders: 'Nombre d’actes',
  newOrder: 'Nouvel acte',
  lastOrders: 'Derniers actes',
  noOrdersToday: 'Aucun acte aujourd’hui',
  quickSale: 'Encaissement rapide (sans patient)',
  creditNeedsClient: 'Pour encaisser à crédit, choisis un patient.',
  orderReady: 'Acte prêt',
  historyHint: 'Tous les actes — cherche par patient ou date.',
  historyActivityHint: 'Tout ce qui s’est passé : actes, factures, patients, caisse…',
  ordersInPeriod: 'Actes liés',
  act_order: 'Actes',
  sellAgain: 'Encaisser encore',
  salesHistoryBtn: 'Historique des actes',
  returnsHint: 'Choisis un acte, la quantité à reprendre, puis cash ou crédit patient.',
  returnsPickOrder: 'Acte / facture',
  catalogForClient: 'Acte pour',
  roleOwnerHint: 'Actes, patients, caisse',
}

const SANTE_AR: Dict = {
  ...SERVICE_AR,
  order: 'تحصيل',
  appOrder: 'تحصيل',
  appQuick: 'تحصيل',
  sellNow: 'تحصيل',
  startSell: '3. تحصيل',
  startSellHint: 'كي يكون عندك عمل طبي',
  emptyCatalogHint: 'زيد عملاً طبياً قبل التحصيل.',
  todayOrders: 'أعمال اليوم',
  profitOrders: 'عدد الأعمال',
  newOrder: 'عمل جديد',
  lastOrders: 'آخر الأعمال',
  noOrdersToday: 'لا أعمال اليوم',
  quickSale: 'تحصيل سريع (بدون مريض)',
  creditNeedsClient: 'للدين اختر مريضاً.',
  orderReady: 'العمل جاهز',
  historyHint: 'كل الأعمال — ابحث بالمريض أو التاريخ.',
  historyActivityHint: 'كل ما حصل: أعمال، فواتير، مرضى، صندوق…',
  ordersInPeriod: 'أعمال مرتبطة',
  act_order: 'أعمال',
  sellAgain: 'تحصيل آخر',
  salesHistoryBtn: 'سجل الأعمال',
  returnsHint: 'اختر عملاً ثم الكمية ثم نقداً أو دين.',
  returnsPickOrder: 'عمل / فاتورة',
  catalogForClient: 'عمل لـ',
  roleOwnerHint: 'أعمال، مرضى، صندوق',
}

function dictFor(mode: CommerceMode | undefined, lang: Language): Dict | null {
  if (mode === 'sante') return lang === 'ar' ? SANTE_AR : SANTE_FR
  if (mode === 'services') return lang === 'ar' ? SERVICE_AR : SERVICE_FR
  return null
}

/** Comme `t`, mais sans « vente » en mode services / santé. */
export function mt(
  mode: CommerceMode | undefined,
  lang: Language,
  key: string,
): string {
  const d = dictFor(mode, lang)
  if (d && d[key]) return d[key]
  return t(lang, key)
}
