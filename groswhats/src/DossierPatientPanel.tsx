import { useMemo, useState } from 'react'
import type {
  AppState,
  Client,
  Language,
  MedicalDocKind,
  MedicalDocument,
} from './types'
import { t } from './i18n'
import {
  addMedicalDocument,
  deleteMedicalDocument,
  medicalDocsForClient,
  updateClient,
} from './store'
import {
  ORDONNANCE_TEMPLATE_AR,
  ORDONNANCE_TEMPLATE_FR,
  ORIENTATION_TEMPLATE_AR,
  ORIENTATION_TEMPLATE_FR,
  buildMedicalDocumentText,
  medicalDocKindLabel,
  printMedicalText,
} from './utils/medicalDocs'
import { openWhatsappText } from './utils/whatsapp'

const KINDS: MedicalDocKind[] = [
  'ordonnance',
  'orientation',
  'certificat',
  'compte_rendu',
]

export function DossierPatientPanel({
  state,
  client,
  lang,
  onState,
  onFlash,
}: {
  state: AppState
  client: Client
  lang: Language
  onState: (next: AppState) => void
  onFlash: (msg: string) => void
}) {
  const docs = useMemo(
    () => medicalDocsForClient(state, client.id),
    [state, client.id],
  )
  const [editProfile, setEditProfile] = useState(false)
  const [birthDate, setBirthDate] = useState(client.birthDate ?? '')
  const [sex, setSex] = useState(client.sex ?? '')
  const [bloodGroup, setBloodGroup] = useState(client.bloodGroup ?? '')
  const [allergies, setAllergies] = useState(client.allergies ?? '')
  const [antecedents, setAntecedents] = useState(client.antecedents ?? '')

  const [compose, setCompose] = useState(false)
  const [kind, setKind] = useState<MedicalDocKind>('ordonnance')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState(
    lang === 'ar' ? ORDONNANCE_TEMPLATE_AR : ORDONNANCE_TEMPLATE_FR,
  )
  const [viewDoc, setViewDoc] = useState<MedicalDocument | null>(null)

  function applyKindTemplate(k: MedicalDocKind) {
    setKind(k)
    if (k === 'ordonnance') {
      setBody(lang === 'ar' ? ORDONNANCE_TEMPLATE_AR : ORDONNANCE_TEMPLATE_FR)
      setTitle(lang === 'ar' ? 'وصفة طبية' : 'Ordonnance')
    } else if (k === 'orientation') {
      setBody(lang === 'ar' ? ORIENTATION_TEMPLATE_AR : ORIENTATION_TEMPLATE_FR)
      setTitle(lang === 'ar' ? 'رسالة توجيه' : 'Lettre d’orientation')
    } else if (k === 'certificat') {
      setBody(
        lang === 'ar'
          ? 'أشهد أن المريض(ة) …\nمن … إلى …\n'
          : 'Je soussigné(e) certifie que le (la) patient(e) …\nDu … au …\n',
      )
      setTitle(lang === 'ar' ? 'شهادة طبية' : 'Certificat médical')
    } else {
      setBody('')
      setTitle(lang === 'ar' ? 'تقرير استشارة' : 'Compte-rendu')
    }
  }

  function saveProfile() {
    onState(
      updateClient(state, client.id, {
        birthDate: birthDate || undefined,
        sex: sex === 'M' || sex === 'F' || sex === 'X' ? sex : undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        allergies: allergies.trim() || undefined,
        antecedents: antecedents.trim() || undefined,
      }),
    )
    setEditProfile(false)
    onFlash(t(lang, 'medProfileSaved'))
  }

  function shareDoc(doc: MedicalDocument, how: 'wa' | 'print') {
    const text = buildMedicalDocumentText(state.settings, client, doc)
    if (how === 'print') {
      printMedicalText(text, medicalDocKindLabel(doc.kind, lang))
      onFlash(t(lang, 'medPrinted'))
      return
    }
    if (!client.phone) {
      onFlash(t(lang, 'agendaNoPhone'))
      return
    }
    openWhatsappText(client.phone, text)
    onFlash(t(lang, 'medWhatsappSent'))
  }

  return (
    <section className="dossier-patient">
      <div className="dossier-head">
        <h3>🩺 {t(lang, 'medDossierTitle')}</h3>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setBirthDate(client.birthDate ?? '')
            setSex(client.sex ?? '')
            setBloodGroup(client.bloodGroup ?? '')
            setAllergies(client.allergies ?? '')
            setAntecedents(client.antecedents ?? '')
            setEditProfile((v) => !v)
          }}
        >
          {editProfile ? t(lang, 'cancel') : t(lang, 'medEditProfile')}
        </button>
      </div>

      {client.allergies ? (
        <div className="dossier-allergy" role="status">
          ⚠ {t(lang, 'medAllergies')}: <strong>{client.allergies}</strong>
        </div>
      ) : null}

      {editProfile ? (
        <div className="dossier-form">
          <div className="grid-2">
            <div className="field">
              <label>{t(lang, 'medBirthDate')}</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t(lang, 'medSex')}</label>
              <select value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="">—</option>
                <option value="F">{lang === 'ar' ? 'أنثى' : 'F'}</option>
                <option value="M">{lang === 'ar' ? 'ذكر' : 'M'}</option>
                <option value="X">—</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>{t(lang, 'medBlood')}</label>
            <input
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="A+, O−…"
            />
          </div>
          <div className="field">
            <label>{t(lang, 'medAllergies')}</label>
            <textarea
              rows={2}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder={t(lang, 'medAllergiesHint')}
            />
          </div>
          <div className="field">
            <label>{t(lang, 'medAntecedents')}</label>
            <textarea
              rows={3}
              value={antecedents}
              onChange={(e) => setAntecedents(e.target.value)}
              placeholder={t(lang, 'medAntecedentsHint')}
            />
          </div>
          <button type="button" className="btn block" onClick={saveProfile}>
            {t(lang, 'save')}
          </button>
        </div>
      ) : (
        <div className="dossier-profile muted">
          {client.birthDate ? (
            <div>
              {t(lang, 'medBirthDate')}: {client.birthDate}
            </div>
          ) : null}
          {client.sex ? (
            <div>
              {t(lang, 'medSex')}: {client.sex}
            </div>
          ) : null}
          {client.bloodGroup ? (
            <div>
              {t(lang, 'medBlood')}: {client.bloodGroup}
            </div>
          ) : null}
          {client.antecedents ? (
            <div>
              {t(lang, 'medAntecedents')}: {client.antecedents}
            </div>
          ) : null}
          {!client.birthDate &&
          !client.sex &&
          !client.bloodGroup &&
          !client.antecedents &&
          !client.allergies ? (
            <div>{t(lang, 'medProfileEmpty')}</div>
          ) : null}
        </div>
      )}

      <div className="btn-row" style={{ margin: '12px 0', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            applyKindTemplate('ordonnance')
            setCompose(true)
            setViewDoc(null)
          }}
        >
          💊 {t(lang, 'medNewOrdonnance')}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            applyKindTemplate('orientation')
            setCompose(true)
            setViewDoc(null)
          }}
        >
          ✉️ {t(lang, 'medNewOrientation')}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            applyKindTemplate('certificat')
            setCompose(true)
            setViewDoc(null)
          }}
        >
          📄 {t(lang, 'medNewCertificat')}
        </button>
      </div>

      {compose ? (
        <div className="dossier-form">
          <div className="field">
            <label>{t(lang, 'medDocType')}</label>
            <select
              value={kind}
              onChange={(e) => applyKindTemplate(e.target.value as MedicalDocKind)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {medicalDocKindLabel(k, lang)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t(lang, 'medDocTitle')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>{t(lang, 'medDocBody')}</label>
            <textarea
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              disabled={!body.trim()}
              onClick={() => {
                const next = addMedicalDocument(state, {
                  clientId: client.id,
                  kind,
                  title,
                  body,
                })
                onState(next)
                const created = next.medicalDocuments[0]
                setCompose(false)
                setViewDoc(created)
                onFlash(t(lang, 'medDocSaved'))
              }}
            >
              {t(lang, 'save')}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setCompose(false)}
            >
              {t(lang, 'cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {viewDoc ? (
        <div className="dossier-view card" style={{ boxShadow: 'none' }}>
          <h4>
            {medicalDocKindLabel(viewDoc.kind, lang)}
            {viewDoc.title ? ` — ${viewDoc.title}` : ''}
          </h4>
          <div className="muted" style={{ marginBottom: 8 }}>
            {new Date(viewDoc.createdAt).toLocaleString(
              lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
            )}
          </div>
          <pre className="dossier-body">{viewDoc.body}</pre>
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => shareDoc(viewDoc, 'print')}
            >
              🖨️ {t(lang, 'medPrint')}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => shareDoc(viewDoc, 'wa')}
            >
              📲 WhatsApp
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setViewDoc(null)}
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                onState(deleteMedicalDocument(state, viewDoc.id))
                setViewDoc(null)
                onFlash(t(lang, 'medDocDeleted'))
              }}
            >
              {t(lang, 'delete')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="dossier-list">
        <div className="muted" style={{ marginBottom: 6 }}>
          {t(lang, 'medHistory')} ({docs.length})
        </div>
        {docs.length === 0 ? (
          <div className="muted">{t(lang, 'medHistoryEmpty')}</div>
        ) : (
          docs.map((d) => (
            <button
              key={d.id}
              type="button"
              className="dossier-doc-row"
              onClick={() => {
                setViewDoc(d)
                setCompose(false)
              }}
            >
              <strong>{medicalDocKindLabel(d.kind, lang)}</strong>
              <span className="muted">
                {d.title ? `${d.title} · ` : ''}
                {new Date(d.createdAt).toLocaleDateString(
                  lang === 'ar' ? 'ar-DZ' : 'fr-DZ',
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

/** Unused import guard helper for settings type in builders — removed */
