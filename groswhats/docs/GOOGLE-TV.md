# Google TV — guide étape par étape

Pour une **Google TV** (TCL, Hisense, Chromecast with Google TV, Xiaomi, etc.), AZ POS utilise le **débogage réseau (ADB)** + éventuellement le **Wake-on-LAN**.

Préférer **AZ POS Windows (.exe)**.

---

## 1. Sur la Google TV (une seule fois)

1. Connecte la TV au **même Wi‑Fi** que le PC.
2. Ouvre **Paramètres → Système → À propos**.
3. Appuie **7 fois** sur **Version build** (ou « Build ») → message « Vous êtes développeur ».
4. Retour → **Options pour les développeurs** :
   - Active **Débogage USB**
   - Active **Débogage réseau** / **Network debugging** / **Wireless debugging** (selon la marque)
5. Toujours dans Réseau / Wi‑Fi, note :
   - **IP** (ex. `192.168.1.42`)
   - **MAC**
6. Si tu vois « Wake on LAN », active-le (aide à allumer depuis la veille).

La première fois qu’AZ POS se connecte, la TV affiche **« Autoriser le débogage USB ? »** → coche Toujours / Autoriser.

---

## 2. Sur le PC Windows

1. Installe **AZ POS** (.exe) — **`adb.exe` est déjà inclus** dans l’application (pas besoin d’installer Platform-Tools).
2. Ouvre AZ POS, métier **Salle de jeux**.

---

## 3. Dans AZ POS

1. Métier **Salle de jeux**.
2. Ouvre le **poste** → **TV Wi‑Fi**.
3. Type : **Google TV / Android TV**.
4. Colle l’**IP** + la **MAC**.
5. Port ADB : **5555** (sauf si la TV indique un autre port).
6. **Enregistrer** → **Test ON** / **Test OFF**.

---

## 4. Au quotidien

- Début de session → TV **ON** (Wake-on-LAN + ADB réveil).
- Fin de temps / **Veille TV** → TV **OFF** (ADB veille).

---

## Si ça ne marche pas

| Message / symptôme | Que faire |
|--------------------|-----------|
| ADB introuvable | Réinstalle AZ POS 1.2.3+ (adb.exe embarqué) |
| unauthorized | Sur la TV → Autoriser le débogage |
| unable to connect | Même Wi‑Fi ; débogage réseau ON ; bon IP/port |
| Allume pas depuis éteint | MAC + Wake on LAN ; sinon prise Shelly |
| Trop compliqué | Type **Shelly** : prise Wi‑Fi entre mur et TV |

---

## Alternative simple

Pas envie d’ADB :  
`Mur → prise Shelly → Google TV`  
Dans AZ POS → type **Shelly** → IP de la prise.
