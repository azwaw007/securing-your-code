import type { AppState, Language } from '../types'
import { formatDa } from '../utils/format'
import {
  annualNetProfitDa,
  lowStockProducts,
  openCreditsDa,
  stockValueDa,
  todayOrders,
} from '../store'

/** Conseils métier ancrés sur les chiffres du magasin (sans modifier le code). */
export function expertAdvice(state: AppState, domain: string, lang: Language): string {
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
          '🛒 خبير مبيعات — Grossiste DZ',
          `اليوم: ${today.length} طلب · ${formatDa(todaySales)}`,
          low > 0 ? `⚠️ ${low} منتج ناقص — أعد التموين قبل خسارة الزبائن.` : '✅ المخزون مستقر.',
          'نصائح: اتصل بـ 5 زبائن قدامى هذا الأسبوع · عرض كرتون بسعر جذاب · واتساب عند وصول بضاعة.',
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
          'احفظ نسخة: الإعدادات أو تصدير عند الإمكان.',
          'الصوت يعمل على Chrome/Android. اسمح بالميكروفون.',
          'لا أعيد كتابة كود السيرفر من هنا — أغيّر فقط الثيم والخيارات الآمنة.',
        ].join('\n')
      case 'dev':
        return [
          '🛠️ مطوّر التطبيق (وضع آمن)',
          'يمكنني بالصوت: تغيير الثيم، حجم النص، الوضع السهل، إظهار/إخفاء زكاة/حاسبة/معرض.',
          'لا يمكنني حذف بياناتك أو كسر البيع أو تعديل كود Vercel من الهاتف.',
          'قل مثلاً: «ثيم أزرق» · «وضع ليلي» · «نص كبير» · «فعّل الوضع السهل».',
        ].join('\n')
      default:
        return 'قل: مبيعات، محاسبة، تسويق، تسيير، معلوماتية، أو مطور.'
    }
  }

  switch (domain) {
    case 'sales':
      return [
        '🛒 Expert vente — Grossiste DZ',
        `Aujourd’hui : ${today.length} commande(s) · ${formatDa(todaySales)}`,
        low > 0
          ? `⚠️ ${low} produit(s) bas — réapprovisionne avant de perdre des clients.`
          : '✅ Stock plutôt stable.',
        'Astuces : appelle 5 anciens clients cette semaine · offre carton attractif · WhatsApp à chaque arrivage.',
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
        '📣 Expert marketing',
        '1) Photo claire de chaque produit (galerie)',
        '2) Message WhatsApp à chaque arrivage',
        '3) Affiche clairement pièce / demi-gros / gros / super gros',
        '4) Fidèles = meilleur prix + tournée régulière',
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
        'Micro : Chrome / Android. Autorise le micro pour la voix.',
        'Je ne réécris pas le code serveur depuis le téléphone — seulement thème & options sûres.',
      ].join('\n')
    case 'dev':
      return [
        '🛠️ Développeur (mode sûr)',
        'Par voix je peux : thème, taille texte, mode facile, afficher/masquer zakat / calculatrice / galerie.',
        'Je ne peux pas supprimer tes données, casser les ventes, ni modifier le code Vercel depuis le téléphone.',
        'Dis : « thème bleu » · « mode nuit » · « gros texte » · « active mode facile ».',
      ].join('\n')
    default:
      return 'Dis : vente, compta, marketing, gestion, informatique, ou développeur.'
  }
}

export function detectExpertDomain(text: string): string | null {
  const n = text.toLowerCase()
  if (/(conseil vente|expert vente|augmenter vente|كيف ابيع|مبيعات|بيع اكثر)/.test(n))
    return 'sales'
  if (/(compta|comptable|bilan|محاسبة|محاسب|زكاة شرح)/.test(n)) return 'accounting'
  if (/(marketing|pub|publicite|تسويق|اعلان)/.test(n)) return 'marketing'
  if (/(gestion|manager|تسيير|ادارة|إدارة)/.test(n)) return 'management'
  if (/(informatique|ordinateur|wifi|معلوماتية|انترنت)/.test(n)) return 'it'
  if (/(developpeur|développeur|code|coder|مطور|برمجة)/.test(n)) return 'dev'
  if (/(conseil|نصيحة|نصائح|expert|خبير)/.test(n)) return 'sales'
  return null
}
