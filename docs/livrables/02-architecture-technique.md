# Livrable 2 — Proposition d'architecture technique

Application mobile BOXING CENTER · cahier des charges §17, §20-2 · version du 18 octobre 2026 · à relire avec la direction.

## 1. Le choix qui commande tout : une seule base de code pour iOS et Android

**Expo + React Native + TypeScript.** Un seul code produit l'application Android, l'application iOS et une version web (utile pour les maquettes et les tests). Rien n'est écrit deux fois.

Pourquoi ce choix, et pas un autre :

| Critère du CDC §17 | Ce que la pile apporte |
|---|---|
| « Une seule application fonctionnelle sur iOS et Android » | un code, deux magasins ; le web en plus |
| « La possibilité de faire évoluer l'application » | même langage (TypeScript) que la boutique, la plateforme coachs, les sites de club et le robot Deciplus : toute l'équipe (Raphaël, Brad, Junior, Eddy) peut intervenir |
| Compilation iOS sans Mac | EAS Build compile l'iOS dans le nuage ; l'équipe travaille sous Windows |
| Corrections sans repasser par les magasins | `expo-updates` livre les corrections JavaScript directement |
| Sécurité du badge | `expo-screen-capture` (captures), `expo-secure-store` (secret du badge), App Attest / Play Integrity (appareil attesté), `expo-crypto` (HMAC) |
| Push | `expo-notifications` sur FCM v1 et APNs |

Écarté : Flutter (aucun Dart dans l'équipe, admin dans une autre langue), Kotlin Multiplatform (même raison), Capacitor (un site dans une coque : gestes et défilement médiocres), natif Swift + Kotlin (deux bases de code, contraire au §17).

Versions au 18/10/2026 : Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 strict ; cibles Android API 36 et iOS 26 (exigences des magasins).

## 2. Les pièces

```
boxing-app/                      un dépôt, un langage
  apps/mobile                    l'application (Expo) — existe
  apps/admin                     l'interface d'administration web (Next.js, Vercel)
  apps/bridge                    le serveur applicatif (Node) : comptes, sessions, badges,
                                 connecteur Deciplus, push, tâches planifiées
  packages/domain                schémas et règles métier partagés (zod) : statuts, droits,
                                 âges, créneaux, validation des formulaires
  packages/brand                 jetons de marque (couleurs, typographie, mouvement) — existe
  supabase/                      base Postgres : migrations, règles d'accès par ligne, fonctions
```

| Pièce | Rôle | Hébergement |
|---|---|---|
| Application mobile | tout ce que voit l'adhérent et le prospect | App Store, Google Play ; EAS Build et Submit |
| Admin web (§15) | comptes et droits, statut Deciplus, actualités, événements, vidéos, plannings, notifications, messages, modération, interrupteurs de fonctions, statistiques d'usage | Vercel (comme les sites de club) |
| Serveur applicatif (`bridge`) | la seule porte vers la base et vers Deciplus ; signe les sessions et les badges ; file de tâches ; crons (lecture nocturne, rappels) | à côté des robots existants (même hébergeur), ou Fly.io région Paris |
| Base Supabase | Postgres (région Paris), Storage (médias, factures en cache), Realtime (admin), sauvegardes PITR | Supabase Pro |
| Connecteur Deciplus | le robot existant de la boutique, étendu en lecture, derrière l'interface `DeciplusProvider` | hébergement actuel du robot |
| Push | Expo Push Service → FCM v1 (Android) et APNs (iOS) | — |
| Vidéo (§9) | Cloudflare Stream : URLs signées, débit adaptatif, pas de téléchargement | Cloudflare |
| Erreurs et usage (§17) | Sentry (région UE) ; statistiques d'usage dans des tables maison lues par l'admin | — |
| Paiements (§5, §12) | jamais dans l'app : la boutique (box-plus, Payplug) s'ouvre dans un navigateur intégré | existant |

## 3. Le modèle de données (Supabase, région Paris)

| Table | Contenu | Accès |
|---|---|---|
| `profiles` | identité (nom, prénom, e-mail, téléphone, date de naissance), `deciplus_member_id`, statut (`invite`, `restreint`, `actif`), club principal, clubs choisis, langue, consentement parental | l'adhérent lit le sien ; l'admin selon rôle |
| `sessions`, `devices` | sessions signées, appareils attestés, révocation | serveur seulement |
| `badges` | activation après vente du badge physique, secret haché, appareil, dates | serveur seulement |
| `access_log` | chaque passage ou refus : code présenté (haché), appareil, club, heure | source des statistiques §6 et des alertes |
| `deciplus_snapshots` | dernier état lu par le robot : abonnement, dates, échéances, impayés, badge, horodatage | serveur ; affiché avec sa date |
| `invoices_index` | index des factures (origine Deciplus ou boutique, numéro, date, montant, lien signé) ; jamais le PDF régénéré | l'adhérent lit les siennes |
| `clubs`, `spaces`, `slots`, `free_access` | plannings des cinq clubs, espaces (États-Unis), plages d'accès libre | lecture publique ; écriture admin |
| `news`, `events` | actualités, galas, stages, offres : titre, texte, photo, vidéo, date, lien billetterie, visibilité (public / adhérents) | lecture publique ; écriture communication |
| `videos` | discipline, niveau, durée, objectif, gratuite ou réservée, mention de sécurité | lecture selon statut |
| `messages_direction` | messages des adhérents à la direction, statut de traitement | adhérent (les siens), admin |
| `staff_messages` | messages coach → adhérent (notification, sans réponse) | serveur, admin |
| `trainings`, `training_participants` | propositions d'entraînement, inscriptions, catégorie, modération | adhérents actifs ; modération admin |
| `notification_prefs`, `push_tokens` | préférences par catégorie, jetons d'appareil | adhérent |
| `roles` | direction, communication, administratif, coach/staff, adhérent (§15) | serveur |

Chaque table est protégée par des règles d'accès par ligne ; l'application ne parle jamais à la base avec des droits d'écriture larges.

## 4. Comptes, sessions, badge : la sécurité (§17, §4)

- **Compte** : e-mail + mot de passe (§2), mot de passe haché (Argon2), lien par e-mail pour l'oubli, code à 6 chiffres à usage unique pour vérifier l'e-mail. Pas de connexion sociale.
- **Session** : jeton d'accès court (15 min) signé par le serveur, lié à l'appareil (attestation App Attest / Play Integrity à la création, clé d'appareil en `SecureStore`), jeton de rafraîchissement avec rotation ; un jeton réutilisé révoque la session ; table `sessions` révocable depuis l'admin ; « déconnecter cet appareil » dans l'app.
- **Badge** : secret d'appareil distinct de la session, remis une seule fois après que le robot a lu la vente du badge physique ; code tournant HMAC-SHA-256, fenêtre 60 s, le validateur accepte la fenêtre précédente ; hors connexion ; protection d'écran en meilleur effort.
- **Appels internes** : robot ↔ serveur ↔ admin signés (HMAC, nonce, horodatage, dérive 60 s).
- **Limites de débit** : par appareil et par compte (connexion 5 / 15 min, code comptoir 10 / h, badge 1 / s).
- **Données** : chiffrées en transit (TLS) et au repos ; secrets dans le coffre de l'hébergeur, rotation trimestrielle ; aucune clé dans le code.
- **Mineurs** : moins de 15 ans → consentement parental ; moins de 18 ans → exclus du sparring ; compte parent avec profils enfants (option).
- **RGPD** : politique de confidentialité, export et suppression du compte dans l'app (obligation des magasins), effacement côté app seulement (le club garde ses obligations comptables côté Deciplus), journal des accès admin.

## 5. Le connecteur Deciplus

```
interface DeciplusProvider {
  findMember(identity): MemberMatch | null      // rapprochement 2 sur 3
  readMember(id): MemberSnapshot                // abonnement, dates, badge
  readSchedule(id): Instalment[]                // échéances, impayés
  listDocuments(id): InvoiceRef[]               // factures (à vérifier)
  exportAttendance(range): AttendanceRow[]      // passages par lot (à vérifier)
  sellBadge / sellOffer / cancel                 // déjà dans le robot
  health(): BridgeHealth                         // file, dernier succès, OTP
}
```

Rythme : lecture nocturne complète par lot ; lecture à la demande (badge ouvert depuis plus de 6 h) ; retour immédiat après une vente ou une résiliation. Mode dégradé automatique : états gelés avec leur date, badge valable 24 h sur le dernier état connu, bandeau dans l'admin. Tests de contrat quotidiens contre le back-office pour détecter un changement d'écran.

## 6. Le validateur de porte (route R2)

Un petit service (sur le serveur applicatif) reçoit le code lu par le lecteur QR du club, recalcule le code attendu pour la fenêtre courante et la précédente, vérifie l'appareil et le statut, ouvre le relais et écrit la ligne dans `access_log`. Le pointage au comptoir (route R3) passe par le même service, depuis l'app staff.

## 7. Notifications (§14)

Catégories : direction (essentielle), coach/staff, événements, promotions, vidéos, rappels d'entraînement, modifications de rencontre, échéances, impayés. Préférences par catégorie dans l'app ; Android 13+ demande la permission à l'exécution ; iOS affiche un écran d'explication avant la demande système. Envoi depuis l'admin, ciblé par club, statut ou liste.

## 8. Environnements, livraison, exploitation

| Sujet | Choix |
|---|---|
| Environnements | développement (Expo Go et builds de développement), recette (TestFlight et tests internes Play, base de recette), production |
| Intégration continue | GitHub Actions : types, lint, tests, budget de performance ; EAS Build et Submit ; Vercel pour l'admin |
| Sauvegardes (§17) | Supabase PITR + export hebdomadaire chiffré vers un stockage Boxing Center |
| Suivi des erreurs (§17) | Sentry, alertes sur le serveur, le robot et l'app |
| Statistiques d'usage (§15) | événements anonymisés dans des tables maison, lus par l'admin |
| Contrôle (§20) | comptes Apple, Google, Supabase, Vercel, Cloudflare, Sentry au nom de la SAS Boxing Center ; les développeurs y sont invités, jamais propriétaires |
| Langues | français ; anglais disponible (textes séparés du code) |

## 9. Coûts récurrents indicatifs

| Poste | Ordre de grandeur |
|---|---|
| Apple Developer Program | 99 $ / an |
| Google Play Console | 25 $ une fois |
| Supabase Pro (PITR) | ~25 $ / mois + stockage |
| EAS (builds iOS et Android) | 0 à 99 $ / mois selon la cadence |
| Sentry | 0 à 26 $ / mois |
| Cloudflare Stream | 10 à 60 $ / mois selon le volume |
| Vercel (admin) | 0 à 20 $ / mois |
| Hébergement du serveur applicatif et des robots | existant ; sinon ~10 $ / mois |

## 10. Ce que cette architecture ne fait pas, volontairement

Pas de paiement dans l'app ; pas de messagerie entre adhérents ; pas de régénération de factures ; pas de suppression de données dans Deciplus ; pas de kit d'interface générique (tout est dessiné aux couleurs du club) ; pas de dépendance à une API Xplor qui n'existe pas.
