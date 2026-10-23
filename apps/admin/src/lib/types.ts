import type { ClubId } from '@bc/brand';
import {
  EVENT_KINDS,
  FAMILLES,
  FEATURE_KEYS,
  NEWS_KINDS,
  NIVEAUX,
  NOTIF_TYPES,
  OBJECTIFS,
  SECURITES,
  SUJETS,
  TRAINING_TYPES,
  type Audience,
  type DemoPattern,
  type EventKind,
  type Famille,
  type FeatureKey,
  type NewsKind,
  type Niveau,
  type NotifType,
  type Objectif,
  type Passage,
  type Securite,
  type Statut,
  type Sujet,
  type TrainingType,
} from '@bc/contract';

/*
 * Les listes fermées partagées avec l'app (familles, niveaux, types de notification, sujets,
 * types d'entraînement, interrupteurs…) sont définies une seule fois dans @bc/contract (admin.ts) :
 * l'admin les réexporte ici sous les mêmes noms.
 */
export { EVENT_KINDS, FAMILLES, FEATURE_KEYS, NEWS_KINDS, NIVEAUX, NOTIF_TYPES, OBJECTIFS, SECURITES, SUJETS, TRAINING_TYPES };
export type { Audience, EventKind, Famille, FeatureKey, NewsKind, Niveau, NotifType, Objectif, Securite, Sujet, TrainingType };

export type { ClubId, Statut };

/* ------------------------------------------------------------------ */
/* L'équipe et ses droits (CDC §15 « Gestion des droits »)             */
/* ------------------------------------------------------------------ */

/** Les quatre profils qui se connectent à l'admin. Le cinquième niveau du CDC, les adhérents, vit dans l'app. */
export const ROLES = ['direction', 'communication', 'administratif', 'coach'] as const;
export type Role = (typeof ROLES)[number];

export type TeamAccount = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Clubs du périmètre ; `all` = tout le réseau. */
  clubs: ClubId[] | 'all';
  /** Ce que l'adhérent lit sous un message (« Accueil · Minimes », « Mehdi · coach »). */
  signature: string;
  status: 'invite' | 'actif' | 'suspendu';
  /** scrypt$N$r$p$sel$empreinte — jamais le mot de passe. */
  passwordHash?: string;
  /** Lien d'activation : seule l'empreinte du jeton est gardée. */
  activation?: { tokenHash: string; expiresAt: string };
  /** Incrémentée à chaque suspension ou nouveau mot de passe : les sessions ouvertes meurent. */
  sessionVersion: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  clubs: ClubId[] | 'all';
  signature: string;
  /** `env` : le compte Direction, celui du super administrateur de la boutique. */
  source: 'env' | 'store';
};

/* ------------------------------------------------------------------ */
/* Médias : la photothèque de l'app, ou un fichier déposé dans l'admin */
/* ------------------------------------------------------------------ */

export type Media = {
  kind: 'photo' | 'upload';
  /** Nom du fichier (photothèque : apps/mobile/assets/photos ; dépôt : .data/media). */
  file: string;
  alt: string;
};

/* ------------------------------------------------------------------ */
/* Contenus (CDC §8, §9)                                                */
/* ------------------------------------------------------------------ */

export type PublishStatus = 'brouillon' | 'programme' | 'publie' | 'archive';

export type Stamp = { createdAt: string; createdBy: string; updatedAt: string; updatedBy: string };

export type NewsItem = Stamp & {
  id: string;
  kind: NewsKind;
  title: string;
  body: string;
  photo?: Media;
  /** Lien vers une vidéo (hébergeur ou réseau social). */
  video?: string;
  /** Date affichée dans l'app (AAAA-MM-JJ). */
  date: string;
  link?: { url: string; label: string };
  club: ClubId | null;
  audience: Audience;
  status: PublishStatus;
  /** Publication programmée (ISO, heure locale du club). */
  publishAt?: string;
  publishedAt?: string;
  /** Propose une notification à la publication (CDC §8). */
  important: boolean;
  demo?: boolean;
  origin?: 'admin' | 'app';
};

export type ClubEvent = Stamp & {
  id: string;
  kind: EventKind;
  title: string;
  body: string;
  /** AAAA-MM-JJTHH:MM, heure locale. */
  startsAt: string;
  endsAt?: string;
  club: ClubId | null;
  /** Lieu, quand l'événement n'a pas lieu dans un club. */
  venue?: string;
  photo?: Media;
  ticketUrl?: string;
  /** Combat d'un boxeur du club (CDC §8, forme de l'exemple du §13). */
  fight?: { fighter: string; opponent: string; weightClass?: string; title?: string; broadcaster?: string };
  audience: Audience;
  status: PublishStatus;
  publishAt?: string;
  publishedAt?: string;
  important: boolean;
  demo?: boolean;
  origin?: 'admin' | 'app';
};

export type VideoItem = Stamp & {
  id: string;
  numero: number;
  title: string;
  famille: Exclude<Famille, 'accesLibre'>;
  niveau: Niveau;
  dureeMin: number;
  objectif: Objectif;
  securite: Securite;
  /** Visible en mode restreint (CDC §9 : « quelques vidéos »). */
  gratuite: boolean;
  /** Identifiant de l'hébergeur (Cloudflare Stream) ou adresse de la vidéo. */
  source: { kind: 'stream' | 'url'; ref: string };
  poster?: Media;
  coach?: string;
  status: PublishStatus;
  publishedAt?: string;
  demo?: boolean;
  origin?: 'admin' | 'app';
};

/* ------------------------------------------------------------------ */
/* Notifications (CDC §14)                                              */
/* ------------------------------------------------------------------ */

/** Ceux que l'admin envoie à la main ; les autres partent tout seuls, d'après une donnée (Deciplus, propositions). */
export const NOTIF_MANUAL: readonly NotifType[] = ['direction', 'evenement', 'promo', 'video', 'club'];
/**
 * Non essentiels : l'adhérent peut les couper dans ses préférences (CDC §14). Même règle que l'app
 * (apps/mobile/src/app/notifications.tsx) : seuls les messages de la direction restent « toujours actifs ».
 */
export const NOTIF_OPTIONAL: readonly NotifType[] = NOTIF_TYPES.filter((t) => t !== 'direction');

export type Target = { clubs: ClubId[] | 'all'; statuts: Statut[] };

export type PushNotification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  /** Écran de l'app ouvert au toucher (« /planning », « /actualites »). */
  link?: string;
  target: Target;
  when: { kind: 'now' } | { kind: 'scheduled'; at: string };
  status: 'brouillon' | 'programmee' | 'en-file' | 'annulee';
  /** Installations qui correspondent à la cible, mesurées sur 30 jours (événements d'usage). */
  reach?: number;
  origin?: { kind: 'news' | 'event' | 'video' | 'planning' | 'moderation'; id: string };
  createdAt: string;
  createdBy: string;
  cancelledAt?: string;
};

/* ------------------------------------------------------------------ */
/* Messagerie (CDC §10)                                                 */
/* ------------------------------------------------------------------ */

export type InboxMessage = {
  id: string;
  /** `note` : note interne, jamais montrée à l'adhérent. */
  from: 'member' | 'staff' | 'auto' | 'note';
  authorId?: string;
  signature?: string;
  text: string;
  at: string;
};

export type InboxThread = {
  id: string;
  member: { id: string; name: string; club: ClubId; statut: Statut };
  sujet: Sujet;
  status: 'nouveau' | 'en-cours' | 'traite';
  assignee?: string;
  messages: InboxMessage[];
  unread: boolean;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
};

export type MessageTarget = { kind: 'membre'; memberId: string; memberName?: string } | { kind: 'groupe'; clubs: ClubId[] | 'all'; statuts: Statut[]; familles: Famille[] };

/** Message d'un membre de l'équipe vers un ou plusieurs adhérents : il arrive en notification, sans réponse possible (CDC §10). */
export type OutgoingMessage = {
  id: string;
  author: { id: string; name: string; role: Role };
  signature: string;
  to: MessageTarget;
  text: string;
  reach?: number;
  status: 'en-file';
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/* Entraînements entre membres (CDC §11)                                */
/* ------------------------------------------------------------------ */

export const SPARRING: readonly TrainingType[] = ['sparring-anglaise', 'sparring-pieds-poings', 'sparring-sol'];

export type TrainingCheck = {
  code: 'coordonnees' | 'hors-acces-libre' | 'sparring-mineur' | 'categorie-coupee' | 'passee' | 'mots-sensibles';
  level: 'bloquant' | 'attention';
};

export const RETRAIT_MOTIFS = ['coordonnees', 'hors-acces-libre', 'securite', 'propos', 'doublon', 'autre'] as const;
export type RetraitMotif = (typeof RETRAIT_MOTIFS)[number];

export type TrainingProposal = {
  id: string;
  type: TrainingType;
  club: ClubId;
  /** AAAA-MM-JJ (CDC §11 : « choix depuis un calendrier »). */
  date: string;
  /** Minutes depuis minuit. */
  debut: number;
  niveau: Niveau;
  observation?: string;
  organizer: { memberId: string; prenom: string; age?: number };
  participants: number;
  status: 'a-verifier' | 'en-ligne' | 'retiree';
  decision?: { by: string; at: string; motif?: RetraitMotif; note?: string };
  createdAt: string;
  demo?: boolean;
};

export type ModerationRules = {
  /** Âge minimal pour proposer ou rejoindre un sparring (CDC §11E ; proposition Q14 : 18 ans). */
  sparringMinAge: number;
  /** Âge minimal pour les autres catégories (16 ans, avec accord parental en dessous de 18). */
  otherMinAge: number;
  /** Une proposition passe d'abord par l'équipe avant d'être visible. */
  premoderation: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

/* ------------------------------------------------------------------ */
/* Interrupteurs de fonctions (CDC §15)                                 */
/* ------------------------------------------------------------------ */

export type FeatureState = Record<FeatureKey, { on: boolean; updatedAt?: string; updatedBy?: string }>;

/* ------------------------------------------------------------------ */
/* Plannings (CDC §7)                                                   */
/* ------------------------------------------------------------------ */

/** La forme exacte d'un créneau de l'app (apps/mobile/src/data/planning.ts). `coach` ne sort jamais de l'admin. */
export type Slot = {
  id: string;
  club: ClubId;
  espace?: string;
  /** 0 = lundi … 6 = dimanche. */
  jour: number;
  /** Minutes depuis minuit. */
  debut: number;
  fin: number;
  activite: string;
  coach?: string;
};

/** Une séance annulée un jour précis : le cours reste au planning. */
export type SlotException = { id: string; slotId: string; date: string; motif: string; createdAt: string; createdBy: string };

export type PlanningChange = {
  id: string;
  at: string;
  by: string;
  kind: 'import' | 'reprise' | 'ajout' | 'deplacement' | 'annulation' | 'retablissement' | 'suppression' | 'restauration' | 'fermeture';
  slotId?: string;
  before?: Slot;
  after?: Slot;
  date?: string;
  note?: string;
  /** Une fermeture annule plusieurs séances d'un coup : on garde lesquelles, pour pouvoir la défaire. */
  exceptionIds?: string[];
  clubs?: ClubId[];
  /** Pour une restauration : le changement qu'elle défait. */
  undoOf?: string;
};

export type PlanningState = {
  /** Le planning tel que l'admin le sert : l'import de l'app, plus les changements de l'équipe. */
  slots: Slot[];
  exceptions: SlotException[];
  history: PlanningChange[];
  source: { path: string; hash: string; importedAt: string; count: number };
  /** Les créneaux de l'app au moment de l'import : la base commune pour dire qui a changé quoi depuis. */
  base?: Slot[];
};

/* ------------------------------------------------------------------ */
/* Démonstration des statistiques (CDC §6, compte de démonstration)     */
/* ------------------------------------------------------------------ */

export type DemoState = {
  memberId: string;
  pattern: DemoPattern;
  /** Régénère l'historique chaque jour : la démo reste à jour sans retouche. */
  rolling: boolean;
  passages: Passage[];
  updatedAt: string;
  updatedBy: string;
};

/* ------------------------------------------------------------------ */
/* Journal                                                              */
/* ------------------------------------------------------------------ */

export type AuditEntry = {
  id: string;
  at: string;
  actor: { id: string; name: string; role: Role | 'systeme' };
  action: string;
  target?: string;
  detail?: string;
};
