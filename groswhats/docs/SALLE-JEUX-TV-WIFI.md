# Relier les TV au logiciel (Wi‑Fi)

## Google TV ?

→ Guide dédié : **[GOOGLE-TV.md](./GOOGLE-TV.md)**  
(Type **Google TV / Android TV** dans AZ POS = IP + débogage réseau.)

---

Oui : si la **Smart TV a le Wi‑Fi** (ou le câble LAN) et est sur le **même réseau** que le PC AZ POS, tu la relies **directement** — sans prise obligatoire.

Deux façons (au choix par poste) :

| Mode | Quand l’utiliser |
|------|------------------|
| **Google TV / Android TV** | TCL, Hisense, Chromecast Google TV… |
| **Smart TV (Wi‑Fi / LAN)** | Autre marque avec IP + MAC / URLs |
| **Prise Shelly / Tasmota** | Plus simple / fiable pour couper l’alimentation |

## A) Smart TV avec Wi‑Fi (recommandé si elle est connectée)

1. Connecte la TV au **même Wi‑Fi** que le PC (pas de 4G).
2. Dans les réglages réseau de la TV, note :
   - l’**adresse IP** (ex. `192.168.1.42`)
   - l’adresse **MAC**
3. Active **Wake on LAN** / **Wake on Wi‑Fi** (souvent dans Réseau / Options avancées).
4. Dans AZ POS → poste → **TV Wi‑Fi** :
   - Type : **Smart TV (Wi‑Fi / LAN)**
   - IP de la Smart TV
   - MAC (pour allumer)
   - **URL OFF** du fabricant si tu veux éteindre sans prise (Sony Bravia, etc.)
5. **Test ON** / **Test OFF**.

> Utilise de préférence **AZ POS Windows (.exe)** — le navigateur web distant ne parle pas bien au Wi‑Fi local.

### Allumer / éteindre

- **ON** : Wake-on-LAN (paquet envoyé à la MAC) — TV doit être en veille réseau, pas débranchée.
- **OFF** : URL HTTP locale de la TV (réglages fabricant) **ou** une prise Wi‑Fi en secours.

Si ta TV n’a pas d’URL OFF, utilise l’option B (prise) uniquement pour l’extinction, ou reste en veille manuelle.

## B) Prise Wi‑Fi (Shelly / Tasmota)

```
Mur → prise Wi‑Fi → TV
```

1. Prise sur le même Wi‑Fi, noter son IP.
2. AZ POS → type **Shelly** ou **Tasmota** → IP → Test ON/OFF.

La console (PS / Xbox) reste branchée à part.

## Dans AZ POS

1. Métier **Salle de jeux**.
2. Chaque poste → **TV Wi‑Fi**.
3. Démarrage session → TV ON.
4. Fin de temps / **Veille TV** → TV OFF.

## Dépannage

| Problème | À vérifier |
|----------|------------|
| Test ON ne réveille pas | Wake on LAN activé ; MAC correcte ; .exe Windows ; TV en veille (pas 0 V) |
| Test OFF ne fait rien | URL OFF renseignée, ou passer en prise Shelly |
| IP change | Réserver l’IP sur le routeur |
| Marche en .exe pas sur le site | Normal (LAN local) |

## Console ≠ TV

- **Console** = type choisi en **admin** (tarifs).
- **TV** = IP / MAC / URLs sur la **fenêtre du poste**.
