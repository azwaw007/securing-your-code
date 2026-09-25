# Publier AZ POS

## Web (déjà en ligne)
Site AZ POS : https://az-pos-dz.vercel.app — push sur `main` déploie automatiquement.

### Monorepo Vercel (projet `az-pos`)
Si **Root Directory** est vide dans le dashboard Vercel, le fichier `vercel.json` à la **racine du repo** force le build sur `groswhats/` (`npm ci` + `npm run build`, sortie `groswhats/dist`). Les API sont exposées via `api/` à la racine (wrappers vers `groswhats/api/`).

Idéal : Root Directory = `groswhats` (alors seul `groswhats/vercel.json` s’applique).

Politique de confidentialité (Play Store) :
https://az-pos-dz.vercel.app/privacy.html

## PC Windows (.exe)

Fichiers générés :

- `release/AZ-POS-Setup-1.2.5.exe` — installeur
- `release/AZ-POS-Portable-1.2.5.exe` — portable

Rebuild :

```bash
npm run native:deps
npm run desktop:build
```

Tag release GitHub : `v1.2.5`

Salle de jeux — TV Wi‑Fi : voir [SALLE-JEUX-TV-WIFI.md](./SALLE-JEUX-TV-WIFI.md).

## Android → Google Play

### 1. Préparer le projet
```bash
npm run native:deps
npm run android:sync
npm run android:open
```

Les photos catalogue (`public/catalog/`) partent dans `dist/` puis dans l’APK via `cap sync`. Même app que le web, hors ligne.

### 2. Android Studio — Bundle signé
1. **Build → Generate Signed Bundle / APK**
2. Choisir **Android App Bundle (.aab)**
3. Créer un keystore (mot de passe fort, **sauvegarde hors PC**)
4. Package : `com.azpos.app`

### 3. Play Console
https://play.google.com/console

- Créer l’app **AZ POS**
- Type : Application
- Catégorie : **Business**
- Contenu : questionnaire PEGI / public cible
- Confidentialité : URL `https://az-pos-dz.vercel.app/privacy.html`

### 4. Textes store (copier-coller)

**Nom :** AZ POS

**Description courte (FR) :**  
Point de vente simple pour grossistes en Algérie — stock, crédit, caisse, WhatsApp.

**Description longue (FR) :**  
AZ POS aide les commerçants et grossistes en Algérie à vendre vite : catalogue produits, clients, ventes cash ou crédit (versé + reste), échéances, scan code-barres / QR, caisse du jour, retours, achats fournisseurs, multi-poste livreurs, agent d’aide en texte (FR / AR). Données sur l’appareil. Fonctionne aussi en PWA hors ligne.

**Description courte (AR) :**  
نقطة بيع بسيطة للتجار في الجزائر — مخزون، دين، صندوق، واتساب.

**Description longue (AR) :**  
AZ POS يساعد التجار والموزعين في الجزائر على البيع بسرعة: منتجات، زبائن، بيع نقداً أو دين، استحقاقات، مسح باركود / QR، صندوق اليوم، مرتجعات، مشتريات، سائقون متعددون، وكيل مساعدة بالنص (فرنسية / عربية). البيانات على الجهاز. يعمل أيضاً كتطبيق ويب دون إنترنت.

### 5. Visuels
- Icône : `public/icons/icon-512.png` (idéalement 512×512)
- Captures téléphone : min. 2 (accueil, vente, clients)

### Checklist
- [ ] Compte Google Play Developer (~25 USD une fois)
- [ ] Keystore sauvegardé
- [ ] `.aab` uploadé (test interne puis production)
- [ ] Politique confidentialité URL
- [ ] Captures + textes FR/AR

## Agent
Texte seulement — pas de voix TTS ni micro.
