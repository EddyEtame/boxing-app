# Livrable 16 — Proposition de maintenance, de correction et de mises à jour

Application mobile BOXING CENTER · cahier des charges §17, §20-16 · version du 18 octobre 2026 · à relire avec la direction.

## 1. Pourquoi une application se maintient

Une application mobile vit dans deux magasins qui changent leurs règles chaque année, sur des systèmes mis à jour chaque automne, et, ici, au-dessus d'un back-office Deciplus dont l'éditeur peut modifier les écrans sans prévenir. Sans maintenance, l'app cesse de s'installer (cibles de version), le robot cesse de lire (changement d'écran) ou le badge cesse d'ouvrir. La maintenance n'est pas une option : c'est la condition pour que ce qui est livré reste livré.

## 2. Trois natures d'intervention

| Nature | Contenu | Délai visé |
|---|---|---|
| **Corrective** | une fonction ne marche plus : badge, connexion, lecture Deciplus, paiement renvoyé par la boutique, affichage cassé | **bloquant** (badge, connexion, Deciplus) : prise en charge sous 4 h ouvrées, correctif sous 48 h ; **gênant** : correctif sous 5 jours ouvrés ; **mineur** : dans la mise à jour mensuelle |
| **Préventive** | surveillance des erreurs (Sentry), de la santé du robot (file, OTP, dernier succès), des sauvegardes, des certificats et des jetons push ; mise à jour mensuelle des dépendances ; test de restauration trimestriel ; rotation des secrets trimestrielle ; tests de contrat quotidiens contre Deciplus | continu |
| **Adaptative** | nouvelles versions d'iOS et d'Android (chaque automne), nouvelles exigences des stores (cibles, confidentialité), montée de version Expo (une fois par an), changements d'écran Deciplus | sous un mois après la sortie ; immédiat pour Deciplus |
| **Évolutive** | nouvelles fonctions demandées par la direction (compte parent, nouveaux clubs, nouvelles catégories) | sur devis, dans une banque de jours |

## 3. Ce que couvre le forfait mensuel

- Surveillance et astreinte en heures ouvrées (lundi à vendredi, 9 h – 18 h).
- Correctifs sans passer par les stores quand c'est possible (`expo-updates`) ; sinon une publication.
- Mise à jour mensuelle des dépendances, lecture des notes de sécurité.
- Deux publications « système » par an (septembre pour iOS, octobre pour Android) et autant que nécessaire pour les correctifs.
- Rapport mensuel d'une page : incidents, délais, erreurs les plus fréquentes, usage (installations, comptes, badges, passages), sauvegardes testées, dépendances mises à jour.
- Tenue de la documentation (livrable 15) à jour.

Charge estimée : **2 jours par mois** en régime de croisière, **4 jours par mois** les trois premiers mois après la mise en ligne. Les évolutions se prennent sur une **banque de jours** achetée par tranche de 5, consommée sur devis accepté.

## 4. Ce qui reste à la charge de Boxing Center

- Les abonnements aux services (Apple, Google, Supabase, EAS, Sentry, Cloudflare, Vercel), payés directement par la SAS, environ 600 à 2 900 $ par an (livrable 4).
- Le matériel des clubs (lecteurs, relais, tablettes) et son remplacement.
- Les contenus : actualités, vidéos, plannings, messages, modération (depuis l'admin).
- La relation avec Xplor Deciplus (compte, questions, frais éventuels).

## 5. Propriété et continuité (§20)

- Tous les comptes (stores, hébergement, base, vidéo, suivi des erreurs, dépôt Git) sont au nom de la SAS Boxing Center ; les développeurs y sont invités avec le rôle minimal nécessaire et retirés en fin de mission.
- Le code source est dans le dépôt de Boxing Center ; la documentation permet à une autre équipe de reprendre : installation, environnements, secrets (où ils vivent, jamais leur valeur), exploitation, procédures de publication, carte des risques.
- Aucune dépendance à un compte personnel de développeur ; aucune clé dans le code.

## 6. Niveaux de service

| Indicateur | Objectif |
|---|---|
| Disponibilité du serveur applicatif et du validateur de porte | 99,5 % par mois (hors maintenance annoncée, hors Deciplus) |
| Badge affichable hors connexion | toujours (calcul local) |
| Fraîcheur des statuts Deciplus | < 24 h ; < 6 h à l'ouverture du badge ; mode dégradé annoncé au-delà de 24 h |
| Délai de correction d'un bloquant | 48 h |
| Perte de données maximale (sauvegardes) | 24 h (point dans le temps + export hebdomadaire) |

## 7. Fin de contrat

Préavis d'un mois ; remise d'un état des lieux (versions, dépendances, incidents ouverts, secrets à faire tourner) ; retrait de tous les accès ; les sauvegardes et le code restent chez Boxing Center.
