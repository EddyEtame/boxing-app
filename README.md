# Application mobile BOXING CENTER — iOS & Android

Application officielle Boxing Center (App Store et Google Play), son interface
d'administration web et ses connecteurs. Le cahier des charges fait foi sur le périmètre.

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
