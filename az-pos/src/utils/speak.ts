const MUTE_KEY = 'az-pos-voice-muted'

export function registerMuteAskHandler(
  _fn: ((pendingText: string, lang: 'fr' | 'ar') => void) | null,
): void {
  /* unused */
}

export function isVoiceMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function wasMuteAsked(): boolean {
  return true
}

export function setVoiceMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (muted) stopSpeaking()
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

function voiceLangCode(lang: string): string {
  if (lang === 'ar' || lang === 'darja') return 'ar-SA'
  if (lang === 'en') return 'en-US'
  if (lang === 'es') return 'es-ES'
  return 'fr-FR'
}

function pickVoice(code: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const prefix = code.slice(0, 2)
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(code.toLowerCase())) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix))
  )
}

export function speakForced(text: string, lang: 'fr' | 'ar' | 'darja' | 'en' | 'es' = 'fr'): void {
  speak(text, lang)
}

export function speak(text: string, lang: string = 'fr'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  if (isVoiceMuted()) return
  const clean = text.replace(/[#*_`]/g, '').replace(/\n+/g, '. ').trim()
  if (!clean) return
  stopSpeaking()
  const u = new SpeechSynthesisUtterance(clean.slice(0, 600))
  u.lang = voiceLangCode(lang)
  const voice = pickVoice(u.lang)
  if (voice) u.voice = voice
  u.rate = lang === 'ar' || lang === 'darja' ? 0.95 : 1
  window.speechSynthesis.speak(u)
}

export function speakDarijaWelcome(text: string): void {
  speak(text, 'ar')
}
