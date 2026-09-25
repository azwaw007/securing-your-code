import type { GameStation, TvControlKind } from '../types'

type TvBridge = {
  wake: (mac: string) => Promise<{ ok: boolean; detail?: string }>
  fetchUrl: (url: string) => Promise<{ ok: boolean; detail?: string }>
}

function azTv(): TvBridge | undefined {
  return (window as unknown as { azTv?: TvBridge }).azTv
}

/** Construit l’URL ON/OFF selon le type de boîtier / Smart TV. */
export function resolveTvUrls(station: Pick<
  GameStation,
  'tvKind' | 'tvHost' | 'tvOnUrl' | 'tvOffUrl'
>): { onUrl?: string; offUrl?: string } {
  const kind: TvControlKind = station.tvKind || 'shelly'
  const host = (station.tvHost || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')

  if (kind === 'custom' || kind === 'smart_tv') {
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
 * Envoie une commande HTTP locale à la TV / prise.
 * Sous Electron (.exe) passe par le bridge natif (LAN fiable).
 */
export async function sendTvCommand(
  url: string | undefined,
  timeoutMs = 4000,
): Promise<TvCommandResult> {
  const target = (url || '').trim()
  if (!target) return { ok: false, reason: 'no_url' }

  const bridge = azTv()
  if (bridge?.fetchUrl) {
    try {
      const res = await bridge.fetchUrl(target)
      if (res.ok) return { ok: true, url: target }
      return { ok: false, reason: 'network', url: target, detail: res.detail }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      return { ok: false, reason: 'network', url: target, detail }
    }
  }

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(target, {
      method: 'GET',
      mode: 'no-cors',
      signal: ctrl.signal,
      cache: 'no-store',
    })
    void res
    return { ok: true, url: target }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: 'network', url: target, detail }
  } finally {
    window.clearTimeout(timer)
  }
}

export async function wakeTvOnLan(mac: string | undefined): Promise<TvCommandResult> {
  const m = (mac || '').trim()
  if (!m) return { ok: false, reason: 'no_url' }
  const bridge = azTv()
  if (!bridge?.wake) {
    return {
      ok: false,
      reason: 'network',
      url: `wol:${m}`,
      detail: 'Wake-on-LAN : utilise AZ POS Windows (.exe)',
    }
  }
  try {
    const res = await bridge.wake(m)
    if (res.ok) return { ok: true, url: `wol:${m}` }
    return { ok: false, reason: 'network', url: `wol:${m}`, detail: res.detail }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: 'network', url: `wol:${m}`, detail }
  }
}

export async function turnTvOn(station: GameStation): Promise<TvCommandResult> {
  const kind = station.tvKind || 'shelly'
  if (kind === 'smart_tv' && station.tvMac?.trim()) {
    const wol = await wakeTvOnLan(station.tvMac)
    if (wol.ok) {
      const { onUrl } = resolveTvUrls(station)
      if (onUrl) void sendTvCommand(onUrl)
      return wol
    }
    // WOL échoué → tenter URL ON si présente
  }
  const { onUrl } = resolveTvUrls(station)
  return sendTvCommand(onUrl)
}

export async function turnTvOff(station: GameStation): Promise<TvCommandResult> {
  const { offUrl } = resolveTvUrls(station)
  return sendTvCommand(offUrl)
}

export function stationHasTvControl(station: GameStation): boolean {
  const kind = station.tvKind || 'shelly'
  if (kind === 'smart_tv' && station.tvMac?.trim()) return true
  const { onUrl, offUrl } = resolveTvUrls(station)
  return Boolean(onUrl || offUrl)
}
