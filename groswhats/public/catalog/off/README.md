# Catalogue OFF → AZ POS (pack versionné)

## Ce qui est dans le dépôt

Un **petit pack** (~100 photos face avant, produits tagués Algérie sur
[Open Food Facts](https://world.openfoodfacts.org/)) est **versionné** ici :

- `index.json` — EAN → nom + fichier
- `*.jpg` — photos locales (`catalog/off/{EAN}.jpg`)

Taille cible : **100–500 photos max** dans git (le pack actuel ≈ 100 / < 1 Mo).
Au-delà, ne pas committer : générer **avant le build** (voir ci-dessous).

Dans l’app AZ POS, un scan / saisie EAN remplit **nom + photo** :
1. d’abord `index.json` + JPG locaux (hors ligne)
2. sinon API Open Food Facts (avec internet)

## Build (pack déjà versionné)

Rien à faire : `npm run build` / `android:sync` / desktop incluent
`public/catalog/off/*.jpg` automatiquement.

## Étendre le pack (local, avant build — sans committer un gros dump)

Depuis `groswhats/` :

```bash
# Pack court (~100 produits + images ~200px) — même taille que le dépôt
npm run off:pack

# Jusqu’à ~500 (5 pages) — utile en local / CI, à NE PAS committer en masse
python3 scripts/fetch-off-algeria.py --max-pages 5 --download-images \
  --images-dir public/catalog/off \
  --az-pos-out /tmp/off-az-pos-import.json \
  --only-with-images
```

Puis rebuild :

```bash
npm run build
# ou
npm run android:sync
```

**Règle :** garder dans git seulement le pack de base (≤ ~500 JPG).
Un export « Algérie complet » (milliers de fichiers) reste hors dépôt.

## Licence

Photos sous licences des contributeurs Open Food Facts (souvent packaging marques).
Le commerçant peut remplacer chaque photo depuis Stock.
