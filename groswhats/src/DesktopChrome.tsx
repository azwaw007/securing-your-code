import { useEffect, useMemo, useRef, useState } from 'react'
import type { CommerceMode, Language, Screen } from './types'
import { t } from './i18n'
import type { MetierFamily } from './locale/metierPacks'
import {
  desktopRailsFor,
  isScreenAction,
  railHint,
  type DesktopRailsConfig,
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

type HotBinding = { key: string; id: RailActionId }

/** F1…F12 dans l’ordre : barre haut → rail gauche → rail droite */
function buildFKeyBindings(rails: {
  top: RailAction[]
  left: RailAction[]
  right: RailAction[]
}): HotBinding[] {
  const out: HotBinding[] = []
  let n = 1
  for (const list of [rails.top, rails.left, rails.right]) {
    for (const item of list) {
      if (n > 12) return out
      out.push({ key: `F${n}`, id: item.id })
      n += 1
    }
  }
  return out
}

function DesktopTipButton({
  title,
  hint,
  side,
  className,
  active,
  onClick,
  children,
  shortcutHint,
  showKeyBadge,
}: {
  title: string
  hint: string
  side: TipSide
  className: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  shortcutHint?: string
  /** Affiche la touche sur l’icône (ex. F1) */
  showKeyBadge?: boolean
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
        className={`${className}${active ? ' is-active' : ''}${
          showKeyBadge && shortcutHint ? ' has-key-badge' : ''
        }`}
        onClick={() => {
          clear()
          onClick()
        }}
        aria-label={
          shortcutHint ? `${title}. ${hint}. ${shortcutHint}` : `${title}. ${hint}`
        }
      >
        {children}
        {showKeyBadge && shortcutHint ? (
          <kbd className="desktop-key-badge" aria-hidden>
            {shortcutHint}
          </kbd>
        ) : null}
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
  bindings,
  occurrenceOffset,
}: {
  items: RailAction[]
  lang: Language
  active?: Screen
  side: TipSide
  onAction: (id: RailActionId) => void
  bindings: HotBinding[]
  /** index de départ dans la séquence F pour ce rail */
  occurrenceOffset: number
}) {
  return (
    <>
      {items.map((s, i) => {
        const key = bindings[occurrenceOffset + i]?.key
        return (
          <DesktopTipButton
            key={s.id}
            title={t(lang, s.labelKey)}
            hint={railHint(lang, s.id)}
            side={side}
            className="desktop-rail-btn desktop-rail-action"
            active={isScreenAction(s.id) && active === s.id}
            onClick={() => onAction(s.id)}
            shortcutHint={key}
            showKeyBadge={!!key}
          >
            <span aria-hidden>{s.icon}</span>
          </DesktopTipButton>
        )
      })}
    </>
  )
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return !!el.closest('input, textarea, select, [contenteditable="true"]')
}

export function DesktopChrome({
  lang,
  mode,
  family,
  railsConfig,
  activeScreen,
  onLang,
  onGo,
  onAction,
  children,
}: {
  lang: Language
  mode?: CommerceMode
  family?: MetierFamily
  railsConfig?: DesktopRailsConfig | null
  activeScreen?: Screen
  onLang: (l: Language) => void
  onGo: (s: Screen) => void
  onAction?: (id: RailActionId) => void
  children: React.ReactNode
}) {
  const rails = useMemo(
    () => desktopRailsFor(family, mode, railsConfig),
    [family, mode, railsConfig],
  )

  const bindings = useMemo(() => buildFKeyBindings(rails), [rails])
  const leftOffset = rails.top.length
  const rightOffset = rails.top.length + rails.left.length

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
      if (isTypingTarget(e.target)) return
      // F1…F12
      if (/^F([1-9]|1[0-2])$/.test(e.key)) {
        const hit = bindings.find((b) => b.key === e.key)
        if (hit) {
          e.preventDefault()
          handle(hit.id)
          return
        }
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      if (e.key === '0') {
        e.preventDefault()
        onGo('home')
        return
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
  }, [onGo, onAction, bindings, rails])

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
          bindings={bindings}
          occurrenceOffset={leftOffset}
        />
      </aside>

      <div className="desktop-chrome-main">
        <nav className="desktop-shortcuts" aria-label="Shortcuts">
          {rails.top.map((s, i) => {
            const key = bindings[i]?.key
            return (
              <DesktopTipButton
                key={s.id}
                title={t(lang, s.labelKey)}
                hint={railHint(lang, s.id)}
                side="bottom"
                className="desktop-shortcut"
                active={isScreenAction(s.id) && activeScreen === s.id}
                onClick={() => handle(s.id)}
                shortcutHint={key}
                showKeyBadge={!!key}
              >
                <span aria-hidden>{s.icon}</span>
              </DesktopTipButton>
            )
          })}
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
          bindings={bindings}
          occurrenceOffset={rightOffset}
        />
      </aside>
    </div>
  )
}
