import { useMemo, useState } from 'react'
import type {
  AppState,
  Employee,
  EmployeeLeave,
  EmployeeRole,
  Language,
  LeaveKind,
  StaffMoneyKind,
} from './types'
import { t } from './i18n'
import {
  addEmployee,
  addEmployeeLeave,
  addStaffLedgerEntry,
  deleteEmployee,
  deleteEmployeeLeave,
  employeeLeavesFor,
  staffBalanceFor,
  staffLedgerFor,
  updateEmployee,
} from './store'
import { formatDa } from './utils/format'

const ROLES: EmployeeRole[] = [
  'vendeur',
  'caissier',
  'livreur',
  'manager',
  'technicien',
  'assistant',
  'autre',
]

const LEAVE_KINDS: LeaveKind[] = ['conge', 'maladie', 'sans_solde', 'autre']

function roleLabel(lang: Language, role: EmployeeRole): string {
  return t(lang, `staffRole_${role}`)
}

function leaveLabel(lang: Language, kind: LeaveKind): string {
  return t(lang, `staffLeave_${kind}`)
}

function moneyLabel(lang: Language, kind: StaffMoneyKind): string {
  return t(lang, `staffMoney_${kind}`)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthLabel(): string {
  return new Date().toISOString().slice(0, 7)
}

export function StaffPanel({
  state,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const employees = useMemo(
    () =>
      [...(state.employees ?? [])].sort((a, b) =>
        a.active === b.active ? a.name.localeCompare(b.name) : a.active ? -1 : 1,
      ),
    [state.employees],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const selected = employees.find((e) => e.id === selectedId) ?? null

  if (selected) {
    return (
      <EmployeeDossier
        state={state}
        employee={selected}
        lang={lang}
        onBack={() => setSelectedId(null)}
        onState={onState}
        onFlash={onFlash}
      />
    )
  }

  if (creating) {
    return (
      <EmployeeForm
        lang={lang}
        initial={null}
        onCancel={() => setCreating(false)}
        onSave={(input) => {
          onState(addEmployee(state, input))
          setCreating(false)
          onFlash(t(lang, 'staffSaved'))
        }}
      />
    )
  }

  return (
    <div className="page staff-page">
      <div className="card">
        <h2>👥 {t(lang, 'staffTitle')}</h2>
        <p className="muted">{t(lang, 'staffHint')}</p>
        <button type="button" className="btn block" onClick={() => setCreating(true)}>
          + {t(lang, 'staffAdd')}
        </button>
      </div>
      {employees.length === 0 ? (
        <div className="card muted">{t(lang, 'staffEmpty')}</div>
      ) : (
        employees.map((e) => {
          const bal = staffBalanceFor(state, e.id)
          return (
            <button
              key={e.id}
              type="button"
              className="list-item staff-row"
              onClick={() => setSelectedId(e.id)}
            >
              <div>
                <strong>
                  {e.name}
                  {!e.active ? ` · ${t(lang, 'staffInactive')}` : ''}
                </strong>
                <div className="muted">
                  {roleLabel(lang, e.role)}
                  {e.contractStart ? ` · ${t(lang, 'staffContractFrom')} ${e.contractStart}` : ''}
                </div>
              </div>
              <div className="staff-row-money">
                <span className="muted">{formatDa(e.salaryDa)}/{t(lang, 'staffPerMonth')}</span>
                {bal.resteAPayer > 0 ? (
                  <strong className="warn-text">{formatDa(bal.resteAPayer)}</strong>
                ) : bal.detteEmploye > 0 ? (
                  <span className="badge warn">{formatDa(bal.detteEmploye)}</span>
                ) : null}
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}

function EmployeeForm({
  lang,
  initial,
  onCancel,
  onSave,
}: {
  lang: Language
  initial: Employee | null
  onCancel: () => void
  onSave: (input: Omit<Employee, 'id' | 'createdAt'>) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [role, setRole] = useState<EmployeeRole>(initial?.role ?? 'vendeur')
  const [contractStart, setContractStart] = useState(initial?.contractStart ?? todayIso())
  const [contractEnd, setContractEnd] = useState(initial?.contractEnd ?? '')
  const [salaryDa, setSalaryDa] = useState(String(initial?.salaryDa ?? ''))
  const [insuranceStart, setInsuranceStart] = useState(initial?.insuranceStart ?? '')
  const [insuranceEnd, setInsuranceEnd] = useState(initial?.insuranceEnd ?? '')
  const [insuranceNote, setInsuranceNote] = useState(initial?.insuranceNote ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [active, setActive] = useState(initial?.active ?? true)

  return (
    <div className="card dossier-form">
      <button type="button" className="btn ghost" onClick={onCancel}>
        ← {t(lang, 'back')}
      </button>
      <h3>{initial ? t(lang, 'staffEdit') : t(lang, 'staffAdd')}</h3>
      <div className="field">
        <label>{t(lang, 'staffName')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>WhatsApp</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="field">
        <label>{t(lang, 'staffRole')}</label>
        <select value={role} onChange={(e) => setRole(e.target.value as EmployeeRole)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(lang, r)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>{t(lang, 'staffContractStart')}</label>
          <input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} />
        </div>
        <div className="field">
          <label>{t(lang, 'staffContractEnd')}</label>
          <input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>{t(lang, 'staffSalary')}</label>
        <input
          inputMode="decimal"
          value={salaryDa}
          onChange={(e) => setSalaryDa(e.target.value)}
          placeholder="0"
        />
      </div>
      <div className="grid-2">
        <div className="field">
          <label>{t(lang, 'staffInsuranceStart')}</label>
          <input
            type="date"
            value={insuranceStart}
            onChange={(e) => setInsuranceStart(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t(lang, 'staffInsuranceEnd')}</label>
          <input type="date" value={insuranceEnd} onChange={(e) => setInsuranceEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>{t(lang, 'staffInsuranceNote')}</label>
        <input
          value={insuranceNote}
          onChange={(e) => setInsuranceNote(e.target.value)}
          placeholder={t(lang, 'staffInsuranceNoteHint')}
        />
      </div>
      <div className="field">
        <label>{t(lang, 'clientNotes')}</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <label className="check-row">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>{t(lang, 'staffActive')}</span>
      </label>
      <button
        type="button"
        className="btn block"
        disabled={!name.trim()}
        onClick={() =>
          onSave({
            name: name.trim(),
            phone: phone.trim(),
            role,
            contractStart: contractStart || undefined,
            contractEnd: contractEnd || undefined,
            salaryDa: Math.max(0, Number(String(salaryDa).replace(',', '.')) || 0),
            insuranceStart: insuranceStart || undefined,
            insuranceEnd: insuranceEnd || undefined,
            insuranceNote: insuranceNote.trim() || undefined,
            notes: notes.trim(),
            active,
          })
        }
      >
        {t(lang, 'save')}
      </button>
    </div>
  )
}

function EmployeeDossier({
  state,
  employee,
  lang,
  onBack,
  onState,
  onFlash,
}: {
  state: AppState
  employee: Employee
  lang: Language
  onBack: () => void
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const leaves = employeeLeavesFor(state, employee.id)
  const ledger = staffLedgerFor(state, employee.id)
  const bal = staffBalanceFor(state, employee.id)

  const [leaveKind, setLeaveKind] = useState<LeaveKind>('conge')
  const [leaveStart, setLeaveStart] = useState(todayIso())
  const [leaveEnd, setLeaveEnd] = useState(todayIso())
  const [leaveNote, setLeaveNote] = useState('')

  const [moneyKind, setMoneyKind] = useState<StaffMoneyKind>('avance')
  const [moneyAmount, setMoneyAmount] = useState('')
  const [moneyNote, setMoneyNote] = useState('')
  const [moneyPeriod, setMoneyPeriod] = useState(monthLabel())

  if (editing) {
    return (
      <EmployeeForm
        lang={lang}
        initial={employee}
        onCancel={() => setEditing(false)}
        onSave={(input) => {
          onState(updateEmployee(state, employee.id, input))
          setEditing(false)
          onFlash(t(lang, 'staffSaved'))
        }}
      />
    )
  }

  const insuranceSoon =
    employee.insuranceEnd &&
    employee.insuranceEnd <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  return (
    <div className="page staff-dossier">
      <div className="card">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← {t(lang, 'staffTitle')}
        </button>
        <div className="dossier-head">
          <h3>{employee.name}</h3>
          <span className="badge">{roleLabel(lang, employee.role)}</span>
        </div>
        <div className="muted">{employee.phone || '—'}</div>

        <div className="fiche-grid" style={{ marginTop: 12 }}>
          <div>
            <div className="fiche-label">{t(lang, 'staffContractStart')}</div>
            <div>{employee.contractStart || '—'}</div>
          </div>
          <div>
            <div className="fiche-label">{t(lang, 'staffContractEnd')}</div>
            <div>{employee.contractEnd || '—'}</div>
          </div>
          <div>
            <div className="fiche-label">{t(lang, 'staffSalary')}</div>
            <div>
              <strong>{formatDa(employee.salaryDa)}</strong> / {t(lang, 'staffPerMonth')}
            </div>
          </div>
          <div>
            <div className="fiche-label">{t(lang, 'staffInsurance')}</div>
            <div>
              {employee.insuranceStart || employee.insuranceEnd
                ? `${employee.insuranceStart || '…'} → ${employee.insuranceEnd || '…'}`
                : '—'}
              {insuranceSoon ? (
                <span className="badge warn" style={{ marginInlineStart: 6 }}>
                  {t(lang, 'staffInsuranceExpiring')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {employee.insuranceNote ? (
          <p className="muted" style={{ marginTop: 8 }}>
            {employee.insuranceNote}
          </p>
        ) : null}

        <div className="staff-money-summary">
          <div>
            <span className="muted">{t(lang, 'staffAdvances')}</span>
            <strong>{formatDa(bal.avancesOuvertes)}</strong>
          </div>
          <div>
            <span className="muted">{t(lang, 'staffDebts')}</span>
            <strong>{formatDa(bal.detteEmploye)}</strong>
          </div>
          <div>
            <span className="muted">{t(lang, 'staffRemainPay')}</span>
            <strong className={bal.resteAPayer > 0 ? 'warn-text' : ''}>
              {formatDa(bal.resteAPayer)}
            </strong>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            ✏️ {t(lang, 'staffEdit')}
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              onState(deleteEmployee(state, employee.id))
              onBack()
              onFlash(t(lang, 'staffDeleted'))
            }}
          >
            {t(lang, 'delete')}
          </button>
        </div>
      </div>

      <div className="card dossier-form">
        <h4>🏖️ {t(lang, 'staffLeaveTitle')}</h4>
        <p className="muted">{t(lang, 'staffLeaveHint')}</p>
        <div className="field">
          <label>{t(lang, 'staffLeaveKind')}</label>
          <select
            value={leaveKind}
            onChange={(e) => setLeaveKind(e.target.value as LeaveKind)}
          >
            {LEAVE_KINDS.map((k) => (
              <option key={k} value={k}>
                {leaveLabel(lang, k)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'staffLeaveStart')}</label>
            <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
          </div>
          <div className="field">
            <label>{t(lang, 'staffLeaveEnd')}</label>
            <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>{t(lang, 'clientNotes')}</label>
          <input value={leaveNote} onChange={(e) => setLeaveNote(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn block"
          disabled={!leaveStart || !leaveEnd}
          onClick={() => {
            onState(
              addEmployeeLeave(state, {
                employeeId: employee.id,
                kind: leaveKind,
                startDate: leaveStart,
                endDate: leaveEnd,
                note: leaveNote,
              }),
            )
            setLeaveNote('')
            onFlash(t(lang, 'staffLeaveSaved'))
          }}
        >
          {t(lang, 'staffLeaveAdd')}
        </button>
        <div className="dossier-list" style={{ marginTop: 10 }}>
          {leaves.length === 0 ? (
            <p className="muted">{t(lang, 'staffLeaveEmpty')}</p>
          ) : (
            leaves.map((lv: EmployeeLeave) => (
              <div key={lv.id} className="dossier-doc-row">
                <div>
                  <strong>{leaveLabel(lang, lv.kind)}</strong>
                  <div className="muted">
                    {lv.startDate} → {lv.endDate}
                    {lv.note ? ` · ${lv.note}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => onState(deleteEmployeeLeave(state, lv.id))}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card dossier-form">
        <h4>💵 {t(lang, 'staffMoneyTitle')}</h4>
        <p className="muted">{t(lang, 'staffMoneyHint')}</p>
        <div className="field">
          <label>{t(lang, 'staffMoneyKind')}</label>
          <select
            value={moneyKind}
            onChange={(e) => setMoneyKind(e.target.value as StaffMoneyKind)}
          >
            {(['avance', 'dette', 'paiement_salaire', 'remboursement'] as StaffMoneyKind[]).map(
              (k) => (
                <option key={k} value={k}>
                  {moneyLabel(lang, k)}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>{t(lang, 'clinicChargeAmount')}</label>
            <input
              inputMode="decimal"
              value={moneyAmount}
              onChange={(e) => setMoneyAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label>{t(lang, 'staffPeriod')}</label>
            <input
              value={moneyPeriod}
              onChange={(e) => setMoneyPeriod(e.target.value)}
              placeholder="2026-09"
            />
          </div>
        </div>
        <div className="field">
          <label>{t(lang, 'clientNotes')}</label>
          <input value={moneyNote} onChange={(e) => setMoneyNote(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn block"
          data-sfx-cash
          disabled={!(Number(moneyAmount) > 0)}
          onClick={() => {
            const amount = Number(String(moneyAmount).replace(',', '.'))
            if (!(amount > 0)) return
            onState(
              addStaffLedgerEntry(state, {
                employeeId: employee.id,
                kind: moneyKind,
                amountDa: amount,
                note: moneyNote,
                periodLabel: moneyPeriod.trim() || undefined,
              }),
            )
            setMoneyAmount('')
            setMoneyNote('')
            onFlash(t(lang, 'staffMoneySaved'))
          }}
        >
          {t(lang, 'staffMoneyAdd')}
        </button>
        <div className="dossier-list" style={{ marginTop: 10 }}>
          {ledger.length === 0 ? (
            <p className="muted">{t(lang, 'staffMoneyEmpty')}</p>
          ) : (
            ledger.map((row) => (
              <div key={row.id} className="dossier-doc-row">
                <div>
                  <strong>
                    {moneyLabel(lang, row.kind)} · {formatDa(row.amountDa)}
                  </strong>
                  <div className="muted">
                    {row.createdAt.slice(0, 10)}
                    {row.periodLabel ? ` · ${row.periodLabel}` : ''}
                    {row.note ? ` · ${row.note}` : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
