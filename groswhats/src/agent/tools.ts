import type { AppState, FontScale, Language, Screen, ThemePreset } from '../types'
import {
  addAppointment,
  addClient,
  addZakatRecord,
  annualNetProfitDa,
  buildPaymentFields,
  clientCreditDa,
  lowStockProducts,
  openCreditsDa,
  pendingIncoming,
  profitInRange,
  rangePresets,
  stockValueDa,
  todayCashDa,
  todayOrders,
  upcomingAppointments,
  updateSettings,
} from '../store'
import { formatDa } from '../utils/format'
import { applyUiTheme, parseFontFromText, parseThemeFromText, themeLabel } from '../utils/theme'
import { can, type AgentPermissions } from './permissions'
import { expertAdvice, type ExpertDomain } from './expertise'
import { evaluateBooking, suggestNearestSlots, toLocalInputValue } from '../booking/agent'
import { bookingPackFor, optionLabel } from '../booking/packs'
import { metierPackFor } from '../locale/metierPacks'

export type ToolName =
  | 'list_capabilities'
  | 'navigate'
  | 'get_dashboard'
  | 'get_low_stock'
  | 'get_credits'
  | 'get_profits'
  | 'set_theme'
  | 'set_font'
  | 'set_easy_mode'
  | 'set_language'
  | 'toggle_home_icon'
  | 'organize_easy'
  | 'add_client'
  | 'calc_zakat'
  | 'open_screen_help'
  | 'expert_advice'
  | 'suggest_booking_slots'
  | 'evaluate_booking'
  | 'create_booking'
  | 'list_bookings'

export interface ToolCall {
  name: ToolName
  args?: Record<string, unknown>
}

export interface ToolResult {
  ok: boolean
  message: string
  nextState?: AppState
  navigateTo?: Screen
  denied?: boolean
}

type ToolDef = {
  name: ToolName
  permission: keyof AgentPermissions | 'none'
  descriptionFr: string
  descriptionAr: string
  run: (state: AppState, args: Record<string, unknown>, lang: Language) => ToolResult
}

const SCREENS: Screen[] = [
  'home',
  'order',
  'products',
  'clients',
  'history',
  'profits',
  'expenses',
  'gallery',
  'delivery',
  'missions',
  'agent',
  'settings',
  'zakat',
  'stock',
  'calculator',
  'arrivages',
  'inbox',
  'caisse',
  'returns',
  'purchases',
]

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.toLowerCase()
    if (['1', 'true', 'oui', 'on', 'yes', 'ih'].includes(s)) return true
    if (['0', 'false', 'non', 'off', 'no', 'la'].includes(s)) return false
  }
  return fallback
}

export const AGENT_TOOLS: ToolDef[] = [
  {
    name: 'list_capabilities',
    permission: 'none',
    descriptionFr: 'Liste ce que l’agent peut organiser',
    descriptionAr: 'يعرض صلاحيات الوكيل',
    run: (state, _a, lang) => {
      const p = state.settings
      const lines =
        lang === 'ar'
          ? [
              '🤖 نظام Agentic — صلاحياتي داخل التطبيق:',
              '• فتح الشاشات (بيع، مخزون، زبائن، سجل، أرباح…)',
              '• قراءة الصندوق / الديون / المخزون الناقص',
              '• تنظيم الواجهة: وضع سهل، ثيم، خط، إظهار/إخفاء أيقونات',
              '• نصائح خبير: مبيعات، محاسبة، تسويق، تسيير، معلوماتية، مطور',
              '• إضافة زبون، حساب الزكاة',
              '• أجندة ذكية: اقتراح مواعيد، تقييم حجز، تسجيل حجز',
              '❌ لا أعدّل كود السيرفر ولا أحذف كل البيانات',
              `الثيم الحالي: ${themeLabel(lang, p.themePreset)} · سهل: ${p.easyMode !== false ? 'نعم' : 'لا'}`,
            ]
          : [
              '🤖 Système Agentic — mes droits dans l’app :',
              '• Ouvrir les écrans (vente, stock, clients, historique, gains…)',
              '• Lire caisse / dettes / stock bas',
              '• Organiser l’UI : mode facile, thème, police, icônes',
              '• Conseils expert : vente, compta, marketing, gestion, info, dév',
              '• Ajouter client, calculer zakat',
              '• Agenda agentique : créneaux proches, évaluer, créer une réservation',
              '❌ Je ne réécris pas le code serveur ni ne vide toutes les données',
              `Thème: ${themeLabel(lang, p.themePreset)} · Facile: ${p.easyMode !== false ? 'oui' : 'non'}`,
            ]
      return { ok: true, message: lines.join('\n') }
    },
  },
  {
    name: 'navigate',
    permission: 'navigate',
    descriptionFr: 'Ouvre un écran',
    descriptionAr: 'يفتح شاشة',
    run: (_state, args, lang) => {
      const screen = String(args.screen || '') as Screen
      if (!SCREENS.includes(screen)) {
        return {
          ok: false,
          message:
            lang === 'ar'
              ? `شاشة غير معروفة. جرّب: ${SCREENS.slice(0, 8).join(', ')}`
              : `Écran inconnu. Ex: ${SCREENS.slice(0, 8).join(', ')}`,
        }
      }
      return {
        ok: true,
        navigateTo: screen,
        message: lang === 'ar' ? `أفتح: ${screen}` : `J’ouvre : ${screen}`,
      }
    },
  },
  {
    name: 'get_dashboard',
    permission: 'readBusiness',
    descriptionFr: 'Résumé du jour',
    descriptionAr: 'ملخص اليوم',
    run: (state, _a, lang) => {
      const today = todayOrders(state)
      const sales = today.reduce((s, o) => s + o.totalDa, 0)
      const cash = todayCashDa(state)
      const credits = openCreditsDa(state)
      const low = lowStockProducts(state).length
      const msg =
        lang === 'ar'
          ? `اليوم: ${today.length} بيع · مبيعات ${formatDa(sales)} · صندوق ${formatDa(cash)} · ديون ${formatDa(credits)} · ناقص ${low}`
          : `Aujourd’hui : ${today.length} ventes · CA ${formatDa(sales)} · Caisse ${formatDa(cash)} · Dettes ${formatDa(credits)} · Stock bas ${low}`
      return { ok: true, message: msg }
    },
  },
  {
    name: 'get_low_stock',
    permission: 'readBusiness',
    descriptionFr: 'Produits en stock bas',
    descriptionAr: 'منتجات ناقصة',
    run: (state, _a, lang) => {
      const low = lowStockProducts(state)
      if (!low.length) {
        return {
          ok: true,
          message: lang === 'ar' ? 'لا منتج ناقص.' : 'Aucun produit en stock bas.',
        }
      }
      const lines = low
        .slice(0, 12)
        .map((p) => `• ${p.name} (${p.stock})`)
        .join('\n')
      return {
        ok: true,
        message: (lang === 'ar' ? `ناقص:\n` : `Stock bas :\n`) + lines,
        navigateTo: 'products',
      }
    },
  },
  {
    name: 'get_credits',
    permission: 'readBusiness',
    descriptionFr: 'Dettes clients',
    descriptionAr: 'ديون الزبائن',
    run: (state, _a, lang) => {
      const total = openCreditsDa(state)
      const top = state.clients
        .map((c) => ({ c, d: clientCreditDa(state, c.id) }))
        .filter((x) => x.d > 0)
        .sort((a, b) => b.d - a.d)
        .slice(0, 8)
      const lines = top.map((x) => `• ${x.c.name} : ${formatDa(x.d)}`).join('\n')
      return {
        ok: true,
        message:
          (lang === 'ar' ? `الديون: ${formatDa(total)}\n` : `Dettes : ${formatDa(total)}\n`) +
          (lines || (lang === 'ar' ? 'لا تفاصيل.' : 'Aucun détail.')),
        navigateTo: 'clients',
      }
    },
  },
  {
    name: 'get_profits',
    permission: 'readBusiness',
    descriptionFr: 'Gains période',
    descriptionAr: 'الأرباح',
    run: (state, args, lang) => {
      const presets = rangePresets()
      const key = String(args.period || 'today') as keyof typeof presets
      const range = presets[key] ?? presets.today
      const s = profitInRange(state, range.from, range.to)
      const msg =
        lang === 'ar'
          ? `أرباح: مبيعات ${formatDa(s.salesTotalDa)} · صندوق ${formatDa(s.cashInDa)} · ربح ${formatDa(s.salesProfitDa)} · مصاريف ${formatDa(s.expensesDa)} · صافي ${formatDa(s.netDa)}`
          : `Gains : ventes ${formatDa(s.salesTotalDa)} · caisse ${formatDa(s.cashInDa)} · marge ${formatDa(s.salesProfitDa)} · dépenses ${formatDa(s.expensesDa)} · net ${formatDa(s.netDa)}`
      return { ok: true, message: msg, navigateTo: 'profits' }
    },
  },
  {
    name: 'set_theme',
    permission: 'editSettings',
    descriptionFr: 'Change le thème',
    descriptionAr: 'يغيّر الثيم',
    run: (state, args, lang) => {
      const raw = String(args.theme || args.preset || '')
      const preset =
        (['forest', 'ocean', 'sand', 'night', 'coral'].includes(raw)
          ? (raw as ThemePreset)
          : parseThemeFromText(raw)) ?? null
      if (!preset) {
        return {
          ok: false,
          message:
            lang === 'ar'
              ? 'ثيم؟ forest / ocean / sand / night / coral'
              : 'Thème ? forest / ocean / sand / night / coral',
        }
      }
      const next = updateSettings(state, { themePreset: preset })
      applyUiTheme(preset, next.settings.fontScale)
      return {
        ok: true,
        nextState: next,
        message:
          lang === 'ar'
            ? `✅ الثيم: ${themeLabel(lang, preset)}`
            : `✅ Thème : ${themeLabel(lang, preset)}`,
      }
    },
  },
  {
    name: 'set_font',
    permission: 'editSettings',
    descriptionFr: 'Taille du texte',
    descriptionAr: 'حجم الخط',
    run: (state, args, lang) => {
      const raw = String(args.scale || args.font || '')
      const scale =
        (['normal', 'large', 'xlarge'].includes(raw)
          ? (raw as FontScale)
          : parseFontFromText(raw)) ?? 'large'
      const next = updateSettings(state, { fontScale: scale })
      applyUiTheme(next.settings.themePreset, scale)
      return {
        ok: true,
        nextState: next,
        message: lang === 'ar' ? `✅ حجم الخط: ${scale}` : `✅ Texte : ${scale}`,
      }
    },
  },
  {
    name: 'set_easy_mode',
    permission: 'organizeUi',
    descriptionFr: 'Mode facile gros boutons',
    descriptionAr: 'الوضع السهل',
    run: (state, args, lang) => {
      const on = asBool(args.on, true)
      const next = updateSettings(state, { easyMode: on })
      return {
        ok: true,
        nextState: next,
        message: on
          ? lang === 'ar'
            ? '✅ الوضع السهل مفعّل'
            : '✅ Mode facile activé'
          : lang === 'ar'
            ? '✅ الوضع السهل مطفي'
            : '✅ Mode facile désactivé',
      }
    },
  },
  {
    name: 'set_language',
    permission: 'editSettings',
    descriptionFr: 'Langue FR/AR',
    descriptionAr: 'اللغة',
    run: (state, args, _lang) => {
      const raw = String(args.language || args.lang || '').toLowerCase()
      const language: Language =
        raw.startsWith('ar') ||
        raw.includes('arab') ||
        raw.includes('darja') ||
        raw.includes('darija') ||
        raw.includes('dardja')
          ? 'ar'
          : raw.startsWith('en') || raw.includes('english') || raw.includes('anglais')
              ? 'en'
              : raw.startsWith('es') || raw.includes('espan') || raw.includes('spanish')
                ? 'es'
                : raw.startsWith('tr') || raw.includes('turc')
                  ? 'tr'
                  : raw.startsWith('it') || raw.includes('italien')
                    ? 'it'
                    : raw.startsWith('de') || raw.includes('deutsch') || raw.includes('allemand')
                      ? 'de'
                      : 'fr'
      const next = updateSettings(state, { language })
      return {
        ok: true,
        nextState: next,
        message: `✅ ${language}`,
      }
    },
  },
  {
    name: 'toggle_home_icon',
    permission: 'organizeUi',
    descriptionFr: 'Afficher/masquer icône accueil',
    descriptionAr: 'إظهار/إخفاء أيقونة',
    run: (state, args, lang) => {
      const icon = String(args.icon || args.name || '').toLowerCase()
      const show = asBool(args.show, true)
      let patch: Partial<AppState['settings']> = {}
      if (icon.includes('zakat') || icon.includes('زكاة')) patch = { showZakat: show }
      else if (icon.includes('calc') || icon.includes('حاسب')) patch = { showCalculator: show }
      else if (icon.includes('galer') || icon.includes('photo') || icon.includes('معرض'))
        patch = { showGallery: show }
      else {
        return {
          ok: false,
          message:
            lang === 'ar'
              ? 'أيقونة؟ zakat / calculatrice / galerie'
              : 'Icône ? zakat / calculatrice / galerie',
        }
      }
      const next = updateSettings(state, patch)
      return {
        ok: true,
        nextState: next,
        message: show
          ? lang === 'ar'
            ? `✅ أظهرت: ${icon}`
            : `✅ Affiché : ${icon}`
          : lang === 'ar'
            ? `✅ أخفيت: ${icon}`
            : `✅ Masqué : ${icon}`,
      }
    },
  },
  {
    name: 'organize_easy',
    permission: 'organizeUi',
    descriptionFr: 'Pack organisation facile (pro)',
    descriptionAr: 'تنظيم سهل كامل',
    run: (state, _a, lang) => {
      const next = updateSettings(state, {
        easyMode: true,
        fontScale: 'large',
        showZakat: true,
        showCalculator: true,
        showGallery: true,
        stockAlertsEnabled: true,
      })
      applyUiTheme(next.settings.themePreset, 'large')
      return {
        ok: true,
        nextState: next,
        navigateTo: 'home',
        message:
          lang === 'ar'
            ? '✅ نظّمت التطبيق: أزرار كبيرة، خط كبير، تنبيهات، أيقونات واضحة.'
            : '✅ App organisée : gros boutons, grand texte, alertes, icônes visibles.',
      }
    },
  },
  {
    name: 'add_client',
    permission: 'mutateBusiness',
    descriptionFr: 'Ajoute un client',
    descriptionAr: 'إضافة زبون',
    run: (state, args, lang) => {
      const name = String(args.name || '').trim()
      const phone = String(args.phone || '').replace(/\s/g, '')
      if (!name || !phone) {
        return {
          ok: false,
          message:
            lang === 'ar'
              ? 'لازم الاسم ورقم الهاتف'
              : 'Il faut le nom et le téléphone',
        }
      }
      const next = addClient(state, {
        name,
        phone,
        city: state.settings.city,
        address: '',
        notes: '',
      })
      return {
        ok: true,
        nextState: next,
        navigateTo: 'clients',
        message: lang === 'ar' ? `✅ زبون: ${name}` : `✅ Client : ${name}`,
      }
    },
  },
  {
    name: 'calc_zakat',
    permission: 'mutateBusiness',
    descriptionFr: 'Calcule la zakat',
    descriptionAr: 'يحسب الزكاة',
    run: (state, _a, lang) => {
      const stock = stockValueDa(state)
      const credits = openCreditsDa(state)
      const base = stock + credits
      const amount = Math.round(base * 0.025)
      const next = addZakatRecord(state, {
        yearLabel: new Date().getFullYear().toString(),
        calculatedAt: new Date().toISOString(),
        stockValueDa: stock,
        includeCredits: true,
        creditsValueDa: credits,
        baseDa: base,
        rate: 0.025,
        amountDa: amount,
      })
      return {
        ok: true,
        nextState: next,
        navigateTo: 'zakat',
        message:
          lang === 'ar'
            ? `زكاة تقديرية: ${formatDa(amount)}`
            : `Zakat estimée : ${formatDa(amount)}`,
      }
    },
  },
  {
    name: 'expert_advice',
    permission: 'readBusiness',
    descriptionFr: 'Conseil expert métier',
    descriptionAr: 'نصيحة خبير',
    run: (state, args, lang) => {
      const domain = String(args.domain || 'sales') as ExpertDomain
      return {
        ok: true,
        message: expertAdvice(state, domain, lang),
      }
    },
  },
  {
    name: 'open_screen_help',
    permission: 'navigate',
    descriptionFr: 'Aide sur un écran',
    descriptionAr: 'مساعدة شاشة',
    run: (_state, args, lang) => {
      const screen = String(args.screen || 'home')
      const tips: Record<string, { fr: string; ar: string }> = {
        home: {
          fr: 'Accueil : icônes apps + recherche intelligente. Dis « organise l’app » pour le mode facile.',
          ar: 'الرئيسية: أيقونات التطبيقات + بحث ذكي. اكتب «نظّم التطبيق» للوضع السهل.',
        },
        order: {
          fr: 'Vente : client (ou rapide) → produits / scan → Payé ou Versé.',
          ar: 'البيع: زبون (أو سريع) → منتجات / مسح → مدفوع أو جزء.',
        },
        history: {
          fr: 'Historique : filtre date + type (commande, facture, client, caisse).',
          ar: 'السجل: تاريخ + نوع (طلب، فاتورة، زبون، صندوق).',
        },
        profits: {
          fr: 'Gains : aujourd’hui / mois / année ou calendrier.',
          ar: 'الأرباح: اليوم / شهر / سنة أو تقويم.',
        },
        settings: {
          fr: 'Réglages : langue, mode facile, thème, multi-poste, droits agent, licence.',
          ar: 'الإعدادات: لغة، وضع سهل، ثيم، متعدد أجهزة، صلاحيات الوكيل، رخصة.',
        },
        products: {
          fr: 'Produits : ajoute nom + prix ; 📷 pour scanner le code-barres.',
          ar: 'المنتجات: أضف الاسم والسعر ؛ 📷 لمسح الباركود.',
        },
        clients: {
          fr: 'Clients : fiche + GPS + solde. Utile pour crédit et livraisons.',
          ar: 'الزبائن: بطاقة + GPS + رصيد. مفيد للدين والتوصيل.',
        },
        caisse: {
          fr: 'Caisse : ouvre le jour avec fond, ferme avec comptage (écart affiché).',
          ar: 'الصندوق: افتح اليوم بمبلغ، أغلق بالعد (يظهر الفرق).',
        },
        returns: {
          fr: 'Retours : choisis la vente, quantité, remboursement cash ou crédit.',
          ar: 'المرتجعات: اختر البيع والكمية، استرداد كاش أو دين.',
        },
        purchases: {
          fr: 'Achats / fournisseurs : +stock et prix d’achat à l’arrivage.',
          ar: 'المشتريات / الموردون: زيادة المخزون وسعر الشراء عند الوصول.',
        },
        inbox: {
          fr: 'Inbox : commandes reçues à traiter (WhatsApp / saisie).',
          ar: 'الوارد: طلبات واردة للمعالجة.',
        },
        arrivages: {
          fr: 'Arrivages : message WhatsApp groupé pour annoncer la marchandise.',
          ar: 'الوصول: رسالة واتساب جماعية لإعلان البضاعة.',
        },
        delivery: {
          fr: 'Carte GPS : clients avec position pour la tournée.',
          ar: 'خريطة GPS: زبائن بموقع للجولة.',
        },
        missions: {
          fr: 'Équipe : livreurs, tournées, sync cloud (si multi-poste ON).',
          ar: 'الفريق: سائقون، جولات، مزامنة سحابة (إن فُعّل المتعدد).',
        },
        gallery: {
          fr: 'Galerie : photos produits pour vendre plus vite.',
          ar: 'المعرض: صور المنتجات للبيع أسرع.',
        },
        expenses: {
          fr: 'Dépenses : gasoil, personnel… pour un vrai bénéfice net.',
          ar: 'المصاريف: مازوط، عمال… لربح صافٍ صحيح.',
        },
        zakat: {
          fr: 'Zakat : estimation stock + crédits × 2,5 %.',
          ar: 'الزكاة: تقدير المخزون + الديون × 2.5٪.',
        },
        agent: {
          fr: 'Agent : écris un conseil (vente, compta…) ou une commande (thème, stock bas).',
          ar: 'الوكيل: اكتب نصيحة (مبيعات، محاسبة…) أو أمراً (ثيم، مخزون ناقص).',
        },
      }
      const tip = tips[screen] ?? {
        fr: 'Écris « organise l’app » pour que je range l’interface, ou « conseil vente » pour un tip.',
        ar: 'اكتب «نظّم التطبيق» لترتيب الواجهة، أو «خبير مبيعات» لنصيحة.',
      }
      return { ok: true, message: lang === 'ar' ? tip.ar : tip.fr, navigateTo: screen as Screen }
    },
  },
  {
    name: 'suggest_booking_slots',
    permission: 'readBusiness',
    descriptionFr: 'Propose des créneaux libres proches',
    descriptionAr: 'يقترح مواعيد قريبة متاحة',
    run: (state, args, lang) => {
      const family = metierPackFor(
        state.settings.domainId,
        state.settings.commerceMode,
      ).family
      const pack = bookingPackFor(family)
      const fromRaw = String(args.from || args.at || '').trim()
      const from = fromRaw ? new Date(fromRaw) : new Date()
      if (!Number.isFinite(from.getTime())) {
        return {
          ok: false,
          message: lang === 'ar' ? 'تاريخ غير صالح' : 'Date invalide',
        }
      }
      const optionIds = Array.isArray(args.options)
        ? args.options.map(String)
        : typeof args.options === 'string'
          ? String(args.options)
              .split(/[,+ ]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : []
      const durationMin =
        Number(args.durationMin) > 0
          ? Number(args.durationMin)
          : pack.defaultDurationMin
      const slots = suggestNearestSlots(state, family, {
        from,
        durationMin,
        optionIds,
        count: 5,
      })
      if (slots.length === 0) {
        return {
          ok: true,
          message:
            lang === 'ar'
              ? 'لا مواعيد متاحة قريباً (3 أسابيع).'
              : 'Aucun créneau libre sur les 3 prochaines semaines.',
        }
      }
      const lines = slots.map((s, i) => {
        const when = s.at.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
        const price =
          s.quoteDa > 0
            ? ` · ≈ ${formatDa(s.quoteDa)}`
            : ''
        return `${i + 1}. ${when}${price}`
      })
      return {
        ok: true,
        navigateTo: 'home',
        message:
          (lang === 'ar' ? 'مواعيد قريبة متاحة:\n' : 'Créneaux proches libres :\n') +
          lines.join('\n'),
      }
    },
  },
  {
    name: 'evaluate_booking',
    permission: 'readBusiness',
    descriptionFr: 'Évalue si une réservation est acceptée ou refusée',
    descriptionAr: 'يقيّم قبول أو رفض الحجز',
    run: (state, args, lang) => {
      const family = metierPackFor(
        state.settings.domainId,
        state.settings.commerceMode,
      ).family
      const pack = bookingPackFor(family)
      const atRaw = String(args.at || args.when || '').trim()
      const at = atRaw ? new Date(atRaw) : null
      if (!at || !Number.isFinite(at.getTime())) {
        return {
          ok: false,
          message:
            lang === 'ar'
              ? 'أعط تاريخاً (مثال 2026-10-05T18:00)'
              : 'Donne une date (ex. 2026-10-05T18:00)',
        }
      }
      const optionIds = Array.isArray(args.options)
        ? args.options.map(String)
        : typeof args.options === 'string'
          ? String(args.options)
              .split(/[,+ ]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : []
      const durationMin =
        Number(args.durationMin) > 0
          ? Number(args.durationMin)
          : pack.defaultDurationMin
      const v = evaluateBooking(state, family, {
        at,
        durationMin,
        optionIds,
      })
      const decision =
        v.decision === 'accepted'
          ? lang === 'ar'
            ? 'مقبول'
            : 'Accepté'
          : v.decision === 'proposed'
            ? lang === 'ar'
              ? 'اقتراح بديل'
              : 'Proposition'
            : lang === 'ar'
              ? 'مرفوض'
              : 'Refusé'
      const reasons = (lang === 'ar' ? v.reasonsAr : v.reasons).join('\n• ')
      const alts =
        v.alternatives.length > 0
          ? '\n' +
            (lang === 'ar' ? 'بدائل:\n' : 'Alternatives :\n') +
            v.alternatives
              .slice(0, 3)
              .map(
                (s) =>
                  `• ${s.at.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`,
              )
              .join('\n')
          : ''
      return {
        ok: true,
        message: `${decision}\n• ${reasons}${alts}`,
      }
    },
  },
  {
    name: 'create_booking',
    permission: 'mutateBusiness',
    descriptionFr: 'Crée une réservation si le créneau est libre',
    descriptionAr: 'يسجّل حجزاً إن كان الموعد متاحاً',
    run: (state, args, lang) => {
      const family = metierPackFor(
        state.settings.domainId,
        state.settings.commerceMode,
      ).family
      const pack = bookingPackFor(family)
      const clientId = String(args.clientId || '').trim()
      const clientName = String(args.clientName || args.name || '')
        .trim()
        .toLowerCase()
      const client =
        state.clients.find((c) => c.id === clientId) ||
        state.clients.find((c) => c.name.toLowerCase().includes(clientName))
      if (!client) {
        return {
          ok: false,
          message:
            lang === 'ar'
              ? 'زبون غير موجود — أعط الاسم أو أضفه أولاً'
              : 'Client introuvable — donne le nom ou ajoute-le d’abord',
        }
      }
      const atRaw = String(args.at || args.when || '').trim()
      const at = atRaw ? new Date(atRaw) : null
      if (!at || !Number.isFinite(at.getTime())) {
        return {
          ok: false,
          message:
            lang === 'ar' ? 'تاريخ الحجز مطلوب' : 'Date de réservation requise',
        }
      }
      const optionIds = Array.isArray(args.options)
        ? args.options.map(String)
        : typeof args.options === 'string'
          ? String(args.options)
              .split(/[,+ ]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : []
      const durationMin =
        Number(args.durationMin) > 0
          ? Number(args.durationMin)
          : pack.defaultDurationMin
      const v = evaluateBooking(state, family, {
        at,
        durationMin,
        optionIds,
      })
      if (v.decision !== 'accepted') {
        const alts = v.alternatives
          .slice(0, 3)
          .map((s) => toLocalInputValue(s.at))
          .join(', ')
        return {
          ok: false,
          message:
            (lang === 'ar'
              ? `الحجز غير مقبول. ${v.reasonsAr.join(' ')}`
              : `Réservation refusée. ${v.reasons.join(' ')}`) +
            (alts
              ? lang === 'ar'
                ? `\nجرّب: ${alts}`
                : `\nEssaie : ${alts}`
              : ''),
        }
      }
      const optLabels = v.optionIds
        .map((id) => {
          const o = pack.options.find((x) => x.id === id)
          return o ? optionLabel(o, lang) : id
        })
        .filter(Boolean)
      const noteExtra = optLabels.length
        ? `${String(args.note || '').trim()} · ${optLabels.join(', ')}`.trim()
        : String(args.note || '').trim()
      const next = addAppointment(state, {
        clientId: client.id,
        at: at.toISOString(),
        note: noteExtra.replace(/^\s*·\s*/, ''),
        durationMin: v.durationMin,
        optionIds: v.optionIds,
        segment: v.segment,
        quoteDa: v.quoteDa,
        agentDecision: 'accepted',
        agentReason: (lang === 'ar' ? v.reasonsAr : v.reasons).join(' · '),
      })
      return {
        ok: true,
        nextState: next,
        navigateTo: 'home',
        message:
          lang === 'ar'
            ? `✅ حجز لـ ${client.name} — ${formatDa(v.quoteDa)}`
            : `✅ Réservation pour ${client.name} — ${formatDa(v.quoteDa)}`,
      }
    },
  },
  {
    name: 'list_bookings',
    permission: 'readBusiness',
    descriptionFr: 'Liste les prochaines réservations',
    descriptionAr: 'يعرض الحجوزات القادمة',
    run: (state, _a, lang) => {
      const list = upcomingAppointments(state, 10)
      if (list.length === 0) {
        return {
          ok: true,
          message:
            lang === 'ar' ? 'لا حجوزات قادمة.' : 'Aucune réservation à venir.',
        }
      }
      const lines = list.map((a, i) => {
        const when = new Date(a.at).toLocaleString(
          lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
          {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          },
        )
        const q =
          typeof a.quoteDa === 'number' && a.quoteDa > 0
            ? ` · ${formatDa(a.quoteDa)}`
            : ''
        return `${i + 1}. ${a.clientName} — ${when}${q}`
      })
      return {
        ok: true,
        message:
          (lang === 'ar' ? 'الحجوزات القادمة:\n' : 'Prochaines réservations :\n') +
          lines.join('\n'),
      }
    },
  },
]

export function getTool(name: string): ToolDef | undefined {
  return AGENT_TOOLS.find((t) => t.name === name)
}

export function executeTool(
  state: AppState,
  call: ToolCall,
  lang: Language,
): ToolResult {
  const tool = getTool(call.name)
  if (!tool) {
    return {
      ok: false,
      message: lang === 'ar' ? `أداة غير موجودة: ${call.name}` : `Outil inconnu : ${call.name}`,
    }
  }
  if (tool.permission !== 'none' && !can(state, tool.permission)) {
    return {
      ok: false,
      denied: true,
      message:
        lang === 'ar'
          ? `❌ ممنوع: ${tool.permission}`
          : `❌ Permission refusée : ${tool.permission}`,
    }
  }
  try {
    return tool.run(state, call.args ?? {}, lang)
  } catch (e) {
    return {
      ok: false,
      message: lang === 'ar' ? 'خطأ أثناء التنفيذ' : `Erreur outil : ${String(e)}`,
    }
  }
}

/** Export inutilisé volontairement gardé pour extensions futures */
export { buildPaymentFields, annualNetProfitDa, pendingIncoming }
