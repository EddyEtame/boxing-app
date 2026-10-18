# Livrable 3 — Maquettes de l'application

Application mobile BOXING CENTER · cahier des charges §16, §20-3 · version du 18 octobre 2026 · à relire avec la direction.

## 1. Ce que sont ces maquettes

Ce ne sont pas des dessins : ce sont les **vrais écrans de l'application**, construits dans le code (`apps/mobile`), affichés au format téléphone (390 × 844) et capturés. Ils se lancent sur ordinateur (`npm run mobile:web`), sur téléphone (Expo Go, même Wi-Fi) et, plus tard, en version compilée. Avantage sur une maquette HTML/CSS séparée : rien ne sera redessiné, les écrans validés ici deviennent l'application.

Ce qui est **réel** dans ces écrans : les cinq clubs (adresses, horaires), les 188 créneaux des plannings, les offres, les 28 portraits de coachs et de boxeurs, les disciplines, le flux d'actualité des combats, les photos (toutes réelles, aucune image générée).
Ce qui est **de démonstration** : l'adhérente « Camille Durand », ses passages, ses factures, les vidéos, les propositions d'entraînement, les actualités du club. Tout cela sera remplacé par les données du serveur et de Deciplus.

## 2. Deux niveaux d'accès (§3), un seul écran d'accueil

L'application ne demande pas de choisir un mode : elle regarde **qui est devant l'écran**.

- Sans compte ou sans abonnement actif → **version restreinte** : la vitrine (offres, clubs, disciplines, portraits, actualité des combats, actualités du club, boutique, création de compte). Les fonctions réservées sont visibles et expliquées, jamais cachées (§16 : « identifiées clairement »).
- Abonnement actif → **version intégrale** : accueil personnalisé (prochain cours dans son club, chiffres de la semaine et du mois, carnet des passages, coachs de son club), badge, abonnement et factures, planning de ses clubs, vidéos, propositions d'entraînement.

Un commutateur de démonstration (Invité / Adhérent) en bas à droite permet de voir les deux versions pendant la relecture ; il disparaît dans l'application publiée.

## 3. Le menu (§16) et où vit chaque rubrique

| Rubrique recommandée par le CDC | Dans l'application |
|---|---|
| 1 Accueil | onglet **Accueil** |
| 2 Mon badge | onglet **Badge** (au centre, surélevé : la fonction prioritaire) |
| 3 Mon abonnement / Mes factures | onglet **Moi** |
| 4 Mes entraînements / statistiques | **Accueil** (chiffres, carnet) et **Moi** |
| 5 Plannings | onglet **Planning** |
| 6 Vidéos & tutoriels | onglet **Entraîner** |
| 7 Entraînements entre membres | onglet **Entraîner** (propositions sur les plages d'accès libre) |
| 8 Actualités & événements | **Accueil** ; écrans Équipe, Disciplines, Combats |
| 9 Boutique | depuis les offres et depuis **Moi** (navigateur intégré) |
| 10 Contacter Boxing Center | depuis **Moi** (modale Contact) |

Cinq onglets au lieu de dix entrées : un pouce atteint tout, et le badge est au centre.

## 4. Les écrans (captures dans `maquettes/`)

| Nº | Écran | Ce qu'on y vérifie | Cahier des charges |
|---|---|---|---|
| 01 | Accueil invité, haut | « Entre. Essaie. Reviens. », offres en affiches, création de compte | §3A, §16 |
| 02 | Accueil invité, disciplines et portraits | huit disciplines avec le nombre de clubs ; portraits des coachs et boxeurs | §3A |
| 03 | Accueil invité, combats et actualités | trois dernières actualités de combats (flux en direct), actualités du club | §3A, §8, §13 |
| 04 | Création de compte | nom, prénom, e-mail, téléphone, date de naissance, mot de passe | §2 |
| 05 | Accueil adhérent, haut | salutation, chiffres de la semaine, clubs choisis, club actif ouvert ou fermé, prochain cours avec compte à rebours | §6, §7 |
| 06 | Accueil adhérent, statistiques et carnet | séances du mois, moyenne, répartition par club, huit semaines, carnet des passages avec tampon « présent » | §6 |
| 07 | Accueil adhérent, coachs et actualités | coachs du club actif, actualités, entrée vers les combats | §3A, §8 |
| 08 | Badge adhérent | QR renouvelé toutes les 60 s avec chrono, numéro de badge, code comptoir, protection d'écran annoncée | §4 |
| 09 | Badge invité | verrouillé : ce qu'il faut pour l'obtenir (abonnement puis badge physique) | §4 condition commerciale |
| 10 | Planning | jour / semaine, club actif, espaces (États-Unis), discipline, horaire, durée | §7 |
| 11 | Entraîner | vidéos avec mention de sécurité, propositions d'entraînement sur les plages libres, règle sparring 18 ans | §9, §11 |
| 12 | Moi | abonnement (type, statut, dates, échéances), factures avec origine et téléchargement, Mes clubs, boutique, contact, notifications, langue, suppression du compte | §5, §12, §14, magasins |
| 13 | Équipe, boxeurs | portraits et fiches des boxeurs | §3A, §8 |
| 14 | Équipe, coachs | portraits et fiches des coachs par club | §3A, §8 |
| 15 | Disciplines | huit familles, clubs qui les proposent, lus dans le planning | §3A |
| 16 | Actualité des combats | flux actu-mma.com, source et date sur chaque ligne | §13 |

## 5. Identité visuelle (§16)

Noir `#080808` en fond, blanc `#F5F5F5`, navy `#20254B`, rouge `#E8001C` réservé à l'énergie (compte à rebours, barre, tampon ; jamais en fond) ; Bebas Neue pour les titres et les chiffres, Montserrat pour le texte, IBM Plex Mono pour les étiquettes techniques (numéros, horodatages). Photos réelles des clubs, assombries et grainées comme sur les affiches. Mouvement court et net (120 à 360 ms), ressort « gant » sur les pressions.

## 6. Ce que ces maquettes ne montrent pas encore

L'interface d'administration (§15), les messages coachs → adhérents (§10), les notifications réelles (§14), la création réelle d'une proposition (§11), la lecture du badge à la porte (§4). Ces pièces arrivent avec le serveur (livrables 8 à 12).

## 7. Comment relire

1. `npm install` puis `npm run mobile:web` à la racine du dépôt : l'application s'ouvre dans le navigateur ; réduire la fenêtre à la largeur d'un téléphone.
2. Ou `npm run mobile` et scanner le QR avec Expo Go sur un téléphone connecté au même Wi-Fi.
3. Le commutateur Invité / Adhérent en bas à droite bascule entre les deux versions.
