# Livrable 1 — Étude de faisabilité : Deciplus et badges

Application mobile BOXING CENTER · cahier des charges §2, §4, §18, §20-1 · version du 18 octobre 2026 · à relire avec la direction.

Chaque affirmation porte une étiquette : **vérifié** (vu dans le code, sur le site ou dans la documentation Xplor, avec la source), **déduit** (conclusion tirée de faits vérifiés), **à vérifier** (ce qu'on ne saura qu'avec le compte réel ou le matériel).

## 1. Ce que le cahier des charges demande de prouver

- §2 : rapprocher chaque compte créé dans l'app avec la base adhérents Deciplus, de façon fiable ; savoir si la personne est ou a été adhérente, si son abonnement est valide, si un badge est enregistré, et lire les informations de l'abonnement.
- §4 : afficher un QR Code compatible avec le contrôle d'accès des salles, disponible seulement après l'achat du badge physique, impossible à partager utilement.
- §18A : accès aux comptes, statuts, échéances, impayés, factures PDF, badges, historiques de passage ; où sont produites les factures.
- §18B : les lecteurs acceptent-ils un QR affiché sur smartphone ; captures d'écran, QR dynamique, réutilisation.

## 2. Deciplus (Xplor) : ce qui est accessible, et comment

### 2.1 Pas d'API publique — **vérifié**

Xplor Deciplus ne publie ni API, ni webhook, ni connecteur. Les seuls exports documentés sont manuels : CSV de statistiques, archive RGPD par membre, historique de réservations (centre d'aide Xplor, recherche du 17/10/2026). Aucune « connexion API » au sens du §2 n'est possible aujourd'hui.

### 2.2 Boxing Center possède déjà un robot Deciplus en production — **vérifié**

Le dépôt de la boutique (`box-plus/bot`, Playwright) se connecte au back-office avec un compte vendeur, lit le code OTP envoyé par e-mail (IMAP) et sait, aujourd'hui, en production :

| Opération | Fonction du robot | Usage pour l'app |
|---|---|---|
| Chercher une fiche (nom, e-mail, téléphone normalisés), détecter les doublons | `member.js` : recherche, `detectDuplicateError`, `detectHardDuplicatePage` | §2 rapprochement |
| Créer une fiche, annoter un membre, lire sa configuration de club | `createMinimesMember`, `annotateMember`, `detectMemberGymConfig` | §2, §15 |
| Vendre une offre, vendre la **carte badge**, régler les dates du badge | `buyAbonnement`, `buyCarteBadge`, `configureBadgeDeferredDates`, `adjustBadgeEndDate`, `enforceBadgeEcheance` | §4 étapes 2 et 3 |
| Lire l'échéancier et les **impayés**, les nettoyer, reporter une échéance | `echeancier-report.js`, `countUnpaidRows`, `deleteUnpaidOnMember`, `unpaid-daily-ops.js` | §5 échéances, impayés |
| Résilier, annuler une vente | `cancelOneContract`, `cancelSale`, `clickResilierEtEnvoyerMail` | §3B bascule de statut |
| Télécharger la photo d'un membre, collecter les anniversaires | `downloadMemberPhoto`, `collectBirthdayMembers` | profil, communication |
| Lire l'**API interne** du back-office avec le jeton de session | `getAccessToken`, `fetchMemberViaApi`, `fetchCatalogFromApi` | lectures structurées, plus fiables que l'écran |
| Exposer sa santé (file, dernier succès, OTP) | `server.js /health` | §15 « statut de connexion à Deciplus » |

**Conclusion (déduit)** : l'interconnexion §2 n'est pas une étude à faire, c'est une extension **en lecture** d'un robot qui existe, derrière une interface déjà écrite (`DeciplusProvider`, contrat du 16/09/2026 : `ensureMember`, `ensureCredential`, `grantAccess`, `getGrant`, `revokeAccess`, `listAccessEvents`).

### 2.3 Ce que l'app peut lire, point par point (§18A)

| Donnée | Faisabilité | Comment | Statut |
|---|---|---|---|
| Compte adhérent (identité, club, statut) | Oui | recherche robot + API interne | **vérifié** (fonctions existantes) |
| Statut d'abonnement, dates de début et de fin | Oui | fiche membre, ventes, contrat | **vérifié** pour la vente, **à vérifier** pour la lecture par lot |
| Échéances à venir, historique | Oui | échéancier de la fiche | **vérifié** (`echeancier-report.js`) |
| Impayés | Oui | lignes « Impayé » de l'échéancier | **vérifié** (`unpaid-daily-ops.js`) |
| Badge enregistré (numéro, dates) | Oui | vente « carte badge », configuration du badge | **vérifié** (le robot vend et date le badge) ; lecture du numéro **à vérifier** |
| Factures PDF des prélèvements | Probable | documents de la fiche membre (espace documents Deciplus) | **à vérifier** : le robot ne télécharge aujourd'hui que la photo |
| Historique des passages | Probable | export CSV des statistiques de passage, par lot, la nuit | **à vérifier** sur le compte réel (volume, format) |

### 2.4 Où sont produites les factures (§18A, §5) — **vérifié**

- Abonnements par prélèvement et comptants vendus dans Deciplus : factures dans les documents de la fiche Deciplus.
- Achats sur la boutique `boutique.boxingcenter.fr` (box-plus) : PDF produits par la boutique (`pdfkit`, routes `/api/facture/...`), stockés côté boutique.
- Règle : « Mes factures » affiche l'union des deux sources avec l'origine de chaque document ; l'app ne régénère jamais une facture (§5, « éviter les doublons »).

### 2.5 Rapprochement fiable (§2) — **déduit**

Score sur trois champs saisis à la création du compte : e-mail, téléphone, date de naissance. Deux concordances sur trois suffisent ; une seule concordance envoie le compte dans une file de validation manuelle de l'admin ; zéro concordance = prospect (mode restreint). L'identifiant Deciplus est stocké avec l'horodatage de la lecture. Le nom seul n'est jamais suffisant, conformément au §2.

### 2.6 Fréquence et volume (§3B « actualisé régulièrement ») — **déduit**

3 200 adhérents par an. Lecture nocturne complète par lot (exports), jamais fiche par fiche ; rafraîchissement à la demande à l'ouverture du badge si la dernière lecture a plus de six heures ; retour d'information immédiat quand le robot vend, date ou résilie. Mode dégradé si le robot tombe : statuts gelés avec leur date, badge valable sur le dernier état connu pendant 24 h, bandeau dans l'admin.

### 2.7 Ne pas se faire bloquer par Xplor — **déduit**

Trois règles : pas de volume anormal (lots, nuit, cache) ; rien qui contourne un paiement Xplor (Decipass et ticket d'accès peuvent être facturés par l'éditeur, on le dit à la direction avant usage) ; une question écrite à Xplor depuis le compte Boxing Center (« nos lecteurs acceptent-ils un QR autre que Decipass ou ticket ? existe-t-il une API partenaire ? »).

## 3. Badges et lecteurs (§4, §18B)

### 3.1 Le système en place — **vérifié**

La porte est pilotée par la **Decibox** (boîtier réseau, relais) et des lecteurs IP vendus par Xplor : lecteur de badge RFID, et « lecteur QRcode / badge (pour le Decipass) », configurés dans Manager → Règles du club → Lecteurs (guide technique Decibox v2, §12 et §27). Un badge physique est un numéro affecté à une fiche.

### 3.2 Les QR que Xplor sait lire — **vérifié**

- **Decipass** : QR dynamique, lié au téléphone, hors connexion, affiché dans l'application Xplor Active. Algorithme propriétaire : notre app ne peut pas produire un QR que ce lecteur accepte sans Xplor.
- **Ticket d'accès** : QR généré par Deciplus pour une prestation unitaire, lu par le même lecteur, non rétroactif.
- Rien de public ne dit que le lecteur accepte un QR encodant le simple numéro de badge. S'il l'acceptait, une capture d'écran vaudrait un badge pour toujours : le §4 refuse ce scénario.

### 3.3 La direction change les lecteurs — **vérifié (Eddy, 17/10)**

Les clubs vont installer des lecteurs capables de lire des QR ; la référence du matériel arrive. La faisabilité dépend donc de **qui valide le QR à la porte**, pas de la capacité à dessiner un QR.

### 3.4 Les routes possibles

| Route | Principe | Avantages | Limites | Condition |
|---|---|---|---|---|
| R1 — Xplor partenaire | SDK Decipass ou accès « contrôle d'accès » pour notre app | chemin homologué | probabilité faible, délai long | réponse de Xplor |
| R2 — Notre validateur à côté du lecteur | code tournant (HMAC, 60 s, lié à l'appareil), lu par un lecteur QR à relais ou une tablette, validé par notre serveur qui ouvre et journalise | contrôle total ; statistiques §6 en temps réel ; Deciplus ne voit rien | matériel par club ; nous portons la sécurité | lecteurs reçus, test T4 |
| R3 — Pointage au comptoir | le staff scanne le QR du membre avec l'app staff ; le serveur valide ; le robot pointe dans Deciplus | zéro matériel, jour 1 | file au comptoir | app staff (phase 1) |
| T1 — Numéro de badge en QR | QR du numéro, lu par le lecteur Xplor | dix minutes à tester | statique : sécurité nulle si copié | **refusé** sauf comme repère de test |

**Recommandation (déduit)** : R3 dès le premier jour (aucun matériel), R2 club par club au rythme des lecteurs, R1 demandé par écrit en parallèle. La vente du badge physique reste la condition d'activation du QR dans le code : sans vente « carte badge » lue par le robot, aucun secret de badge n'est remis au téléphone (§4, condition commerciale).

### 3.5 Anti-partage, par système (§4, §18B) — **vérifié**

| Mesure | Android | iOS | Verdict |
|---|---|---|---|
| Blocage des captures et enregistrements | `FLAG_SECURE` : capture et enregistrement bloqués, aperçu noir dans le sélecteur d'apps | pas de blocage garanti ; détection de capture au premier plan ; masquage dans le sélecteur ; astuce de rendu de `expo-screen-capture` depuis iOS 13 | meilleur effort, jamais vendu comme sécurité |
| Masquage en arrière-plan ou pendant un enregistrement | oui | oui (détection d'enregistrement) | fait dans la maquette |
| QR dynamique, temporaire, renouvelé | oui | oui | **c'est la sécurité réelle** : code HMAC-SHA-256 sur un secret d'appareil, fenêtre de 60 s, le lecteur accepte la fenêtre précédente |
| Liaison à un appareil identifié | Play Integrity | App Attest | prouvée par la plateforme, pas déduite d'un identifiant |
| Vérification à chaque passage | oui | oui | le validateur recalcule le code et journalise |

Une capture ou une photo du QR devient inutile après 60 s ; un QR présenté deux fois dans deux clubs à cinq minutes d'écart déclenche une alerte ; le secret de badge est distinct de la session (voler l'un ne donne pas l'autre).

### 3.6 Ce qu'il faut recevoir pour clore le §18B — **à vérifier**

1. Le modèle exact des nouveaux lecteurs (photo, référence, fiche technique, fournisseur).
2. Un badge de test affecté à une fiche de test, et l'accès Manager → Lecteurs pour lire les journaux pendant les essais.
3. Le numéro de compte Xplor pour la question écrite.
4. Une photo des lecteurs actuels de chaque club (cinq photos, cinq minutes).

Plan d'essai dès réception : T1 (repère), T2 ticket d'accès, T4 notre validateur ; résultats consignés dans ce document.

## 4. Plannings (§7, §18C) — **vérifié**

Les plannings des cinq clubs existent déjà sous forme structurée (`bc-plannings/data_tables.json` : activités, espaces, créneaux, lignes ACCÈS LIBRE). Ils sont lus par la maquette (188 créneaux). Ils seront migrés dans des tables éditables par la direction depuis l'admin ; les sites de club pourront lire la même source. Faisable sans dépendance à Deciplus.

## 5. Paiements et facturation (§5, §12, §18D) — **vérifié**

- Un abonnement de salle est un service physique : Apple 3.1.3(e) et Google Play (« gym memberships ») imposent le paiement **hors** achat intégré. On ne vend rien dans l'app : la boutique s'ouvre dans un navigateur intégré (SFSafariViewController / Custom Tabs) avec la session partagée.
- La régularisation d'un impayé existe dans la boutique (`echeancier-pay.js`, page Payplug hébergée, puis tâche robot dans Deciplus) : l'app ouvre ce parcours. Aucune donnée bancaire dans l'app (§5).
- Vidéo : jamais vendue seule (Apple 3.1.1) ; elle est un avantage de l'abonnement physique.

## 6. Rencontres entre membres (§11, §18E) — **proposé**

Faisable sans Deciplus (base applicative). Règles proposées : créneaux limités aux plages d'accès libre du club (lignes ACCÈS LIBRE, sinon heures d'ouverture) ; âge lu dans Deciplus (date de naissance) ; moins de 18 ans exclus des catégories sparring ; règles par catégorie modifiables dans l'admin ; rappel de sécurité accepté à chaque participation ; aucun texte libre hors l'observation ; modération et suppression dans l'admin. **À valider** par la direction et l'assureur.

## 7. Stores (§18F) — **vérifié**

Comptes au nom de la SAS Boxing Center (Apple Developer Program 99 $/an, D-U-N-S requis ; Google Play Console 25 $) ; suppression de compte dans l'app obligatoire (Apple 5.1.1(v), Google Play) ; pas de connexion sociale (sinon Sign in with Apple) ; cibles API 36 Android et SDK iOS 26 ; majorité numérique 15 ans (CNIL) : consentement parental en dessous. iOS se compile sans Mac avec EAS Build.

## 8. Verdict, fonction par fonction

| Fonction du CDC | Faisable | Condition |
|---|---|---|
| Création de compte et rapprochement Deciplus (§2) | **Oui** | extension en lecture du robot ; score 2 sur 3 |
| Restreint / intégral, bascule automatique (§3) | **Oui** | lecture nocturne des statuts |
| Badge QR affiché dans l'app, lié au compte, après achat du badge (§4) | **Oui** | secret remis après vente « carte badge » lue par le robot |
| Badge QR **lu à la porte** (§4) | **Oui, sous condition** | R3 jour 1 ; R2 avec les nouveaux lecteurs ; R1 si Xplor répond |
| Anti-partage (§4) | **Oui** | code tournant + appareil attesté ; écran en meilleur effort |
| Mon abonnement, échéances, impayés (§5) | **Oui** | échéancier par le robot |
| Factures PDF (§5) | **Probable** | téléchargement des documents de la fiche à vérifier ; boutique déjà prête |
| Régularisation en ligne (§5) | **Oui** | parcours boutique existant |
| Statistiques de fréquentation (§6) | **Oui** | export passages (à vérifier) ou journal de notre validateur (R2) |
| Plannings et admin (§7) | **Oui** | données existantes |
| Boutique (§12) | **Oui** | navigateur intégré, hors achat intégré |

## 9. Risques

| Risque | Gravité | Parade |
|---|---|---|
| Xplor change son back-office, le robot casse | haute | interface `DeciplusProvider`, tests de contrat quotidiens, mode dégradé, alerte |
| Lecteurs non compatibles dans un club | haute | R3 jour 1, R2 club par club |
| Xplor s'oppose à un usage non prévu | moyenne | question écrite, aucun volume anormal, aucun contournement de paiement |
| Apple refuse l'app pour la vidéo payante hors achat intégré | moyenne | texte des stores, vidéo = avantage du service physique |
| Captures iOS | moyenne | code tournant ; ne jamais vendre le blocage d'écran |
| Volume RPA | moyenne | lots, API interne, cache |
| Mineurs et sparring | haute | règles par catégorie, âge Deciplus, rappel accepté, modération |

## 10. Ce que cette étude attend de Boxing Center

1. Les quatre éléments du §3.6 (lecteurs, badge de test, accès Manager, compte Xplor).
2. Un accès au compte Deciplus de test pour vérifier les documents (factures) et l'export des passages.
3. La position de la direction sur R3 (pointage comptoir) comme solution du premier jour.
4. Les règles d'assurance pour le sparring et les mineurs (§6).
