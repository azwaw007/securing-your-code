/** Synthèse vocale désactivée (lente, découpée, pas de vraie darja). */

export function registerMuteAskHandler(
  _fn: ((pendingText: string, lang: 'fr' | 'ar') => void) | null,
): void {
  /* no-op */
}

export function isVoiceMuted(): boolean {
  return true
}

export function wasMuteAsked(): boolean {
  return true
}

export function setVoiceMuted(_muted: boolean): void {
  /* no-op — voix agent / TTS coupée */
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

export function speakForced(
  _text: string,
  _lang: 'fr' | 'ar' | 'darja' = 'fr',
): void {
  stopSpeaking()
}

export function speak(_text: string, _lang: 'fr' | 'ar' = 'fr'): void {
  stopSpeaking()
}

/** Ancien TTS “darja” (navigateur) — coupé. */
export function speakDarijaWelcome(_text: string): void {
  stopSpeaking()
}
