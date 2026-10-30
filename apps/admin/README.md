# Administration Boxing Center

L'interface web de l'équipe (CDC §15) : une application à part, branchée à l'app, au planning, à la base des adhérents et au serveur applicatif. Elle fait ce que l'app ne peut pas faire sur un téléphone : voir les cinq clubs d'un coup, agir sur vingt lignes à la fois, tout retrouver au clavier.

Elle vit sur la branche **`admin`** du dépôt (décision du 30/10/2026) : c'est un site à part, qui se déploie seul (voir « Déployer »). `main` reste la branche de l'app et du serveur ; `admin` reprend `main` quand le contrat ou le serveur changent (`git merge main`).

Next.js 16 (App Router), TypeScript strict, aucune base de données pendant la mise au point : les données vivent dans `apps/admin/.data/` (fichiers JSON, ignorés par Git).

## Installer et lancer (PowerShell)

Depuis la racine du dépôt :

```powershell
npm install
npm run env:boutique --workspace apps/admin
npm run dev --workspace apps/admin
```

Puis ouvrir <http://localhost:3001> et se connecter avec les identifiants du super administrateur de la boutique.

`env:boutique` lit `Plannings/box-plus/.env`, en copie **seulement** `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD` dans `apps/admin/.env.local`, génère `SESSION_SECRET`, vérifie que Next relit les mêmes valeurs et que le fichier est ignoré par Git. Il n'affiche jamais une valeur. Autre emplacement : `npm run env:boutique --workspace apps/admin -- --from "C:\chemin\vers\.env"`.

## Variables (`apps/admin/.env.local`)

Les noms seulement ; le modèle est `.env.example`.

| Variable | Rôle |
|---|---|
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | Le compte Direction (celui de la boutique). |
| `SESSION_SECRET` | Signe le cookie de session (12 h, httpOnly, SameSite strict). |
| `ADMIN_DATA_DIR` | Facultatif : un autre dossier pour les données. |
| `ADMIN_CORS_ORIGINS` | Facultatif : origines web en plus de localhost et du réseau local. |
| `TRUST_PROXY` | `1` seulement derrière un proxy qui réécrit `X-Forwarded-For` (production). |
| `DECIPLUS_BRIDGE_URL`, `DECIPLUS_BRIDGE_SECRET` | Le pont Deciplus (le robot de la boutique). |
| `EXPO_ACCESS_TOKEN` | L'envoi des notifications (Expo Push). |
| `CLOUDFLARE_STREAM_ACCOUNT_ID`, `CLOUDFLARE_STREAM_TOKEN` | L'hébergement des vidéos. |
| `SENTRY_DSN` | Le suivi des erreurs. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | La base de l'app (comptes, fiches Deciplus, file de rapprochement), lue côté serveur seulement — rubrique **Adhérents**. Sans elles, la rubrique montre des exemples. |
| `MEMBER_BRIDGE_URL`, `ADMIN_BRIDGE_SECRET` | Le serveur applicatif (`apps/bridge`) : décisions de rapprochement et santé du commerce, appels signés. Mêmes valeurs que le serveur. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique : le rafraîchissement en direct des pages (signaux `live_signals`). |
| `ADMIN_BACKUP_DIR` | Facultatif : le dossier des sauvegardes datées (`npm run backup`). |
| `BOUTIQUE_URL`, `COMBATS_FEED_URL` | La boutique et le fil des combats (CDC §13), vérifiés par « Branchements ». |

La page **Branchements** dit, pour chacune, si elle est présente — jamais sa valeur.

## Brancher l'app

Dans `apps/mobile/.env`, `EXPO_PUBLIC_API_URL` = l'adresse de cet admin vue du téléphone (la page **Démo des stats** affiche les adresses du réseau local, par exemple `http://192.168.1.20:3001`). L'app envoie alors sa mesure d'usage et peut lire ce que l'admin publie.

## Ce que l'app peut appeler

| Route | Méthode | Ce qu'elle fait |
|---|---|---|
| `/api/events` | POST | Lots d'événements d'usage anonymes (contrat `EventBatch`). |
| `/api/plannings` | GET | Les créneaux des cinq clubs, les séances annulées (8 semaines), les heures d'ouverture de chaque club (`horaires`) et ses jours de fermeture (`fermetures`, 13 semaines). L'accès libre se calcule avec `plagesLibres` du contrat. Jamais le nom d'un coach. `ETag` / 304. |
| `/api/actualites`, `/api/evenements`, `/api/videos` | GET | Les contenus publiés, avec leur audience (invité ou adhérent actif). Une vidéo ne nomme jamais de coach. |
| `/api/fonctions` | GET | Les interrupteurs de l'app, tels qu'ils s'appliquent. |
| `/api/notifications?club=&statut=` | GET | Les notifications des 30 derniers jours pour ce club et ce statut. Seules les offres et les nouvelles vidéos se coupent dans l'app (`NOTIF_OPTIONAL` du contrat) ; tout le reste est essentiel. |
| `/api/messages` | POST | Un message d'un adhérent à la direction (CDC §10) ; identité déclarée tant que Deciplus n'est pas branché. |
| `/api/messages/:id` | GET | Le fil de l'adhérent (en-tête `x-bc-thread-token`), sans les notes internes. |
| `/api/entrainements?club=` | GET, POST | Les entraînements entre membres publiés ; une proposition depuis l'app (CDC §11). |
| `/api/demo/members/48213/passages` | GET (PUT : admin) | Les passages du compte de démonstration (CDC §6). Tout autre numéro est refusé. |

Les routes publiques acceptent les origines locales (Expo, réseau local) ; les écritures sont limitées en débit et validées strictement. Les routes `/api/admin/*` exigent une session.

## Les rubriques

| Rubrique | CDC |
|---|---|
| Aujourd'hui — ce qui attend, la journée des clubs, la vitrine, les branchements | §15 |
| Actualités, Événements, Vidéos — assistants, photothèque, aperçu dans l'app, reprise du contenu de l'app | §8, §9 |
| Plannings — l'affiche de chaque club, les horaires et l'accès libre, réseau, contrôles, « comme l'adhérent », assistants d'ajout, de déplacement, d'annulation et de fermeture | §7, §11 |
| Messages, Notifications — boîte de réception, envois ciblés, aperçus sur écran verrouillé | §10, §14 |
| Modération, Fonctions — propositions d'entraînement, règles, interrupteurs | §11, §15 |
| Adhérents — les comptes de l'app, leur fiche Deciplus, l'abonnement pris dans l'app, la file de rapprochement que l'accueil tranche | §2, §15 |
| Statistiques, Démo des stats — mesure d'usage (les non-membres d'abord), compte de démonstration | §6, §15 |
| Branchements, Deciplus — l'état réel de chaque système | §2, §17, §18 |
| Comptes et droits, Journal — l'équipe, les profils, la trace de chaque action | §15 |

Raccourcis : `Ctrl K` (chercher ou créer), `?` (aide de la page), `g` puis une lettre (aller à une rubrique).

## Données de démonstration

```powershell
npm run seed:events --workspace apps/admin
npm run seed:events:clear --workspace apps/admin
```

La première commande écrit 45 jours d'événements d'usage marqués « démo » ; la seconde les retire (les vrais événements de l'app restent). Les messages, propositions et contenus d'exemple se chargent depuis l'état vide de leur rubrique et se retirent de la même façon.

## Vérifier

```powershell
npm run typecheck --workspace apps/admin
npm run lint --workspace apps/admin
npm test --workspace apps/admin
```

Les tests couvrent la construction de la vue Adhérents et la signature des appels au serveur applicatif, vérifiée par le code même du serveur. La branche `admin` les rejoue à chaque poussée (`.github/workflows/admin.yml`), avec la construction de production.

## Déployer (site à part)

L'admin garde ses données dans des fichiers (`.data`) : il lui faut un hôte avec un disque qui survit aux redémarrages — le même hôte que le serveur applicatif (BotHosting, Node 22), derrière le même tunnel Cloudflare, convient. Vercel et les hôtes sans disque ne conviennent pas tant que les données n'ont pas rejoint une base.

Depuis la racine du dépôt, sur la branche `admin` :

```powershell
npm ci
npm run build --workspace apps/admin
npm run start --workspace apps/admin
```

- Variables : celles de `.env.local` ci-dessus, dans le panneau de l'hôte, avec `TRUST_PROXY=1` et `ADMIN_DATA_DIR` sur le disque persistant.
- Tunnel : un nom d'hôte (par exemple `admin.boxingcenter.fr`) vers `http://localhost:3001`.
- Sauvegardes : `npm run backup --workspace apps/admin` une fois par jour (tâche planifiée de l'hôte) écrit un dossier daté dans `.backups` (ou `ADMIN_BACKUP_DIR`), avec un manifeste, et garde les trente dernières ; **Branchements** affiche la date de la dernière.
- Mise à jour : `git pull`, puis les trois commandes.

## Pour le serveur : où l'admin se branche

Tout ce qui lit ou écrit hors de l'admin passe par ces fichiers ; le reste de l'interface n'y touche pas. Le détail tenu à jour — les deux branches, ce que l'admin attend encore du serveur, le déploiement — est dans [`src/server/couture.md`](src/server/couture.md).

| Fichier | Ce qu'il fait | Côté serveur |
|---|---|---|
| `src/server/members.ts` | Lit `profiles`, `deciplus_snapshots`, `subscription_state`, `link_requests` avec la clé de service ; envoie la décision à `POST /internal/admin/link-resolution` (signature `x-bc-timestamp` / `x-bc-signature`, corps `{ link_request_id, resolution, actor }`). | `actor` est l'identifiant du compte admin (texte) ; la base attend un `uuid` d'`auth.users` dans `link_requests.resolved_by` et `audit_log.actor` : à faire accepter un texte, ou à passer les comptes de l'équipe sous Supabase Auth (`staff_roles`). |
| `src/server/member-bridge.ts`, `src/server/live-bump.ts`, `src/components/LiveRefresh.tsx` | Santé du commerce, signal après chaque écriture, rafraîchissement en direct. | En place. |
| `src/server/comms.ts` (`envois`, `notifications` en file) | Les notifications attendent un envoi : il faut les jetons des appareils (`devices`) et une route pour les enregistrer depuis l'app. | À écrire côté serveur et côté app. |
| `src/server/accounts.ts` | Les comptes de l'équipe et leurs liens d'activation (non envoyés). | Supabase Auth + crochet Brevo, puis `staff_roles` pour le rôle. |
| `src/app/api/*` | Ce que l'app lit : plannings, contenus, notifications, messages, entraînements, mesure d'usage. | En place ; l'app y pointe par `EXPO_PUBLIC_API_URL`. |

## Ce qui n'est pas encore branché

L'envoi réel des notifications (Expo Push), le pont Deciplus, l'hébergement vidéo, le suivi des erreurs, la base hébergée et ses sauvegardes, l'envoi des liens d'activation par e-mail. La page **Branchements** en tient la liste à jour.
