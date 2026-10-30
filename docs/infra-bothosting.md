# Serveur BotHosting (vendeur Raphael) : app + bridge + robot Deciplus

Un seul processus Pterodactyl (`apps/bridge/start.mjs`) peut lancer :

- le robot BOXPLUS (`BOT_ROLE=app`, Chromium / Playwright)
- le tunnel Cloudflare (`cloudflared`)
- le bridge Node (comptes, HMAC, Supabase)

L'admin Next peut tourner sur le meme serveur (`next start`, port interne) derriere un second hostname du tunnel, avec `ADMIN_DATA_DIR` sur le disque du serveur (les JSON ne survivent pas a un hebergeur sans disque).

## Taille a prendre

| Profil | RAM | vCPU | Quand |
| --- | --- | --- | --- |
| Minimum | 4 Go | 2 | Bridge + tunnel + un robot Deciplus, admin ailleurs avec disque |
| Recommande | 8 Go | 4 | Bridge + robot + tunnel + admin Next sur la meme machine |
| Confort | 16 Go | 4 | Deux navigateurs (app + boutique) ou pics OTP / ventes en parallele |

Chromium seul occupe souvent 1 a 1,5 Go. En dessous de 4 Go le robot tue le bridge (OOM). 8 Go / 4 vCPU est le bon choix pour le compte vendeur Raphael si tout est sur BotHosting.

Disque : 20 Go utiles (logs, `.data` admin, binaire cloudflared, cache Playwright).

Region : proche de Paris (latence Supabase et boutique).

## Variables (noms seulement)

Bridge : `PUBLIC_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BRIDGE_SECRET`, `ADMIN_BRIDGE_SECRET`, `SHOP_BRIDGE_SECRET`, `BOT_URL`, `BOT_SYNC_SECRET`, `SEND_EMAIL_HOOK_SECRET`, `BREVO_*`, `BOUTIQUE_CHECKOUT_BASE_URL`, `ROBOT_DIR`, `CLOUDFLARE_TUNNEL_TOKEN`.

Admin sur le meme hote : `ADMIN_DATA_DIR`, `TRUST_PROXY=1`, `MEMBER_BRIDGE_URL=http://127.0.0.1:8080`, `ADMIN_BRIDGE_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_ACCESS_TOKEN` (push), `SENTRY_DSN`, `CLOUDFLARE_STREAM_*` quand les comptes existent.

BOXPLUS (Vercel, navigateur) : memes `APP_BRIDGE_SECRET` et `SHOP_BRIDGE_SECRET`, `APP_BRIDGE_PUBLIC_URL` = URL publique du tunnel, cron `/api/cron/app-bridge-outbox`.

## Ce qui reste un compte externe (pas le CPU)

- Supabase : appliquer les migrations du depot (socle, commerce, live_signals, passages).
- Hook Auth Send Email vers `{PUBLIC_URL}/hooks/auth-email`.
- Expo Push : jeton dans l'admin ou le bridge.
- Sentry et Cloudflare Stream : des qu'un projet est cree, coller les cles ; le code ne les invente pas.
- Sauvegardes : export Supabase (PITR ou dump quotidien) + copie du dossier `ADMIN_DATA_DIR`.
