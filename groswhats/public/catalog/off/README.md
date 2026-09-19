# Catalogue OFF → AZ POS

Images face avant téléchargées depuis [Open Food Facts](https://world.openfoodfacts.org/)
(produits tagués Algérie), pour `imageDataUrl: "catalog/off/{EAN}.jpg"`.

Dans l’app AZ POS, un scan / saisie EAN remplit **nom + photo** automatiquement
(API en ligne, ou `index.json` + images locales hors ligne).

## Générer

Depuis `groswhats/` :

```bash
# test (1 page ≈ 100 produits + images ~200px)
python3 scripts/fetch-off-algeria.py --max-pages 1 --download-images \
  --images-dir public/catalog/off \
  --az-pos-out off-az-pos-import.json \
  --only-with-images

# export complet (long, milliers de fichiers)
python3 scripts/fetch-off-algeria.py --download-images \
  --images-dir public/catalog/off \
  --az-pos-out off-az-pos-import.json \
  --only-with-images
```

Puis `npm run android:sync` / build web pour inclure les fichiers dans l’app.

## Licence

Photos sous licences des contributeurs Open Food Facts (souvent packaging marques).
À utiliser en connaissance de cause ; le commerçant peut remplacer chaque photo depuis Stock.
