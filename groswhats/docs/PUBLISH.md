# Publier AZ POS

## Web (déjà en ligne)
https://grossiste-dz.vercel.app — push sur `main` déploie automatiquement.

## PC Windows (.exe)

Fichiers déjà générés sur cette machine :

- `groswhats/release/AZ POS Setup 1.0.0.exe` — installeur
- `groswhats/release/AZ POS 1.0.0.exe` — portable

Rebuild :

```bash
cd groswhats
npm run native:deps
npm run desktop:build
```

## Android → Google Play

1. Installer Android Studio + SDK
2. Sync le web dans Android :

```bash
cd groswhats
npm run native:deps
npm run android:sync
npm run android:open
```

3. Dans Android Studio :
   - **Build → Generate Signed Bundle / APK**
   - Choisir **Android App Bundle (.aab)**
   - Créer un keystore (garde-le en sécurité)
4. Play Console : https://play.google.com/console
   - Créer l’app **AZ POS**
   - Package : `com.azpos.app`
   - Upload le `.aab`
   - Remplir fiche (description, captures, politique de confidentialité)

### Checklist Play Store
- [ ] Nom : AZ POS
- [ ] Icône 512×512
- [ ] Captures téléphone (min. 2)
- [ ] Description courte + longue (FR / AR)
- [ ] Catégorie : Business
- [ ] Politique de confidentialité (URL)
- [ ] Contenu PEGI / rating questionnaire

## Agent
Texte seulement — pas de voix TTS ni micro.
