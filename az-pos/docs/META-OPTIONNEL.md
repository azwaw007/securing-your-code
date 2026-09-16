# Meta / Instagram (optionnel)

Tu n’as **pas besoin** de token pour vendre avec AZ Soft.
WhatsApp + stories à copier suffisent.

Si un jour tu veux le **feed auto** Facebook/Instagram :

1. Crée une Page Facebook + Instagram pro lié  
2. Va sur https://developers.facebook.com → crée une app  
3. Récupère : Page ID, IG User ID, Page Access Token  
4. Dans l’agent AZ POS :
   - `meta page TON_PAGE_ID`
   - `meta ig TON_IG_USER_ID`
   - `meta token TON_TOKEN`
   - `meta on`
   - `publie facebook` ou `publie instagram`

API : `POST /api/meta-publish`  
Stories organiques : toujours en **copie manuelle** (API Meta limitée).
