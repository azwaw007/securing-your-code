import type { GameStation, TvControlKind } from '../types'

/** Construit l’URL ON/OFF selon le type de boîtier Wi‑Fi. */
export function resolveTvUrls(station: Pick<
  GameStation,
  'tvKind' | 'tvHost' | 'tvOnUrl' | 'tvOffUrl'
>): { onUrl?: string; offUrl?: string } {
  const kind: TvControlKind = station.tvKind || 'shelly'
  const host = (station.tvHost || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')

  if (kind === 'custom') {
    return {
      onUrl: station.tvOnUrl?.trim() || undefined,
      offUrl: station.tvOffUrl?.trim() || undefined,
    }
  }

  if (!host) return {}

  if (kind === 'tasmota') {
    const base = `http://${host}`
    return {
      onUrl: `${base}/cm?cmnd=Power%20On`,
      offUrl: `${base}/cm?cmnd=Power%20Off`,
    }
  }

  // Shelly Gen1 Plug / Relay (API locale HTTP)
  const base = `http://${host}`
  return {
    onUrl: `${base}/relay/0?turn=on`,
    offUrl: `${base}/relay/0?turn=off`,
  }
}

export type TvCommandResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'no_url' | 'network'; url?: string; detail?: string }

/**
 * Envoie une commande HTTP locale à la prise / TV.
 * Fonctionne surtout en Electron / app locale (pas depuis un site HTTPS distant).
 */
export async function sendTvCommand(
  url: string | undefined,
  timeoutMs = 4000,
): Promise<TvCommandResult> {
  const target = (url || '').trim()
  if (!target) return { ok: false, reason: 'no_url' }

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(target, {
      method: 'GET',
      mode: 'no-cors',
      signal: ctrl.signal,
      cache: 'no-store',
    })
    // no-cors → opaque ; on considère l’envoi comme tenté avec succès
    void res
    return { ok: true, url: target }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: 'network', url: target, detail }
  } finally {
    window.clearTimeout(timer)
  }
}

export async function turnTvOn(station: GameStation): Promise<TvCommandResult> {
  const { onUrl } = resolveTvUrls(station)
  return sendTvCommand(onUrl)
}

export async function turnTvOff(station: GameStation): Promise<TvCommandResult> {
  const { offUrl } = resolveTvUrls(station)
  return sendTvCommand(offUrl)
}

export function stationHasTvControl(station: GameStation): boolean {
  const { onUrl, offUrl } = resolveTvUrls(station)
  return Boolean(onUrl || offUrl)
}
