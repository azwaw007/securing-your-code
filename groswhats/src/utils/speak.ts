/** Voix courte pour commerçants qui lisent peu — avec option sourdine. */

const MUTE_KEY = 'grossiste-dz-voice-muted'
const ASKED_KEY = 'grossiste-dz-voice-asked'

let askHandler: ((pendingText: string, lang: 'fr' | 'ar') => void) | null = null

export function registerMuteAskHandler(
  fn: ((pendingText: string, lang: 'fr' | 'ar') => void) | null,
): void {
  askHandler = fn
}

export function isVoiceMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function wasMuteAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return false
  }
}

export function setVoiceMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

function speakNow(text: string, lang: 'fr' | 'ar' | 'darja'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    // Darja ≈ arabe algérien pour la synthèse vocale
    u.lang = lang === 'fr' ? 'fr-FR' : 'ar-DZ'
    u.rate = lang === 'darja' ? 0.9 : 0.95
    window.speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}

/** Force la parole (après réponse au message sourdine / accueil agent). */
export function speakForced(
  text: string,
  lang: 'fr' | 'ar' | 'darja' = 'fr',
): void {
  if (isVoiceMuted()) return
  speakNow(text, lang)
}

/**
 * Parle le texte sauf si sourdine.
 * Première fois : demande sourdine via le handler enregistré.
 */
export function speak(text: string, lang: 'fr' | 'ar' = 'fr'): void {
  if (isVoiceMuted()) return
  if (!wasMuteAsked() && askHandler) {
    askHandler(text, lang)
    return
  }
  speakNow(text, lang)
}

/** Accueil agent en darja (ignore la demande sourdine pour démarrer). */
export function speakDarijaWelcome(text: string): void {
  if (isVoiceMuted()) return
  speakNow(text, 'darja')
}
