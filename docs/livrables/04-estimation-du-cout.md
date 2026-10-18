# Livrable 4 — Estimation du coût de développement

Application mobile BOXING CENTER · cahier des charges §19, §20-4 · version du 18 octobre 2026 · à relire avec la direction.

## 1. Méthode

Le coût est compté en **jours de travail** par brique, phase par phase, dans l'ordre du §19. Le montant dépend du tarif journalier retenu ; trois hypothèses sont données en §5. L'estimation suppose ce qui existe déjà et qu'on réutilise : le robot Deciplus de la boutique, la boutique et son parcours de paiement, les plannings structurés, les sites de club (contenus), le flux d'actualité des combats, et la base d'application déjà construite (jetons de marque, écrans, données réelles). Sans ces réemplois, il faudrait compter environ 60 jours de plus.

Chaque ligne porte une marge d'incertitude : **±** signifie que la brique dépend d'une vérification encore ouverte (livrable 1, §10).

## 2. Phase 1 — Fondations et espace membre

| Brique | Contenu | Jours |
|---|---|---|
| Serveur applicatif, comptes, sessions | base Supabase, schéma, règles d'accès, création de compte, mot de passe, e-mail, sessions liées à l'appareil, suppression de compte | 12 |
| Connecteur Deciplus en lecture ± | rapprochement 2 sur 3, lecture de la fiche, échéancier, impayés, badge, documents, export des passages, lecture nocturne, mode dégradé, tests de contrat | 15 |
| Badge QR | activation après vente du badge, secret d'appareil, code tournant, protections d'écran, validateur de porte (route R2), pointage comptoir (route R3) avec l'app staff ± | 12 |
| Mon abonnement, Mes factures | écrans branchés sur les lectures Deciplus et boutique, téléchargement PDF, régularisation d'un impayé par la boutique | 6 |
| Statistiques | calcul depuis les passages réels (export ou journal), affichage existant | 4 |
| Plannings | tables, import des données existantes, édition dans l'admin, espaces d'États-Unis | 8 |
| Actualités et événements | tables, publication dans l'admin (titre, texte, photo, vidéo, date, lien billetterie), reprise des contenus des sites | 8 |
| Boutique | navigateur intégré avec session, liens profonds vers les offres | 2 |
| Interface d'administration, socle | authentification, cinq rôles, statut de connexion à Deciplus, journal, interrupteurs de fonctions | 10 |
| Finition de l'interface et performance | passes de finition, mouvement, accessibilité, budget de performance mesuré | 8 |
| Tests automatisés | sessions, rejeu, badge, connecteur, règles de droits | 6 |
| **Total phase 1** | | **91** |

## 3. Phase 2 — Contenus et communication

| Brique | Contenu | Jours |
|---|---|---|
| Vidéos et tutoriels | hébergement Cloudflare Stream, URLs signées, bibliothèque classée (discipline, niveau, durée, objectif), gratuites / réservées, mention de sécurité, ajout dans l'admin | 8 |
| Messagerie vers la direction | envoi depuis l'app, file et traitement dans l'admin, statuts | 6 |
| Messages coachs / staff → adhérents | envoi individuel ou ciblé depuis l'admin, notification, aucune réponse possible, bouton « écrire à la direction » | 5 |
| Notifications push | jetons, catégories, préférences, écran d'explication, envoi ciblé depuis l'admin, rappels d'échéance | 6 |
| Actualités boxe et MMA | extension du flux à la boxe anglaise, écran existant branché | 4 |
| **Total phase 2** | | **29** |

## 4. Phase 3 — Entraînements entre membres

| Brique | Contenu | Jours |
|---|---|---|
| Propositions | création (club, date, créneau d'accès libre, catégorie, observation), consultation, inscription, annulation | 8 |
| Règles et modération | âge, droits, catégories désactivables, règles sparring, modération et suppression dans l'admin, notifications de modification | 6 |
| **Total phase 3** | | **14** |

## 5. Transverse

| Brique | Contenu | Jours |
|---|---|---|
| Tests avec des adhérents (livrable 13) | préparation, deux vagues, corrections | 10 |
| Publication sur les stores (livrable 14) | comptes, fiches, captures, textes, validation Apple et Google, réponses aux refus | 5 |
| Documentation technique et administrative (livrable 15) | guide de l'admin, exploitation, reprise par une autre équipe | 5 |
| Revue de sécurité | relecture du dessin, tests d'intrusion internes, rotation des secrets | 4 |
| Pilotage et relectures | points avec la direction, arbitrages, recette | 8 |
| **Total transverse** | | **32** |

## 6. Récapitulatif

| | Jours |
|---|---|
| Phase 1 | 91 |
| Phase 2 | 29 |
| Phase 3 | 14 |
| Transverse | 32 |
| **Total** | **166 jours** (fourchette 150 à 190 selon les vérifications ouvertes) |

| Hypothèse de tarif journalier | Coût de développement |
|---|---|
| 300 € | 49 800 € |
| 400 € | 66 400 € |
| 500 € | 83 000 € |

Si l'équipe interne réalise le projet, le coût se lit en jours répartis entre les quatre développeurs (voir le calendrier, livrable 5).

## 7. Coûts récurrents (hors développement)

| Poste | Par an |
|---|---|
| Apple Developer Program | 99 $ |
| Google Play Console | 25 $ une fois |
| Supabase Pro (sauvegardes point dans le temps) | ~300 $ |
| EAS (compilations iOS et Android) | 0 à 1 200 $ selon la cadence |
| Sentry | 0 à 310 $ |
| Cloudflare Stream | 120 à 720 $ selon le volume de vidéos |
| Vercel (admin) | 0 à 240 $ |
| **Ordre de grandeur** | **600 à 2 900 $ par an** |

## 8. Ce qui n'est pas compté

- Le **matériel** des clubs : lecteurs QR, relais, tablettes (route R2), à la charge de Boxing Center ; prix selon le modèle retenu.
- Les éventuels frais Xplor (Decipass, tickets, prestation partenaire) si une route Xplor est retenue.
- La production des **vidéos** (tournage, montage) : l'app les héberge, elle ne les produit pas.
- La **maintenance** après la mise en ligne (livrable 16).

## 9. Ce qui fait varier le coût

- **À la baisse** : lecture des factures et des passages Deciplus confirmée simple (−5 j) ; route R3 seule au lancement (−4 j) ; pas de compte parent / profils enfants (option, non comptée).
- **À la hausse** : lecteurs différents d'un club à l'autre (+2 j par modèle) ; Xplor demande un parcours imposé (+5 à 10 j) ; comptes développeur créés tard (décalage, pas de coût) ; refus de validation par un store (+2 à 5 j).
