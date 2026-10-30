# La couture entre l'admin et le serveur

Ce fichier est tenu par la session qui construit l'admin (interface) pour celle qui construit le serveur (`apps/bridge`, Supabase, robot BOXPLUS). Il dit, à chaque étape, ce que l'admin lit ou écrit hors de lui, ce qu'il attend encore du serveur, et comment les deux branches vivent ensemble. Il se met à jour à chaque changement de l'un ou de l'autre ; les constats datés restent, pour qu'on sache ce qui a été vu quand.

Dernière mise à jour : 30/10/2026, 18 h.

## 1. Les branches

- L'admin est un site à part : il vit sur la branche **`admin`** (décision d'Eddy, 30/10/2026), dans le même dépôt, avec `packages/contract`, `packages/brand` et les fichiers de l'app qu'il lit (`apps/mobile/src/data/planning.ts`, `clubs.ts`, `assets/`).
- `main` ne porte plus l'admin. Le commit qui l'en retire est prêt sur la branche **`main-sans-admin`** (verrou des dépendances régénéré, `npm ci`, types, tests du contrat, du serveur et de la base vérifiés) : il se fusionne dans `main` dès que le serveur est d'accord — un mot suffit.
- Toute modification de l'admin se fait sur `admin` : `git switch admin`, ou un worktree (`git worktree add ../boxing-app-admin admin`). Ce qui a été écrit dans `apps/admin` sur `main` ces derniers jours (collections Postgres, comptes staff Auth, lecture des vidéos, combats, limites des médias, pont) a été repris sur `admin` le 30/10 : rien n'est perdu.
- `admin` reprend `main` quand le contrat ou le serveur changent : `git merge main`. **La première fois après le retrait d'apps/admin de main**, la fusion s'enregistre sans reprendre la suppression : `git merge -s ours main` (une fois), puis les fusions suivantes redeviennent ordinaires. `main` ne reprend jamais `admin`.
- La branche `admin` est vérifiée à chaque poussée (`.github/workflows/admin.yml` : types, lint, tests, construction de production). Le flux de `main` ne vérifie pas l'admin : un changement d'admin poussé sur `main` n'est testé nulle part.

## 2. Ce que l'admin lit et écrit hors de lui (état au 30/10/2026)

| Fichier de l'admin | Lit | Écrit | Variables |
|---|---|---|---|
| `src/server/members.ts` (rubrique Adhérents) | `profiles`, `deciplus_snapshots`, `subscription_state`, `link_requests` (clé de service, côté serveur seulement, pages de 1 000) | rien directement : une décision part en `POST /internal/admin/link-resolution` (`{ link_request_id, resolution, actor }`, signature `x-bc-timestamp` / `x-bc-signature`) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MEMBER_BRIDGE_URL`, `ADMIN_BRIDGE_SECRET` |
| `src/server/pg-collections.ts`, `store.ts` | `admin_collections` | `admin_collections`, `audit_log` | les mêmes |
| `src/server/staff-auth.ts`, `accounts.ts` | Supabase Auth, `staff_roles` | — | les mêmes |
| `src/server/member-bridge.ts`, `live-bump.ts`, `components/LiveRefresh.tsx` | `POST /internal/admin/shop-health`, `/internal/admin/link-requests` ; Realtime `live_signals` | `POST /internal/admin/live-bump` après chaque écriture | `MEMBER_BRIDGE_URL`, `ADMIN_BRIDGE_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `src/server/branchements.ts` | un appel signé à `shop-health`, un `count` sur `profiles`, la présence des clés publiques | — | toutes, par leur nom seulement |
| `src/app/api/*` (ce que l'app lit) | les collections de l'admin | `envois`, `messagerie`, `propositions`, `events.jsonl` | — |

Sans `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, la rubrique Adhérents tourne sur des exemples locaux marqués comme tels ; la page Branchements le dit.

## 3. Ce que l'admin attend encore du serveur

1. **`POST /internal/admin/link-requests`** : aujourd'hui `{ items: [{ id, profileId, email, status }] }`. Pour que l'admin cesse de lire la base lui-même, la route devrait rendre ce que l'écran montre : pour chaque demande `a_revoir`, `id`, `order_id`, `created_at`, `decided_at`, `deciplus_member_id`, `mismatch_fields`, `reason`, et le profil (`prenom`, `nom`, `email`, `telephone`, `date_naissance`, `club_principal`, `link_status`, `consentement_parental_requis`, `created_at`). Plus une route de lecture des comptes (`profiles` + `deciplus_snapshots` + `subscription_state`, paginée) pour l'annuaire. Tant que ce n'est pas là, `members.ts` lit la base directement : c'est volontaire et borné à ce fichier.
2. **L'acteur d'une décision.** `link_requests.resolved_by` et `audit_log.actor` sont des `uuid` vers `auth.users` ; l'admin envoie l'identifiant texte de son compte (`actor`, ≤ 80 caractères). Sur la base réelle, la mise à jour échouera. Deux sorties : accepter un texte (`resolved_by text`, ou une colonne `resolved_by_label`), ou attendre que les comptes de l'équipe soient des utilisateurs Supabase (`staff-auth.ts` va dans ce sens) et envoyer alors leur `uuid`. L'admin suivra l'une ou l'autre.
3. **Les notifications.** L'admin les met en file (`notifications`, `envois`) mais rien ne part : aucun jeton d'appareil n'existe (l'app n'en enregistre pas, le serveur n'a pas de route `devices`). Il manque : une route pour que l'app enregistre son jeton Expo (profil, plateforme, version), et soit une route d'envoi côté serveur (l'admin lui passe la cible : clubs, statuts, et le message), soit l'accès lecture à `devices` pour que l'admin envoie lui-même via l'API Expo (`EXPO_ACCESS_TOKEN`). La première option garde la clé de service d'un seul côté.
4. **Les comptes de l'équipe.** `staff-auth.ts` ouvre la connexion par Supabase Auth ; les rôles de `staff_roles` (`direction`, `communication`, `administratif`, `coach`) sont ceux de `src/lib/permissions.ts` — garder les mêmes mots. Les liens d'activation de l'admin (`accounts.ts`) ne sont pas envoyés : le crochet Brevo du serveur peut les porter (invitation Supabase), et l'admin lira le rôle dans `staff_roles`.
5. **Les vidéos.** `api/videos/[id]/lecture` est en place ; il manque le dépôt (Cloudflare Stream : URL de dépôt direct signée, `CLOUDFLARE_STREAM_ACCOUNT_ID` / `CLOUDFLARE_STREAM_TOKEN`). L'assistant Vidéos sait déjà poser une référence Stream ou une adresse.
6. **Les données de l'admin.** Avec `pg-collections.ts`, `admin_collections` devient la source et les fichiers JSON une copie locale : dire laquelle fait foi en cas de désaccord (aujourd'hui : Postgres si la table répond, sinon les fichiers). Les sauvegardes de l'admin (`npm run backup`) copient les fichiers ; la base a les siennes (PITR ou export quotidien).

## 4. Déploiement

- Même hôte que le serveur (BotHosting, Node 22), derrière le même tunnel : `ADMIN_APP_DIR` du lanceur doit pointer vers un **checkout de la branche `admin`** (pas `main`, qui n'aura plus `apps/admin`), construit par `npm ci && npm run build --workspace apps/admin`. `ADMIN_DATA_DIR` sur le disque persistant, `TRUST_PROXY=1`, les variables de `apps/admin/.env.example`.
- Un nom d'hôte du tunnel pour l'admin (par exemple `admin.boxingcenter.fr` → `http://127.0.0.1:3001`), ou le relais `ADMIN_INTERNAL_URL` du serveur pour `/api/*` : les deux marchent, le premier donne une adresse propre à l'équipe.
- Sauvegardes : `npm run backup --workspace apps/admin` une fois par jour (tâche planifiée), trente gardées ; Branchements affiche la date de la dernière.

## 5. Constats datés

- 30/10 : `main` a reçu quatre commits d'admin dans la journée (pont, limites des médias, Postgres, vidéos). Tous repris sur `admin` le soir même. À partir du retrait, ils iront directement sur `admin`.
- 30/10 : la signature des appels admin → serveur est testée contre le code même du serveur (`apps/admin/test/bridge-sign.test.ts` importe `apps/bridge/src/signature.ts`) : si l'un change, l'autre le voit.
- 30/10 : la route `/internal/admin/link-requests` et la table de la page Deciplus ont été remplacées, côté admin, par un compte et un renvoi vers la rubrique Adhérents, qui montre tout et tranche.
