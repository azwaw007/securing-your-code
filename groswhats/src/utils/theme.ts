import type { FontScale, Language, ThemePreset } from '../types'
import type { MetierTheme } from '../locale/metierPacks'
import { metierPackFor } from '../locale/metierPacks'
import type { CommerceMode } from '../types'

export const THEME_PRESETS: Record<
  ThemePreset,
  {
    labelFr: string
    labelAr: string
    vars: Record<string, string>
  }
> = {
  forest: {
    labelFr: 'Forêt (vert)',
    labelAr: 'غابة (أخضر)',
    vars: {
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
  },
  ocean: {
    labelFr: 'Océan (bleu)',
    labelAr: 'بحر (أزرق)',
    vars: {
      '--bg': '#eef3f8',
      '--bg-2': '#d9e4ef',
      '--ink': '#122033',
      '--muted': '#5a6b7d',
      '--card': '#f7fbff',
      '--line': '#c5d4e3',
      '--brand': '#0b5cab',
      '--brand-2': '#1a7ad4',
      '--glow': 'rgba(26, 122, 212, 0.16)',
    },
  },
  sand: {
    labelFr: 'Sable (chaud)',
    labelAr: 'رمل (دافئ)',
    vars: {
      '--bg': '#f6ecd9',
      '--bg-2': '#ead9b8',
      '--ink': '#2a2116',
      '--muted': '#7a6a52',
      '--card': '#fff8eb',
      '--line': '#e0d0b0',
      '--brand': '#9a5b12',
      '--brand-2': '#c2781a',
      '--glow': 'rgba(194, 120, 26, 0.16)',
    },
  },
  night: {
    labelFr: 'Nuit (sombre)',
    labelAr: 'ليل (داكن)',
    vars: {
      '--bg': '#12161c',
      '--bg-2': '#1a222c',
      '--ink': '#e8eef6',
      '--muted': '#c5d0de',
      '--card': '#1c2430',
      '--line': '#3a4658',
      '--brand': '#3dba8c',
      '--brand-2': '#5ad4a6',
      '--glow': 'rgba(61, 186, 140, 0.22)',
    },
  },
  coral: {
    labelFr: 'Corail',
    labelAr: 'مرجاني',
    vars: {
      '--bg': '#f8efec',
      '--bg-2': '#efddd7',
      '--ink': '#2a1612',
      '--muted': '#7a5a52',
      '--card': '#fff8f6',
      '--line': '#e5cfc8',
      '--brand': '#c44536',
      '--brand-2': '#e05a48',
      '--glow': 'rgba(224, 90, 72, 0.16)',
    },
  },
}

const FONT_SCALE: Record<FontScale, string> = {
  normal: '16px',
  large: '18px',
  xlarge: '20px',
}

function paintRoot(
  vars: Record<string, string>,
  fontScale: FontScale,
  opts: { themeId: string; metier?: string; mood?: MetierTheme['mood'] },
): void {
  const root = document.documentElement
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v)
  }
  root.style.setProperty('--app-font-size', FONT_SCALE[fontScale] ?? FONT_SCALE.normal)
  root.dataset.theme = opts.themeId
  root.dataset.fontScale = fontScale
  if (opts.metier) root.dataset.metier = opts.metier
  else delete root.dataset.metier
  const mood = opts.mood || 'light'
  document.body.style.background =
    mood === 'dim' || opts.themeId === 'night'
      ? `radial-gradient(circle at top left, var(--glow), transparent 28%), linear-gradient(180deg, #0e1318 0%, var(--bg) 45%, #0a0e12 100%)`
      : mood === 'clinical'
        ? `radial-gradient(circle at 12% 0%, var(--glow), transparent 32%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 85%, white) 0%, var(--bg) 38%, var(--bg-2) 100%)`
        : `radial-gradient(circle at top left, var(--glow), transparent 28%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 70%, white) 0%, var(--bg) 40%, var(--bg-2) 100%)`
}

/** Applique thème + taille texte sur :root (sûr, réversible). */
export function applyUiTheme(preset: ThemePreset, fontScale: FontScale): void {
  const theme = THEME_PRESETS[preset] ?? THEME_PRESETS.forest
  paintRoot(theme.vars, fontScale, {
    themeId: preset,
    mood: preset === 'night' ? 'dim' : 'light',
  })
}

/** Thème dérivé du métier / domaine (prioritaire si themeSource !== user). */
export function applyMetierTheme(
  domainId: string | undefined,
  mode: CommerceMode | undefined,
  fontScale: FontScale,
): void {
  const pack = metierPackFor(domainId, mode)
  paintRoot(pack.theme.vars, fontScale, {
    themeId: `metier-${pack.family}`,
    metier: pack.family,
    mood: pack.theme.mood,
  })
}

/** Applique le thème effectif selon la source. */
export function applyEffectiveTheme(opts: {
  themeSource?: 'metier' | 'user'
  themePreset: ThemePreset
  fontScale: FontScale
  domainId?: string
  commerceMode?: CommerceMode
}): void {
  if (opts.themeSource === 'user') {
    applyUiTheme(opts.themePreset, opts.fontScale)
    return
  }
  applyMetierTheme(opts.domainId, opts.commerceMode, opts.fontScale)
}

export function themeLabel(lang: Language, preset: ThemePreset): string {
  const t = THEME_PRESETS[preset]
  return lang === 'ar' ? t.labelAr : t.labelFr
}

export function parseThemeFromText(text: string): ThemePreset | null {
  const n = text.toLowerCase()
  if (/(nuit|sombre|dark|ليل|داكن)/.test(n)) return 'night'
  if (/(ocean|bleu|blue|بحر|أزرق|ازرق)/.test(n)) return 'ocean'
  if (/(sable|chaud|sand|warm|رمل|دافئ)/.test(n)) return 'sand'
  if (/(corail|rouge|coral|مرجاني|أحمر|احمر)/.test(n)) return 'coral'
  if (/(foret|forêt|vert|green|غابة|أخضر|اخضر|defaut|défaut)/.test(n)) return 'forest'
  return null
}

export function parseFontFromText(text: string): FontScale | null {
  const n = text.toLowerCase()
  if (/(tres gros|très gros|xlarge|كبير جدا|اكبر)/.test(n)) return 'xlarge'
  if (/(gros texte|grand texte|large|تكبير|كبير|كبر الخط)/.test(n)) return 'large'
  if (/(texte normal|petite|normal|عادي|صغير)/.test(n)) return 'normal'
  return null
}
