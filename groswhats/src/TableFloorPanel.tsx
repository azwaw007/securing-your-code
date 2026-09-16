import { useState } from 'react'
import type { AppState, FloorTable, Language } from './types'
import { t } from './i18n'
import {
  deleteFloorTable,
  setTableStatus,
  upsertFloorTable,
} from './store'

export function TableFloorPanel({
  state,
  lang,
  onState,
  onFlash,
  onOpenTable,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
  /** Navigate to order with this held sale */
  onOpenTable: (tableId: string, heldSaleId: string) => void
}) {
  const tables = state.tables ?? []
  const [name, setName] = useState(`T${tables.length + 1}`)
  const [seats, setSeats] = useState(2)
  const [showForm, setShowForm] = useState(false)

  function addTable() {
    const n = name.trim() || `T${tables.length + 1}`
    const next = upsertFloorTable(state, {
      name: n,
      seats: Math.max(1, seats || 2),
    })
    onState(next)
    onFlash(t(lang, 'tableSaved'))
    setShowForm(false)
    setName(`T${(next.tables ?? []).length + 1}`)
  }

  function openTable(tb: FloorTable) {
    onOpenTable(tb.id, tb.heldSaleId)
  }

  function markBill(tb: FloorTable) {
    onState(setTableStatus(state, tb.id, 'bill', tb.heldSaleId))
  }

  function freeTable(tb: FloorTable) {
    onState(setTableStatus(state, tb.id, 'free'))
  }

  return (
    <div className="card table-floor">
      <div className="list-item" style={{ borderBottom: 'none', paddingTop: 0 }}>
        <div>
          <h2 style={{ margin: 0 }}>🍽️ {t(lang, 'tableFloorTitle')}</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {t(lang, 'tableFloorHint')}
          </p>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setShowForm((v) => !v)}
        >
          {t(lang, 'tableAdd')}
        </button>
      </div>

      {showForm ? (
        <div className="clinic-agenda-form">
          <div className="grid-2">
            <div className="field">
              <label>{t(lang, 'tableName')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>{t(lang, 'tableSeats')}</label>
              <input
                type="number"
                min={1}
                max={20}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value) || 2)}
              />
            </div>
          </div>
          <button type="button" className="btn block" onClick={addTable}>
            {t(lang, 'tableAdd')}
          </button>
        </div>
      ) : null}

      {tables.length === 0 ? (
        <div className="empty">{t(lang, 'tableEmpty')}</div>
      ) : (
        <div className="table-grid">
          {tables.map((tb) => (
            <div
              key={tb.id}
              className={`table-tile is-${tb.status}`}
            >
              <strong>{tb.name}</strong>
              <div className="muted">
                {tb.seats} ·{' '}
                {tb.status === 'free'
                  ? t(lang, 'tableFree')
                  : tb.status === 'bill'
                    ? t(lang, 'tableBill')
                    : t(lang, 'tableOpen')}
              </div>
              <div className="btn-row" style={{ marginTop: 6, justifyContent: 'center' }}>
                {tb.status === 'free' ? (
                  <button type="button" className="btn" onClick={() => openTable(tb)}>
                    {t(lang, 'tableOpen')}
                  </button>
                ) : null}
                {tb.status === 'busy' ? (
                  <>
                    <button type="button" className="btn" onClick={() => openTable(tb)}>
                      {t(lang, 'tableOpen')}
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => markBill(tb)}
                    >
                      {t(lang, 'tableBill')}
                    </button>
                  </>
                ) : null}
                {tb.status === 'bill' ? (
                  <>
                    <button type="button" className="btn" onClick={() => openTable(tb)}>
                      {t(lang, 'tableBill')}
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => freeTable(tb)}
                    >
                      {t(lang, 'tableFree')}
                    </button>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                className="btn danger"
                style={{ marginTop: 4, fontSize: '0.75rem' }}
                onClick={() => {
                  onState(deleteFloorTable(state, tb.id))
                  onFlash(t(lang, 'tableDeleted'))
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
