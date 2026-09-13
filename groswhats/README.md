# AZ POS v1.0

Point de vente pour commerçants en Algérie — **web**, **Windows (.exe)** et **Android (Play Store)**.

- Web : https://grossiste-dz.vercel.app  
- Package ID : `com.azpos.app`

## Développement

```bash
npm install
npm run icons
npm run dev
```

## Build web (Vercel)

```bash
npm run build
```

Déploiement auto sur push `main` (projet AZ POS / Vercel, dossier app).

## Version PC Windows (.exe)

```bash
npm run native:deps   # installe Electron (hors deps web Vercel)
npm run desktop:build
```

Sortie dans `release/` :
- `AZ POS Setup *.exe` (installeur)
- `AZ POS *.exe` (portable)

## Version Android (Play Store)

1. Installer [Android Studio](https://developer.android.com/studio)
2. Puis :

```bash
npm run native:deps
npm run android:sync
npm run android:open
```

3. Dans Android Studio : **Build → Generate Signed Bundle / APK** → **.aab** pour Play Console.

Package : `com.azpos.app` · Nom : **AZ POS**

## Agent

Texte seulement (pas de voix TTS / micro).

## Licence vendeur

```bash
npm run license -- "Nom client"
```

## Publication PC / Play Store

Voir [docs/PUBLISH.md](docs/PUBLISH.md).
