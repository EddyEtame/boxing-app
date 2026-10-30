# Application mobile BOXING CENTER — iOS & Android

Application officielle Boxing Center (App Store et Google Play), son serveur applicatif
et ses connecteurs. Le cahier des charges fait foi sur le périmètre.

## L'interface d'administration

L'admin (`apps/admin`, Next.js) est un site à part : il vit sur la branche **`admin`** de ce
dépôt, pas sur `main` (décision du 30/10/2026). Pour y travailler : `git switch admin`, ou
`git worktree add ../boxing-app-admin admin`. Ce qu'il lit et écrit hors de lui, ce qu'il
attend du serveur et comment il se déploie : `apps/admin/src/server/couture.md`, sur cette
branche. `admin` reprend `main` (`git merge main`) ; `main` ne reprend jamais `admin`.

## Dépôts

Deux dépôts reçoivent exactement le même historique :

- `angoularaphael/appli-boxing` — le dépôt de travail de l'équipe. **On tire toujours d'ici.**
- `EddyEtame/boxing-app` — copie miroir. On y pousse en même temps.

Le remote `origin` est câblé pour ça : `git pull origin main` tire du dépôt de l'équipe,
`git push origin main` pousse sur les deux dépôts d'un seul geste.

## Règles de travail

1. `git pull origin main` **avant** de commencer et **avant** de pousser. Jamais de `push --force`.
2. Aucune signature d'outil dans les messages de commit. Le crochet `.githooks/commit-msg`
   les retire ; il s'active une fois par clone avec `git config core.hooksPath .githooks`
   (ou `npm install` quand le `package.json` existera).
3. Aucun secret, aucune URL de base, aucun identifiant dans le code. Tout passe par `.env`
   (gitignoré) ; `.env.example` ne contient que les noms des variables.
4. Les documents internes (cahier des charges, notes de recherche, décisions) vivent dans
   `.research/` et dans les PDF à la racine : les deux sont gitignorés.
5. Messages de commit en français, courts, qui disent ce qui change pour l'utilisateur.

## État

Le choix de la pile technique est en cours de décision. Le code arrive après.
