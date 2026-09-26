import { useEffect, useRef, useState } from 'react'
import type { AppState, Language, Screen } from './types'
import { t } from './i18n'
import {
  applyAgentSideEffect,
  runAgent,
  teachAndRun,
  type AgentResult,
} from './agent/runAgent'
import { detectChatLang } from './agent/chat'
import {
  isVoiceMuted,
  setVoiceMuted,
  speak,
  stopSpeaking,
} from './utils/speak'
import { isVoiceSupported, startVoiceListen, type VoiceLang } from './utils/voice'
import {
  clearAgentMemory,
  memoryStats,
  TEACHABLE_INTENTS,
  type AgentIntentId,
} from './agent/memory'
import { dailyExpertTip } from './agent/expertise'

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  thought?: string
}

const SUGGESTIONS_FR = [
  'aide',
  'stock bas',
  'crédits',
  'résumé du jour',
  'ouvre vente',
  'ouvre clients',
  'organise l’app',
  'thème nuit',
  'conseil vente',
  'lance campagne',
  'az digital',
]

const SUGGESTIONS_AR = [
  'مساعدة',
  'مخزون ناقص',
  'الديون',
  'ملخص اليوم',
  'افتح البيع',
  'افتح الزبائن',
  'نظّم التطبيق',
  'ثيم الليل',
  'خبير مبيعات',
  'ابدأ حملة',
  'az digital',
]

export function AgentPage({
  state,
  lang,
  onState,
  onNavigate,
  onInvoiceSent,
  initialUtterance,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onNavigate: (screen: Screen) => void
  onInvoiceSent: () => void
  /** Première phrase optionnelle (texte) */
  initialUtterance?: string | null
}) {
  const [input, setInput] = useState('')
  const [suggestMode, setSuggestMode] = useState<'fr' | 'ar'>(lang === 'ar' ? 'ar' : 'fr')
  const [pendingTeach, setPendingTeach] = useState<string | null>(null)
  const [memTick, setMemTick] = useState(0)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [voiceOn, setVoiceOn] = useState(() => !isVoiceMuted())
  const [voiceLang, setVoiceLang] = useState<VoiceLang>(lang === 'ar' ? 'ar' : 'fr')
  const listenRef = useRef<{ stop: () => void } | null>(null)
  const stateRef = useRef(state)
  const seededRef = useRef(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const tip = dailyExpertTip(state, lang)
    return [
      {
        id: 'welcome',
        role: 'agent',
        text:
          (lang === 'ar'
            ? 'مرحباً، أنا وكيل AZ POS (صندوق ومخزون وزبائن).\nجرّب: مخزون ناقص · الديون · ملخص اليوم · افتح البيع · نظّم التطبيق\n\n'
            : 'Salam, je suis l’agent AZ POS (caisse, stock, clients).\nEssaie : stock bas · crédits · résumé du jour · ouvre vente · organise l’app\n\n') +
          tip,
      },
    ]
  })
  const endRef = useRef<HTMLDivElement>(null)
  const suggestions = suggestMode === 'ar' ? SUGGESTIONS_AR : SUGGESTIONS_FR
  const stats = memoryStats()

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingTeach, busy])

  useEffect(() => {
    return () => {
      listenRef.current?.stop()
      stopSpeaking()
    }
  }, [])

  function handleResult(result: AgentResult) {
    if (result.nextState) onState(result.nextState)
    if (result.action?.type === 'navigate') onNavigate(result.action.screen)
    if (result.action?.type === 'send_invoice_last') {
      applyAgentSideEffect(result.nextState ?? stateRef.current, result.action)
      onInvoiceSent()
    } else {
      applyAgentSideEffect(result.nextState ?? stateRef.current, result.action)
    }
    setMessages((m) => [
      ...m,
      {
        id: `a_${Date.now()}`,
        role: 'agent',
        text: result.reply,
        thought: result.agenticThought,
      },
    ])
    if (result.needsTeach && result.pendingPhrase) {
      setPendingTeach(result.pendingPhrase)
    } else {
      setPendingTeach(null)
    }
    if (result.learned || result.intent) setMemTick((x) => x + 1)
    if (voiceOn) {
      const talkLang = detectChatLang(result.reply, lang === 'ar' ? 'ar' : 'fr')
      speak(result.reply, talkLang)
    }
  }

  async function send(text: string) {
    const value = text.trim()
    if (!value || busy) return
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: 'user', text: value }])
    setInput('')
    setBusy(true)
    try {
      const result = await runAgent(stateRef.current, value)
      handleResult(result)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!initialUtterance) return
    seededRef.current = false
    const phrase = initialUtterance
    const tmr = window.setTimeout(() => {
      if (seededRef.current) return
      seededRef.current = true
      void send(phrase)
    }, 200)
    return () => window.clearTimeout(tmr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUtterance])

  function teach(intent: AgentIntentId) {
    if (!pendingTeach) return
    const phrase = pendingTeach
    setPendingTeach(null)
    const result = teachAndRun(stateRef.current, phrase, intent)
    handleResult(result)
  }

  return (
    <>
      <div className="card agent-card">
        <h2>🤖 {t(lang, 'agent')}</h2>
        <div className="notice">{t(lang, 'agentHint')}</div>
        <div className="muted" style={{ marginBottom: 8 }}>
          {t(lang, 'agentMemory')} : {stats.intents} · {stats.aliases}
          <button
            type="button"
            className="btn ghost"
            style={{ marginInlineStart: 8 }}
            onClick={() => {
              clearAgentMemory()
              setMemTick((x) => x + 1)
              setMessages((m) => [
                ...m,
                {
                  id: `a_${Date.now()}`,
                  role: 'agent',
                  text: t(lang, 'agentClearDone'),
                },
              ])
            }}
          >
            {t(lang, 'agentClearMemory')}
          </button>
        </div>

        <div className="field">
          <label>{t(lang, 'agentSuggestLang')}</label>
          <div className="btn-row">
            <button
              type="button"
              className={`btn ${suggestMode === 'fr' ? '' : 'ghost'}`}
              onClick={() => setSuggestMode('fr')}
            >
              Français
            </button>
            <button
              type="button"
              className={`btn ${suggestMode === 'ar' ? '' : 'ghost'}`}
              onClick={() => setSuggestMode('ar')}
            >
              العربية
            </button>
          </div>
        </div>

        <div className="agent-chat">
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.role}`}>
              {m.thought ? (
                <div className="muted agent-thought">
                  {t(lang, 'agentPlan')}: {m.thought}
                </div>
              ) : null}
              <pre>{m.text}</pre>
            </div>
          ))}
          {busy ? (
            <div className="bubble agent">
              <pre>{lang === 'ar' ? 'راني نفكّر…' : 'Je cherche…'}</pre>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {pendingTeach ? (
          <div className="teach-box">
            <div className="muted">{t(lang, 'agentTeach')}</div>
            <div className="chip-row">
              {TEACHABLE_INTENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip teach-chip"
                  onClick={() => teach(item.id)}
                >
                  {lang === 'ar' ? item.ar : item.fr}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="chip-row">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="btn-row" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={`btn ${voiceOn ? '' : 'ghost'}`}
            onClick={() => {
              const next = !voiceOn
              setVoiceOn(next)
              setVoiceMuted(!next)
              if (!next) stopSpeaking()
            }}
          >
            {voiceOn ? t(lang, 'agentVoiceOn') : t(lang, 'agentVoiceOff')}
          </button>
          <button
            type="button"
            className={`btn ${voiceLang === 'fr' ? '' : 'ghost'}`}
            onClick={() => setVoiceLang('fr')}
          >
            FR
          </button>
          <button
            type="button"
            className={`btn ${voiceLang === 'ar' ? '' : 'ghost'}`}
            onClick={() => setVoiceLang('ar')}
          >
            AR
          </button>
        </div>

        <div className="agent-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(lang, 'agentPlaceholder')}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send(input)
            }}
          />
          <button
            type="button"
            className={`btn ${listening ? 'secondary' : 'ghost'}`}
            disabled={!isVoiceSupported()}
            onClick={() => {
              if (listening) {
                listenRef.current?.stop()
                listenRef.current = null
                setListening(false)
                return
              }
              if (!isVoiceSupported()) {
                window.alert(t(lang, 'voiceUnsupported'))
                return
              }
              setListening(true)
              listenRef.current = startVoiceListen({
                voiceLang,
                onFinal: (text) => {
                  listenRef.current?.stop()
                  listenRef.current = null
                  setListening(false)
                  send(text)
                },
                onError: () => {
                  listenRef.current = null
                  setListening(false)
                },
                onEnd: () => {
                  listenRef.current = null
                  setListening(false)
                },
              })
            }}
          >
            {listening ? `🎤 ${t(lang, 'agentMicOn')}` : `🎤 ${t(lang, 'agentMic')}`}
          </button>
          <button className="btn" disabled={busy} onClick={() => send(input)}>
            {busy ? (lang === 'ar' ? '…' : '…') : t(lang, 'agentSend')}
          </button>
        </div>
        <span style={{ display: 'none' }}>{memTick}</span>
      </div>
    </>
  )
}
