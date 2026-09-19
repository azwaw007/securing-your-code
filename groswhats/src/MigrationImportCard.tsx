import { useRef, useState } from 'react'
import type { AppState, Language } from './types'
import { t } from './i18n'
import {
  downloadSampleCsv,
  importMigrationCsv,
  type MigrationKind,
  type MigrationResult,
} from './utils/migrateCsv'

export function MigrationImportCard({
  lang,
  onState,
  onFlash,
}: {
  lang: Language
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
}) {
  const [kind, setKind] = useState<MigrationKind>('products')
  const [paste, setPaste] = useState('')
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<MigrationResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function applyText(text: string) {
    setBusy(true)
    try {
      const outcome = { current: null as MigrationResult | null }
      onState((s) => {
        const { state, result } = importMigrationCsv(s, kind, text)
        outcome.current = result
        return state
      })
      const summary = outcome.current
      setLast(summary)
      if (summary && (summary.added > 0 || summary.updated > 0)) {
        onFlash('migrateImportOk')
      } else if (summary?.errors.includes('empty')) {
        onFlash('migrateImportEmpty')
      } else if (
        summary?.errors.includes('needName') ||
        summary?.errors.includes('needNamePhone')
      ) {
        onFlash('migrateImportBadHeader')
      } else {
        onFlash('migrateImportNone')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>{t(lang, 'migrateTitle')}</h2>
      <p className="muted">{t(lang, 'migrateHint')}</p>
      <div className="notice" style={{ marginBottom: 10 }}>
        {t(lang, 'migrateStockHint')}
      </div>

      <div className="field">
        <label>{t(lang, 'migrateKind')}</label>
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as MigrationKind)
            setLast(null)
          }}
        >
          <option value="products">{t(lang, 'migrateProducts')}</option>
          <option value="clients">{t(lang, 'migrateClients')}</option>
        </select>
      </div>

      <div className="btn-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn secondary"
          onClick={() => downloadSampleCsv(kind)}
        >
          {t(lang, 'migrateDownloadSample')}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {t(lang, 'migratePickFile')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain,.txt"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
              applyText(String(reader.result || ''))
            }
            reader.readAsText(file)
          }}
        />
      </div>

      <div className="field">
        <label>{t(lang, 'migratePaste')}</label>
        <textarea
          rows={5}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={
            kind === 'products'
              ? 'nom;barcode;prix;achat;stock'
              : 'nom;telephone;ville;solde'
          }
        />
      </div>
      <button
        type="button"
        className="btn block"
        disabled={busy || !paste.trim()}
        onClick={() => applyText(paste)}
      >
        {t(lang, 'migrateRun')}
      </button>

      {last ? (
        <div className="notice" style={{ marginTop: 10 }}>
          {t(lang, 'migrateResult')
            .replace('{added}', String(last.added))
            .replace('{updated}', String(last.updated))
            .replace('{skipped}', String(last.skipped))}
        </div>
      ) : null}
    </div>
  )
}
