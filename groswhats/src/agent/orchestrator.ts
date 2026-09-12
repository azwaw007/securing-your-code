import type { AppState, Language, Screen } from '../types'
import { can } from './permissions'
import { executeTool, type ToolCall, type ToolResult } from './tools'
import { detectExpertDomain } from './expertise'

export interface AgenticTrace {
  thought: string
  tools: Array<{ name: string; ok: boolean; message: string }>
}

export interface AgenticOutcome {
  reply: string
  nextState?: AppState
  navigateTo?: Screen
  trace: AgenticTrace
  usedAgentic: boolean
}

function includesAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase()
  return words.some((w) => t.includes(w.toLowerCase()))
}

function planTools(text: string, lang: Language): ToolCall[] {
  const n = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const calls: ToolCall[] = []
  const expertDomain = detectExpertDomain(text)
  const isExpertAsk = !!expertDomain

  if (
    includesAny(n, [
      'que peux',
      'tes droits',
      'permission',
      'capacite',
      'agentic',
      'صلاح',
      'تقدر',
      'شنو تقدر',
    ])
  ) {
    calls.push({ name: 'list_capabilities' })
  }

  if (
    includesAny(n, [
      'organise',
      'organize',
      'rang',
      'facilite',
      'mode facile',
      'pack facile',
      'نظم',
      'رتب',
      'سهل الكل',
    ])
  ) {
    calls.push({ name: 'organize_easy' })
  }

  if (includesAny(n, ['theme', 'couleur', 'nuit', 'bleu', 'vert', 'ثيم', 'لون', 'ليل'])) {
    calls.push({ name: 'set_theme', args: { theme: text } })
  }

  if (includesAny(n, ['gros texte', 'grand texte', 'font', 'خط', 'كبر الخط'])) {
    calls.push({ name: 'set_font', args: { scale: text } })
  }

  if (includesAny(n, ['mode facile', 'gros bouton', 'وضع سهل'])) {
    const off = includesAny(n, ['desactive', 'off', 'non', 'اطفي', 'وقف'])
    calls.push({ name: 'set_easy_mode', args: { on: !off } })
  }

  if (includesAny(n, ['arabe', 'العربية', 'darja ar'])) {
    calls.push({ name: 'set_language', args: { language: 'ar' } })
  } else if (includesAny(n, ['francais', 'français', 'french'])) {
    calls.push({ name: 'set_language', args: { language: 'fr' } })
  }

  if (includesAny(n, ['cache zakat', 'masque zakat', 'اخف زكاة'])) {
    calls.push({ name: 'toggle_home_icon', args: { icon: 'zakat', show: false } })
  } else if (includesAny(n, ['montre zakat', 'affiche zakat', 'اظهر زكاة'])) {
    calls.push({ name: 'toggle_home_icon', args: { icon: 'zakat', show: true } })
  }

  if (includesAny(n, ['resume', 'tableau', 'dashboard', 'ملخص', 'اليوم كامل'])) {
    calls.push({ name: 'get_dashboard' })
  }

  if (includesAny(n, ['stock bas', 'rupture', 'ناقص', 'نفاد'])) {
    calls.push({ name: 'get_low_stock' })
  }

  if (includesAny(n, ['dette', 'credit', 'دين', 'ديون', 'yekhlas'])) {
    calls.push({ name: 'get_credits' })
  }

  if (includesAny(n, ['gain', 'benefice', 'profit', 'ربح', 'ارباح'])) {
    let period = 'today'
    if (includesAny(n, ['mois', 'شهر'])) period = 'lastMonth'
    if (includesAny(n, ['annee', 'سنة', 'année'])) period = 'thisYear'
    calls.push({ name: 'get_profits', args: { period } })
  }

  if (includesAny(n, ['zakat', 'زكاة']) && !includesAny(n, ['شرح', 'conseil', 'expert', 'خبير'])) {
    calls.push({ name: 'calc_zakat' })
  }

  if (expertDomain) {
    calls.push({ name: 'expert_advice', args: { domain: expertDomain } })
  }

  // Navigation — ne pas voler « conseil vente »
  const navMap: Array<{ words: string[]; screen: string }> = [
    { words: ['vente', 'commande', 'order', 'بيع', 'طلب'], screen: 'order' },
    { words: ['historique', 'facture', 'سجل', 'فاتورة'], screen: 'history' },
    { words: ['client', 'زبون'], screen: 'clients' },
    { words: ['produit', 'stock', 'مخزون', 'منتج'], screen: 'products' },
    { words: ['reglage', 'parametre', 'اعداد', 'إعداد'], screen: 'settings' },
    { words: ['carte', 'gps', 'livraison', 'خريطة'], screen: 'delivery' },
    { words: ['mission', 'livreur', 'سائق', 'جولة'], screen: 'missions' },
    { words: ['galerie', 'photo', 'معرض', 'صور'], screen: 'gallery' },
    { words: ['depense', 'مصاريف'], screen: 'expenses' },
    { words: ['profit', 'gain', 'أرباح'], screen: 'profits' },
    { words: ['caisse', 'صندوق'], screen: 'caisse' },
    { words: ['retour', 'مرتجع'], screen: 'returns' },
    { words: ['achat', 'fournisseur', 'مورد', 'شراء'], screen: 'purchases' },
  ]

  if (
    !isExpertAsk &&
    includesAny(n, ['ouvre', 'va ', 'allez', 'افتح', 'روح', 'سير'])
  ) {
    for (const m of navMap) {
      if (includesAny(n, m.words)) {
        calls.push({ name: 'navigate', args: { screen: m.screen } })
        calls.push({ name: 'open_screen_help', args: { screen: m.screen } })
        break
      }
    }
  }

  if (calls.length === 0 && includesAny(n, ['organise', 'organize', 'نظم', 'رتب', 'agentic'])) {
    calls.push({ name: 'list_capabilities' })
    calls.push({ name: 'organize_easy' })
  }

  void lang
  return calls
}

/**
 * Boucle agentic : plan → outils (avec permissions) → réponse.
 */
export function runAgentic(state: AppState, userText: string): AgenticOutcome | null {
  const lang = state.settings.language
  if (!can(state, 'agenticLoop')) return null

  const text = userText.trim()
  if (!text) return null

  const wantAgentic = includesAny(text.toLowerCase(), [
    'organise',
    'organize',
    'agentic',
    'range',
    'facilite',
    'configure',
    'regle',
    'parametre',
    'theme',
    'permission',
    'que peux',
    'tes droits',
    'conseil',
    'expert',
    'نظم',
    'رتب',
    'سهّل',
    'سهل الكل',
    'صلاح',
    'ثيم',
    'اعداد',
    'نظّم',
    'resume du jour',
    'ملخص',
    'خبير',
    'نصيحة',
    'نصائح',
  ])

  const calls = planTools(text, lang)
  if (!wantAgentic && calls.length === 0) {
    const domain = detectExpertDomain(text)
    if (domain) {
      calls.push({ name: 'expert_advice', args: { domain } })
    } else {
      return null
    }
  }

  if (calls.length === 0) {
    calls.push({ name: 'list_capabilities' })
  }

  let cur = state
  const toolLogs: AgenticTrace['tools'] = []
  let navigateTo: Screen | undefined
  const messages: string[] = []

  const thought =
    lang === 'ar'
      ? `خطة: ${calls.map((c) => c.name).join(' → ')}`
      : `Plan : ${calls.map((c) => c.name).join(' → ')}`

  for (const call of calls.slice(0, 6)) {
    const res: ToolResult = executeTool(cur, call, lang)
    toolLogs.push({ name: call.name, ok: res.ok, message: res.message })
    if (res.nextState) cur = res.nextState
    if (res.navigateTo) navigateTo = res.navigateTo
    messages.push(res.message)
  }

  const onlyExpert =
    calls.length === 1 && calls[0]?.name === 'expert_advice'
  const header = onlyExpert
    ? ''
    : lang === 'ar'
      ? '🤖 Agentic — تم التنفيذ\n'
      : '🤖 Agentic — exécuté\n'

  return {
    usedAgentic: true,
    reply: header + messages.join('\n\n'),
    nextState: cur !== state ? cur : undefined,
    navigateTo,
    trace: { thought, tools: toolLogs },
  }
}
