import { useEffect, useMemo, useRef, useState } from 'react'
import type { CommerceMode, Language, Screen } from './types'
import { t } from './i18n'
import type { MetierFamily } from './locale/metierPacks'
import {
  desktopRailsFor,
  isScreenAction,
  railHint,
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

const TIP_DELAY_MS = 700

type TipSide = 'right' | 'left' | 'bottom'

function DesktopTipButton({
  title,
  hint,
  side,
  className,
  active,
  onClick,
  children,
  shortcutHint,
}: {
  title: string
  hint: string
  side: TipSide
  className: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  shortcutHint?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | null>(null)

  function clearTimer() {
    if (timer.current != null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  function clear() {
    clearTimer()
    setOpen(false)
    setPos(null)
  }

  function place() {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 10
    if (side === 'right') {
      setPos({ top: r.top + r.height / 2, left: r.right + gap })
    } else if (side === 'left') {
      setPos({ top: r.top + r.height / 2, left: r.left - gap })
    } else {
      setPos({ top: r.bottom + 8, left: r.left + r.width / 2 })
    }
  }

  function arm() {
    clearTimer()
    timer.current = window.setTimeout(() => {
      place()
      setOpen(true)
    }, TIP_DELAY_MS)
  }

  useEffect(() => () => clear(), [])

  return (
    <span
      ref={wrapRef}
      className={`desktop-tip-wrap desktop-tip-${side}`}
      onMouseEnter={arm}
      onMouseLeave={clear}
      onFocus={arm}
      onBlur={clear}
    >
      <button
        type="button"
        className={`${className}${active ? ' is-active' : ''}`}
        onClick={() => {
          clear()
          onClick()
        }}
        aria-label={`${title}. ${hint}`}
      >
        {children}
      </button>
      {open && hint && pos ? (
        <span
          className={`desktop-tip desktop-tip-fixed desktop-tip-fixed-${side}`}
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
        >
          <strong className="desktop-tip-title">
            {title}
            {shortcutHint ? (
              <kbd className="desktop-tip-kbd">{shortcutHint}</kbd>
            ) : null}
          </strong>
          <span className="desktop-tip-body">{hint}</span>
        </span>
      ) : null}
    </span>
  )
}

function RailButtons({
  items,
  lang,
  active,
  side,
  onAction,
}: {
  items: RailAction[]
  lang: Language
  active?: Screen
  side: TipSide
  onAction: (id: RailActionId) => void
}) {
  return (
    <>
      {items.map((s) => (
        <DesktopTipButton
          key={s.id}
          title={t(lang, s.labelKey)}
          hint={railHint(lang, s.id)}
          side={side}
          className="desktop-rail-btn desktop-rail-action"
          active={isScreenAction(s.id) && active === s.id}
          onClick={() => onAction(s.id)}
        >
          <span aria-hidden>{s.icon}</span>
        </DesktopTipButton>
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
      <aside className="desktop-rail desktop-rail-start" aria-label="FR EN tools">
        {ltrLangs.map((l) => (
          <DesktopTipButton
            key={l.id}
            title={t(lang, `lang_${l.id}`)}
            hint={railHint(lang, `lang_${l.id}`)}
            side="right"
            className="desktop-rail-btn desktop-rail-lang"
            active={lang === l.id}
            onClick={() => onLang(l.id)}
          >
            {l.label}
          </DesktopTipButton>
        ))}
        <div className="desktop-rail-sep" aria-hidden />
        <RailButtons
          items={rails.left}
          lang={lang}
          active={activeScreen}
          side="right"
          onAction={handle}
        />
      </aside>

      <div className="desktop-chrome-main">
        <nav className="desktop-shortcuts" aria-label="Shortcuts">
          {rails.top.map((s, i) => (
            <DesktopTipButton
              key={s.id}
              title={t(lang, s.labelKey)}
              hint={railHint(lang, s.id)}
              side="bottom"
              className="desktop-shortcut"
              active={isScreenAction(s.id) && activeScreen === s.id}
              onClick={() => handle(s.id)}
              shortcutHint={`Ctrl+${i + 1}`}
            >
              <span aria-hidden>{s.icon}</span>
            </DesktopTipButton>
          ))}
        </nav>
        <div className="desktop-chrome-body">{children}</div>
      </div>

      <aside className="desktop-rail desktop-rail-end" aria-label="AR tools">
        <DesktopTipButton
          title={t(lang, 'lang_ar')}
          hint={railHint(lang, 'lang_ar')}
          side="left"
          className="desktop-rail-btn desktop-rail-lang"
          active={lang === 'ar'}
          onClick={() => onLang('ar')}
        >
          {arLang.label}
        </DesktopTipButton>
        <div className="desktop-rail-sep" aria-hidden />
        <RailButtons
          items={rails.right}
          lang={lang}
          active={activeScreen}
          side="left"
          onAction={handle}
        />
      </aside>
    </div>
  )
}
