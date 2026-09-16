export type VoiceLang = 'fr' | 'ar' | 'darja'

export const VOICE_LANG_CODE: Record<VoiceLang, string> = {
  fr: 'fr-FR',
  ar: 'ar-SA',
  /** Plus proche dispo pour darja Algérie */
  darja: 'ar-DZ',
}

type SpeechRec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<
    ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean }
  >
}

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isVoiceSupported(): boolean {
  return !!getSpeechRecognitionCtor()
}

export function startVoiceListen(options: {
  voiceLang: VoiceLang
  /** Écoute continue (agent mains libres) */
  continuous?: boolean
  onPartial?: (text: string) => void
  onFinal: (text: string) => void
  onError: (message: string) => void
  onEnd: () => void
}): { stop: () => void } | null {
  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) {
    options.onError('unsupported')
    return null
  }

  const rec = new Ctor()
  rec.lang = VOICE_LANG_CODE[options.voiceLang]
  rec.continuous = options.continuous === true
  rec.interimResults = true
  rec.maxAlternatives = 3
  let stopped = false

  rec.onresult = (ev) => {
    let interim = ''
    let finalText = ''
    for (let i = 0; i < ev.results.length; i++) {
      const res = ev.results[i]
      const alt = res[0]?.transcript ?? ''
      if ((res as { isFinal?: boolean }).isFinal) finalText += alt + ' '
      else interim += alt
    }
    if (interim && options.onPartial) options.onPartial(interim.trim())
    if (finalText.trim()) options.onFinal(finalText.trim())
  }

  rec.onerror = (ev) => {
    options.onError(ev.error || 'error')
  }

  rec.onend = () => {
    if (stopped) {
      options.onEnd()
      return
    }
    // Relance auto en mode continu (Chrome coupe souvent après une phrase)
    if (options.continuous) {
      try {
        rec.start()
        return
      } catch {
        options.onEnd()
        return
      }
    }
    options.onEnd()
  }

  try {
    rec.start()
  } catch {
    options.onError('start_failed')
    return null
  }

  return {
    stop: () => {
      stopped = true
      try {
        rec.abort()
      } catch {
        try {
          rec.stop()
        } catch {
          // ignore
        }
      }
    },
  }
}

/** Oui / ih / ey… en darja / FR / AR */
export function isVoiceYes(text: string): boolean {
  const s = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  return /^(oui|ouais|ouai|yes|ok|daccord|d accord|ey+|ih+|iyeh|iye|wah|waha|واخا|نعم|اي|آه|اه|هيه|صحيح)(\s|$|[!.])/i.test(
    s,
  ) || /^(oui|ih|ey|نعم|اي)\b/.test(s)
}

/** Non / la… */
export function isVoiceNo(text: string): boolean {
  const s = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  return /^(non|no|nah|la+|lla|لا|كلا)(\s|$|[!.])/i.test(s) || /^(non|لا)\b/.test(s)
}

/** Arrête / khlas / eskout — fin session agent */
export function isVoiceStop(text: string): boolean {
  const s = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return false
  // « stock khlas » = stock, pas stop
  if (/stock|makhzen|مخزون/.test(s) && /khlas|khallas|خلاص|ناقص/.test(s)) {
    return false
  }
  return (
    /\b(arete|arrete|arretes|stop| suffice|eskout|skout|sokot|oskot|oskout|khlas|khallas|khles|barka|baraka)\b/.test(
      s,
    ) || /^(خلاص|اسكت|اسكوتي|توقف|بركة|صافي)$/.test(s) || /\b(خلاص|اسكت)\b/.test(s)
  )
}

/** Normalise darja / arabe dialectal / typos pour l’agent AZ POS */
export function normalizeDarjaHints(text: string): string {
  let s = text.toLowerCase()

  // Chiffres arabes → latins
  const digits: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  }
  s = s.replace(/[٠-٩]/g, (d) => digits[d] ?? d)

  // 3 / 7 / 9 style chat (avant le reste)
  s = s
    .replace(/\b3aouni\b/g, 'aide')
    .replace(/\b3aweni\b/g, 'aide')
    .replace(/\baaweni\b/g, 'aide')
    .replace(/\b7asse?b\b/g, 'calcule')
    .replace(/\b7seb\b/g, 'calcule')
    .replace(/\b7ell\b/g, 'ouvre')
    .replace(/\b9ima\b/g, 'valeur')
    .replace(/\bna9es\b/g, 'bas')
    .replace(/\bstock\s*na9es\b/g, 'stock bas')
    .replace(/\bstock\s*na+9e?s\b/g, 'stock bas')

  const map: Array<[RegExp, string]> = [
    // Aide
    [/\b3aweni\b/g, 'aide'],
    [/\baaweni\b/g, 'aide'],
    [/\bgoulili\b/g, 'aide'],
    [/\bgoulli\b/g, 'aide'],
    [/\bchouf\b/g, 'montre'],
    [/\bwrach\b/g, 'aide'],
    [/\bwrini\b/g, 'montre'],
    [/\baide moi\b/g, 'aide'],
    [/\bhelp me\b/g, 'aide'],

    // Combien / qui
    [/\bchhal\b/g, 'combien'],
    [/\bch7al\b/g, 'combien'],
    [/\bchal\b/g, 'combien'],
    [/\bkam\b/g, 'combien'],
    [/\bwasch\b/g, 'combien'],
    [/\bwesh\b/g, 'combien'],
    [/\bchkoune\b/g, 'qui'],
    [/\bchkoun\b/g, 'qui'],
    [/\bchkon\b/g, 'qui'],

    // Crédits / dettes
    [/\byekhlass?\b/g, 'doit'],
    [/\byekhles\b/g, 'doit'],
    [/\byedden\b/g, 'credits'],
    [/\bdiyoune?\b/g, 'credits'],
    [/\bdiyoun\b/g, 'credits'],
    [/\bdain\b/g, 'credits'],
    [/\bdayn\b/g, 'credits'],
    [/\bma khallas\b/g, 'credits'],
    [/\bmakhallas\b/g, 'credits'],
    [/\bimpayes?\b/g, 'credits'],
    [/\bqui doit\b/g, 'credits'],

    // Stock bas / rupture
    [/\bstock naqes\b/g, 'stock bas'],
    [/\bstock na9es\b/g, 'stock bas'],
    [/\bstock khlass\b/g, 'stock bas'],
    [/\bstock khlas\b/g, 'stock bas'],
    [/\bmakhzen naqes\b/g, 'stock bas'],
    [/\bnaqes\b/g, 'bas'],
    [/\bkhlas\b/g, 'stock bas'],
    [/\bkhlass\b/g, 'stock bas'],
    [/\brupture\b/g, 'stock bas'],
    [/\bfini\b/g, 'stock bas'],
    [/\brah khlass\b/g, 'stock bas'],

    // Stock / valeur
    [/\bmakhzen\b/g, 'stock'],
    [/\bmakhzoun\b/g, 'stock'],
    [/\bmakhzan\b/g, 'stock'],
    [/\bstok\b/g, 'stock'],
    [/\bqima\b/g, 'valeur'],
    [/\bkiima\b/g, 'valeur'],
    [/\b9ima\b/g, 'valeur'],
    [/\bvaleur stock\b/g, 'valeur du stock'],
    [/\bchhal stock\b/g, 'valeur du stock'],
    [/\bwasch kayen\b/g, 'stock'],
    [/\bkayen\b/g, 'reste'],

    // Ajouter
    [/\bzid\b/g, 'ajoute'],
    [/\bziid\b/g, 'ajoute'],
    [/\bajouti\b/g, 'ajoute'],
    [/\bdakhkhel\b/g, 'ajoute'],
    [/\bdakhel\b/g, 'ajoute'],
    [/\bnouveau client\b/g, 'ajoute client'],
    [/\bclient jdid\b/g, 'ajoute client'],

    // Calculer
    [/\bhaseb\b/g, 'calcule'],
    [/\bhasebha\b/g, 'calcule'],
    [/\b7asseb\b/g, 'calcule'],
    [/\b7seb\b/g, 'calcule'],
    [/\b7asseb\b/g, 'calcule'],
    [/\behsab\b/g, 'calcule'],

    // Ouvrir / aller
    [/\bouvri\b/g, 'ouvre'],
    [/\bouvriha\b/g, 'ouvre'],
    [/\bhell\b/g, 'ouvre'],
    [/\b7ell\b/g, 'ouvre'],
    [/\brouh\b/g, 'ouvre'],
    [/\bsir\b/g, 'ouvre'],
    [/\bemchi\b/g, 'ouvre'],
    [/\bva a\b/g, 'ouvre'],
    [/\ballez a\b/g, 'ouvre'],

    // Envoyer
    [/\bsift\b/g, 'envoie'],
    [/\bsiftet\b/g, 'envoie'],
    [/\bsiftli\b/g, 'envoie'],
    [/\bsiftelha\b/g, 'envoie'],
    [/\bb3ath\b/g, 'envoie'],
    [/\bbaath\b/g, 'envoie'],
    [/\bbe3ath\b/g, 'envoie'],
    [/\barsel\b/g, 'envoie'],
    [/\barselli\b/g, 'envoie'],

    // Facture
    [/\bfactoura\b/g, 'facture'],
    [/\bfaktoura\b/g, 'facture'],
    [/\bfacture\b/g, 'facture'],
    [/\binvoice\b/g, 'facture'],
    [/\bbon\b/g, 'facture'],

    // Arrivages
    [/\bwsel\b/g, 'arrivages'],
    [/\bwassel\b/g, 'arrivages'],
    [/\bwssel\b/g, 'arrivages'],
    [/\bjdid\b/g, 'nouveaux'],
    [/\bjdoud\b/g, 'nouveaux'],
    [/\bmarcha jdida\b/g, 'arrivages'],
    [/\bmarchandise jdida\b/g, 'arrivages'],

    // Commande reçue / inbox
    [/\bcommande jaya\b/g, 'commande recue'],
    [/\bcommande jat\b/g, 'commande recue'],
    [/\btalab ja\b/g, 'commande recue'],
    [/\btalab jaya\b/g, 'commande recue'],
    [/\bsajjel\b/g, 'enregistre'],
    [/\bsejjel\b/g, 'enregistre'],
    [/\bsejel\b/g, 'enregistre'],
    [/\benregistre\b/g, 'enregistre'],

    // Commande / vente
    [/\bcommande\b/g, 'commande'],
    [/\btalab\b/g, 'commande'],
    [/\bbe3\b/g, 'vente'],
    [/\bbi3\b/g, 'vente'],
    [/\bvente rapide\b/g, 'vente rapide'],
    [/\bbe3 sari3\b/g, 'vente rapide'],
    [/\bbe3 sari3\b/g, 'vente rapide'],
    [/\bsari3\b/g, 'rapide'],
    [/\bcomptoir\b/g, 'vente rapide'],
    [/\bcaisse\b/g, 'caisse'],
    [/\bsandou9\b/g, 'caisse'],
    [/\bwesh\b/g, 'salut'],
    [/\bwech\b/g, 'salut'],
    [/\blabas\b/g, 'salut'],
    [/\brbe7 lyoum\b/g, 'benefice'],
    [/\bchhal rbe7\b/g, 'benefice'],
    [/\bnadem\b/g, 'organise'],
    [/\btheme lil\b/g, 'theme nuit'],
    [/\b3aweni\b/g, 'aide'],
    [/\bkiwesh\b/g, 'aide'],
    [/\bkiwech\b/g, 'aide'],

    // Dépenses
    [/\bmasarif\b/g, 'depenses'],
    [/\bmasarif\b/g, 'depenses'],
    [/\bmasrouf\b/g, 'depenses'],
    [/\bkhirajat\b/g, 'depenses'],
    [/\bdepenses?\b/g, 'depenses'],
    [/\bfrais\b/g, 'depenses'],
    [/\bgazoil\b/g, 'gasoil'],
    [/\bgasoil\b/g, 'gasoil'],
    [/\bmazout\b/g, 'gasoil'],
    [/\bmaazout\b/g, 'gasoil'],
    [/\bessence\b/g, 'gasoil'],
    [/\bcarburant\b/g, 'gasoil'],
    [/\bpersonnel\b/g, 'personnel'],
    [/\bsalaire\b/g, 'personnel'],
    [/\bkhedama\b/g, 'personnel'],
    [/\bkhadama\b/g, 'personnel'],
    [/\boouvriers?\b/g, 'personnel'],
    [/\bloyer\b/g, 'depenses'],
    [/\bkra\b/g, 'depenses'],

    // Gains / bénéfice
    [/\brbe7\b/g, 'benefice'],
    [/\brbah\b/g, 'benefice'],
    [/\brbeh\b/g, 'benefice'],
    [/\bgain\b/g, 'benefice'],
    [/\bbenefice\b/g, 'benefice'],
    [/\bmarge\b/g, 'benefice'],
    [/\brabh\b/g, 'benefice'],

    // Zakat
    [/\bzakat\b/g, 'zakat'],
    [/\bzekat\b/g, 'zakat'],
    [/\bzaka\b/g, 'zakat'],

    // Clients / téléphone
    [/\bzaboun\b/g, 'client'],
    [/\bzboun\b/g, 'client'],
    [/\bclient\b/g, 'client'],
    [/\bnumero\b/g, 'telephone'],
    [/\bnum\b/g, 'telephone'],
    [/\btel\b/g, 'telephone'],
    [/\bwhatsapp\b/g, 'whatsapp'],
    [/\bwatsapp\b/g, 'whatsapp'],
    [/\bwatsap\b/g, 'whatsapp'],

    // Prix
    [/\bsouma\b/g, 'prix'],
    [/\bsuma\b/g, 'prix'],
    [/\btaman\b/g, 'prix'],
    [/\bprix\b/g, 'prix'],
    [/\bachat\b/g, 'prix achat'],
    [/\bbe3\b/g, 'vente'],

    // Réglages / home
    [/\breglage\b/g, 'reglages'],
    [/\bparametre\b/g, 'reglages'],
    [/\bsettings\b/g, 'reglages'],
    [/\baccueil\b/g, 'accueil'],
    [/\bdar\b/g, 'accueil'],
  ]

  for (const [re, to] of map) s = s.replace(re, to)
  return s
}
