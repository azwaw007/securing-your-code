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

API Open Food Facts parfois en **503** : réessaie plus tard.

Depuis `groswhats/` :

```bash
# Pack court (~100)
npm run off:pack

# Jusqu’à ~400 (4 pages) — utile en local / CI, à NE PAS committer en masse si >500
python3 scripts/fetch-off-algeria.py --max-pages 4 --download-images \
  --images-dir public/catalog/off \
  --az-pos-out /tmp/off-az-pos-import.json \
  --only-with-images
```

Puis rebuild (`npm run build` / `android:sync`).

## Licence

Photos sous licences des contributeurs Open Food Facts (souvent packaging marques).
Le commerçant peut remplacer chaque photo depuis Stock.
