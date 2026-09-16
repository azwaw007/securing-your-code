import { useState } from 'react'
import type { Language } from './types'
import { t } from './i18n'

type Op = '+' | '-' | '×' | '÷' | null

function formatDisplay(n: number): string {
  if (!Number.isFinite(n)) return 'Erreur'
  const rounded = Math.round(n * 1e8) / 1e8
  const s = String(rounded)
  if (s.length > 14) return rounded.toExponential(6)
  return s.replace('.', ',')
}

function parseDisplay(s: string): number {
  return Number(s.replace(',', '.')) || 0
}

function applyOp(a: number, b: number, op: Op): number {
  if (!op) return b
  if (op === '+') return a + b
  if (op === '-') return a - b
  if (op === '×') return a * b
  if (op === '÷') return b === 0 ? NaN : a / b
  return b
}

export function CalculatorPage({ lang }: { lang: Language }) {
  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [op, setOp] = useState<Op>(null)
  const [fresh, setFresh] = useState(true)

  function inputDigit(d: string) {
    setDisplay((cur) => {
      if (fresh || cur === '0' || cur === 'Erreur') {
        setFresh(false)
        return d === ',' ? '0,' : d
      }
      if (d === ',' && cur.includes(',')) return cur
      if (cur.replace(',', '').replace('-', '').length >= 12) return cur
      return cur + d
    })
  }

  function clearAll() {
    setDisplay('0')
    setStored(null)
    setOp(null)
    setFresh(true)
  }

  function backspace() {
    if (fresh) return
    setDisplay((cur) => {
      if (cur.length <= 1 || (cur.length === 2 && cur.startsWith('-'))) {
        setFresh(true)
        return '0'
      }
      return cur.slice(0, -1)
    })
  }

  function setOperator(next: Op) {
    const current = parseDisplay(display)
    if (stored !== null && op && !fresh) {
      const result = applyOp(stored, current, op)
      setDisplay(formatDisplay(result))
      setStored(Number.isFinite(result) ? result : null)
    } else {
      setStored(current)
    }
    setOp(next)
    setFresh(true)
  }

  function equals() {
    if (stored === null || !op) return
    const result = applyOp(stored, parseDisplay(display), op)
    setDisplay(formatDisplay(result))
    setStored(null)
    setOp(null)
    setFresh(true)
  }

  function percent() {
    const current = parseDisplay(display)
    const base = stored ?? 0
    const result = op ? (base * current) / 100 : current / 100
    setDisplay(formatDisplay(result))
    setFresh(true)
  }

  function toggleSign() {
    setDisplay((cur) => {
      if (cur === '0' || cur === 'Erreur') return cur
      return cur.startsWith('-') ? cur.slice(1) : `-${cur}`
    })
    setFresh(false)
  }

  const keys: Array<{ label: string; kind: string; onClick: () => void }> = [
    { label: 'C', kind: 'fn', onClick: clearAll },
    { label: '±', kind: 'fn', onClick: toggleSign },
    { label: '%', kind: 'fn', onClick: percent },
    { label: '÷', kind: 'op', onClick: () => setOperator('÷') },
    { label: '7', kind: 'num', onClick: () => inputDigit('7') },
    { label: '8', kind: 'num', onClick: () => inputDigit('8') },
    { label: '9', kind: 'num', onClick: () => inputDigit('9') },
    { label: '×', kind: 'op', onClick: () => setOperator('×') },
    { label: '4', kind: 'num', onClick: () => inputDigit('4') },
    { label: '5', kind: 'num', onClick: () => inputDigit('5') },
    { label: '6', kind: 'num', onClick: () => inputDigit('6') },
    { label: '−', kind: 'op', onClick: () => setOperator('-') },
    { label: '1', kind: 'num', onClick: () => inputDigit('1') },
    { label: '2', kind: 'num', onClick: () => inputDigit('2') },
    { label: '3', kind: 'num', onClick: () => inputDigit('3') },
    { label: '+', kind: 'op', onClick: () => setOperator('+') },
    { label: '⌫', kind: 'fn', onClick: backspace },
    { label: '0', kind: 'num', onClick: () => inputDigit('0') },
    { label: ',', kind: 'num', onClick: () => inputDigit(',') },
    { label: '=', kind: 'eq', onClick: equals },
  ]

  return (
    <div className="card calc-card">
      <h2>{t(lang, 'calculator')}</h2>
      <div className="muted">{t(lang, 'calculatorHint')}</div>
      <div className="calc-display" aria-live="polite">
        <div className="calc-op">
          {stored !== null && op ? `${formatDisplay(stored)} ${op}` : ' '}
        </div>
        <div className="calc-value">{display}</div>
      </div>
      <div className="calc-pad">
        {keys.map((k) => (
          <button
            key={k.label}
            type="button"
            className={`calc-key calc-${k.kind}${op === k.label || (k.label === '−' && op === '-') ? ' active' : ''}`}
            onClick={k.onClick}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  )
}
