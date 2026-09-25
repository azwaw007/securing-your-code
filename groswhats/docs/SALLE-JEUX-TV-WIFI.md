# Relier les TV au logiciel (Wi‑Fi)

AZ POS **n’envoie pas** de commande à la Smart TV Sony / Samsung directement.  
Chaque TV est branchée sur une **prise Wi‑Fi** (Shelly ou Tasmota / Sonoff). Le logiciel coupe ou allume cette prise → la TV s’éteint ou se rallume.

## Matériel

1. Une **prise Wi‑Fi** par poste (Shelly Plug / Plus Plug, ou Sonoff avec **Tasmota**).
2. PC / tablette AZ POS et toutes les prises sur le **même Wi‑Fi local** (pas de 4G).
3. Version **Windows (.exe)** recommandée (HTTP local, sans blocage CORS du navigateur).

## Brancher

```
Prise murale → Prise Wi‑Fi → Câble TV → TV
                         ↑
              console PS / Xbox (reste allumée)
```

La console reste sous tension ; seule l’alimentation **TV** passe par la prise Wi‑Fi.

## Configurer la prise

### Shelly
1. App Shelly → connecter la prise au Wi‑Fi de la salle.
2. Noter l’**adresse IP** (ex. `192.168.1.50`) — fixe si possible (DHCP réservation sur le routeur).
3. Dans AZ POS → poste → **TV Wi‑Fi** → type **Shelly** → coller l’IP → Enregistrer.
4. Boutons **Test ON** / **Test OFF**.

### Tasmota / Sonoff
1. Flasher Tasmota, joindre le Wi‑Fi, noter l’IP.
2. AZ POS → type **Tasmota** → IP → Test ON/OFF.

### URL personnalisées
Si autre boîtier : type **URL personnalisées** et coller les liens HTTP ON / OFF du fabricant.

## Dans AZ POS

1. Métier **Salle de jeux**.
2. Sur chaque poste : **TV Wi‑Fi** → type + IP.
3. Au démarrage d’une session → TV ON (si configurée).
4. Fin de temps / **Veille TV** → TV OFF.

## Dépannage

| Problème | À vérifier |
|----------|------------|
| Test OFF ne fait rien | Même Wi‑Fi que le PC ; IP correcte ; ping depuis le PC |
| Marche en .exe pas sur le web | Normal : le site HTTPS distant ne parle pas au LAN |
| IP change | Réserver l’IP sur le routeur |
| TV s’allume seule | Mode « dernière entrée » / HDMI-CEC selon la TV |

## Console ≠ TV

- **Console** (PS4 / PS5 / Xbox…) = choisie **par poste en admin** → tarifs.
- **TV** = prise Wi‑Fi IP sur la fenêtre du poste.
