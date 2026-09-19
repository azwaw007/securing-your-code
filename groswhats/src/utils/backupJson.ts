/** Sauvegarde / restauration complète AZ POS (JSON local). */

import type { AppState } from '../types'
import { migrate } from '../store'

const BACKUP_MARK = 'az-pos-backup'
const MAX_BACKUP_BYTES = 25 * 1024 * 1024

export type BackupEnvelope = {
  kind: typeof BACKUP_MARK
  version: 1
  exportedAt: string
  state: unknown
}

export function downloadBackupJson(state: AppState): void {
  const envelope: BackupEnvelope = {
    kind: BACKUP_MARK,
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
  }
  const blob = new Blob([JSON.stringify(envelope)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const day = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `azpos-sauvegarde-${day}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBackupJson(raw: string): { ok: true; state: AppState } | { ok: false; reason: string } {
  if (raw.length > MAX_BACKUP_BYTES) {
    return { ok: false, reason: 'tooLarge' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'invalidJson' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'invalidShape' }
  }
  const obj = parsed as Record<string, unknown>
  let payload: unknown = obj
  if (obj.kind === BACKUP_MARK && obj.state) {
    payload = obj.state
  } else if (!('products' in obj) || !('settings' in obj)) {
    return { ok: false, reason: 'invalidShape' }
  }
  try {
    const state = migrate(payload)
    return { ok: true, state }
  } catch {
    return { ok: false, reason: 'migrateFail' }
  }
}
