import type { CommerceMode, Language } from '../types'

export type DomainVocab = {
  client: string
  product: string
  sell: string
  sellHint: string
}

export type ShopDomain = {
  id: string
  mode: CommerceMode
  icon: string
  nameFr: string
  nameAr: string
  catalog: string
  vocab: { fr: DomainVocab; ar: DomainVocab }
}

const POS = {
  fr: { client: 'Client', product: 'Produit', sell: 'Vendre', sellHint: 'Caisse et ticket' },
  ar: { client: 'زبون', product: 'منتج', sell: 'بيع', sellHint: 'صندوق وتذكرة' },
}
const SVC = {
  fr: { client: 'Client', product: 'Prestation', sell: 'Facturer', sellHint: 'Encaisser une prestation' },
  ar: { client: 'زبون', product: 'خدمة', sell: 'فوترة', sellHint: 'تحصيل الخدمة' },
}
const MED = {
  fr: { client: 'Patient', product: 'Acte', sell: 'Encaisser', sellHint: 'Acte + paiement' },
  ar: { client: 'مريض', product: 'عمل', sell: 'تحصيل', sellHint: 'عمل طبي + دفع' },
}
const CAR = {
  fr: { client: 'Client', product: 'Véhicule / service', sell: 'Facturer', sellHint: 'Location ou réparation' },
  ar: { client: 'زبون', product: 'مركبة / خدمة', sell: 'فوترة', sellHint: 'كراء أو تصليح' },
}

function d(
  id: string,
  mode: CommerceMode,
  icon: string,
  nameFr: string,
  nameAr: string,
  catalog: string,
  vocab: ShopDomain['vocab'] = POS,
): ShopDomain {
  return { id, mode, icon, nameFr, nameAr, catalog, vocab }
}

export const COMMERCE_MODES: Array<{
  id: CommerceMode
  icon: string
  nameFr: string
  nameAr: string
  hintFr: string
  hintAr: string
}> = [
  { id: 'gros', icon: '📦', nameFr: 'Gros', nameAr: 'جملة', hintFr: 'Dépôt, carton, livraisons', hintAr: 'مستودع، كرتون، توصيل' },
  { id: 'detail', icon: '🛒', nameFr: 'Détail', nameAr: 'تجزئة', hintFr: 'Boutique, superette, caisse', hintAr: 'محل، سوبرات، صندوق' },
  { id: 'sante', icon: '🩺', nameFr: 'Santé', nameAr: 'صحة', hintFr: 'Cabinet, clinique, labo', hintAr: 'عيادة، مصحة، مخبر' },
  { id: 'auto', icon: '🚗', nameFr: 'Auto', nameAr: 'سيارات', hintFr: 'Location, garage, pièces', hintAr: 'كراء، ورشة، قطع' },
  {
    id: 'services',
    icon: '🧰',
    nameFr: 'Services',
    nameAr: 'خدمات',
    hintFr: 'Prestations, rendez-vous, facturation',
    hintAr: 'خدمات، مواعيد، فوترة',
  },
]

export const DOMAINS: ShopDomain[] = [
  d('gros-alimentaire', 'gros', '🥫', 'Gros alimentaire', 'جملة غذائي', 'alim-gros'),
  d('gros-boissons', 'gros', '🥤', 'Gros boissons', 'جملة مشروبات', 'boissons'),
  d('gros-cosmetique', 'gros', '💄', 'Gros cosmétique', 'جملة تجميل', 'cosmetique'),
  d('gros-parapharmacie', 'gros', '💊', 'Gros parapharmacie', 'جملة شبه صيدلة', 'para'),
  d('gros-chaussures', 'gros', '👟', 'Gros chaussures', 'جملة أحذية', 'chaussures'),
  d('gros-vetements', 'gros', '👕', 'Gros vêtements', 'جملة ملابس', 'vetements'),
  d('gros-textile', 'gros', '🧵', 'Gros textile / tissus', 'جملة أقمشة', 'textile'),
  d('gros-lingerie', 'gros', '🩱', 'Gros lingerie', 'جملة ملابس داخلية', 'vetements'),
  d('gros-animalerie', 'gros', '🐾', 'Gros animalerie', 'جملة حيوانات', 'animalerie'),
  d('gros-quincaillerie', 'gros', '🔧', 'Gros quincaillerie', 'جملة عتاد', 'quincaillerie'),
  d('gros-electro', 'gros', '📺', 'Gros électroménager', 'جملة أجهزة', 'electro'),
  d('gros-telephone', 'gros', '📱', 'Gros téléphone', 'جملة هواتف', 'telephone'),
  d('gros-pieces-auto', 'gros', '⚙️', 'Gros pièces auto', 'جملة قطع غيار', 'pieces-auto'),
  d('gros-bureautique', 'gros', '📎', 'Gros bureautique', 'جملة مكتبيات', 'bureautique'),
  d('gros-jouets', 'gros', '🧸', 'Gros jouets', 'جملة ألعاب', 'jouets'),
  d('gros-meuble', 'gros', '🛋️', 'Gros meuble', 'جملة أثاث', 'meuble'),
  d('gros-droguerie', 'gros', '🧹', 'Gros droguerie', 'جملة منظفات', 'droguerie'),
  d('gros-fruits', 'gros', '🍅', 'Gros fruits & légumes', 'جملة خضر وفواكه', 'fruits'),
  d('gros-boucherie', 'gros', '🥩', 'Gros viande', 'جملة لحوم', 'boucherie'),
  d('gros-confiserie', 'gros', '🍬', 'Gros confiserie', 'جملة حلويات', 'confiserie'),
  d('gros-construction', 'gros', '🧱', 'Gros matériaux', 'جملة مواد بناء', 'construction'),
  d('gros-sanitaire', 'gros', '🚿', 'Gros sanitaire', 'جملة صحي', 'sanitaire'),
  d('gros-peinture', 'gros', '🎨', 'Gros peinture', 'جملة دهان', 'construction'),
  d('gros-sport', 'gros', '⚽', 'Gros sport', 'جملة رياضة', 'sport'),
  d('gros-baby', 'gros', '🍼', 'Gros puériculture', 'جملة أطفال', 'baby'),
  d('gros-bijoux', 'gros', '💍', 'Gros bijoux fantaisie', 'جملة إكسسوار', 'bijoux'),
  d('gros-emballage', 'gros', '📦', 'Gros emballage', 'جملة تغليف', 'bureautique'),
  d('gros-informatique', 'gros', '💻', 'Gros informatique', 'جملة إعلام آلي', 'telephone'),

  d('detail-alimentation', 'detail', '🏪', 'Alimentation générale', 'مواد غذائية عامة', 'alim-detail'),
  d('detail-superette', 'detail', '🛍️', 'Superette', 'سوبرات', 'alim-detail'),
  d('detail-cosmetique', 'detail', '💅', 'Cosmétique détail', 'تجميل تجزئة', 'cosmetique'),
  d('detail-para', 'detail', '🧴', 'Parapharmacie', 'شبه صيدلة', 'para'),
  d('detail-boulangerie', 'detail', '🥖', 'Boulangerie', 'مخبزة', 'boulangerie'),
  d('detail-patisserie', 'detail', '🍰', 'Pâtisserie', 'حلويات شرقية', 'confiserie'),
  d('detail-boucherie', 'detail', '🥩', 'Boucherie', 'جزارة', 'boucherie'),
  d('detail-poisson', 'detail', '🐟', 'Poissonnerie', 'سمك', 'boucherie'),
  d('detail-fruits', 'detail', '🍊', 'Fruits & légumes', 'خضر وفواكه', 'fruits'),
  d('detail-epicerie', 'detail', '🧂', 'Épicerie fine', 'عطارة', 'alim-detail'),
  d('detail-telephone', 'detail', '📱', 'Téléphonie', 'هواتف', 'telephone'),
  d('detail-pretaporter', 'detail', '👗', 'Prêt-à-porter', 'ملابس', 'vetements'),
  d('detail-chaussures', 'detail', '👠', 'Chaussures', 'أحذية', 'chaussures'),
  d('detail-bijouterie', 'detail', '💎', 'Bijouterie', 'مجوهرات', 'bijoux'),
  d('detail-optique', 'detail', '👓', 'Optique', 'نظارات', 'para'),
  d('detail-droguerie', 'detail', '🧽', 'Droguerie', 'منظفات', 'droguerie'),
  d('detail-cadeaux', 'detail', '🎁', 'Cadeaux', 'هدايا', 'jouets'),
  d('detail-librairie', 'detail', '📚', 'Librairie', 'مكتبة', 'bureautique'),
  d('detail-animalerie', 'detail', '🐕', 'Animalerie', 'حيوانات أليفة', 'animalerie'),
  d('detail-quincaillerie', 'detail', '🪛', 'Quincaillerie', 'عتاد', 'quincaillerie'),
  d('detail-electro', 'detail', '🔌', 'Électroménager', 'أجهزة منزلية', 'electro'),
  d('detail-meuble', 'detail', '🪑', 'Meubles', 'أثاث', 'meuble'),
  d('detail-jouets', 'detail', '🪀', 'Jouets', 'ألعاب', 'jouets'),
  d('detail-sport', 'detail', '🏋️', 'Articles de sport', 'رياضة', 'sport'),
  d('detail-baby', 'detail', '👶', 'Puériculture', 'أطفال', 'baby'),
  d('detail-restaurant', 'detail', '🍽️', 'Restaurant', 'مطعم', 'restaurant'),
  d('detail-fastfood', 'detail', '🍔', 'Fast-food', 'أكل سريع', 'restaurant'),
  d('detail-cafe', 'detail', '☕', 'Café / salon de thé', 'مقهى', 'cafe'),
  d('detail-salon', 'detail', '💇', 'Salon de coiffure', 'حلاقة', 'salon'),
  d('detail-esthetique', 'detail', '✨', 'Institut de beauté', 'تجميل نسائي', 'salon'),
  d('detail-pressing', 'detail', '👔', 'Pressing', 'مصبغة', 'pressing'),
  d('detail-fleuriste', 'detail', '💐', 'Fleuriste', 'ورود', 'confiserie'),
  d('detail-kiosque', 'detail', '📰', 'Kiosque', 'كشك', 'alim-detail'),

  d('sante-dentaire', 'sante', '🦷', 'Cabinet dentaire', 'عيادة أسنان', 'dentaire', MED),
  d('sante-radio', 'sante', '🩻', 'Radiologie', 'أشعة', 'radio', MED),
  d('sante-esthetique', 'sante', '💉', 'Chirurgie esthétique', 'جراحة تجميل', 'esthetique', MED),
  d('sante-general', 'sante', '🩺', 'Médecine générale', 'طب عام', 'medical', MED),
  d('sante-pediatrie', 'sante', '👶', 'Pédiatrie', 'طب أطفال', 'medical', MED),
  d('sante-gyneco', 'sante', '🌸', 'Gynécologie', 'نساء وتوليد', 'medical', MED),
  d('sante-ophtalmo', 'sante', '👁️', 'Ophtalmologie', 'طب عيون', 'medical', MED),
  d('sante-orl', 'sante', '👂', 'ORL', 'أنف أذن حنجرة', 'medical', MED),
  d('sante-dermato', 'sante', '🧴', 'Dermatologie', 'جلد', 'esthetique', MED),
  d('sante-kine', 'sante', '🧘', 'Kinésithérapie', 'ترويض', 'medical', MED),
  d('sante-labo', 'sante', '🧪', 'Laboratoire', 'مخبر تحاليل', 'labo', MED),
  d('sante-clinique', 'sante', '🏥', 'Clinique', 'عيادة متعددة', 'medical', MED),
  d('sante-veterinaire', 'sante', '🐈', 'Vétérinaire', 'بيطرة', 'veterinaire', MED),
  d('sante-optique', 'sante', '👓', 'Optique médicale', 'بصريات طبية', 'para', MED),

  d('auto-location', 'auto', '🔑', 'Location de voiture', 'كراء سيارات', 'loc-auto', CAR),
  d('auto-vente', 'auto', '🚘', 'Vente de voiture', 'بيع سيارات', 'vente-auto', CAR),
  d('auto-showroom', 'auto', '🏛️', 'Showroom', 'معرض سيارات', 'vente-auto', CAR),
  d('auto-garage', 'auto', '🛠️', 'Garage / mécanique', 'ورشة ميكانيك', 'garage', CAR),
  d('auto-pieces', 'auto', '🔩', 'Pièces auto détail', 'قطع غيار', 'pieces-auto', CAR),
  d('auto-lavage', 'auto', '🚿', 'Lavage auto', 'غسيل سيارات', 'lavage', CAR),
  d('auto-pneus', 'auto', '🛞', 'Pneumatiques', 'عجلات', 'pieces-auto', CAR),

  d('svc-avocat', 'services', '⚖️', 'Cabinet d’avocat', 'محاماة', 'generic-service', SVC),
  d('svc-comptable', 'services', '📊', 'Expertise comptable', 'محاسبة', 'generic-service', SVC),
  d('svc-notaire', 'services', '📜', 'Étude notariale', 'توثيق', 'generic-service', SVC),
  d('svc-immo', 'services', '🏠', 'Agence immobilière', 'عقارات', 'immo', SVC),
  d('svc-voyage', 'services', '✈️', 'Agence de voyage', 'سفر', 'voyage', SVC),
  d('svc-hotel', 'services', '🏨', 'Hôtel / auberge', 'فندق', 'hotel', SVC),
  d('svc-formation', 'services', '🎓', 'Centre de formation', 'تكوين', 'formation', SVC),
  d('svc-ecole', 'services', '🏫', 'École privée', 'مدرسة خاصة', 'formation', SVC),
  d('svc-fetes', 'services', '🎉', 'Salle des fêtes', 'قاعة أفراح', 'fete', SVC),
  d('svc-photo', 'services', '📷', 'Photographe', 'تصوير', 'photo', SVC),
  d('svc-print', 'services', '🖨️', 'Imprimerie', 'مطبعة', 'print', SVC),
  d('svc-couture', 'services', '🪡', 'Couture / retouches', 'خياطة', 'salon', SVC),
  d('svc-plombier', 'services', '🚰', 'Plomberie', 'ترصيص', 'artisan', SVC),
  d('svc-electricien', 'services', '💡', 'Électricité', 'كهرباء', 'artisan', SVC),
  d('svc-clim', 'services', '❄️', 'Climatisation', 'تكييف', 'artisan', SVC),
  d('svc-menage', 'services', '🧼', 'Ménage / nettoyage', 'تنظيف', 'pressing', SVC),
  d('svc-securite', 'services', '🛡️', 'Sécurité / gardiennage', 'حراسة', 'generic-service', SVC),
  d('svc-transport', 'services', '🚚', 'Transport / livraison', 'نقل وتوصيل', 'transport', SVC),
  d('svc-info', 'services', '🖥️', 'Dépannage informatique', 'إعلام آلي', 'generic-service', SVC),
  d('svc-sport', 'services', '🥊', 'Salle de sport', 'قاعة رياضة', 'formation', SVC),
  d('svc-creche', 'services', '🍼', 'Crèche', 'حضانة', 'formation', SVC),
  d('svc-spa', 'services', '🧖', 'Spa / hammam', 'حمام / سبا', 'salon', SVC),
]

export function domainsForMode(mode: CommerceMode): ShopDomain[] {
  return DOMAINS.filter((x) => x.mode === mode)
}

export function domainById(id: string): ShopDomain {
  return DOMAINS.find((x) => x.id === id) ?? DOMAINS[0]
}

export function domainName(domain: ShopDomain, lang: Language): string {
  return lang === 'ar' ? domain.nameAr : domain.nameFr
}

const MODE_I18N: Record<CommerceMode, Partial<Record<Language, string>>> = {
  gros: { en: 'Wholesale', es: 'Mayorista', tr: 'Toptan', it: 'Ingrosso', de: 'Großhandel' },
  detail: { en: 'Retail', es: 'Detalle', tr: 'Perakende', it: 'Dettaglio', de: 'Einzelhandel' },
  sante: { en: 'Health', es: 'Salud', tr: 'Sağlık', it: 'Salute', de: 'Gesundheit' },
  auto: { en: 'Auto', es: 'Auto', tr: 'Oto', it: 'Auto', de: 'Auto' },
  services: { en: 'Services', es: 'Servicios', tr: 'Hizmetler', it: 'Servizi', de: 'Dienstleistungen' },
}

export function modeLabel(mode: CommerceMode, lang: Language): string {
  const m = COMMERCE_MODES.find((x) => x.id === mode)
  if (!m) return mode
  if (lang === 'ar') return m.nameAr
  return MODE_I18N[mode][lang] || m.nameFr
}

const MODE_HINT: Record<CommerceMode, Partial<Record<Language, string>>> = {
  gros: {
    en: 'Warehouse, cartons, deliveries',
    es: 'Almacén, cajas, entregas',
    tr: 'Depo, koli, teslimat',
    it: 'Magazzino, cartoni, consegne',
    de: 'Lager, Kartons, Lieferungen',
  },
  detail: {
    en: 'Shop, checkout, small stock',
    es: 'Tienda, caja, stock corto',
    tr: 'Dükkan, kasa, az stok',
    it: 'Negozio, cassa, scorte corte',
    de: 'Laden, Kasse, kleiner Bestand',
  },
  sante: {
    en: 'Clinic, lab, procedures',
    es: 'Clínica, laboratorio, actos',
    tr: 'Klinik, laboratuvar, işlem',
    it: 'Studio, laboratorio, prestazioni',
    de: 'Praxis, Labor, Leistungen',
  },
  auto: {
    en: 'Rent or repair',
    es: 'Alquiler o taller',
    tr: 'Kiralama veya tamir',
    it: 'Noleggio o officina',
    de: 'Miete oder Werkstatt',
  },
  services: {
    en: 'Jobs and appointments',
    es: 'Servicios y citas',
    tr: 'Hizmet ve randevu',
    it: 'Prestazioni e appuntamenti',
    de: 'Leistungen und Termine',
  },
}

export function modeHint(mode: CommerceMode, lang: Language): string {
  const m = COMMERCE_MODES.find((x) => x.id === mode)
  if (!m) return ''
  if (lang === 'ar') return m.hintAr
  return MODE_HINT[mode][lang] || m.hintFr
}
