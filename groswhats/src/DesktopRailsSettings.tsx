import { useMemo, useState } from 'react'
import type { Language } from './types'
import { t } from './i18n'
import {
  ALL_RAIL_ACTIONS,
  RAIL_SLOT_LIMITS,
  desktopRailsFor,
  type DesktopRailsConfig,
  type RailActionId,
} from './locale/desktopRails'
import type { MetierFamily } from './locale/metierPacks'
import type { CommerceMode } from './types'

type Slot = 'top' | 'left' | 'right'

/**
 * Réglage admin des raccourcis desktop (barre haute + rails).
 */
export function DesktopRailsSettings({
  lang,
  family,
  mode,
  value,
  onChange,
}: {
  lang: Language
  family: MetierFamily
  mode: CommerceMode
  value: DesktopRailsConfig | undefined
  onChange: (next: DesktopRailsConfig | undefined) => void
}) {
  const defaults = useMemo(() => desktopRailsFor(family, mode), [family, mode])
  const [slot, setSlot] = useState<Slot>('left')

  const effective: Record<Slot, string[]> = {
    top: value?.top?.length
      ? value.top
      : defaults.top.map((a) => a.id as string),
    left: value?.left?.length
      ? value.left
      : defaults.left.map((a) => a.id as string),
    right: value?.right?.length
      ? value.right
      : defaults.right.map((a) => a.id as string),
  }

  const selected = new Set(effective[slot])
  const max = RAIL_SLOT_LIMITS[slot]
  const isCustom = !!(value?.top || value?.left || value?.right)

  function toggle(id: RailActionId) {
    const cur = [...effective[slot]]
    const i = cur.indexOf(id)
    let next: string[]
    if (i >= 0) {
      next = cur.filter((_, idx) => idx !== i)
    } else {
      if (cur.length >= max) return
      next = [...cur, id]
    }
    onChange({
      ...(value || {}),
      [slot]: next,
    })
  }

  function move(id: string, dir: -1 | 1) {
    const cur = [...effective[slot]]
    const i = cur.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= cur.length) return
    ;[cur[i], cur[j]] = [cur[j]!, cur[i]!]
    onChange({
      ...(value || {}),
      [slot]: cur,
    })
  }

  const slotLabel =
    slot === 'top'
      ? t(lang, 'desktopRailsTop')
      : slot === 'left'
        ? t(lang, 'desktopRailsLeft')
        : t(lang, 'desktopRailsRight')

  return (
    <div className="field desktop-rails-settings">
      <label>{t(lang, 'desktopRailsTitle')}</label>
      <p className="muted" style={{ marginTop: 0 }}>
        {t(lang, 'desktopRailsHint')}
      </p>

      <div className="btn-row" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
        {(
          [
            ['left', 'desktopRailsLeft'],
            ['right', 'desktopRailsRight'],
            ['top', 'desktopRailsTop'],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            className={`btn ${slot === id ? '' : 'secondary'}`}
            onClick={() => setSlot(id)}
          >
            {t(lang, key)}
          </button>
        ))}
      </div>

      <div className="muted" style={{ marginBottom: 8 }}>
        {slotLabel} — {effective[slot].length}/{max}
      </div>

      {effective[slot].length > 0 ? (
        <div className="desktop-rails-order" style={{ marginBottom: 10 }}>
          {effective[slot].map((id) => {
            const a = ALL_RAIL_ACTIONS.find((x) => x.id === id)
            if (!a) return null
            return (
              <div key={id} className="desktop-rails-order-row">
                <span>
                  {a.icon} {t(lang, a.labelKey)}
                </span>
                <span className="btn-row" style={{ gap: 4 }}>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ minWidth: 36, padding: '4px 8px' }}
                    onClick={() => move(id, -1)}
                    aria-label="↑"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ minWidth: 36, padding: '4px 8px' }}
                    onClick={() => move(id, 1)}
                    aria-label="↓"
                  >
                    ↓
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="desktop-rails-grid">
        {ALL_RAIL_ACTIONS.map((a) => {
          const on = selected.has(a.id)
          const full = !on && selected.size >= max
          return (
            <label
              key={a.id}
              className={`check-row desktop-rails-pick ${on ? 'is-on' : ''} ${
                full ? 'is-full' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={full}
                onChange={() => toggle(a.id)}
              />
              <span>
                {a.icon} {t(lang, a.labelKey)}
              </span>
            </label>
          )
        })}
      </div>

      <button
        type="button"
        className="btn secondary block"
        style={{ marginTop: 10 }}
        disabled={!isCustom}
        onClick={() => onChange(undefined)}
      >
        {t(lang, 'desktopRailsReset')}
      </button>
    </div>
  )
}
