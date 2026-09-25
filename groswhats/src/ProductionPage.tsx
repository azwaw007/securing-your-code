import { useMemo, useState } from 'react'
import type { AppState, Language, RecipeIngredient } from './types'
import { t, unitLabel } from './i18n'
import { formatDa, formatQty } from './utils/format'
import {
  activeLocationId,
  addRecipe,
  deleteRecipe,
  displayStock,
  produceFromRecipe,
  stockAt,
  updateRecipe,
} from './store'

type Tab = 'produce' | 'recipes' | 'history'

export function ProductionPage({
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
  const [tab, setTab] = useState<Tab>('produce')
  const recipes = state.recipes ?? []
  const runs = useMemo(
    () =>
      [...(state.productionRuns ?? [])].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1,
      ),
    [state.productionRuns],
  )
  const products = useMemo(
    () => [...state.products].sort((a, b) => a.name.localeCompare(b.name)),
    [state.products],
  )
  const locId = activeLocationId(state)

  const [recipeId, setRecipeId] = useState('')
  const [qtyStr, setQtyStr] = useState('1')

  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [outputId, setOutputId] = useState('')
  const [note, setNote] = useState('')
  const [ingredients, setIngredients] = useState<
    Array<{ productId: string; qtyStr: string }>
  >([{ productId: '', qtyStr: '1' }])

  const selected = recipes.find((r) => r.id === recipeId)

  function resetForm() {
    setEditId(null)
    setName('')
    setOutputId('')
    setNote('')
    setIngredients([{ productId: '', qtyStr: '1' }])
  }

  function loadRecipe(id: string) {
    const r = recipes.find((x) => x.id === id)
    if (!r) return
    setEditId(r.id)
    setName(r.name)
    setOutputId(r.outputProductId)
    setNote(r.note || '')
    setIngredients(
      r.ingredients.length
        ? r.ingredients.map((i) => ({
            productId: i.productId,
            qtyStr: String(i.qtyPerUnit),
          }))
        : [{ productId: '', qtyStr: '1' }],
    )
    setTab('recipes')
  }

  function saveRecipe() {
    const n = name.trim()
    if (!n || !outputId) {
      onFlash(t(lang, 'prodNeedRecipe'))
      return
    }
    const ings: RecipeIngredient[] = []
    for (const row of ingredients) {
      const q = Number(String(row.qtyStr).replace(',', '.'))
      if (!row.productId || !Number.isFinite(q) || q <= 0) continue
      if (row.productId === outputId) {
        onFlash(t(lang, 'prodIngredientNotOutput'))
        return
      }
      ings.push({ productId: row.productId, qtyPerUnit: q })
    }
    if (!ings.length) {
      onFlash(t(lang, 'prodNeedIngredients'))
      return
    }
    if (editId) {
      onState(
        updateRecipe(state, editId, {
          name: n,
          outputProductId: outputId,
          ingredients: ings,
          note: note.trim() || undefined,
        }),
      )
    } else {
      onState(
        addRecipe(state, {
          name: n,
          outputProductId: outputId,
          ingredients: ings,
          note: note.trim() || undefined,
        }),
      )
    }
    resetForm()
    onFlash(t(lang, 'prodRecipeSaved'))
  }

  function runProduce() {
    const qty = Number(String(qtyStr).replace(',', '.'))
    if (!recipeId) {
      onFlash(t(lang, 'prodPickRecipe'))
      return
    }
    const res = produceFromRecipe(state, recipeId, qty)
    if (!res.ok) {
      if (res.error === 'insufficient_stock') {
        onFlash(
          `${t(lang, 'prodShortage')}: ${res.missingName || ''} (${formatQty(res.have ?? 0)} / ${formatQty(res.need ?? 0)})`,
        )
        return
      }
      if (res.error === 'bad_qty') {
        onFlash(t(lang, 'prodBadQty'))
        return
      }
      if (res.error === 'missing_output') {
        onFlash(t(lang, 'prodMissingOutput'))
        return
      }
      onFlash(t(lang, 'prodFailed'))
      return
    }
    onState(res.state)
    onFlash(
      `${t(lang, 'prodDone')}: ${formatQty(res.run.qtyProduced)} × ${res.run.outputName}`,
    )
    setQtyStr('1')
  }

  const preview = useMemo(() => {
    if (!selected) return null
    const qty = Number(String(qtyStr).replace(',', '.')) || 0
    return selected.ingredients.map((ing) => {
      const p = state.products.find((x) => x.id === ing.productId)
      const need = ing.qtyPerUnit * qty
      const have = p ? stockAt(p, locId) : 0
      return {
        id: ing.productId,
        name: p?.name || '—',
        unit: p?.unit,
        need,
        have,
        ok: !!p && have + 1e-9 >= need && need > 0,
      }
    })
  }, [selected, qtyStr, state.products, locId])

  return (
    <div className="page production-page">
      <header className="page-head">
        <h1>{t(lang, 'prodTitle')}</h1>
        <p className="muted">{t(lang, 'prodHint')}</p>
      </header>

      <div className="chip-row" role="tablist">
        {(
          [
            ['produce', 'prodTabProduce'],
            ['recipes', 'prodTabRecipes'],
            ['history', 'prodTabHistory'],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`btn ${tab === id ? '' : 'secondary'}`}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {t(lang, key)}
          </button>
        ))}
      </div>

      {tab === 'produce' ? (
        <section className="card">
          <h2>{t(lang, 'prodRunTitle')}</h2>
          {recipes.length === 0 ? (
            <p className="muted">{t(lang, 'prodNoRecipes')}</p>
          ) : (
            <>
              <div className="field">
                <label>{t(lang, 'prodRecipe')}</label>
                <select
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                >
                  <option value="">—</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t(lang, 'prodQty')}</label>
                <input
                  inputMode="decimal"
                  value={qtyStr}
                  onChange={(e) => setQtyStr(e.target.value)}
                />
              </div>
              {selected && preview ? (
                <div className="dossier-list" style={{ marginTop: 8 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    {t(lang, 'prodConsumePreview')}
                  </div>
                  {preview.map((line) => (
                    <div key={line.id} className="list-item">
                      <div>
                        <strong>{line.name}</strong>
                        <div className="muted">
                          −{formatQty(line.need)}
                          {line.unit ? ` ${unitLabel(lang, line.unit)}` : ''}
                          {' · '}
                          {t(lang, 'prodStock')}: {formatQty(line.have)}
                        </div>
                      </div>
                      <span className={`badge ${line.ok ? '' : 'warn'}`}>
                        {line.ok ? 'OK' : t(lang, 'prodShortage')}
                      </span>
                    </div>
                  ))}
                  {(() => {
                    const out = state.products.find(
                      (p) => p.id === selected.outputProductId,
                    )
                    return out ? (
                      <div className="list-item">
                        <div>
                          <strong>+ {out.name}</strong>
                          <div className="muted">
                            {t(lang, 'prodStock')}:{' '}
                            {formatQty(displayStock(state, out))}
                          </div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              ) : null}
              <button
                type="button"
                className="btn block"
                style={{ marginTop: 12 }}
                disabled={!recipeId}
                onClick={runProduce}
              >
                {t(lang, 'prodProduce')}
              </button>
            </>
          )}
        </section>
      ) : null}

      {tab === 'recipes' ? (
        <section className="card">
          <h2>
            {editId ? t(lang, 'prodEditRecipe') : t(lang, 'prodNewRecipe')}
          </h2>
          <div className="field">
            <label>{t(lang, 'prodRecipeName')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>{t(lang, 'prodOutput')}</label>
            <select
              value={outputId}
              onChange={(e) => setOutputId(e.target.value)}
            >
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t(lang, 'note')}</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <h3 style={{ marginTop: 12 }}>{t(lang, 'prodIngredients')}</h3>
          <p className="muted">{t(lang, 'prodIngredientsHint')}</p>
          {ingredients.map((row, idx) => (
            <div
              key={idx}
              className="field"
              style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}
            >
              <div style={{ flex: 1 }}>
                <label>{t(lang, 'prodMp')}</label>
                <select
                  value={row.productId}
                  onChange={(e) => {
                    const next = [...ingredients]
                    next[idx] = { ...row, productId: e.target.value }
                    setIngredients(next)
                  }}
                >
                  <option value="">—</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: 96 }}>
                <label>{t(lang, 'prodPerUnit')}</label>
                <input
                  inputMode="decimal"
                  value={row.qtyStr}
                  onChange={(e) => {
                    const next = [...ingredients]
                    next[idx] = { ...row, qtyStr: e.target.value }
                    setIngredients(next)
                  }}
                />
              </div>
              <button
                type="button"
                className="btn secondary"
                disabled={ingredients.length <= 1}
                onClick={() =>
                  setIngredients(ingredients.filter((_, i) => i !== idx))
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn secondary block"
            onClick={() =>
              setIngredients([...ingredients, { productId: '', qtyStr: '1' }])
            }
          >
            + {t(lang, 'prodAddIngredient')}
          </button>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn block" onClick={saveRecipe}>
              {t(lang, 'prodSaveRecipe')}
            </button>
            {editId ? (
              <button
                type="button"
                className="btn secondary"
                onClick={resetForm}
              >
                {t(lang, 'cancel')}
              </button>
            ) : null}
          </div>

          <div className="dossier-list" style={{ marginTop: 16 }}>
            {recipes.length === 0 ? (
              <p className="muted">{t(lang, 'prodNoRecipes')}</p>
            ) : (
              recipes.map((r) => {
                const out = state.products.find((p) => p.id === r.outputProductId)
                return (
                  <div key={r.id} className="list-item">
                    <div>
                      <strong>{r.name}</strong>
                      <div className="muted">
                        → {out?.name || '—'} · {r.ingredients.length}{' '}
                        {t(lang, 'prodMpShort')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => loadRecipe(r.id)}
                      >
                        {t(lang, 'prodEdit')}
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => {
                          onState(deleteRecipe(state, r.id))
                          if (editId === r.id) resetForm()
                          if (recipeId === r.id) setRecipeId('')
                          onFlash(t(lang, 'prodRecipeDeleted'))
                        }}
                      >
                        {t(lang, 'delete')}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      ) : null}

      {tab === 'history' ? (
        <section className="card">
          <h2>{t(lang, 'prodHistory')}</h2>
          {runs.length === 0 ? (
            <p className="muted">{t(lang, 'prodHistoryEmpty')}</p>
          ) : (
            <div className="dossier-list">
              {runs.map((run) => (
                <div key={run.id} className="list-item">
                  <div>
                    <strong>
                      {formatQty(run.qtyProduced)} × {run.outputName}
                    </strong>
                    <div className="muted">
                      {run.recipeName}
                      {run.unitCostDa != null
                        ? ` · ${t(lang, 'prodUnitCost')} ${formatDa(run.unitCostDa)}`
                        : ''}
                    </div>
                    <div className="muted">
                      {run.consumed
                        .map((c) => `−${formatQty(c.qty)} ${c.name}`)
                        .join(' · ')}
                    </div>
                    <div className="muted">
                      {new Date(run.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
