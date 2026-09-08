# Grossiste DZ v1.0 — Prêt à vendre

## Contenu

| Élément | Chemin |
|---------|--------|
| Application | `src/` → build `dist/` |
| Guide client | `public/guide.html` + `docs/GUIDE-UTILISATION.md` |
| Guide vendeur | `docs/GUIDE-VENDEUR.md` |
| Générateur licences (page) | `seller/license-generator.html` |
| Générateur licences (CLI) | `tools/generate-license.mjs` |

## Lancer en local

```bash
cd groswhats
npm install
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

Le dossier `dist/` est ce que tu donnes / héberges pour les clients.

## Générer une licence

```bash
npm run license -- "Nom du commerce" 365
```

Ou ouvrir `seller/license-generator.html` dans Chrome.

## Avant la 1ère vraie vente

1. Change `LICENSE_SECRET` dans `src/license/license.ts`
2. Mets le **même** secret dans le générateur
3. `npm run build`
