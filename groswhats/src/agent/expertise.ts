import type { AppState, Language } from '../types'
import { formatDa } from '../utils/format'
import {
  annualNetProfitDa,
  lowStockProducts,
  openCreditsDa,
  stockValueDa,
  todayOrders,
} from '../store'

export type ExpertDomain =
  | 'sales'
  | 'accounting'
  | 'marketing'
  | 'management'
  | 'it'
  | 'dev'

/** Conseil du jour ancré sur les chiffres (accueil agent). */
export function dailyExpertTip(state: AppState, lang: Language): string {
  const low = lowStockProducts(state).length
  const credits = openCreditsDa(state)
  const today = todayOrders(state)
  if (lang === 'ar') {
    if (low > 0) return `💡 نصيحة اليوم: ${low} منتج ناقص — عبّئ قبل خسارة الزبائن.`
    if (credits > 50_000)
      return `💡 نصيحة اليوم: ديون ${formatDa(credits)} — اتصل بـ 3 زبائن للتحصيل.`
    if (today.length === 0)
      return '💡 نصيحة اليوم: ابدأ ببيع سريع أو أرسل واتساب لزبائن قدامى.'
    return '💡 نصيحة اليوم: سجّل كل مصروف اليوم — الأرباح تكون أوضح.'
  }
  if (low > 0)
    return `💡 Conseil du jour : ${low} produit(s) bas — réapprovisionne avant de perdre des clients.`
  if (credits > 50_000)
    return `💡 Conseil du jour : crédits ${formatDa(credits)} — appelle 3 clients pour encaisser.`
  if (today.length === 0)
    return '💡 Conseil du jour : lance une vente rapide ou WhatsApp à d’anciens clients.'
  return '💡 Conseil du jour : note chaque dépense aujourd’hui — les gains seront plus clairs.'
}

/** Conseils métier ancrés sur les chiffres du magasin (sans modifier le code). */
export function expertAdvice(
  state: AppState,
  domain: ExpertDomain | string,
  lang: Language,
): string {
  const low = lowStockProducts(state).length
  const credits = openCreditsDa(state)
  const stock = stockValueDa(state)
  const today = todayOrders(state)
  const todaySales = today.reduce((s, o) => s + o.totalDa, 0)
  const profit = annualNetProfitDa(state)

  if (lang === 'ar') {
    switch (domain) {
      case 'sales':
        return [
          '🛒 خبير مبيعات — AZ POS',
          `اليوم: ${today.length} طلب · ${formatDa(todaySales)}`,
          low > 0
            ? `⚠️ ${low} منتج ناقص — أعد التموين قبل خسارة الزبائن.`
            : '✅ المخزون مستقر.',
          'نصائح: اتصل بـ 5 زبائن قدامى هذا الأسبوع · عرض كرتون بسعر جذاب · واتساب عند وصول بضاعة.',
          'اكتب: «خبير محاسبة» · «خبير تسويق» · «خبير تسيير».',
        ].join('\n')
      case 'accounting':
        return [
          '📒 خبير محاسبة',
          `قيمة المخزون: ${formatDa(stock)}`,
          `ديون الزبائن: ${formatDa(credits)}`,
          `ربح ${profit.year}: صافي ${formatDa(profit.netDa)} (مبيعات ${formatDa(profit.salesProfitDa)} − مصاريف ${formatDa(profit.expensesDa)})`,
          'نصيحة: سجّل كل المصاريف يومياً · افصل النقد عن الدين · احسب الزكاة من المخزون+الديون.',
        ].join('\n')
      case 'marketing':
        return [
          '📣 خبير تسويق',
          '1) صورة واضحة لكل منتج في المعرض',
          '2) رسالة واتساب عند كل وصول (صفحة الوصول)',
          '3) أسعار: قطعة / نصف جملة / جملة / سوبر جملة واضحة',
          '4) زبون وفيّ = سعر أفضل + توصيل منتظم',
        ].join('\n')
      case 'management':
        return [
          '👔 خبير تسيير',
          state.team.multiPosteEnabled
            ? 'الوضع المتعدد مفعّل — خطط جولات السائقين كل صباح.'
            : 'يمكنك تفعيل متعدد الأجهزة لإدارة السائقين من الإعدادات.',
          credits > 50_000
            ? `الديون مرتفعة (${formatDa(credits)}) — حدّ ائتمان لكل زبون.`
            : 'الديون تحت السيطرة نسبياً.',
          'رتّب الأولوية: بيع → تحصيل → تموين → توصيل.',
        ].join('\n')
      case 'it':
        return [
          '💻 خبير معلوماتية',
          'التطبيق يعمل دون إنترنت على الهاتف (PWA).',
          'احفظ نسخة عند الإمكان · حدّث Chrome / التطبيق.',
          'اكتب للأوامر: «ثيم أزرق» · «نص كبير» · «فعّل الوضع السهل».',
          'لا أعيد كتابة كود السيرفر من هنا — أغيّر فقط الثيم والخيارات الآمنة.',
        ].join('\n')
      case 'dev':
        return [
          '🛠️ مطوّر التطبيق (وضع آمن)',
          'بالكتابة يمكنني: تغيير الثيم، حجم النص، الوضع السهل، إظهار/إخفاء زكاة / حاسبة / معرض.',
          'لا يمكنني حذف بياناتك أو كسر البيع أو تعديل كود Vercel من الهاتف.',
          'اكتب مثلاً: «ثيم أزرق» · «وضع ليلي» · «نص كبير» · «فعّل الوضع السهل».',
        ].join('\n')
      default:
        return 'اكتب: خبير مبيعات، محاسبة، تسويق، تسيير، معلوماتية، أو مطور.'
    }
  }

  switch (domain) {
    case 'sales':
      return [
        '🛒 Expert vente — AZ POS',
        `Aujourd’hui : ${today.length} commande(s) · ${formatDa(todaySales)}`,
        low > 0
          ? `⚠️ ${low} produit(s) bas — réapprovisionne avant de perdre des clients.`
          : '✅ Stock plutôt stable.',
        'Astuces : appelle 5 anciens clients cette semaine · offre carton attractif · WhatsApp à chaque arrivage.',
        'Écris aussi : « conseil compta » · « expert marketing » · « conseil gestion ».',
      ].join('\n')
    case 'accounting':
      return [
        '📒 Expert comptable',
        `Valeur stock : ${formatDa(stock)}`,
        `Crédits clients : ${formatDa(credits)}`,
        `Bénéfice ${profit.year} : net ${formatDa(profit.netDa)} (ventes ${formatDa(profit.salesProfitDa)} − dépenses ${formatDa(profit.expensesDa)})`,
        'Conseil : note chaque dépense · sépare cash / crédit · zakat = stock + crédits × 2,5 %.',
      ].join('\n')
    case 'marketing':
      return [
        '📣 Marketing magasin (sans fausse publication auto)',
        '1) Photo produit nette + prix clair dans le stock',
        '2) WhatsApp clients sur les arrivages (bouton Arrivages)',
        '3) Promo : copie un texte depuis la fiche produit si tu veux une story manuelle',
        '4) Fidélité : rappelle les crédits / clients dormants',
        'Je ne publie pas sur Facebook/Instagram — caisse & stock seulement.',
      ].join('\n')
    case 'management':
      return [
        '👔 Expert gestion',
        state.team.multiPosteEnabled
          ? 'Multi-poste actif — planifie les tournées livreurs chaque matin.'
          : 'Tu peux activer multi-poste (livreurs) dans les réglages.',
        credits > 50_000
          ? `Crédits élevés (${formatDa(credits)}) — fixe un plafond par client.`
          : 'Crédits sous contrôle relatif.',
        'Priorité : vendre → encaisser → réappro → livrer.',
      ].join('\n')
    case 'it':
      return [
        '💻 Expert informatique',
        'L’app marche hors ligne sur le téléphone (PWA).',
        'Sauvegarde quand tu peux · garde Chrome / l’app à jour.',
        'Écris pour configurer : « thème bleu » · « gros texte » · « active mode facile ».',
        'Je ne réécris pas le code serveur depuis le téléphone — seulement thème & options sûres.',
      ].join('\n')
    case 'dev':
      return [
        '🛠️ Développeur (mode sûr)',
        'En texte je peux : thème, taille texte, mode facile, afficher/masquer zakat / calculatrice / galerie.',
        'Je ne peux pas supprimer tes données, casser les ventes, ni modifier le code Vercel depuis le téléphone.',
        'Écris : « thème bleu » · « mode nuit » · « gros texte » · « active mode facile ».',
      ].join('\n')
    default:
      return 'Écris : conseil vente, compta, marketing, gestion, informatique, ou développeur.'
  }
}

export function detectExpertDomain(text: string): ExpertDomain | null {
  const n = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (
    /(conseil\s*vente|expert\s*vente|augmenter\s*(les\s*)?vente|كيف ابيع|بيع اكثر|خبير مبيعات|conseil vente)/.test(
      n,
    )
  ) {
    return 'sales'
  }
  if (
    /(conseil\s*compta|expert\s*compta|comptable|bilan|محاسبة|محاسب|خبير محاسبة|زكاة شرح)/.test(
      n,
    )
  ) {
    return 'accounting'
  }
  if (/(marketing|pub|publicite|تسويق|اعلان|خبير تسويق)/.test(n)) return 'marketing'
  if (/(conseil\s*gestion|expert\s*gestion|manager|تسيير|ادارة|إدارة|خبير تسيير)/.test(n))
    return 'management'
  if (/(informatique|ordinateur|wifi|معلوماتية|انترنت|خبير معلومات)/.test(n)) return 'it'
  if (/(developpeur|developpeur|code|coder|مطور|برمجة|خبير مطور)/.test(n)) return 'dev'

  // « conseil / expert » seulement si le métier est clair — sinon l’agent général répond
  if (/(conseil|نصيحة|نصائح|expert|خبير)/.test(n)) {
    if (/(vente|بيع|مبيع)/.test(n)) return 'sales'
    if (/(compta|bilan|محاسب)/.test(n)) return 'accounting'
    if (/(market|pub|تسويق)/.test(n)) return 'marketing'
    if (/(gestion|تسيير|ادارة)/.test(n)) return 'management'
    if (/(info|wifi|معلومات)/.test(n)) return 'it'
    if (/(dev|code|مطور|برمجة)/.test(n)) return 'dev'
  }
  return null
}
