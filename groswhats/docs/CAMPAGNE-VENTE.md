# Campagne vente AZ Soft × AZ POS — **retirée**

L’agent campagne / stories et la page `/seller/campagne.html` ont été **retirés** :
ils ne publiaient pas vraiment sur Facebook/Instagram (file locale + copie manuelle).

## Ce qui reste
- **Agent AZ POS** : caisse, stock, clients, organisation de l’app
- **Promo produit** : texte story/WhatsApp **à copier à la main** depuis la fiche produit
- **Pages vendeur** : `/seller/pro.html` · `/seller/license-generator.html`
- **Démo** : https://az-pos-dz.vercel.app

## Modules legacy (non branchés)
`src/agent/campaignManager.ts` et `src/marketing/campaignPack*` restent dans le dépôt
mais ne sont plus appelés par l’agent. Ne pas les reconnecter sans vraie API Meta.
