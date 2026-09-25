import { useEffect, useMemo } from 'react'
import type { CommerceMode, Language, Screen } from './types'
import { t } from './i18n'
import type { MetierFamily } from './locale/metierPacks'
import {
  desktopRailsFor,
  isScreenAction,
  type RailAction,
  type RailActionId,
} from './locale/desktopRails'

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

function RailButtons({
  items,
  lang,
  active,
  onAction,
}: {
  items: RailAction[]
  lang: Language
  active?: Screen
  onAction: (id: RailActionId) => void
}) {
  return (
    <>
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`desktop-rail-btn desktop-rail-action ${
            isScreenAction(s.id) && active === s.id ? 'is-active' : ''
          }`}
          onClick={() => onAction(s.id)}
          title={t(lang, s.labelKey)}
        >
          <span aria-hidden>{s.icon}</span>
        </button>
      ))}
    </>
  )
}

export function DesktopChrome({
  lang,
  mode,
  family,
  activeScreen,
  onLang,
  onGo,
  onAction,
  children,
}: {
  lang: Language
  mode?: CommerceMode
  family?: MetierFamily
  activeScreen?: Screen
  onLang: (l: Language) => void
  onGo: (s: Screen) => void
  /** Actions spéciales (recherche, nouveau produit, alertes) */
  onAction?: (id: RailActionId) => void
  children: React.ReactNode
}) {
  const rails = useMemo(() => desktopRailsFor(family, mode), [family, mode])

  const handle = (id: RailActionId) => {
    if (onAction && (id === 'search' || id === 'newProduct' || id === 'alerts')) {
      onAction(id)
      return
    }
    if (isScreenAction(id)) onGo(id)
  }

  useEffect(() => {
    if (!isElectronDesktop()) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const top = rails.top
      if (e.key === '0') {
        e.preventDefault()
        onGo('home')
        return
      }
      const idx = Number(e.key)
      if (idx >= 1 && idx <= 9 && top[idx - 1]) {
        e.preventDefault()
        const id = top[idx - 1]!.id
        if (id === 'search' || id === 'newProduct' || id === 'alerts') onAction?.(id)
        else if (isScreenAction(id)) onGo(id)
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        onAction?.('search')
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        onAction?.('newProduct')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onGo, onAction, rails])

  if (!isElectronDesktop()) {
    return <>{children}</>
  }

  const ltrLangs = LANGS.filter((l) => l.id !== 'ar')
  const arLang = LANGS.find((l) => l.id === 'ar')!

  return (
    <div
      className="desktop-chrome"
      data-platform={window.azDesktop?.platform || ''}
      data-metier={family || mode || ''}
    >
      {/* LTR : langues + raccourcis quotidiens */}
      <aside className="desktop-rail desktop-rail-start" aria-label="FR EN tools">
        {ltrLangs.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`desktop-rail-btn desktop-rail-lang ${lang === l.id ? 'is-active' : ''}`}
            onClick={() => onLang(l.id)}
            title={t(lang, `lang_${l.id}`)}
          >
            {l.label}
          </button>
        ))}
        <div className="desktop-rail-sep" aria-hidden />
        <RailButtons
          items={rails.left}
          lang={lang}
          active={activeScreen}
          onAction={handle}
        />
      </aside>

      <div className="desktop-chrome-main">
        <nav className="desktop-shortcuts" aria-label="Shortcuts">
          {rails.top.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`desktop-shortcut ${
                isScreenAction(s.id) && activeScreen === s.id ? 'is-active' : ''
              }`}
              onClick={() => handle(s.id)}
              title={`${t(lang, s.labelKey)} (Ctrl+${i + 1})`}
            >
              <span aria-hidden>{s.icon}</span>
            </button>
          ))}
        </nav>
        <div className="desktop-chrome-body">{children}</div>
      </div>

      {/* RTL : arabe + aide / calendrier / alertes */}
      <aside className="desktop-rail desktop-rail-end" aria-label="AR tools">
        <button
          type="button"
          className={`desktop-rail-btn desktop-rail-lang ${lang === 'ar' ? 'is-active' : ''}`}
          onClick={() => onLang('ar')}
          title={t(lang, 'lang_ar')}
        >
          {arLang.label}
        </button>
        <div className="desktop-rail-sep" aria-hidden />
        <RailButtons
          items={rails.right}
          lang={lang}
          active={activeScreen}
          onAction={handle}
        />
      </aside>
    </div>
  )
}
