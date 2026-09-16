import { useState } from 'react'
import type { AppState, Language, RepairStatus } from './types'
import { t } from './i18n'
import { addRepairOrder, deleteRepairOrder, updateRepairOrder } from './store'
import { formatDa } from './utils/format'

const STATUSES: RepairStatus[] = ['devis', 'or', 'done', 'cancelled']

function statusLabel(lang: Language, status: RepairStatus): string {
  if (status === 'devis') return t(lang, 'repairDevis')
  if (status === 'or') return t(lang, 'repairOr')
  if (status === 'done') return t(lang, 'repairDone')
  return t(lang, 'repairCancel')
}

export function RepairOrderPanel({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const orders = [...(state.repairOrders ?? [])].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  )
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [estimate, setEstimate] = useState('')
  const [note, setNote] = useState('')

  function save() {
    const t2 = title.trim()
    if (!t2) return
    const client = state.clients.find((c) => c.id === clientId)
    onState(
      addRepairOrder(state, {
        clientId: client?.id || '',
        clientName: client?.name || '',
        clientPhone: client?.phone || '',
        title: t2,
        status: 'devis',
        estimateDa: Math.max(0, Number(String(estimate).replace(',', '.')) || 0),
        note: note.trim(),
      }),
    )
    setTitle('')
    setEstimate('')
    setNote('')
    onFlash(t(lang, 'repairSave'))
  }

  return (
    <section className="repair-orders card">
      <h3>🛠️ {t(lang, 'repairTitle')}</h3>
      <p className="muted">{t(lang, 'repairHint')}</p>

      <div className="field">
        <label>{t(lang, 'client')}</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">—</option>
          {state.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>{t(lang, 'repairTitleField')}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t(lang, 'repairEstimate')}</label>
        <input
          inputMode="decimal"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          placeholder="0"
        />
      </div>
      <div className="field">
        <label>{t(lang, 'note')}</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button
        type="button"
        className="btn block"
        disabled={!title.trim()}
        onClick={save}
      >
        + {t(lang, 'repairNew')}
      </button>

      <div className="dossier-list" style={{ marginTop: 12 }}>
        {orders.length === 0 ? (
          <p className="muted">{t(lang, 'repairEmpty')}</p>
        ) : (
          orders.map((r) => (
            <div key={r.id} className="dossier-doc-row repair-row">
              <div>
                <strong>{r.title}</strong>
                <div className="muted">
                  {r.clientName || '—'}
                  {r.estimateDa > 0 ? ` · ${formatDa(r.estimateDa)}` : ''}
                  {r.note ? ` · ${r.note}` : ''}
                </div>
                <div className="repair-status-chips">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`repair-status-chip ${r.status === s ? 'active' : ''}`}
                      onClick={() => onState(updateRepairOrder(state, r.id, { status: s }))}
                    >
                      {statusLabel(lang, s)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => onState(deleteRepairOrder(state, r.id))}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
