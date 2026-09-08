# Guide vendeur — Grossiste DZ

Tu vends l’app. Le client utilise. Tu génères les licences.

## Prix recommandés (Algérie)

| Offre | Prix indicatif |
|--------|----------------|
| Essai | 14 jours gratuit |
| Licence 1 an | 8 000 – 15 000 DA |
| Installation + formation | 5 000 – 10 000 DA |
| Pack lifetime (si client refuse l’abo) | 25 000 – 40 000 DA |

## Avant de vendre (obligatoire)

1. Change le secret dans **les 2 endroits** (même valeur) :
   - `src/license/license.ts` → `LICENSE_SECRET`
   - `seller/license-generator.html` → champ Secret
   - optionnel : variable `GDZ_LICENSE_SECRET` pour le script Node
2. Rebuild l’app : `npm run build`
3. Héberge / envoie le dossier `dist` au client (ou ton lien en ligne)

## Générer une licence

### Option A — page vendeur (simple)

1. Ouvre `seller/license-generator.html` dans Chrome
2. Nom du client
3. Durée (365 jours = 1 an)
4. **Générer** → **Copier**
5. Envoie la clé au client sur WhatsApp

### Option B — terminal

```bash
cd groswhats
node tools/generate-license.mjs "Dépôt El Amel" 365
```

## Script de vente (WhatsApp)

> Salam, je te propose **Grossiste DZ** : stock + commandes WhatsApp + ticket + facture + zakat + agent vocal.  
> Essai **14 jours gratuit**.  
> Ensuite **12 000 DA / an**.  
> Je t’installe sur le téléphone et je t’explique.

## Après paiement

1. Génère la licence au **nom du commerce**
2. Envoie la clé `GDZ1.…`
3. Le client colle la clé → Activer
4. Note dans ton carnet : client, date, date d’expiration

## Renouvellement

1 mois avant expiration, contacte le client → nouvelle clé 365 jours.

## Sécurité (honnête)

La licence est côté téléphone (suffisant pour grossistes locaux).  
Ne publie **jamais** ton `LICENSE_SECRET`.  
Change-le avant la première vente réelle.
