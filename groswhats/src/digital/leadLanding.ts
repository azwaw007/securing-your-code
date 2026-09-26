/**
 * Landing page e-com + leads (formulaire) — wilayas, COD, paiements pays.
 */
import { WILAYAS } from '../data/wilayas'
import { paymentsForCountry, type CountryPaymentId } from './countryPayments'

export type LeadLandingConfig = {
  titleFr: string
  titleAr: string
  subtitleFr: string
  subtitleAr: string
  productName: string
  priceDa: number
  currency: string
  countryCode: string
  /** Méthodes activées (ids) — défaut = toutes du pays */
  enabledPayments: CountryPaymentId[]
  whatsapp: string
  /** Inclure les 69 wilayas (DZ) dans le formulaire */
  useWilayas: boolean
  /** COD activé */
  codEnabled: boolean
  brandName: string
  updatedAt: string
}

export type LandingLead = {
  id: string
  name: string
  phone: string
  wilaya: string
  wilayaCode: string
  address: string
  qty: number
  paymentId: string
  paymentLabel: string
  productName: string
  priceDa: number
  note: string
  status: 'new' | 'contacted' | 'confirmed' | 'cancelled'
  createdAt: string
  source: 'landing' | 'preview'
}

const CFG_KEY = 'az-lead-landing-cfg-v1'
const LEADS_KEY = 'az-lead-landing-leads-v1'

export function defaultLandingConfig(partial?: Partial<LeadLandingConfig>): LeadLandingConfig {
  const country = partial?.countryCode || 'DZ'
  const pays = paymentsForCountry(country)
  return {
    titleFr: 'Commandez maintenant',
    titleAr: 'اطلب الآن',
    subtitleFr: 'Livraison 69 wilayas · paiement à la livraison disponible',
    subtitleAr: 'توصيل 69 ولاية · الدفع عند الاستلام متاح',
    productName: partial?.productName || 'Mon produit',
    priceDa: partial?.priceDa ?? 4900,
    currency: partial?.currency || 'DA',
    countryCode: country,
    enabledPayments:
      partial?.enabledPayments ||
      (pays.map((p) => p.id) as CountryPaymentId[]),
    whatsapp: partial?.whatsapp || '',
    useWilayas: partial?.useWilayas ?? country === 'DZ',
    codEnabled: partial?.codEnabled ?? true,
    brandName: partial?.brandName || 'Ma boutique',
    updatedAt: new Date().toISOString(),
  }
}

export function loadLandingConfig(): LeadLandingConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (!raw) return defaultLandingConfig()
    return { ...defaultLandingConfig(), ...JSON.parse(raw) }
  } catch {
    return defaultLandingConfig()
  }
}

export function saveLandingConfig(patch: Partial<LeadLandingConfig>): LeadLandingConfig {
  const next = {
    ...loadLandingConfig(),
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(CFG_KEY, JSON.stringify(next))
  return next
}

export function loadLeads(): LandingLead[] {
  try {
    const raw = localStorage.getItem(LEADS_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as LandingLead[]
    return Array.isArray(list) ? list.slice(0, 500) : []
  } catch {
    return []
  }
}

export function saveLeads(list: LandingLead[]): void {
  localStorage.setItem(LEADS_KEY, JSON.stringify(list.slice(0, 500)))
}

export function addLead(
  input: Omit<LandingLead, 'id' | 'createdAt' | 'status'> & {
    status?: LandingLead['status']
  },
): LandingLead {
  const lead: LandingLead = {
    id: `lead_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: input.status || 'new',
    name: input.name.trim(),
    phone: input.phone.trim(),
    wilaya: input.wilaya.trim(),
    wilayaCode: input.wilayaCode.trim(),
    address: input.address.trim(),
    qty: Math.max(1, input.qty || 1),
    paymentId: input.paymentId,
    paymentLabel: input.paymentLabel,
    productName: input.productName,
    priceDa: input.priceDa,
    note: input.note?.trim() || '',
    source: input.source,
  }
  saveLeads([lead, ...loadLeads()])
  return lead
}

export function updateLeadStatus(
  id: string,
  status: LandingLead['status'],
): void {
  saveLeads(loadLeads().map((l) => (l.id === id ? { ...l, status } : l)))
}

/** 69 entrées (58 wilayas + villes carte) — pour formulaire DZ */
export function wilayasForForm(): typeof WILAYAS {
  return WILAYAS
}

export function buildWhatsappOrderMessage(
  lead: Pick<
    LandingLead,
    'name' | 'phone' | 'wilaya' | 'address' | 'qty' | 'paymentLabel' | 'productName' | 'priceDa'
  >,
  lang: 'fr' | 'ar',
): string {
  if (lang === 'ar') {
    return [
      `طلب جديد — ${lead.productName}`,
      `الاسم: ${lead.name}`,
      `الهاتف: ${lead.phone}`,
      `الولاية: ${lead.wilaya}`,
      `العنوان: ${lead.address || '—'}`,
      `الكمية: ${lead.qty}`,
      `الدفع: ${lead.paymentLabel}`,
      `السعر: ${lead.priceDa} دج`,
    ].join('\n')
  }
  return [
    `Nouvelle commande — ${lead.productName}`,
    `Nom : ${lead.name}`,
    `Tél : ${lead.phone}`,
    `Wilaya : ${lead.wilaya}`,
    `Adresse : ${lead.address || '—'}`,
    `Qté : ${lead.qty}`,
    `Paiement : ${lead.paymentLabel}`,
    `Prix : ${lead.priceDa} DA`,
  ].join('\n')
}

/** HTML autonome exportable (landing + formulaire) */
export function exportLandingHtml(cfg: LeadLandingConfig, lang: 'fr' | 'ar'): string {
  const pays = paymentsForCountry(cfg.countryCode).filter(
    (p) =>
      cfg.enabledPayments.includes(p.id) &&
      (cfg.codEnabled || p.id !== 'cod'),
  )
  const wilayas = cfg.useWilayas
    ? WILAYAS.map(
        (w) =>
          `<option value="${w.code}">${w.code} · ${lang === 'ar' ? w.nameAr : w.name}</option>`,
      ).join('\n')
    : ''
  const payOpts = pays
    .map(
      (p) =>
        `<option value="${p.id}">${p.icon} ${lang === 'ar' ? p.labelAr : p.labelFr}</option>`,
    )
    .join('\n')
  const title = lang === 'ar' ? cfg.titleAr : cfg.titleFr
  const sub = lang === 'ar' ? cfg.subtitleAr : cfg.subtitleFr
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const wa = cfg.whatsapp.replace(/\D/g, '')

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(cfg.brandName)} — ${escapeHtml(title)}</title>
<style>
:root{--bg:#0c1a24;--card:#132533;--ink:#e8f4fc;--muted:#8bb0c4;--brand:#0ea5e9;--line:#1e3a4a}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(165deg,#0c1a24,#123044);color:var(--ink);min-height:100vh}
.wrap{max-width:520px;margin:0 auto;padding:24px 16px 48px}
.hero{text-align:center;margin-bottom:24px}
.brand{font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:var(--brand);margin:0 0 8px}
h1{font-size:1.75rem;margin:0 0 8px;line-height:1.2}
.sub{color:var(--muted);margin:0 0 16px}
.price{font-size:1.6rem;font-weight:700;color:#7dd3fc}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
label{display:block;margin:12px 0 4px;font-size:.85rem;color:var(--muted)}
input,select,textarea{width:100%;padding:12px;border-radius:10px;border:1px solid var(--line);background:#0a1620;color:var(--ink);font:inherit}
button{width:100%;margin-top:18px;padding:14px;border:0;border-radius:12px;background:var(--brand);color:#042f3a;font-weight:700;font-size:1rem;cursor:pointer}
.ok{margin-top:12px;color:#86efac;display:none}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <p class="brand">${escapeHtml(cfg.brandName)}</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="sub">${escapeHtml(sub)}</p>
    <p class="price">${escapeHtml(cfg.productName)} — ${cfg.priceDa} ${escapeHtml(cfg.currency)}</p>
  </header>
  <form class="card" id="leadForm">
    <label>${lang === 'ar' ? 'الاسم الكامل' : 'Nom complet'}</label>
    <input name="name" required autocomplete="name"/>
    <label>${lang === 'ar' ? 'الهاتف / واتساب' : 'Téléphone / WhatsApp'}</label>
    <input name="phone" required inputmode="tel" autocomplete="tel"/>
    ${
      cfg.useWilayas
        ? `<label>${lang === 'ar' ? 'الولاية (69)' : 'Wilaya (69)'}</label>
    <select name="wilaya" required>
      <option value="">${lang === 'ar' ? 'اختر الولاية' : 'Choisir la wilaya'}</option>
      ${wilayas}
    </select>`
        : `<label>${lang === 'ar' ? 'المدينة' : 'Ville'}</label>
    <input name="wilaya" required/>`
    }
    <label>${lang === 'ar' ? 'العنوان' : 'Adresse'}</label>
    <textarea name="address" rows="2"></textarea>
    <label>${lang === 'ar' ? 'الكمية' : 'Quantité'}</label>
    <input name="qty" type="number" min="1" value="1" required/>
    <label>${lang === 'ar' ? 'طريقة الدفع' : 'Paiement'}</label>
    <select name="payment" required>
      ${payOpts}
    </select>
    <label>${lang === 'ar' ? 'ملاحظة' : 'Note'}</label>
    <textarea name="note" rows="2"></textarea>
    <button type="submit">${lang === 'ar' ? 'تأكيد الطلب' : 'Confirmer la commande'}</button>
    <p class="ok" id="ok">${lang === 'ar' ? 'تم إرسال الطلب' : 'Commande envoyée'}</p>
  </form>
</div>
<script>
const WA=${JSON.stringify(wa)};
const PRODUCT=${JSON.stringify(cfg.productName)};
const PRICE=${cfg.priceDa};
const LANG=${JSON.stringify(lang)};
document.getElementById('leadForm').addEventListener('submit',function(e){
  e.preventDefault();
  var fd=new FormData(e.target);
  var name=fd.get('name');
  var phone=String(fd.get('phone')||'');
  var wilaya=fd.get('wilaya');
  var address=fd.get('address')||'';
  var qty=fd.get('qty')||1;
  var payment=fd.get('payment');
  var note=fd.get('note')||'';
  var payLabel=e.target.payment.options[e.target.payment.selectedIndex].text;
  var wilayaLabel=e.target.wilaya.tagName==='SELECT'
    ? e.target.wilaya.options[e.target.wilaya.selectedIndex].text
    : wilaya;
  var msg=LANG==='ar'
    ? ('طلب جديد — '+PRODUCT+'\\nالاسم: '+name+'\\nالهاتف: '+phone+'\\nالولاية: '+wilayaLabel+'\\nالعنوان: '+address+'\\nالكمية: '+qty+'\\nالدفع: '+payLabel+'\\nالسعر: '+PRICE+'\\n'+note)
    : ('Nouvelle commande — '+PRODUCT+'\\nNom: '+name+'\\nTél: '+phone+'\\nWilaya: '+wilayaLabel+'\\nAdresse: '+address+'\\nQté: '+qty+'\\nPaiement: '+payLabel+'\\nPrix: '+PRICE+'\\n'+note);
  document.getElementById('ok').style.display='block';
  if(WA){
    window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');
  } else {
    try{navigator.clipboard.writeText(msg)}catch(err){}
    alert(msg);
  }
});
</script>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
