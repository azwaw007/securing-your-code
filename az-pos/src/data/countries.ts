import type { Language } from '../types'

export type Country = {
  code: string
  nameFr: string
  nameAr: string
  currency: string
  /** Prix catalogue DZ → monnaie locale */
  priceFactor: number
  phoneHint: string
  cityLabelFr: string
  cityLabelAr: string
  /** Langues de l’app pour ce pays (ordre = défaut en premier). */
  langs: Language[]
  popular?: boolean
}

export const COUNTRIES: Country[] = [
  { code: 'DZ', nameFr: 'Algérie', nameAr: 'الجزائر', currency: 'DA', priceFactor: 1, phoneHint: '0555 12 34 56', cityLabelFr: 'Wilaya', cityLabelAr: 'الولاية', langs: ['fr', 'ar', 'darja'], popular: true },
  { code: 'TN', nameFr: 'Tunisie', nameAr: 'تونس', currency: 'TND', priceFactor: 0.023, phoneHint: '20 123 456', cityLabelFr: 'Gouvernorat', cityLabelAr: 'الولاية', langs: ['fr', 'ar'], popular: true },
  { code: 'MA', nameFr: 'Maroc', nameAr: 'المغرب', currency: 'MAD', priceFactor: 0.075, phoneHint: '06 12 34 56 78', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr', 'ar', 'darja'], popular: true },
  { code: 'LY', nameFr: 'Libye', nameAr: 'ليبيا', currency: 'LYD', priceFactor: 0.036, phoneHint: '091 123 4567', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'] },
  { code: 'MR', nameFr: 'Mauritanie', nameAr: 'موريتانيا', currency: 'MRU', priceFactor: 0.3, phoneHint: '22 12 34 56', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'fr'] },
  { code: 'EG', nameFr: 'Égypte', nameAr: 'مصر', currency: 'EGP', priceFactor: 0.36, phoneHint: '010 1234 5678', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'], popular: true },
  { code: 'SN', nameFr: 'Sénégal', nameAr: 'السنغال', currency: 'F CFA', priceFactor: 4.5, phoneHint: '77 123 45 67', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr'] },
  { code: 'CI', nameFr: 'Côte d’Ivoire', nameAr: 'ساحل العاج', currency: 'F CFA', priceFactor: 4.5, phoneHint: '07 12 34 56 78', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr'] },
  { code: 'CM', nameFr: 'Cameroun', nameAr: 'الكاميرون', currency: 'F CFA', priceFactor: 4.5, phoneHint: '6 12 34 56 78', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr', 'en'] },
  { code: 'ML', nameFr: 'Mali', nameAr: 'مالي', currency: 'F CFA', priceFactor: 4.5, phoneHint: '76 12 34 56', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr'] },
  { code: 'BF', nameFr: 'Burkina Faso', nameAr: 'بوركينا فاسو', currency: 'F CFA', priceFactor: 4.5, phoneHint: '70 12 34 56', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr'] },
  { code: 'NE', nameFr: 'Niger', nameAr: 'النيجر', currency: 'F CFA', priceFactor: 4.5, phoneHint: '90 12 34 56', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr'] },
  { code: 'GN', nameFr: 'Guinée', nameAr: 'غينيا', currency: 'GNF', priceFactor: 65, phoneHint: '622 12 34 56', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr'] },
  { code: 'FR', nameFr: 'France', nameAr: 'فرنسا', currency: '€', priceFactor: 0.0069, phoneHint: '06 12 34 56 78', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr'], popular: true },
  { code: 'BE', nameFr: 'Belgique', nameAr: 'بلجيكا', currency: '€', priceFactor: 0.0069, phoneHint: '0470 12 34 56', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr', 'de', 'en'] },
  { code: 'CH', nameFr: 'Suisse', nameAr: 'سويسرا', currency: 'CHF', priceFactor: 0.0065, phoneHint: '079 123 45 67', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr', 'de', 'it'] },
  { code: 'ES', nameFr: 'Espagne', nameAr: 'إسبانيا', currency: '€', priceFactor: 0.0069, phoneHint: '612 34 56 78', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['es'] },
  { code: 'IT', nameFr: 'Italie', nameAr: 'إيطاليا', currency: '€', priceFactor: 0.0069, phoneHint: '312 345 6789', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['it'] },
  { code: 'DE', nameFr: 'Allemagne', nameAr: 'ألمانيا', currency: '€', priceFactor: 0.0069, phoneHint: '0151 12345678', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['de'] },
  { code: 'GB', nameFr: 'Royaume-Uni', nameAr: 'بريطانيا', currency: '£', priceFactor: 0.0059, phoneHint: '07700 900123', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['en'] },
  { code: 'SA', nameFr: 'Arabie saoudite', nameAr: 'السعودية', currency: 'SAR', priceFactor: 0.028, phoneHint: '05 1234 5678', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'], popular: true },
  { code: 'AE', nameFr: 'Émirats', nameAr: 'الإمارات', currency: 'AED', priceFactor: 0.027, phoneHint: '050 123 4567', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'], popular: true },
  { code: 'QA', nameFr: 'Qatar', nameAr: 'قطر', currency: 'QAR', priceFactor: 0.027, phoneHint: '3312 3456', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'] },
  { code: 'KW', nameFr: 'Koweït', nameAr: 'الكويت', currency: 'KWD', priceFactor: 0.0023, phoneHint: '5000 1234', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'] },
  { code: 'BH', nameFr: 'Bahreïn', nameAr: 'البحرين', currency: 'BHD', priceFactor: 0.0028, phoneHint: '3600 1234', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'] },
  { code: 'OM', nameFr: 'Oman', nameAr: 'عُمان', currency: 'OMR', priceFactor: 0.0028, phoneHint: '9123 4567', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'] },
  { code: 'JO', nameFr: 'Jordanie', nameAr: 'الأردن', currency: 'JOD', priceFactor: 0.0052, phoneHint: '079 123 4567', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'en'] },
  { code: 'LB', nameFr: 'Liban', nameAr: 'لبنان', currency: 'LBP', priceFactor: 650, phoneHint: '03 123 456', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['ar', 'fr', 'en'] },
  { code: 'TR', nameFr: 'Turquie', nameAr: 'تركيا', currency: 'TRY', priceFactor: 0.25, phoneHint: '0532 123 45 67', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['tr'] },
  { code: 'US', nameFr: 'États-Unis', nameAr: 'الولايات المتحدة', currency: 'USD', priceFactor: 0.0075, phoneHint: '(555) 123-4567', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['en', 'es'] },
  { code: 'CA', nameFr: 'Canada', nameAr: 'كندا', currency: 'CAD', priceFactor: 0.01, phoneHint: '(514) 555-0123', cityLabelFr: 'Ville', cityLabelAr: 'المدينة', langs: ['fr', 'en'] },
]

export function countryByCode(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]
}

export function convertPriceDa(priceDa: number, factor: number): number {
  const n = priceDa * factor
  if (n >= 100) return Math.round(n / 5) * 5
  if (n >= 10) return Math.round(n)
  if (n >= 1) return Math.round(n * 10) / 10
  return Math.round(n * 100) / 100
}
