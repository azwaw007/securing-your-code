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
  const [suggestMode, setSuggestMode] = useState<'fr' | 'ar' | 'darja'>(
    lang === 'ar' ? 'ar' : 'darja',
  )
  const [pendingTeach, setPendingTeach] = useState<string | null>(null)
  const [memTick, setMemTick] = useState(0)
  const stateRef = useRef(state)
  const seededRef = useRef(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'agent',
      text:
        lang === 'ar'
          ? 'مرحباً، أنا وكيل AZ POS. اكتب طلبك هنا (بدون صوت).'
          : 'Salam, je suis l’agent AZ POS. Écris ta demande ici (sans voix).',
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)
  const suggestions =
    suggestMode === 'darja'
      ? SUGGESTIONS_DARJA
      : suggestMode === 'ar'
        ? SUGGESTIONS_AR
        : SUGGESTIONS_FR
  const stats = memoryStats()

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingTeach])

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
  }

  function send(text: string) {
    const value = text.trim()
    if (!value) return
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: 'user', text: value }])
    setInput('')
    const result = runAgent(stateRef.current, value)
    handleResult(result)
  }

  useEffect(() => {
    if (!initialUtterance || seededRef.current) return
    seededRef.current = true
    const tmr = window.setTimeout(() => send(initialUtterance), 200)
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
            <button
              type="button"
              className={`btn ${suggestMode === 'darja' ? '' : 'ghost'}`}
              onClick={() => setSuggestMode('darja')}
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
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(lang, 'agentPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send(input)
            }}
          />
          <button className="btn" onClick={() => send(input)}>
            {t(lang, 'agentSend')}
          </button>
        </div>
        <span style={{ display: 'none' }}>{memTick}</span>
      </div>
    </>
  )
}
