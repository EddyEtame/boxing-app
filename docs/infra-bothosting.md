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
telephone  --https-->  pont (api.boxingcenter.fr)
equipe     --https-->  admin (ex. admin.boxingcenter.fr)
pont       --http+secret-->  robot (port BotHosting, pas de DNS public)
admin      --https-->  pont (MEMBER_BRIDGE_URL)
boutique   --https-->  pont (SHOP_BRIDGE_SECRET, APP_BRIDGE_PUBLIC_URL)
```

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
`MEMBER_BRIDGE_URL=https://api.boxingcenter.fr`, `ADMIN_BRIDGE_SECRET`
(identique au pont), `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPER_ADMIN_EMAIL`,
`SUPER_ADMIN_PASSWORD`, `SESSION_SECRET`, `BOUTIQUE_URL`,
`EXPO_ACCESS_TOKEN`, `SENTRY_DSN`, `CLOUDFLARE_STREAM_*` quand les comptes
existent.

### Boutique (Vercel)

Memes `APP_BRIDGE_SECRET` et `SHOP_BRIDGE_SECRET`,
`APP_BRIDGE_PUBLIC_URL=https://api.boxingcenter.fr`,
cron `GET /api/cron/app-bridge-outbox`.

## DNS Cloudflare

- `api.boxingcenter.fr` -> pont, `localhost:8080` (ou le PORT du panel relais)
- hostname admin (ex. `admin.boxingcenter.fr`) -> serveur admin, port Next

## Ce qui reste un compte externe (pas le CPU)

- Supabase : migrations du depot (socle, commerce, live_signals, passages,
  notices, admin_collections).
- Hook Auth Send Email vers `https://api.boxingcenter.fr/hooks/auth-email`.
- Expo Push, Sentry, Cloudflare Stream : coller les cles des qu'un compte existe.
- Sauvegardes : export Supabase (PITR ou dump quotidien) + copie de
  `ADMIN_DATA_DIR` sur le serveur admin.
