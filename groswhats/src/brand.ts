/** Identité produit AZ POS (web + Android + PC) */
export const APP_BRAND = {
  name: 'AZ POS',
  shortName: 'AZ POS',
  /** Package Android / ID Electron */
  id: 'com.azpos.app',
  description:
    'Point de vente, stock, WhatsApp, caisse et livraisons pour commerçants en Algérie',
  defaultShopName: 'AZ POS',
  /**
   * SAV vendeur AZ Soft (WhatsApp).
   * Format local DZ — normalisé en 213… à l’ouverture wa.me
   */
  supportWhatsapp: '0540456864',
  supportDisplay: '05 40 45 68 64',
  /** Assets logo (public/brand/) */
  logoStack: '/brand/logo-stack.webp',
  logoWide: '/brand/logo-wide.webp',
  logoHeader: '/brand/logo-header.webp',
  /** Fond splash / icônes */
  navy: '#0a1628',
} as const

export type AppBrand = typeof APP_BRAND
