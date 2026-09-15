# Sécurité AZ POS (notes)

## Déjà en place
- Données métier surtout en **localStorage** (appareil)
- Headers Vercel : `nosniff`, `Referrer-Policy`, `Permissions-Policy`
- `/seller/*` exclu du rewrite SPA + `X-Frame-Options: DENY`
- API Meta : rate-limit, message borné, `https` only, token serveur préféré
- Licence / essai côté client

## À faire plus tard (si besoin)
- Auth forte multi-poste (pas seulement companyCode + syncSecret)
- Chiffrement sauvegarde / export
- Rotation secrets licence
- CSP stricte (peut casser PWA / WhatsApp links — à tester)

## Ne pas
- Committer de vrais tokens Meta / secrets licence
- Activer `META_ALLOW_CLIENT_TOKEN=1` en prod publique
