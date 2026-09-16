import { useMemo, useState } from 'react'
import type { AppState, Client, Language } from './types'
import { t } from './i18n'
import { updateClient } from './store'
import type { MetierFamily } from './locale/metierPacks'
import {
  specialtyFieldHint,
  specialtyFieldLabel,
  specialtyProfileFor,
  type SpecialtyField,
  type SpecialtyProfile,
} from './locale/specialtyParams'

function clientField(client: Client, key: string): string {
  const v = (client as unknown as Record<string, unknown>)[key]
  if (v == null) return ''
  return String(v)
}

function buildDraft(
  client: Client,
  fields: SpecialtyField[],
): Record<string, string> {
  const draft: Record<string, string> = {}
  for (const f of fields) {
    draft[f.key] = clientField(client, f.key)
  }
  return draft
}

export function SpecialtyDossierPanel({
  state,
  client,
  lang,
  family,
  profile: profileProp,
  onState,
  onFlash,
}: {
  state: AppState
  client: Client
  lang: Language
  family?: MetierFamily | string
  profile?: SpecialtyProfile | null
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const profile =
    profileProp ?? (family ? specialtyProfileFor(family) : null)
  const fields = profile?.fields ?? []
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(() => buildDraft(client, fields))

  const uiLang: 'fr' | 'ar' = lang === 'ar' ? 'ar' : 'fr'
  const title =
    profile == null
      ? ''
      : uiLang === 'ar'
        ? profile.dossierTitleAr
        : profile.dossierTitleFr
  const hint =
    profile == null
      ? ''
      : uiLang === 'ar'
        ? profile.dossierHintAr
        : profile.dossierHintFr

  const hasAny = useMemo(
    () => fields.some((f) => clientField(client, f.key).trim()),
    [client, fields],
  )

  if (!profile || fields.length === 0) return null

  function startEdit() {
    setDraft(buildDraft(client, fields))
    setEdit(true)
  }

  function save() {
    const patch: Record<string, string | undefined> = {}
    for (const f of fields) {
      const raw = (draft[f.key] ?? '').trim()
      patch[f.key] = raw || undefined
    }
    onState(updateClient(state, client.id, patch as Partial<Client>))
    setEdit(false)
    onFlash(t(lang, 'specialtySaved'))
  }

  function setField(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function renderInput(field: SpecialtyField) {
    const value = draft[field.key] ?? ''
    const ph = specialtyFieldHint(field, uiLang)
    if (field.kind === 'textarea') {
      return (
        <textarea
          rows={3}
          value={value}
          placeholder={ph || undefined}
          onChange={(e) => setField(field.key, e.target.value)}
        />
      )
    }
    if (field.kind === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => setField(field.key, e.target.value)}
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {uiLang === 'ar' ? o.labelAr : o.labelFr}
            </option>
          ))}
        </select>
      )
    }
    const inputType =
      field.kind === 'date' ? 'date' : field.kind === 'number' ? 'number' : 'text'
    return (
      <input
        type={inputType}
        value={value}
        placeholder={ph || undefined}
        onChange={(e) => setField(field.key, e.target.value)}
      />
    )
  }

  return (
    <div className="card dossier-panel" style={{ marginTop: 12, boxShadow: 'none' }}>
      <div className="btn-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{title}</h3>
        <button type="button" className="btn ghost" onClick={() => (edit ? setEdit(false) : startEdit())}>
          {edit ? t(lang, 'cancel') : `✏️ ${t(lang, 'specialtyEdit')}`}
        </button>
      </div>
      <p className="muted">{hint}</p>

      {edit ? (
        <div className="dossier-form">
          {fields.map((field) => (
            <div className="field" key={field.key}>
              <label>{specialtyFieldLabel(field, uiLang)}</label>
              {renderInput(field)}
            </div>
          ))}
          <button type="button" className="btn block" onClick={save}>
            {t(lang, 'save')}
          </button>
        </div>
      ) : !hasAny ? (
        <p className="muted">{t(lang, 'specialtyEmpty')}</p>
      ) : (
        <div className="fiche-grid">
          {fields.map((field) => {
            const v = clientField(client, field.key)
            if (!v) return null
            return (
              <div className="fiche-full" key={field.key}>
                <div className="fiche-label">{specialtyFieldLabel(field, uiLang)}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{v}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
