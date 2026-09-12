/** Sons UI légers (Web Audio) — clic + « cha-ching » caisse. */

let enabled = true
let audioCtx: AudioContext | null = null

export function setUiSoundsEnabled(on: boolean): void {
  enabled = on
}

export function getUiSoundsEnabled(): boolean {
  return enabled
}

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    if (!audioCtx) audioCtx = new AC()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function beep(
  c: AudioContext,
  {
    freq,
    duration = 0.05,
    type = 'square',
    gain = 0.05,
    delay = 0,
  }: {
    freq: number
    duration?: number
    type?: OscillatorType
    gain?: number
    delay?: number
  },
): void {
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** Clic court UI */
export function playClick(): void {
  if (!enabled) return
  const c = ctx()
  if (!c) return
  try {
    beep(c, { freq: 920, duration: 0.035, type: 'triangle', gain: 0.035 })
  } catch {
    /* ignore */
  }
}

/** Son spécial caisse / encaissement (ding-ding métallique) */
export function playCash(): void {
  if (!enabled) return
  const c = ctx()
  if (!c) return
  try {
    beep(c, { freq: 1310, duration: 0.08, type: 'square', gain: 0.055 })
    beep(c, {
      freq: 1740,
      duration: 0.12,
      type: 'square',
      gain: 0.045,
      delay: 0.07,
    })
    beep(c, {
      freq: 980,
      duration: 0.1,
      type: 'triangle',
      gain: 0.03,
      delay: 0.14,
    })
  } catch {
    /* ignore */
  }
}

/** Bip lecteur code-barres (succès) — type scanner caisse */
export function playBarcodeOk(): void {
  if (!enabled) return
  const c = ctx()
  if (!c) return
  try {
    beep(c, { freq: 2400, duration: 0.07, type: 'square', gain: 0.07 })
    beep(c, {
      freq: 2800,
      duration: 0.05,
      type: 'square',
      gain: 0.045,
      delay: 0.06,
    })
  } catch {
    /* ignore */
  }
}

/** Bip erreur code-barres inconnu */
export function playBarcodeError(): void {
  if (!enabled) return
  const c = ctx()
  if (!c) return
  try {
    beep(c, { freq: 320, duration: 0.14, type: 'sawtooth', gain: 0.055 })
    beep(c, {
      freq: 220,
      duration: 0.16,
      type: 'sawtooth',
      gain: 0.04,
      delay: 0.12,
    })
  } catch {
    /* ignore */
  }
}

function isInteractive(el: Element): boolean {
  return !!el.closest(
    'button, .chip, .choice-card, .app-tile, .client-pick, .sell-cta, .history-cta, .client-open, .tier-chip, a[href], [role="button"]',
  )
}

function wantsCash(el: Element): boolean {
  return !!el.closest('[data-sfx-cash], .sfx-cash, .pay-cash')
}

/** Clics globaux : léger sur boutons, cash si data-sfx-cash */
export function installUiClickSounds(): () => void {
  const onDown = (ev: Event) => {
    if (!enabled) return
    const target = ev.target
    if (!(target instanceof Element)) return
    if (!isInteractive(target)) return
    if (target.closest('[data-sfx-skip], input, textarea, select, label')) return
    if (wantsCash(target)) {
      playCash()
      return
    }
    playClick()
  }
  document.addEventListener('pointerdown', onDown, true)
  return () => document.removeEventListener('pointerdown', onDown, true)
}
