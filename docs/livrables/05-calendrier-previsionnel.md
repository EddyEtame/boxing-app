# Livrable 5 — Calendrier prévisionnel de réalisation

Application mobile BOXING CENTER · cahier des charges §19, §20-5 · version du 18 octobre 2026 · à relire avec la direction.

## 1. Hypothèses

- Les livrables 1 à 5 sont relus et validés par la direction **au plus tard le vendredi 30 octobre 2026**.
- Le développement commence le **lundi 2 novembre 2026** avec deux à trois développeurs en parallèle (phase 1), puis un à deux.
- Semaine du 21 décembre au 3 janvier : activité réduite de moitié.
- Les comptes développeur Apple et Google existent **avant le 15 janvier 2027** (délai de vérification Apple : jusqu'à deux semaines).
- Le compte Deciplus de test et les lecteurs de test sont disponibles **avant le 16 novembre 2026** ; sans eux, les briques « connecteur » et « badge à la porte » glissent d'autant.

## 2. Le calendrier

| Période | Semaines | Jalon | Contenu |
|---|---|---|---|
| 19 → 30 oct. 2026 | 2 | **Validation des livrables 1 à 5** | relecture, arbitrages (hébergeur, vidéo, route de porte au lancement), question écrite à Xplor, demande des lecteurs et du compte de test |
| 2 nov. → 22 janv. 2027 | 11 (10 effectives) | **Phase 1 livrée en recette** | serveur, comptes, connecteur Deciplus, badge, abonnement et factures, statistiques, plannings et admin, actualités et admin, boutique, finition, tests automatisés |
| 16 nov. 2026 | — | essais sur lecteurs | T1, T2, T4 dès réception ; choix de la route par club |
| 14 déc. 2026 | — | première version installable | build de développement Android et iOS (EAS), tests internes sur téléphones |
| 25 janv. → 26 févr. 2027 | 5 | **Phase 2 livrée en recette** | vidéos, messagerie direction, messages coachs, push, actualités boxe et MMA |
| 8 févr. 2027 | — | première bêta adhérents | TestFlight et tests internes Play, 20 à 30 adhérents volontaires, phase 1 seule |
| 1 → 26 mars 2027 | 4 | **Phase 3 livrée en recette** | propositions d'entraînement, inscriptions, règles, modération |
| 8 mars → 2 avr. 2027 | 4 | **Tests avec des adhérents** (livrable 13) | deuxième vague, 50 à 100 adhérents, tous les clubs, corrections au fil de l'eau |
| 6 avr. 2027 | — | soumission aux stores | fiches, captures, textes, politique de confidentialité, validation (3 à 10 jours chacun) |
| **20 avr. 2027** | — | **Mise en ligne** | Google Play et App Store ; communication dans les clubs |
| 20 avr. → 20 mai 2027 | 4 | stabilisation | corrections rapides, suivi des erreurs, premiers retours ; passage en maintenance (livrable 16) |

Durée totale : **6 mois** de la validation à la mise en ligne, dont 20 semaines de développement.

## 3. Ce qui peut être déployé plus tôt (§19 « déploiement progressif »)

- **Version vitrine** (mode restreint seul : clubs, plannings, disciplines, portraits, actualités, combats, boutique) : publiable dès que les comptes développeur existent, sans Deciplus. Elle existe déjà en maquette fonctionnelle. Mise en ligne possible en **février 2027**, ce qui ouvre les stores et commence la communication avant l'espace membre.
- **Espace membre sans badge à la porte** (abonnement, factures, statistiques, pointage comptoir) : dès la phase 1, même si les lecteurs tardent.

## 4. Dépendances et risques de calendrier

| Dépendance | Qui | Date limite | Si elle manque |
|---|---|---|---|
| Validation des livrables 1 à 5 | direction | 30 oct. 2026 | tout glisse d'autant |
| Compte Deciplus de test, badge de test, accès Manager → Lecteurs | direction | 16 nov. 2026 | le connecteur avance à l'aveugle ; recette décalée |
| Modèle des lecteurs, un lecteur de test | direction | 16 nov. 2026 | route R3 seule au lancement ; R2 ajoutée club par club après |
| Comptes Apple et Google au nom de la SAS | direction | 15 janv. 2027 | pas de bêta TestFlight, pas de publication |
| Réponse de Xplor | Xplor | sans engagement | n'empêche rien : R2 et R3 n'en dépendent pas |
| Règles d'assurance pour le sparring et les mineurs | direction, assureur | 1 mars 2027 | phase 3 livrée avec les règles par défaut (18 ans, catégories désactivables) |
| Vidéos à publier (tournage) | direction, coachs | 25 janv. 2027 | la rubrique ouvre avec peu de contenus |

## 5. Rythme de relecture avec la direction

Un point de trente minutes **toutes les deux semaines** (le jeudi), sur la version installable du moment ; une recette formelle à la fin de chaque phase ; les décisions consignées le jour même.
