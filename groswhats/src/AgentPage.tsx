import { useEffect, useRef, useState } from 'react'
import type { AppState, Language, Screen } from './types'
import { t } from './i18n'
import {
  applyAgentSideEffect,
  runAgent,
  teachAndRun,
  type AgentResult,
} from './agent/runAgent'
import {
  clearAgentMemory,
  memoryStats,
  TEACHABLE_INTENTS,
  type AgentIntentId,
} from './agent/memory'
import {
  isVoiceStop,
  isVoiceSupported,
  startVoiceListen,
  type VoiceLang,
} from './utils/voice'
import { speakDarijaWelcome, stopSpeaking } from './utils/speak'

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  thought?: string
}

const SUGGESTIONS_FR = [
  'organise l’app',
  'thème nuit',
  'résumé du jour',
  'stock bas',
  'crédits',
  'mes gains',
  'calcule zakat',
  'aide',
]

const SUGGESTIONS_AR = [
  'نظّم التطبيق',
  'ثيم الليل',
  'ملخص اليوم',
  'مخزون ناقص',
  'الديون',
  'أرباحي',
  'احسب الزكاة',
  'مساعدة',
]

const SUGGESTIONS_DARJA = [
  'nadem l’app',
  'theme lil',
  'resume lyoum',
  'stock na9es',
  'chkoune yekhlas',
  '7seb zakat',
  'apprend khlass = stock bas',
  '3aweni',
]

export function AgentPage({
  state,
  lang,
  onState,
  onNavigate,
  onInvoiceSent,
  initialUtterance,
  handsFree = false,
  onHandsFreeEnd,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onNavigate: (screen: Screen) => void
  onInvoiceSent: () => void
  /** Première phrase (ex: demande vocale à l’ouverture) */
  initialUtterance?: string | null
  /** Écoute continue jusqu’à arete / khlas / eskout */
  handsFree?: boolean
  onHandsFreeEnd?: () => void
}) {
  const [input, setInput] = useState('')
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('darja')
  const [listening, setListening] = useState(false)
  const [handsFreeOn, setHandsFreeOn] = useState(handsFree)
  const [partial, setPartial] = useState('')
  const [pendingTeach, setPendingTeach] = useState<string | null>(null)
  const [memTick, setMemTick] = useState(0)
  const stopRef = useRef<(() => void) | null>(null)
  const stateRef = useRef(state)
  const seededRef = useRef(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'agent',
      text:
        lang === 'ar'
          ? 'مرحباً، أنا وكيل Grossiste DZ. قل «خلاص / اسكت / arete» باش نحبس.'
          : 'Salam, je suis l’agent. Dis «khlas / eskout / arete» pour arrêter.',
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)
  const suggestions =
    voiceLang === 'darja'
      ? SUGGESTIONS_DARJA
      : voiceLang === 'ar' || lang === 'ar'
        ? SUGGESTIONS_AR
        : SUGGESTIONS_FR
  const voiceOk = isVoiceSupported()
  const stats = memoryStats()

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partial, pendingTeach])

  useEffect(() => {
    return () => {
      stopRef.current?.()
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
    speakDarijaWelcome(result.reply.slice(0, 220))
    if (result.needsTeach && result.pendingPhrase) {
      setPendingTeach(result.pendingPhrase)
    } else {
      setPendingTeach(null)
    }
    if (result.learned || result.intent) setMemTick((x) => x + 1)
  }

  function stopHandsFree(bye = true) {
    stopRef.current?.()
    stopRef.current = null
    setListening(false)
    setPartial('')
    setHandsFreeOn(false)
    stopSpeaking()
    if (bye) {
      speakDarijaWelcome('واخا، سكيت. قولّي عاونّي كي تعاود تحتاجني.')
      setMessages((m) => [
        ...m,
        {
          id: `a_stop_${Date.now()}`,
          role: 'agent',
          text: t(lang, 'agentStopped'),
        },
      ])
    }
    onHandsFreeEnd?.()
  }

  function send(text: string) {
    const value = text.trim()
    if (!value) return
    if (isVoiceStop(value)) {
      setMessages((m) => [...m, { id: `u_${Date.now()}`, role: 'user', text: value }])
      stopHandsFree(true)
      return
    }
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: 'user', text: value }])
    setInput('')
    setPartial('')
    const result = runAgent(stateRef.current, value)
    handleResult(result)
  }

  function startHandsFreeListen() {
    if (!voiceOk) return
    stopRef.current?.()
    setListening(true)
    setPartial('')
    const ctrl = startVoiceListen({
      voiceLang: 'darja',
      continuous: true,
      onPartial: (text) => setPartial(text),
      onFinal: (text) => {
        setPartial('')
        send(text)
      },
      onError: (err) => {
        if (err === 'aborted' || err === 'no-speech') return
        setListening(false)
        stopRef.current = null
        const msg =
          err === 'not-allowed'
            ? t(lang, 'voiceDenied')
            : err === 'unsupported'
              ? t(lang, 'voiceUnsupported')
              : t(lang, 'voiceError')
        setMessages((m) => [
          ...m,
          { id: `a_${Date.now()}`, role: 'agent', text: msg },
        ])
      },
      onEnd: () => {
        setListening(false)
        stopRef.current = null
      },
    })
    stopRef.current = ctrl?.stop ?? null
  }

  useEffect(() => {
    if (!handsFree) return
    setHandsFreeOn(true)
    setVoiceLang('darja')
    const tmr = window.setTimeout(() => startHandsFreeListen(), 900)
    return () => window.clearTimeout(tmr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handsFree])

  useEffect(() => {
    if (!initialUtterance || seededRef.current) return
    seededRef.current = true
    const tmr = window.setTimeout(() => send(initialUtterance), 400)
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

  function toggleVoice() {
    if (listening || handsFreeOn) {
      stopHandsFree(false)
      return
    }
    if (!voiceOk) {
      setMessages((m) => [
        ...m,
        {
          id: `a_${Date.now()}`,
          role: 'agent',
          text: t(lang, 'voiceUnsupported'),
        },
      ])
      return
    }
    setHandsFreeOn(true)
    startHandsFreeListen()
  }

  return (
    <>
      <div className="card agent-card">
        <h2>🤖 {t(lang, 'agent')}</h2>
        <div className="notice">{t(lang, 'agentHint')}</div>
        {handsFreeOn ? (
          <div className="notice warn">{t(lang, 'agentHandsFreeHint')}</div>
        ) : null}
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
          <label>{t(lang, 'voiceLang')}</label>
          <div className="btn-row">
            <button
              type="button"
              className={`btn ${voiceLang === 'fr' ? '' : 'ghost'}`}
              onClick={() => setVoiceLang('fr')}
            >
              Français
            </button>
            <button
              type="button"
              className={`btn ${voiceLang === 'ar' ? '' : 'ghost'}`}
              onClick={() => setVoiceLang('ar')}
            >
              العربية
            </button>
            <button
              type="button"
              className={`btn ${voiceLang === 'darja' ? '' : 'ghost'}`}
              onClick={() => setVoiceLang('darja')}
            >
              دارجة
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
          {partial ? (
            <div className="bubble agent partial">
              <pre>🎤 {partial}</pre>
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

        <div className="agent-input-row">
          <button
            type="button"
            className={`btn mic-btn ${listening || handsFreeOn ? 'listening' : 'secondary'}`}
            onClick={toggleVoice}
            title={t(lang, 'voiceTalk')}
          >
            {listening || handsFreeOn ? '⏹️' : '🎤'}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              listening || handsFreeOn
                ? t(lang, 'voiceListening')
                : t(lang, 'agentPlaceholder')
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') send(input)
            }}
          />
          <button className="btn" onClick={() => send(input)}>
            {t(lang, 'agentSend')}
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>
          {t(lang, 'agentStopTip')}
        </div>
        <span style={{ display: 'none' }}>{memTick}</span>
      </div>
    </>
  )
}
