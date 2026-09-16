/** Identité produit AZ POS (web + Android + PC) */
export const APP_BRAND = {
  name: 'AZ POS',
  shortName: 'AZ POS',
  /** Package Android / ID Electron */
  id: 'com.azpos.app',
  description:
    'Point de vente, stock, WhatsApp, caisse et livraisons pour commerçants en Algérie',
  defaultShopName: 'AZ POS',
} as const

export type AppBrand = typeof APP_BRAND
