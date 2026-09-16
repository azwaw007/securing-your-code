import { useMemo, useState } from 'react'
import type { AppState, Client, IncomingOrder, Language, Order, Product, Screen } from './types'
import { t, unitLabel } from './i18n'
import { mt } from './locale/modeCopy'
import { formatDa, formatQty } from './utils/format'
import { buildArrivalsMessage, openWhatsappText } from './utils/whatsapp'
import { parseContactLines, pickPhoneContacts } from './utils/contacts'
import { ensureNotificationPermission } from './utils/notify'
import {
  daysUntilDue,
  formatDueDateLabel,
  orderRemainingDa,
} from './store'

export function StockAlertCard({
  products,
  lang,
  enabled,
  onEnable,
}: {
  products: Product[]
  lang: Language
  enabled: boolean
  onEnable: () => void
}) {
  return (
    <div className={`card ${products.length ? 'alert-card' : ''}`}>
      <h2>{t(lang, 'stockAlertTitle')}</h2>
      {!enabled ? (
        <button className="btn block" onClick={onEnable}>
          {t(lang, 'enableAlerts')}
        </button>
      ) : null}
      {products.length === 0 ? (
        <div className="empty">{t(lang, 'stockAlertEmpty')}</div>
      ) : (
        products.map((p) => (
          <div className="list-item" key={p.id}>
            <div>
              <strong>{p.name}</strong>
              <div className="muted">
                {formatQty(p.stock)} {unitLabel(lang, p.unit)}
              </div>
            </div>
            <span className="badge warn">{t(lang, 'lowStock')}</span>
          </div>
        ))
      )}
    </div>
  )
}

/** Alertes échéances dettes (retard + bientôt) */
export function DueAlertCard({
  overdue,
  soon,
  lang,
  enabled,
  onEnable,
  onOpenClient,
}: {
  overdue: Order[]
  soon: Order[]
  lang: Language
  enabled: boolean
  onEnable: () => void
  onOpenClient?: (id: string) => void
}) {
  const list = [...overdue, ...soon]
  if (list.length === 0 && enabled) return null

  return (
    <div className={`card ${list.length ? 'alert-card' : ''}`}>
      <h2>📅 {t(lang, 'dueAlertTitle')}</h2>
      {!enabled ? (
        <button className="btn block" onClick={onEnable}>
          {t(lang, 'enableAlerts')}
        </button>
      ) : null}
      {enabled && list.length === 0 ? (
        <div className="empty">{t(lang, 'dueAlertEmpty')}</div>
      ) : null}
      {overdue.map((o) => (
        <button
          type="button"
          className="list-item due-alert-row"
          key={`ov-${o.id}`}
          onClick={() => o.clientId && onOpenClient?.(o.clientId)}
        >
          <div>
            <strong>{o.clientName}</strong>
            <div className="muted">
              {formatDa(orderRemainingDa(o))}
              {o.dueDate
                ? ` · ${formatDueDateLabel(o.dueDate, lang)}`
                : ''}
            </div>
          </div>
          <span className="badge warn">{t(lang, 'dueOverdue')}</span>
        </button>
      ))}
      {soon.map((o) => {
        const left = o.dueDate ? daysUntilDue(o.dueDate) : 0
        return (
          <button
            type="button"
            className="list-item due-alert-row"
            key={`soon-${o.id}`}
            onClick={() => o.clientId && onOpenClient?.(o.clientId)}
          >
            <div>
              <strong>{o.clientName}</strong>
              <div className="muted">
                {formatDa(orderRemainingDa(o))}
                {o.dueDate
                  ? ` · ${formatDueDateLabel(o.dueDate, lang)}`
                  : ''}
              </div>
            </div>
            <span className="badge">
              {left === 0
                ? t(lang, 'dueToday')
                : t(lang, 'dueInDays').replace('{n}', String(left))}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function InboxPage({
  state,
  lang,
  onAdd,
  onUpdate,
  onGoOrder,
}: {
  state: AppState
  lang: Language
  onAdd: (input: Omit<IncomingOrder, 'id' | 'createdAt' | 'status'>) => void
  onUpdate: (id: string, patch: Partial<IncomingOrder>) => void
  onGoOrder: () => void
}) {
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [note, setNote] = useState('')
  const pending = state.incomingOrders.filter((o) => o.status === 'pending')

  const askText =
    lang === 'ar'
      ? `السلام، للطلب أرسلوا على واتساب ${state.settings.phone} : اسم المنتج + الكمية. شكرا — ${state.settings.shopName}`
      : `Salam, pour commander envoyez sur WhatsApp ${state.settings.phone} : produit + quantité. Merci — ${state.settings.shopName}`

  return (
    <>
      <div className="card">
        <h2>{t(lang, 'inboxTitle')}</h2>
        <div className="notice">{t(lang, 'inboxHint')}</div>
        <button
          className="btn secondary block"
          onClick={async () => {
            await navigator.clipboard.writeText(askText)
          }}
        >
          {t(lang, 'copyAskText')}
        </button>
      </div>

      <div className="card">
        <div className="field">
          <label>{t(lang, 'clientName')}</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="field">
          <label>WhatsApp</label>
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
        </div>
        <div className="field">
          <label>{t(lang, 'incomingNote')}</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="2 cartons huile, 5 kg couscous..."
          />
        </div>
        <button
          className="btn block"
          disabled={!note.trim()}
          onClick={() => {
            onAdd({
              clientName: clientName.trim() || 'Client WhatsApp',
              clientPhone: clientPhone.trim(),
              note: note.trim(),
            })
            setClientName('')
            setClientPhone('')
            setNote('')
          }}
        >
          {t(lang, 'addIncoming')}
        </button>
      </div>

      <div className="card">
        <h2>
          {t(lang, 'pendingIncoming')} ({pending.length})
        </h2>
        {state.incomingOrders.length === 0 ? (
          <div className="empty">{t(lang, 'noIncoming')}</div>
        ) : (
          state.incomingOrders.map((o) => (
            <div className="order-block" key={o.id}>
              <div className="list-item">
                <div>
                  <strong>{o.clientName}</strong>
                  <div className="muted">{o.clientPhone || '—'}</div>
                  <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{o.note}</div>
                  <span className={`badge ${o.status === 'pending' ? 'warn' : ''}`}>
                    {o.status}
                  </span>
                </div>
              </div>
              {o.status === 'pending' ? (
                <div className="btn-row">
                  <button className="btn" onClick={onGoOrder}>
                    {mt(state.settings.commerceMode, lang, 'newOrder')}
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => onUpdate(o.id, { status: 'done' })}
                  >
                    {t(lang, 'markDone')}
                  </button>
                  <button
                    className="btn danger"
                    onClick={() => onUpdate(o.id, { status: 'rejected' })}
                  >
                    {t(lang, 'markRejected')}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </>
  )
}

export function ArrivagesPage({
  state,
  lang,
}: {
  state: AppState
  lang: Language
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [extra, setExtra] = useState('')
  const names = state.products.filter((p) => selected[p.id]).map((p) => p.name)
  const message = useMemo(
    () => buildArrivalsMessage(state.settings, names, extra.trim()),
    [state.settings, names, extra],
  )

  return (
    <>
      <div className="card">
        <h2>{t(lang, 'arrivagesTitle')}</h2>
        <div className="notice">{t(lang, 'arrivagesHint')}</div>
        <div className="field">
          <label>{t(lang, 'selectProducts')}</label>
          {state.products.map((p) => (
            <label key={p.id} className="field check-row">
              <input
                type="checkbox"
                checked={!!selected[p.id]}
                onChange={(e) =>
                  setSelected((s) => ({ ...s, [p.id]: e.target.checked }))
                }
              />
              {p.name}
            </label>
          ))}
        </div>
        <div className="field">
          <label>{t(lang, 'extraNote')}</label>
          <textarea rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </div>
        <div className="field">
          <label>{t(lang, 'previewMessage')}</label>
          <pre className="ticket-preview">{message}</pre>
        </div>
      </div>

      <div className="card">
        <h2>{t(lang, 'clients')}</h2>
        {state.clients.length === 0 ? (
          <div className="empty">{t(lang, 'addClientFirst')}</div>
        ) : (
          <>
            <button
              className="btn block"
              disabled={names.length === 0}
              onClick={() => {
                state.clients.forEach((c, i) => {
                  window.setTimeout(() => openWhatsappText(c.phone, message), i * 600)
                })
              }}
            >
              {t(lang, 'sendToAll')}
            </button>
            {state.clients.map((c) => (
              <div className="list-item" key={c.id}>
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted">{c.phone}</div>
                </div>
                <button
                  className="btn secondary"
                  disabled={names.length === 0}
                  onClick={() => openWhatsappText(c.phone, message)}
                >
                  {t(lang, 'sendToOne')}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

export async function importPhoneContacts(): Promise<
  Array<Pick<Client, 'name' | 'phone'>>
> {
  return pickPhoneContacts()
}

export function importPastedContacts(text: string): Array<Pick<Client, 'name' | 'phone'>> {
  return parseContactLines(text)
}

export async function enableStockAlerts(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  const ok = await ensureNotificationPermission()
  return ok ? 'granted' : 'denied'
}

export type ExtraScreen = Extract<Screen, 'inbox' | 'arrivages'>
