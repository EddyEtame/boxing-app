# Administration Boxing Center

L'interface web de l'équipe (CDC §15) : une application à part, branchée à l'app, au planning et, bientôt, à Deciplus. Elle fait ce que l'app ne peut pas faire sur un téléphone : voir les cinq clubs d'un coup, agir sur vingt lignes à la fois, tout retrouver au clavier.

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
| `SUPABASE_URL` | La base hébergée, quand elle remplacera les fichiers JSON. |
| `BOUTIQUE_URL`, `COMBATS_FEED_URL` | La boutique et le fil des combats (CDC §13), vérifiés par « Branchements ». |

La page **Branchements** dit, pour chacune, si elle est présente — jamais sa valeur.

## Brancher l'app

Dans `apps/mobile/.env`, `EXPO_PUBLIC_API_URL` = l'adresse de cet admin vue du téléphone (la page **Démo des stats** affiche les adresses du réseau local, par exemple `http://192.168.1.20:3001`). L'app envoie alors sa mesure d'usage et peut lire ce que l'admin publie.

## Ce que l'app peut appeler

| Route | Méthode | Ce qu'elle fait |
|---|---|---|
| `/api/events` | POST | Lots d'événements d'usage anonymes (contrat `EventBatch`). |
| `/api/plannings` | GET | Les créneaux des cinq clubs et les séances annulées (8 semaines). Jamais le nom d'un coach. `ETag` / 304. |
| `/api/actualites`, `/api/evenements`, `/api/videos` | GET | Les contenus publiés, avec leur audience (invité ou adhérent actif). |
| `/api/fonctions` | GET | Les interrupteurs de l'app, tels qu'ils s'appliquent. |
| `/api/notifications?club=&statut=` | GET | Les notifications des 30 derniers jours pour ce club et ce statut. |
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
| Plannings — l'affiche de chaque club, réseau, contrôles, « comme l'adhérent », assistants d'ajout, de déplacement, d'annulation et de fermeture | §7 |
| Messages, Notifications — boîte de réception, envois ciblés, aperçus sur écran verrouillé | §10, §14 |
| Modération, Fonctions — propositions d'entraînement, règles, interrupteurs | §11, §15 |
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
```

## Ce qui n'est pas encore branché

L'envoi réel des notifications (Expo Push), le pont Deciplus, l'hébergement vidéo, le suivi des erreurs, la base hébergée et ses sauvegardes, l'envoi des liens d'activation par e-mail. La page **Branchements** en tient la liste à jour.
