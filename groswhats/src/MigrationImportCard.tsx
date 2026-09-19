import { useRef, useState } from 'react'
import type { AppState, Language } from './types'
import { t } from './i18n'
import {
  downloadSampleCsv,
  importMigrationCsv,
  type MigrationKind,
  type MigrationResult,
} from './utils/migrateCsv'
import { downloadBackupJson, parseBackupJson } from './utils/backupJson'

const MAX_CSV_CHARS = 2_000_000
const MAX_CSV_LINES = 5000

export function MigrationImportCard({
  lang,
  state,
  onState,
  onFlash,
}: {
  lang: Language
  state: AppState
  onState: (fn: (s: AppState) => AppState) => void
  onFlash: (key: string) => void
}) {
  const [kind, setKind] = useState<MigrationKind>('products')
  const [paste, setPaste] = useState('')
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<MigrationResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)

  function applyText(text: string) {
    if (text.length > MAX_CSV_CHARS || text.split(/\r?\n/).length > MAX_CSV_LINES) {
      onFlash('migrateImportTooLarge')
      return
    }
    setBusy(true)
    try {
      const outcome = { current: null as MigrationResult | null }
      onState((s) => {
        const { state: next, result } = importMigrationCsv(s, kind, text)
        outcome.current = result
        return next
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

  function restoreBackup(raw: string) {
    setBusy(true)
    try {
      const parsed = parseBackupJson(raw)
      if (!parsed.ok) {
        onFlash(
          parsed.reason === 'tooLarge'
            ? 'backupTooLarge'
            : parsed.reason === 'invalidJson' || parsed.reason === 'invalidShape'
              ? 'backupInvalid'
              : 'backupInvalid',
        )
        return
      }
      const ok = window.confirm(t(lang, 'backupRestoreConfirm'))
      if (!ok) return
      onState(() => parsed.state)
      onFlash('backupRestored')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
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
              if (file.size > MAX_CSV_CHARS) {
                onFlash('migrateImportTooLarge')
                return
              }
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

      <div className="card">
        <h2>{t(lang, 'backupTitle')}</h2>
        <p className="muted">{t(lang, 'backupHint')}</p>
        <div className="btn-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              downloadBackupJson(state)
              onFlash('backupExported')
            }}
          >
            {t(lang, 'backupExport')}
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() => backupRef.current?.click()}
          >
            {t(lang, 'backupImport')}
          </button>
          <input
            ref={backupRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (file.size > 25 * 1024 * 1024) {
                onFlash('backupTooLarge')
                return
              }
              const reader = new FileReader()
              reader.onload = () => restoreBackup(String(reader.result || ''))
              reader.readAsText(file)
            }}
          />
        </div>
      </div>
    </>
  )
}
