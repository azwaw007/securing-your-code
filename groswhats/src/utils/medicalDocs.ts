import type { Client, Language, MedicalDocument, MedicalDocKind, ShopSettings } from '../types'

export function medicalDocKindLabel(kind: MedicalDocKind, lang: Language): string {
  if (lang === 'ar') {
    if (kind === 'ordonnance') return 'وصفة طبية'
    if (kind === 'orientation') return 'رسالة توجيه'
    if (kind === 'certificat') return 'شهادة طبية'
    return 'تقرير'
  }
  if (kind === 'ordonnance') return 'Ordonnance'
  if (kind === 'orientation') return 'Lettre d’orientation'
  if (kind === 'certificat') return 'Certificat médical'
  return 'Compte-rendu'
}

export function buildMedicalDocumentText(
  settings: ShopSettings,
  client: Client,
  doc: Pick<MedicalDocument, 'kind' | 'title' | 'body' | 'createdAt'>,
): string {
  const lang = settings.language
  const date = new Date(doc.createdAt).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')
  const kind = medicalDocKindLabel(doc.kind, lang)
  const profile: string[] = []
  if (client.birthDate) {
    profile.push(lang === 'ar' ? `تاريخ الميلاد: ${client.birthDate}` : `Né(e) le : ${client.birthDate}`)
  }
  if (client.sex) {
    const sexLabel =
      lang === 'ar'
        ? client.sex === 'F'
          ? 'أنثى'
          : client.sex === 'M'
            ? 'ذكر'
            : '—'
        : client.sex === 'F'
          ? 'F'
          : client.sex === 'M'
            ? 'M'
            : '—'
    profile.push(lang === 'ar' ? `الجنس: ${sexLabel}` : `Sexe : ${sexLabel}`)
  }
  if (client.bloodGroup) {
    profile.push(lang === 'ar' ? `الزمرة: ${client.bloodGroup}` : `Groupe : ${client.bloodGroup}`)
  }
  if (client.allergies) {
    profile.push(lang === 'ar' ? `⚠ حساسية: ${client.allergies}` : `⚠ Allergies : ${client.allergies}`)
  }

  if (lang === 'ar') {
    return [
      settings.shopName,
      settings.city,
      settings.phone,
      '────────────────',
      kind,
      doc.title && doc.title !== kind ? doc.title : '',
      `التاريخ: ${date}`,
      `المريض: ${client.name}`,
      client.phone ? `هاتف: ${client.phone}` : '',
      ...profile,
      '────────────────',
      doc.body,
      '────────────────',
      'توقيع الطبيب',
      '',
    ]
      .filter((l) => l !== '')
      .join('\n')
  }

  return [
    settings.shopName.toUpperCase(),
    settings.city,
    settings.phone,
    '────────────────',
    kind.toUpperCase(),
    doc.title && doc.title !== kind ? doc.title : '',
    `Date : ${date}`,
    `Patient : ${client.name}`,
    client.phone ? `Tél. : ${client.phone}` : '',
    ...profile,
    '────────────────',
    doc.body,
    '────────────────',
    'Signature du médecin',
    '',
  ]
    .filter((l) => l !== '')
    .join('\n')
}

/** Impression document médical (iframe, comme le ticket). */
export function printMedicalText(text: string, title = 'Document'): void {
  const existing = document.getElementById('az-pos-print-frame')
  if (existing) existing.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'az-pos-print-frame'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    window.print()
    return
  }

  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  doc.open()
  doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title.replace(/</g, '')}</title>
  <style>
    @page { margin: 12mm; size: A5; }
    body {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 13px;
      line-height: 1.45;
      white-space: pre-wrap;
      color: #111;
    }
  </style>
</head>
<body>${safe}</body>
</html>`)
  doc.close()

  const run = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      window.print()
    }
  }
  setTimeout(run, 250)
}

export const ORDONNANCE_TEMPLATE_FR = `Rp/
1) 
2) 
3) 

Posologie / conseils :
`

export const ORDONNANCE_TEMPLATE_AR = `الوصفة:
1) 
2) 
3) 

الجرعة / نصائح:
`

export const ORIENTATION_TEMPLATE_FR = `Cher confrère / chère consœur,

Je vous adresse le (la) patient(e) pour avis / prise en charge :

Motif :
Antécédents utiles :
Examens déjà faits :

Avec mes remerciements,
`

export const ORIENTATION_TEMPLATE_AR = `الزميل المحترم،

أحيل إليكم المريض(ة) من أجل رأي / متابعة:

السبب:
سوابق مفيدة:
فحوصات سابقة:

مع الشكر،
`
