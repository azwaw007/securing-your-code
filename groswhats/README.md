# AZ POS v1.0

Point de vente pour commerçants en Algérie — **web**, **Windows (.exe)** et **Android (Play Store)**.

- Web : https://grossiste-dz.vercel.app  
- Package ID : `com.azpos.app`

## Développement

```bash
cd groswhats
npm install
npm run icons
npm run dev
```

## Build web (Vercel)

```bash
npm run build
```

Déploiement auto sur push `main` (projet Vercel `grossiste-dz`, root `groswhats`).

## Version PC Windows (.exe)

```bash
npm run desktop:build
```

Sortie dans `groswhats/release/` :
- `AZ POS Setup *.exe` (installeur NSIS)
- `AZ POS *.exe` (portable)

Prérequis : Node.js 20+.

## Version Android (Play Store)

1. Installer [Android Studio](https://developer.android.com/studio)
2. Une fois :

```bash
npm run android:add
```

3. Ensuite à chaque changement :

```bash
npm run android:sync
npm run android:open
```

4. Dans Android Studio : **Build → Generate Signed Bundle / APK** → **Android App Bundle (.aab)** pour Play Console.

Package : `com.azpos.app` · Nom affiché : **AZ POS**

## Agent

Texte seulement (pas de voix TTS / micro).

## Licence vendeur

```bash
npm run license -- "Nom client"
```
