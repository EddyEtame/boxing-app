import type { ClubId } from '@bc/brand';

import type { Statut } from './passages';

/**
 * L'API QUE L'ADMIN OUVRE À L'APP (apps/admin, ajoutée au contrat le 23/10/2026).
 *
 * Les listes fermées partagées vivent ici une seule fois : l'admin les
 * réexporte, l'app peut les reprendre au lieu de ses copies locales. Toutes les
 * routes publiques acceptent les origines locales (Expo, réseau local) ; aucune
 * ne renvoie de donnée personnelle, ni le nom d'un coach pour le planning.
 */

/* ------------------------------------------------------------------ */
/* Listes partagées                                                     */
/* ------------------------------------------------------------------ */

/** Les familles de discipline : les mêmes que l'app (features/planning/model.ts) et que les affiches. */
export const FAMILLES = ['anglaise', 'piedsPoings', 'mma', 'grappling', 'crossTraining', 'hyrox', 'ladyPunch', 'educative', 'baby', 'boxingCamp', 'accesLibre'] as const;
export type Famille = (typeof FAMILLES)[number];

export const NIVEAUX = ['Débutant', 'Intermédiaire', 'Confirmé'] as const;
export type Niveau = (typeof NIVEAUX)[number];

export const OBJECTIFS = ['Technique', 'Cardio', 'Condition', 'Mobilité', 'Renforcement', 'Sparring'] as const;
export type Objectif = (typeof OBJECTIFS)[number];

/** CDC §9 : la sécurité d'un exercice fait en autonomie. */
export const SECURITES = ['seul', 'partenaire', 'encadrement'] as const;
export type Securite = (typeof SECURITES)[number];

/** CDC §8 : ce que présente la rubrique Actualités (les événements datés ont leur propre route). */
export const NEWS_KINDS = ['club', 'resultat', 'portrait', 'reportage', 'activite', 'promo', 'annonce'] as const;
export type NewsKind = (typeof NEWS_KINDS)[number];

export const EVENT_KINDS = ['gala', 'combat', 'stage', 'competition', 'portes-ouvertes', 'autre'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** `tous` : visible aussi en mode restreint et par l'invité ; `actifs` : adhérents à jour. */
export type Audience = 'tous' | 'actifs';

/** Les dix types du CDC §14, dans son ordre. */
export const NOTIF_TYPES = ['direction', 'coach', 'evenement', 'promo', 'video', 'club', 'rappel', 'rencontre', 'echeance', 'impaye'] as const;
export type NotifType = (typeof NOTIF_TYPES)[number];

/** Les sujets d'un message à la direction (CDC §10). */
export const SUJETS = ['general', 'acces', 'abonnement', 'info', 'admin'] as const;
export type Sujet = (typeof SUJETS)[number];

/** CDC §11 : les types d'entraînement entre membres. */
export const TRAINING_TYPES = ['sparring-anglaise', 'sparring-pieds-poings', 'sparring-sol', 'training-collectif', 'footing'] as const;
export type TrainingType = (typeof TRAINING_TYPES)[number];

/** Les interrupteurs de l'app (CDC §15 « activation ou désactivation de certaines fonctionnalités »). */
export const FEATURE_KEYS = [
  'inscription',
  'badge',
  'messagerie',
  'entrainements',
  'entrainements.sparring-anglaise',
  'entrainements.sparring-pieds-poings',
  'entrainements.sparring-sol',
  'entrainements.training-collectif',
  'entrainements.footing',
  'videos',
  'combats',
  'boutique',
  'statistiques',
  'notifications.promo',
  'mesure',
  'demo',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

export const ADMIN_API = {
  /** GET → PlanningResponse (ETag : If-None-Match répond 304). */
  plannings: '/api/plannings',
  /** GET → ContentList<PublicNews>. */
  actualites: '/api/actualites',
  /** GET → ContentList<PublicEvent>. */
  evenements: '/api/evenements',
  /** GET → ContentList<PublicVideo>. */
  videos: '/api/videos',
  /** GET → FeaturesResponse. */
  fonctions: '/api/fonctions',
  /** GET ?club=&statut= → NotificationsResponse. */
  notifications: '/api/notifications',
  /** POST MemberMessageRequest → MemberMessageResponse. */
  messages: '/api/messages',
  /** GET (en-tête THREAD_TOKEN_HEADER) → ThreadResponse. */
  message: (threadId: string) => `/api/messages/${encodeURIComponent(threadId)}`,
  /** GET ?club= → TrainingsResponse ; POST TrainingRequest → TrainingCreated. */
  entrainements: '/api/entrainements',
} as const;

/** Le jeton d'un fil de messages, rendu une seule fois à sa création : l'app le garde. */
export const THREAD_TOKEN_HEADER = 'x-bc-thread-token';

/* ------------------------------------------------------------------ */
/* Plannings (CDC §7)                                                   */
/* ------------------------------------------------------------------ */

/** Un créneau tel que l'app le lit : jamais le nom du coach. `jour` : 0 = lundi ; minutes depuis minuit. */
export type PublicSlot = { id: string; club: ClubId; espace?: string; jour: number; debut: number; fin: number; activite: string };

export type PlanningResponse = {
  /** Empreinte du contenu servi : change dès qu'un créneau ou une annulation change. */
  version: string;
  updatedAt: string;
  clubs: ClubId[];
  slots: PublicSlot[];
  /** Séances annulées à venir (huit semaines) : l'app barre la date. `motif` : « coach-absent », « salle », « ferie »… suivi d'une précision. */
  cancellations: { slotId: string; date: string; motif: string }[];
};

/* ------------------------------------------------------------------ */
/* Actualités, événements, vidéos (CDC §8, §9)                          */
/* ------------------------------------------------------------------ */

/** Une image servie par l'admin, en adresse absolue. */
export type PublicMedia = { url: string; alt: string };

export type ContentList<T> = {
  items: T[];
  /** La rubrique est-elle ouverte dans l'app ? (interrupteur « Fonctions » pour les vidéos.) */
  enabled: boolean;
  /** ISO 8601 : la dernière modification d'un élément servi. */
  updatedAt: string | null;
};

export type PublicNews = {
  id: string;
  kind: NewsKind;
  title: string;
  body: string;
  /** AAAA-MM-JJ, la date affichée. */
  date: string;
  photo: PublicMedia | null;
  video: string | null;
  link: { url: string; label: string } | null;
  club: ClubId | null;
  audience: Audience;
  important: boolean;
  publishedAt: string;
};

export type PublicEvent = {
  id: string;
  kind: EventKind;
  title: string;
  body: string;
  /** AAAA-MM-JJTHH:MM, heure de Toulouse (heure murale, sans fuseau). */
  startsAt: string;
  endsAt: string | null;
  club: ClubId | null;
  venue: string | null;
  photo: PublicMedia | null;
  ticketUrl: string | null;
  /** La forme de l'exemple du CDC §13. */
  fight: { fighter: string; opponent: string; weightClass: string | null; title: string | null; broadcaster: string | null } | null;
  audience: Audience;
  important: boolean;
  publishedAt: string;
};

export type PublicVideo = {
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
  coach: string | null;
  poster: PublicMedia | null;
  /** Donnée seulement pour une vidéo gratuite ; une vidéo réservée se lira par une adresse signée. */
  source: { kind: 'stream' | 'url'; ref: string } | null;
  publishedAt: string;
};

/* ------------------------------------------------------------------ */
/* Fonctions et entraînements entre membres (CDC §11, §15)              */
/* ------------------------------------------------------------------ */

/** L'état effectif : une catégorie d'entraînement est coupée si la rubrique l'est. */
export type FeaturesResponse = { features: Record<FeatureKey, boolean>; updatedAt: string | null };

export type PublicTraining = {
  id: string;
  club: ClubId;
  /** AAAA-MM-JJ, heure de Toulouse. */
  date: string;
  /** « 18:30 ». */
  heure: string;
  debut: number;
  type: TrainingType;
  niveau: Niveau;
  observation?: string;
  participants: number;
  /** Le prénom seulement. */
  organisateur: { prenom: string };
};

export type TrainingsResponse = { items: PublicTraining[]; off: boolean; updatedAt: string };

/** `heure` (« 18:30 ») ou `debut` (minutes). */
export type TrainingRequest = {
  type: TrainingType;
  club: ClubId;
  date: string;
  heure?: string;
  debut?: number;
  niveau: Niveau;
  observation?: string;
  organisateur: { memberId: string; prenom: string; age?: number };
};

/** 201 : `a-verifier` tant que l'équipe n'a pas validé (prémodération ou vérification bloquante). */
export type TrainingCreated = { id: string; status: 'a-verifier' | 'en-ligne'; checks: string[] };

/* ------------------------------------------------------------------ */
/* Messages et notifications (CDC §10, §14)                             */
/* ------------------------------------------------------------------ */

/** Sans THREAD_TOKEN_HEADER, un nouveau fil s'ouvre ; avec, le message s'ajoute à ce fil. */
export type MemberMessageRequest = {
  /** L'identifiant aléatoire de l'installation (le même que la mesure d'usage). */
  anonId: string;
  club: ClubId;
  statut: Statut;
  sujet: Sujet;
  text: string;
  /** Déclarés par l'app, non vérifiés tant que Deciplus n'est pas branché. */
  name?: string;
  memberId?: string;
  threadId?: string;
};

/** 201 à la création d'un fil (le jeton n'est donné qu'une fois), 200 quand on ajoute à un fil. */
export type MemberMessageResponse = { threadId: string; token?: string; status: 'nouveau' | 'en-cours' | 'traite' };

export type ThreadMessage = { id: string; from: 'member' | 'staff' | 'auto'; signature?: string; text: string; at: string };

/** Jamais une note interne de l'équipe. */
export type ThreadResponse = { id: string; status: 'nouveau' | 'en-cours' | 'traite'; sujet: Sujet; messages: ThreadMessage[]; updatedAt: string };

export type PublicNotification = { id: string; type: NotifType; title: string; body: string; link?: string; at: string };

/** Trente jours, sans aucune donnée personnelle ; `en-file` tant que l'envoi (Expo Push) n'est pas branché. */
export type NotificationsResponse = { items: PublicNotification[]; delivery: 'en-file' };

export type PublicError = { error: 'off' | 'statut' | 'invalide' | 'debit' | 'taille' | 'introuvable'; fields?: string[]; retryAfter?: number };
