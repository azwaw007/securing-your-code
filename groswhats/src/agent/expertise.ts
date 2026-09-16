import type { AppState, CommerceMode, Language } from '../types'
import { formatDa } from '../utils/format'
import {
  annualNetProfitDa,
  lowStockProducts,
  openCreditsDa,
  stockValueDa,
  todayOrders,
} from '../store'
import { modeLabel } from '../data/domains'
import { metierCopy } from '../locale/metierPacks'

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

function accountingSectionTips(mode: CommerceMode, lang: Language): string[] {
  if (lang === 'ar') {
    switch (mode) {
      case 'gros':
        return [
          'جملة: هامش الكرتون ≠ هامش القطعة — احسب الاثنين.',
          'حدّ ائتمان لكل تاجر · حوّل الكبار إلى دفع جزئي.',
          'الزكاة تقريبية: (مخزون + ديون) × 2.5٪ إن بلغت النصاب.',
        ]
      case 'detail':
        return [
          'تجزئة: سجّل المصروف اليومي (كراء، كهرباء، أجرة).',
          'راقب الرفوف الناقصة — خسارة صامتة.',
          'افصل نقد الصندوق عن دين الزبائن في الملخص.',
        ]
      case 'sante':
        return [
          'صحة: كل عمل = سطر فاتورة (كشف، علاج، دواء).',
          'لا تخلط أتعاب الطبيب مع مبيعات الاستقبال.',
          'احفظ الوصفات والتوجيهات مع الملف.',
        ]
      case 'auto':
        return [
          'سيارات: رقم أمر إصلاح / عقد كراء لكل ملف.',
          'هامش القطعة = بيع − شراء · سجّل اليد العاملة منفصلة.',
          'عربون الكراء ≠ إيراد نهائي حتى نهاية العقد.',
        ]
      case 'services':
        return [
          'خدمات: فوّر بالمهمة أو الحصة، لا بالمزاج.',
          'عربون عند الحجز · الباقي عند التسليم.',
          'تتبّع الساعات إن كان التسعير بالساعة.',
        ]
      default:
        return ['سجّل المصاريف يومياً · افصل النقد عن الدين.']
    }
  }
  switch (mode) {
    case 'gros':
      return [
        'Gros : marge carton ≠ marge pièce — calcule les deux.',
        'Plafond crédit par commerçant · acomptes sur les gros dossiers.',
        'Zakat approx. : (stock + crédits) × 2,5 % si nisab atteint.',
      ]
    case 'detail':
      return [
        'Détail : note loyer / élec / salaire chaque jour.',
        'Ruptures rayon = ventes perdues silencieuses.',
        'Sépare cash caisse et crédits clients dans le résumé.',
      ]
    case 'sante':
      return [
        'Santé : chaque acte = ligne de facture (consult, soin, produit).',
        'Ne mélange pas honoraires médecin et encaissement réception.',
        'Archive ordonnances / orientations avec le dossier.',
      ]
    case 'auto':
      return [
        'Auto : un n° d’OR / contrat de location par dossier.',
        'Marge pièce = vente − achat · main-d’œuvre à part.',
        'Acompte location ≠ revenu final tant que le contrat court.',
      ]
    case 'services':
      return [
        'Services : facture à la mission ou à la séance.',
        'Acompte à la réservation · solde à la livraison.',
        'Si tarif horaire : note les heures réellement faites.',
      ]
    default:
      return ['Note les dépenses chaque jour · sépare cash / crédit.']
  }
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
  const mode = state.settings.commerceMode
  const domainId = state.settings.domainId
  const sectionName =
    metierCopy(domainId, mode, lang).homeTitle || modeLabel(mode, lang)

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
          `📒 خبير محاسبة — قسم «${sectionName}»`,
          `قيمة المخزون: ${formatDa(stock)}`,
          `ديون الزبائن: ${formatDa(credits)}`,
          `ربح ${profit.year}: صافي ${formatDa(profit.netDa)} (مبيعات ${formatDa(profit.salesProfitDa)} − مصاريف ${formatDa(profit.expensesDa)})`,
          ...accountingSectionTips(mode, lang),
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
        `📒 Expert comptable — section « ${sectionName} »`,
        `Valeur stock : ${formatDa(stock)}`,
        `Crédits clients : ${formatDa(credits)}`,
        `Bénéfice ${profit.year} : net ${formatDa(profit.netDa)} (ventes ${formatDa(profit.salesProfitDa)} − dépenses ${formatDa(profit.expensesDa)})`,
        ...accountingSectionTips(mode, lang),
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
