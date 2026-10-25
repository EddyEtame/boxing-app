# Bridge Boxing Center

Serveur applicatif de l'app officielle (5 clubs a Toulouse). Il tient les comptes, envoie le rapprochement Deciplus au robot BOXPLUS, recoit le resultat, envoie les e-mails de compte (Brevo) et enregistre la mesure d'usage anonyme.

L'app et l'admin ne parlent pas a Deciplus. Elles appellent ce serveur. Le robot reste sur la meme machine et n'ecoute qu'en local.

## Lancement

Depuis la racine du monorepo :

```
npm run dev --workspace apps/bridge
npm run start --workspace apps/bridge
npm run typecheck --workspace apps/bridge
npm test --workspace apps/bridge
```

Node 22, sans etape de compilation : `node --experimental-strip-types`. Le fichier `src/register.mjs` resout les imports internes de `@bc/contract`.

## Variables

Voir `.env.example` (noms seulement, aucun secret dans le depot).

| Nom | Role |
| --- | --- |
| PORT | Ecoute HTTP, defaut 8080 |
| HOST | Defaut 0.0.0.0 |
| PUBLIC_URL | URL https publique (tunnel), utilisee comme base de rappel du robot |
| SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | Ecriture base (cle service, jamais dans l'app) |
| BOT_URL | Robot local, defaut http://127.0.0.1:3050 |
| BOT_SYNC_SECRET | En-tete `x-sync-secret` vers le robot |
| APP_BRIDGE_SECRET | Signature des retours `POST /internal/app-member-status` |
| ADMIN_BRIDGE_SECRET | Signature des decisions `POST /internal/admin/link-resolution` |
| SEND_EMAIL_HOOK_SECRET | Secret du crochet Supabase, format `v1,whsec_<base64>` |
| BREVO_API_KEY | Envoi des e-mails |
| BREVO_SENDER_EMAIL | Defaut suzinabot@gmail.com |
| BREVO_SENDER_NAME | Defaut Boxing Center |
| BREVO_REPLY_TO | Defaut boxingcenter31@gmail.com |

Le lanceur BotHosting lit en plus `ROBOT_DIR`, `CLOUDFLARE_TUNNEL_TOKEN` et `CLOUDFLARED_BIN`.

## Deploiement BotHosting

Un seul processus (Pterodactyl) demarre `node start.mjs`. Ce lanceur tient trois enfants et relance celui qui s'arrete au bout de 5 secondes :

- le robot BOXPLUS (`node bot/index.js` dans `ROBOT_DIR`, `BOT_ROLE=app`) s'il est defini ;
- `cloudflared tunnel --no-autoupdate run --token ...` si `CLOUDFLARE_TUNNEL_TOKEN` est defini (binaire `CLOUDFLARED_BIN` ou `./bin/cloudflared`) ;
- le bridge.

Les journaux sont prefixes `[robot]`, `[tunnel]` et `[bridge]`.

Le robot n'est pas expose. `BOT_URL` pointe vers `http://127.0.0.1:3050`. Seul le tunnel publie le bridge.

## Tunnel Cloudflare

Creer un tunnel nomme sur un sous-domaine de boxingcenter.fr, par exemple `api.boxingcenter.fr`.

Le service public du tunnel vise `http://localhost:8080` (ou le `PORT` choisi). `PUBLIC_URL` vaut alors `https://api.boxingcenter.fr`, sans barre finale.

Le robot rappelle `POST {PUBLIC_URL}/internal/app-member-status`.

## Crochet e-mail Supabase

Dans le projet Supabase : Authentication, Hooks, Send Email (HTTPS).

URI : `{PUBLIC_URL}/hooks/auth-email`

Coller le secret genere dans `SEND_EMAIL_HOOK_SECRET` (il commence par `v1,whsec_`).

Les messages sont en francais, sans lien : un code a 6 chiffres, valable 1 heure (inscription, mot de passe oublie, changement d'adresse, reauthentification, lien magique, invitation). Regler la longueur OTP du projet a 6 chiffres pour que `token` soit ce code.
