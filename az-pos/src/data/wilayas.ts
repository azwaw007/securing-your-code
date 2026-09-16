/** Wilayas d’Algérie (centres approx. pour cadrer la carte). */

export interface Wilaya {
  code: string
  name: string
  nameAr: string
  lat: number
  lng: number
  zoom: number
}

export const WILAYAS: Wilaya[] = [
  { code: '01', name: 'Adrar', nameAr: 'أدرار', lat: 27.8742, lng: -0.2939, zoom: 9 },
  { code: '02', name: 'Chlef', nameAr: 'الشلف', lat: 36.1654, lng: 1.3345, zoom: 10 },
  { code: '03', name: 'Laghouat', nameAr: 'الأغواط', lat: 33.8, lng: 2.8651, zoom: 10 },
  { code: '04', name: 'Oum El Bouaghi', nameAr: 'أم البواقي', lat: 35.8754, lng: 7.1135, zoom: 10 },
  { code: '05', name: 'Batna', nameAr: 'باتنة', lat: 35.5559, lng: 6.1741, zoom: 10 },
  { code: '06', name: 'Béjaïa', nameAr: 'بجاية', lat: 36.7509, lng: 5.0567, zoom: 10 },
  { code: '07', name: 'Biskra', nameAr: 'بسكرة', lat: 34.8516, lng: 5.7282, zoom: 10 },
  { code: '08', name: 'Béchar', nameAr: 'بشار', lat: 31.6167, lng: -2.2167, zoom: 9 },
  { code: '09', name: 'Blida', nameAr: 'البليدة', lat: 36.47, lng: 2.8277, zoom: 11 },
  { code: '10', name: 'Bouira', nameAr: 'البويرة', lat: 36.3743, lng: 3.9014, zoom: 10 },
  { code: '11', name: 'Tamanrasset', nameAr: 'تمنراست', lat: 22.785, lng: 5.5228, zoom: 8 },
  { code: '12', name: 'Tébessa', nameAr: 'تبسة', lat: 35.4042, lng: 8.1242, zoom: 10 },
  { code: '13', name: 'Tlemcen', nameAr: 'تلمسان', lat: 34.8783, lng: -1.315, zoom: 10 },
  { code: '14', name: 'Tiaret', nameAr: 'تيارت', lat: 35.371, lng: 1.317, zoom: 10 },
  { code: '15', name: 'Tizi Ouzou', nameAr: 'تيزي وزو', lat: 36.7118, lng: 4.0459, zoom: 10 },
  { code: '16', name: 'Alger', nameAr: 'الجزائر', lat: 36.7538, lng: 3.0588, zoom: 11 },
  { code: '17', name: 'Djelfa', nameAr: 'الجلفة', lat: 34.6703, lng: 3.2505, zoom: 9 },
  { code: '18', name: 'Jijel', nameAr: 'جيجل', lat: 36.8206, lng: 5.7665, zoom: 10 },
  { code: '19', name: 'Sétif', nameAr: 'سطيف', lat: 36.1905, lng: 5.4138, zoom: 10 },
  { code: '20', name: 'Saïda', nameAr: 'سعيدة', lat: 34.8303, lng: 0.1517, zoom: 10 },
  { code: '21', name: 'Skikda', nameAr: 'سكيكدة', lat: 36.8762, lng: 6.9092, zoom: 10 },
  { code: '22', name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', lat: 35.1899, lng: -0.6308, zoom: 10 },
  { code: '23', name: 'Annaba', nameAr: 'عنابة', lat: 36.9, lng: 7.7667, zoom: 11 },
  { code: '24', name: 'Guelma', nameAr: 'قالمة', lat: 36.4621, lng: 7.4261, zoom: 10 },
  { code: '25', name: 'Constantine', nameAr: 'قسنطينة', lat: 36.365, lng: 6.6147, zoom: 11 },
  { code: '26', name: 'Médéa', nameAr: 'المدية', lat: 36.2642, lng: 2.7539, zoom: 10 },
  { code: '27', name: 'Mostaganem', nameAr: 'مستغانم', lat: 35.9311, lng: 0.0892, zoom: 10 },
  { code: '28', name: 'M’Sila', nameAr: 'المسيلة', lat: 35.7058, lng: 4.5417, zoom: 10 },
  { code: '29', name: 'Mascara', nameAr: 'معسكر', lat: 35.3968, lng: 0.1403, zoom: 10 },
  { code: '30', name: 'Ouargla', nameAr: 'ورقلة', lat: 31.9525, lng: 5.3333, zoom: 9 },
  { code: '31', name: 'Oran', nameAr: 'وهران', lat: 35.6971, lng: -0.6308, zoom: 11 },
  { code: '32', name: 'El Bayadh', nameAr: 'البيض', lat: 33.6831, lng: 1.0193, zoom: 9 },
  { code: '33', name: 'Illizi', nameAr: 'إليزي', lat: 26.508, lng: 8.482, zoom: 8 },
  { code: '34', name: 'Bordj Bou Arreridj', nameAr: 'برج بوعريريج', lat: 36.073, lng: 4.761, zoom: 10 },
  { code: '35', name: 'Boumerdès', nameAr: 'بومرداس', lat: 36.7664, lng: 3.4772, zoom: 11 },
  { code: '36', name: 'El Tarf', nameAr: 'الطارف', lat: 36.7672, lng: 8.3136, zoom: 10 },
  { code: '37', name: 'Tindouf', nameAr: 'تندوف', lat: 27.6711, lng: -8.1478, zoom: 8 },
  { code: '38', name: 'Tissemsilt', nameAr: 'تيسمسيلت', lat: 35.6072, lng: 1.8108, zoom: 10 },
  { code: '39', name: 'El Oued', nameAr: 'الوادي', lat: 33.3683, lng: 6.8674, zoom: 9 },
  { code: '40', name: 'Khenchela', nameAr: 'خنشلة', lat: 35.4358, lng: 7.1433, zoom: 10 },
  { code: '41', name: 'Souk Ahras', nameAr: 'سوق أهراس', lat: 36.2864, lng: 7.9511, zoom: 10 },
  { code: '42', name: 'Tipaza', nameAr: 'تيبازة', lat: 36.5897, lng: 2.4478, zoom: 11 },
  { code: '43', name: 'Mila', nameAr: 'ميلة', lat: 36.4503, lng: 6.2644, zoom: 10 },
  { code: '44', name: 'Aïn Defla', nameAr: 'عين الدفلى', lat: 36.2641, lng: 1.9679, zoom: 10 },
  { code: '45', name: 'Naâma', nameAr: 'النعامة', lat: 33.2667, lng: -0.3167, zoom: 9 },
  { code: '46', name: 'Aïn Témouchent', nameAr: 'عين تموشنت', lat: 35.2975, lng: -1.1404, zoom: 10 },
  { code: '47', name: 'Ghardaïa', nameAr: 'غرداية', lat: 32.4902, lng: 3.6736, zoom: 10 },
  { code: '48', name: 'Relizane', nameAr: 'غليزان', lat: 35.7373, lng: 0.5559, zoom: 10 },
  { code: '49', name: 'Timimoun', nameAr: 'تيميمون', lat: 29.258, lng: 0.233, zoom: 9 },
  { code: '50', name: 'Bordj Badji Mokhtar', nameAr: 'برج باجي مختار', lat: 21.329, lng: 0.954, zoom: 8 },
  { code: '51', name: 'Ouled Djellal', nameAr: 'أولاد جلال', lat: 34.425, lng: 5.075, zoom: 10 },
  { code: '52', name: 'Béni Abbès', nameAr: 'بني عباس', lat: 30.131, lng: -2.166, zoom: 9 },
  { code: '53', name: 'In Salah', nameAr: 'عين صالح', lat: 27.193, lng: 2.46, zoom: 8 },
  { code: '54', name: 'In Guezzam', nameAr: 'عين قزام', lat: 19.572, lng: 5.769, zoom: 8 },
  { code: '55', name: 'Touggourt', nameAr: 'تقرت', lat: 33.107, lng: 6.058, zoom: 10 },
  { code: '56', name: 'Djanet', nameAr: 'جانت', lat: 24.555, lng: 9.482, zoom: 8 },
  { code: '57', name: 'El M’Ghair', nameAr: 'المغير', lat: 33.951, lng: 5.924, zoom: 10 },
  { code: '58', name: 'El Meniaa', nameAr: 'المنيعة', lat: 30.579, lng: 2.884, zoom: 9 },
  { code: '59', name: 'Aflou', nameAr: 'أفلو', lat: 34.1127, lng: 2.1022, zoom: 10 },
  { code: '60', name: 'Barika', nameAr: 'بريكة', lat: 35.389, lng: 5.3658, zoom: 10 },
  { code: '61', name: 'El Kantara', nameAr: 'القنطرة', lat: 35.225, lng: 5.707, zoom: 10 },
  { code: '62', name: 'Bir El Ater', nameAr: 'بئر العاتر', lat: 34.744, lng: 8.058, zoom: 10 },
  { code: '63', name: 'El Aricha', nameAr: 'العريشة', lat: 34.225, lng: -1.0, zoom: 10 },
  { code: '64', name: 'Ksar Chellala', nameAr: 'قصر الشلالة', lat: 35.17, lng: 2.317, zoom: 10 },
  { code: '65', name: 'Aïn Oussara', nameAr: 'عين وسارة', lat: 35.451, lng: 2.906, zoom: 10 },
  { code: '66', name: 'Messaad', nameAr: 'مسعد', lat: 34.154, lng: 3.496, zoom: 10 },
  { code: '67', name: 'Ksar El Boukhari', nameAr: 'قصر البخاري', lat: 35.887, lng: 2.751, zoom: 10 },
  { code: '68', name: 'Bou Saâda', nameAr: 'بوسعادة', lat: 35.213, lng: 4.174, zoom: 10 },
  { code: '69', name: 'El Abiodh Sidi Cheikh', nameAr: 'الأبيض سيدي الشيخ', lat: 32.893, lng: 0.548, zoom: 10 },
]

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const ALIASES: Record<string, string> = {
  alger: '16',
  algeria: '16',
  algiers: '16',
  oran: '31',
  wahran: '31',
  constantine: '25',
  qacentina: '25',
  setif: '19',
  bejaia: '06',
  bougie: '06',
  blida: '09',
  boumerdes: '35',
  boumerd: '35',
  tipaza: '42',
  tipasa: '42',
  tizi: '15',
  'tizi ouzou': '15',
  annaba: '23',
  bone: '23',
  aflou: '59',
  barika: '60',
  brika: '60',
  'el kantara': '61',
  kantara: '61',
  qantara: '61',
  'bir el ater': '62',
  'bir ater': '62',
  'el aricha': '63',
  aricha: '63',
  'ksar chellala': '64',
  chellala: '64',
  'ain oussara': '65',
  oussara: '65',
  messaad: '66',
  'ksar el boukhari': '67',
  boukhari: '67',
  'bou saada': '68',
  bousaada: '68',
  'el abiodh': '69',
  'sidi cheikh': '69',
  abiodh: '69',
}

export function matchWilayaCode(city: string): string | null {
  const f = fold(city)
  if (!f) return null
  if (ALIASES[f]) return ALIASES[f]
  for (const [alias, code] of Object.entries(ALIASES)) {
    if (f.includes(alias)) return code
  }
  for (const w of WILAYAS) {
    const n = fold(w.name)
    const a = fold(w.nameAr)
    if (f === n || f === a || f.includes(n) || n.includes(f)) return w.code
    if (a && (f.includes(a) || a.includes(f))) return w.code
  }
  return null
}

export function wilayaByCode(code: string): Wilaya | undefined {
  return WILAYAS.find((w) => w.code === code)
}

/** 58 wilayas officielles (les codes 59+ sont des villes pour la carte). */
export const OFFICIAL_WILAYAS: Wilaya[] = WILAYAS.filter((w) => Number(w.code) <= 58)
