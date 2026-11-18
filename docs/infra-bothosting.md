# Serveurs BotHosting (vendeur Raphael) : pont, robot, admin

Trois machines distinctes. Un Chromium qui rame ne doit plus faire tomber
l'API ni l'admin. Le lanceur `apps/bridge/start.mjs` ne demarre que les
enfants dont les variables sont posees : chaque serveur n'en lance qu'un.

La boutique BOXPLUS reste sur Vercel (4e piece, deja en place).

## Machines a prendre

Region : proche de Paris. Node 22. Pas les serveurs boutique / WhatsApp / coach.

| Serveur | RAM | vCPU | Disque | Processus | Commande |
| --- | --- | --- | --- | --- | --- |
| Pont | 4 Go | 2 | 10 Go | bridge Node + tunnel Cloudflare | `node bootstrap.js` |
| Robot Deciplus | 4 Go | 2 | 15 Go | BOXPLUS `BOT_ROLE=app` (Chromium) | `node bot/index.js` |
| Admin | 4 Go | 2 | 20 Go | Next (`next start`) | `npx next start --port $PORT` |

Le robot est le plus lourd (Chromium ~1,5 Go). 4 Go lui suffisent **s'il est seul**.
Ne pas le coller sur le pont.

Un seul compte Deciplus vendeur Raphael sur le robot app : deux robots avec
le meme login se marchent dessus (OTP, session).

## Qui parle a qui

```
telephone  --https-->  pont (Domains BotHosting, ex. bc-api.apps.bot-hosting.cloud)
equipe     --https-->  admin (Domains ou hostname admin)
pont       --http+secret-->  robot (port BotHosting, pas de DNS public)
admin      --https-->  pont (MEMBER_BRIDGE_URL)
boutique   --https-->  pont (SHOP_BRIDGE_SECRET, APP_BRIDGE_PUBLIC_URL)
```

Sans toucher au DNS OVH de boxingcenter.fr : publier le pont via
**BotHosting Domains** (`*.apps.bot-hosting.cloud`) et pointer
`PUBLIC_URL` / `EXPO_PUBLIC_API_URL` / `MEMBER_BRIDGE_URL` dessus.

Le robot n'est pas public. Le pont l'appelle avec `BOT_URL` + `BOT_SYNC_SECRET`.

## Variables (noms seulement)

### Pont (`apps/bridge/.env.server`)

`PUBLIC_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BRIDGE_SECRET`,
`ADMIN_BRIDGE_SECRET`, `SHOP_BRIDGE_SECRET`, `BOT_URL` (URL du serveur robot),
`BOT_SYNC_SECRET`, `SEND_EMAIL_HOOK_SECRET`, `BREVO_*`,
`BOUTIQUE_CHECKOUT_BASE_URL`, `CLOUDFLARE_TUNNEL_TOKEN`.

Ne pas poser `ROBOT_DIR` ni `ADMIN_APP_DIR` ici.

### Robot (BOXPLUS `bot/.env`)

`BOT_ROLE=app`, `BOT_SYNC_SECRET` (identique au pont), `APP_BRIDGE_SECRET`,
`PORT` du panel, identifiants Deciplus vendeur Raphael + IMAP OTP,
`SUPABASE_*` si le bot les lit deja.

### Admin (`apps/admin/.env.local`)

`ADMIN_DATA_DIR` sur le disque local, `TRUST_PROXY=1`,
`MEMBER_BRIDGE_URL` (URL Domains du pont), `ADMIN_BRIDGE_SECRET`
(identique au pont), `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPER_ADMIN_EMAIL`,
`SUPER_ADMIN_PASSWORD`, `SESSION_SECRET`, `BOUTIQUE_URL`,
`EXPO_ACCESS_TOKEN`, `SENTRY_DSN`, `CLOUDFLARE_STREAM_*` quand les comptes
existent.

### Boutique (Vercel)

Memes `APP_BRIDGE_SECRET` et `SHOP_BRIDGE_SECRET`,
`APP_BRIDGE_PUBLIC_URL` = URL Domains du pont (ex. bc-api…),
cron `GET /api/cron/app-bridge-outbox`. Ne pas changer la boutique
tant que le flux shop-bridge n'est pas reteste.

## Publication HTTPS (sans DNS OVH)

1. Activer Domains sur **bc-pont** (alias optionnel, ex. `bc-api`).
2. Le pont ecoute le `SERVER_PORT` / `PORT` du panel.
3. Hook Auth Send Email Supabase vers
   `https://bc-api.apps.bot-hosting.cloud/hooks/auth-email`
   (ou l'URL Domains actuelle).

Un CNAME `api.boxingcenter.fr` vers BotHosting n'est possible que si on
modifie la zone DNS (OVH) : hors scope tant qu'on n'y touche pas.

## Ce qui reste un compte externe (pas le CPU)

- Supabase : migrations du depot (socle, commerce, live_signals, passages,
  notices, admin_collections).
- Hook Auth Send Email (URL Domains du pont, ci-dessus).
- Expo Push, Sentry, Cloudflare Stream : coller les cles des qu'un compte existe.
- Sauvegardes : export Supabase (PITR ou dump quotidien) + copie de
  `ADMIN_DATA_DIR` sur le serveur admin.
