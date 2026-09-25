import { useEffect } from 'react'
import type { Language, Screen } from './types'
import { t } from './i18n'

declare global {
  interface Window {
    azDesktop?: {
      isElectron: boolean
      platform?: string
    }
  }
}

export function isElectronDesktop(): boolean {
  return typeof window !== 'undefined' && window.azDesktop?.isElectron === true
}

const LANGS: Array<{ id: Language; label: string }> = [
  { id: 'fr', label: 'FR' },
  { id: 'en', label: 'EN' },
  { id: 'ar', label: 'ع' },
]

type Shortcut = { id: Screen; icon: string; labelKey: string }

/** Raccourcis pro en accès direct (barre haute) */
const SHORTCUTS: Shortcut[] = [
  { id: 'order', icon: '🛒', labelKey: 'order' },
  { id: 'products', icon: '📦', labelKey: 'products' },
  { id: 'clients', icon: '👥', labelKey: 'clients' },
  { id: 'caisse', icon: '💵', labelKey: 'caisse' },
  { id: 'history', icon: '📜', labelKey: 'history' },
  { id: 'stock', icon: '📊', labelKey: 'stock' },
  { id: 'expenses', icon: '💸', labelKey: 'expenses' },
  { id: 'profits', icon: '📈', labelKey: 'profitsTitle' },
  { id: 'settings', icon: '⚙️', labelKey: 'settings' },
]

export function DesktopChrome({
  lang,
  onLang,
  onGo,
  children,
}: {
  lang: Language
  onLang: (l: Language) => void
  onGo: (s: Screen) => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!isElectronDesktop()) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const map: Record<string, Screen> = {
        '1': 'order',
        '2': 'products',
        '3': 'clients',
        '4': 'caisse',
        '5': 'history',
        '6': 'stock',
        '7': 'expenses',
        '8': 'profits',
        '9': 'settings',
        '0': 'home',
      }
      const screen = map[e.key]
      if (!screen) return
      e.preventDefault()
      onGo(screen)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onGo])

  if (!isElectronDesktop()) {
    return <>{children}</>
  }

  const ltrLangs = LANGS.filter((l) => l.id !== 'ar')
  const arLang = LANGS.find((l) => l.id === 'ar')!

  return (
    <div className="desktop-chrome" data-platform={window.azDesktop?.platform || ''}>
      {/* LTR : rail gauche (début de lecture FR/EN) */}
      <aside className="desktop-rail desktop-rail-start" aria-label="FR EN">
        {ltrLangs.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`desktop-rail-btn ${lang === l.id ? 'is-active' : ''}`}
            onClick={() => onLang(l.id)}
            title={t(lang, `lang_${l.id}`)}
          >
            {l.label}
          </button>
        ))}
      </aside>

      <div className="desktop-chrome-main">
        <nav className="desktop-shortcuts" aria-label="Shortcuts">
          {SHORTCUTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="desktop-shortcut"
              onClick={() => onGo(s.id)}
              title={`${t(lang, s.labelKey)} (Ctrl+${
                SHORTCUTS.findIndex((x) => x.id === s.id) + 1
              })`}
            >
              <span aria-hidden>{s.icon}</span>
            </button>
          ))}
        </nav>
        <div className="desktop-chrome-body">{children}</div>
      </div>

      {/* RTL : rail droite (début de lecture arabe) */}
      <aside className="desktop-rail desktop-rail-end" aria-label="AR">
        <button
          type="button"
          className={`desktop-rail-btn ${lang === 'ar' ? 'is-active' : ''}`}
          onClick={() => onLang('ar')}
          title={t(lang, 'lang_ar')}
        >
          {arLang.label}
        </button>
      </aside>
    </div>
  )
}
