import type { CommerceMode, Language } from '../types'
import type { DomainVocab, ShopDomain } from '../data/domains'
import { countryByCode } from '../data/countries'
import { domainById } from '../data/domains'
import { isRtl } from './langs'

const VOCAB: Record<
  CommerceMode,
  Record<'fr' | 'ar' | 'en' | 'es' | 'tr' | 'it' | 'de', DomainVocab>
> = {
  gros: {
    fr: { client: 'Client', product: 'Stock', sell: 'Commande', sellHint: 'Carton, tarif, livraison' },
    ar: { client: 'زبون', product: 'مخزون', sell: 'طلب', sellHint: 'كرتون، سعر، توصيل' },
    en: { client: 'Customer', product: 'Stock', sell: 'Order', sellHint: 'Carton, price, delivery' },
    es: { client: 'Cliente', product: 'Stock', sell: 'Pedido', sellHint: 'Caja, tarifa, entrega' },
    tr: { client: 'Müşteri', product: 'Stok', sell: 'Sipariş', sellHint: 'Koli, fiyat, teslimat' },
    it: { client: 'Cliente', product: 'Scorte', sell: 'Ordine', sellHint: 'Cartone, tariffa, consegna' },
    de: { client: 'Kunde', product: 'Lager', sell: 'Auftrag', sellHint: 'Karton, Preis, Lieferung' },
  },
  detail: {
    fr: { client: 'Client', product: 'Rayon', sell: 'Caisse', sellHint: 'Scanner et encaisser' },
    ar: { client: 'زبون', product: 'رف', sell: 'صندوق', sellHint: 'مسح ودفع' },
    en: { client: 'Customer', product: 'Shelf', sell: 'Till', sellHint: 'Scan and take payment' },
    es: { client: 'Cliente', product: 'Estante', sell: 'Caja', sellHint: 'Escanear y cobrar' },
    tr: { client: 'Müşteri', product: 'Reyon', sell: 'Kasa', sellHint: 'Okut ve tahsil et' },
    it: { client: 'Cliente', product: 'Scaffale', sell: 'Cassa', sellHint: 'Scansiona e incassa' },
    de: { client: 'Kunde', product: 'Regal', sell: 'Kasse', sellHint: 'Scannen und kassieren' },
  },
  sante: {
    fr: { client: 'Patient', product: 'Acte', sell: 'Encaisser', sellHint: 'Acte + paiement' },
    ar: { client: 'مريض', product: 'عمل', sell: 'تحصيل', sellHint: 'عمل طبي + دفع' },
    en: { client: 'Patient', product: 'Procedure', sell: 'Charge', sellHint: 'Act + payment' },
    es: { client: 'Paciente', product: 'Acto', sell: 'Cobrar', sellHint: 'Acto + pago' },
    tr: { client: 'Hasta', product: 'İşlem', sell: 'Tahsil', sellHint: 'İşlem + ödeme' },
    it: { client: 'Paziente', product: 'Prestazione', sell: 'Incassa', sellHint: 'Atto + pagamento' },
    de: { client: 'Patient', product: 'Leistung', sell: 'Kasse', sellHint: 'Leistung + Zahlung' },
  },
  auto: {
    fr: { client: 'Client', product: 'Véhicule / service', sell: 'Facturer', sellHint: 'Location, vente ou réparation' },
    ar: { client: 'زبون', product: 'مركبة / خدمة', sell: 'فوترة', sellHint: 'كراء أو بيع أو تصليح' },
    en: { client: 'Customer', product: 'Vehicle / service', sell: 'Invoice', sellHint: 'Rent, sell or repair' },
    es: { client: 'Cliente', product: 'Vehículo / servicio', sell: 'Facturar', sellHint: 'Alquiler, venta o taller' },
    tr: { client: 'Müşteri', product: 'Araç / hizmet', sell: 'Faturala', sellHint: 'Kiralama, satış, tamir' },
    it: { client: 'Cliente', product: 'Veicolo / servizio', sell: 'Fattura', sellHint: 'Noleggio, vendita o officina' },
    de: { client: 'Kunde', product: 'Fahrzeug / Service', sell: 'Berechnen', sellHint: 'Miete, Verkauf oder Werkstatt' },
  },
  services: {
    fr: { client: 'Client', product: 'Prestation', sell: 'Facturer', sellHint: 'Encaisser une prestation' },
    ar: { client: 'زبون', product: 'خدمة', sell: 'فوترة', sellHint: 'تحصيل الخدمة' },
    en: { client: 'Client', product: 'Service', sell: 'Invoice', sellHint: 'Charge a service' },
    es: { client: 'Cliente', product: 'Servicio', sell: 'Facturar', sellHint: 'Cobrar un servicio' },
    tr: { client: 'Müşteri', product: 'Hizmet', sell: 'Faturala', sellHint: 'Hizmet tahsil et' },
    it: { client: 'Cliente', product: 'Servizio', sell: 'Fattura', sellHint: 'Incassa un servizio' },
    de: { client: 'Kunde', product: 'Leistung', sell: 'Berechnen', sellHint: 'Leistung kassieren' },
  },
}

export function vocabLang(lang: Language): keyof (typeof VOCAB)['gros'] {
  if (lang === 'ar') return 'ar'
  if (lang === 'en' || lang === 'es' || lang === 'tr' || lang === 'it' || lang === 'de') {
    return lang
  }
  return 'fr'
}

export function shopVocab(mode: CommerceMode | undefined, lang: Language): DomainVocab {
  return VOCAB[mode || 'gros'][vocabLang(lang)]
}

export function domainVocab(domain: ShopDomain, lang: Language): DomainVocab {
  return shopVocab(domain.mode, lang)
}

export function isWholesale(mode: CommerceMode | undefined): boolean {
  return (mode || 'gros') === 'gros'
}

export function isShopRetail(mode: CommerceMode | undefined): boolean {
  return mode === 'detail'
}

export function showWholesaleTiers(mode: CommerceMode | undefined): boolean {
  return isWholesale(mode)
}

export function showDemiGros(mode: CommerceMode | undefined): boolean {
  return isWholesale(mode)
}

/** Livraison, arrivages, commandes dépôt — pas une boutique. */
export function showDepotTools(mode: CommerceMode | undefined): boolean {
  return isWholesale(mode)
}

/** Santé / auto / services : on facture une personne, pas un passage anonyme. */
export function preferClientOnSale(mode: CommerceMode | undefined): boolean {
  return mode === 'sante' || mode === 'auto' || mode === 'services'
}

export function showHomeScan(mode: CommerceMode | undefined): boolean {
  return mode === 'gros' || mode === 'detail' || mode === 'auto'
}

/** Agenda RDV + rappels WhatsApp (médecins / cliniques). */
export function showClinicAgenda(mode: CommerceMode | undefined): boolean {
  return mode === 'sante'
}

export function showReturns(mode: CommerceMode | undefined): boolean {
  return mode === 'gros' || mode === 'detail' || mode === 'auto'
}

export function showGallery(mode: CommerceMode | undefined): boolean {
  return mode === 'gros' || mode === 'detail'
}

export function defaultZakatOn(countryCode: string): boolean {
  return ['DZ', 'SA', 'AE', 'EG', 'MA', 'TN', 'LY', 'MR', 'QA', 'KW', 'BH', 'OM', 'JO'].includes(
    countryCode.toUpperCase(),
  )
}

export function countryDisplayName(code: string, lang: Language): string {
  const c = countryByCode(code)
  return isRtl(lang) ? c.nameAr : c.nameFr
}

export function cityLabel(code: string, lang: Language): string {
  const c = countryByCode(code)
  return isRtl(lang) ? c.cityLabelAr : c.cityLabelFr
}

export function cashChipsFor(countryCode: string): number[] {
  const cur = countryByCode(countryCode).currency
  if (['€', '£', 'CHF', 'USD', 'CAD', 'TND', 'MAD', 'LYD', 'SAR', 'AED'].includes(cur)) {
    return [5, 10, 20, 50, 100]
  }
  if (cur === 'F CFA' || cur === 'GNF' || cur === 'LBP') {
    return [500, 1000, 2000, 5000, 10000]
  }
  return [500, 1000, 2000, 5000, 10000]
}

export function numberLocale(lang: Language, countryCode: string): string {
  const c = countryCode.toUpperCase()
  if (lang === 'ar') {
    if (c === 'SA' || c === 'AE' || c === 'EG') return 'ar-SA'
    return 'ar-DZ'
  }
  if (lang === 'en') return c === 'US' ? 'en-US' : 'en-GB'
  if (lang === 'es') return 'es-ES'
  if (lang === 'tr') return 'tr-TR'
  if (lang === 'it') return 'it-IT'
  if (lang === 'de') return 'de-DE'
  if (c === 'FR' || c === 'BE' || c === 'CH') return 'fr-FR'
  return 'fr-DZ'
}

export function activeDomain(domainId?: string): ShopDomain {
  return domainById(domainId || 'gros-alimentaire')
}
