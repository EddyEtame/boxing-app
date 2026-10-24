import { isNotifEssential, NOTIF_TYPES, type ClubId, type Famille, type InboxThread, type NotifType, type OutgoingMessage, type PushNotification, type Statut } from '@/lib/types';

/**
 * Les formes propres à la communication (CDC §10, §14). Les types de base
 * (PushNotification, InboxThread, OutgoingMessage) restent dans lib/types.ts ;
 * ici, seulement ce que les pages Notifications et Messages ajoutent.
 */

/** Les écrans de l'app qu'une notification peut ouvrir au toucher. */
export const APP_LINKS = ['/', '/planning', '/actualites', '/evenements', '/videos', '/messages'] as const;
export type AppLink = (typeof APP_LINKS)[number];

export const isAppLink = (v: unknown): v is AppLink => typeof v === 'string' && (APP_LINKS as readonly string[]).includes(v);

export const STATUTS: Statut[] = ['invite', 'restreint', 'actif'];

/**
 * Un message de l'équipe va à des adhérents : l'invité n'a pas de compte pour
 * le recevoir. Le restreint garde son fil (l'app le lui montre verrouillé).
 */
export const MESSAGE_STATUTS: Statut[] = ['actif', 'restreint'];

export const LIMITS = { title: 50, body: 150, message: 1000, reply: 2000, memberText: 2000, name: 60 } as const;

/** Sur un écran verrouillé d'iPhone, au-delà de ~32 caractères le titre se coupe ; ~110 pour le texte (4 lignes). */
export const LOCK_CUT = { title: 32, body: 110 } as const;

/**
 * Chaque type de notification (CDC §14), d'où il part, et la préférence de
 * l'app qui le range (apps/mobile/src/app/notifications.tsx). Essentiel ou
 * non vient d'une seule liste, dans @bc/contract (NOTIF_OPTIONAL) — Eddy,
 * 24/10/2026 : tout est essentiel sauf les offres et les nouvelles vidéos.
 */
export type AppPref = 'direction' | 'coach' | 'events' | 'promos' | 'videos' | 'trainings' | 'billing' | 'clubs';
export type NotifSource = 'admin' | 'messages' | 'deciplus' | 'propositions';

const META: Record<NotifType, { source: NotifSource; pref: AppPref; link: AppLink }> = {
  direction: { source: 'admin', pref: 'direction', link: '/' },
  coach: { source: 'messages', pref: 'coach', link: '/messages' },
  evenement: { source: 'admin', pref: 'events', link: '/evenements' },
  promo: { source: 'admin', pref: 'promos', link: '/actualites' },
  video: { source: 'admin', pref: 'videos', link: '/videos' },
  club: { source: 'admin', pref: 'clubs', link: '/' },
  rappel: { source: 'propositions', pref: 'trainings', link: '/' },
  rencontre: { source: 'propositions', pref: 'trainings', link: '/' },
  echeance: { source: 'deciplus', pref: 'billing', link: '/' },
  impaye: { source: 'deciplus', pref: 'billing', link: '/' },
};

export const NOTIF_META = Object.fromEntries(NOTIF_TYPES.map((type) => [type, { ...META[type], essential: isNotifEssential(type) }])) as Record<NotifType, { source: NotifSource; pref: AppPref; essential: boolean; link: AppLink }>;

/** Ce qui part tout seul, une fois les services branchés. */
export const NOTIF_AUTO: NotifType[] = ['echeance', 'impaye', 'rappel', 'rencontre', 'coach'];

export type NotifOrigin = NonNullable<PushNotification['origin']>;

/** L'assistant « Envoyer une notification ». `at` : « AAAA-MM-JJTHH:MM », heure de Toulouse. */
export type NotifDraft = {
  type: NotifType | null;
  title: string;
  body: string;
  link: AppLink | '';
  clubs: ClubId[] | 'all';
  statuts: Statut[];
  when: 'now' | 'scheduled';
  at: string;
  origin: NotifOrigin | null;
};

/** Ce qui a pré-rempli l'assistant (une actualité, un événement, une vidéo, un cours). */
export type NotifPrefill = { draft: NotifDraft; source: { kind: NotifOrigin['kind']; label: string } } | { draft: null; missing: string };

/** Une ligne de l'historique, avec le statut tel qu'il est maintenant (une programmation échue passe en file). */
export type NotifRow = PushNotification;

/* ------------------------------------------------------------------ */
/* Messagerie                                                           */
/* ------------------------------------------------------------------ */

/**
 * Le fil tel que l'admin le garde. Un fil venu de l'app porte l'empreinte de
 * son installation et celle de son jeton de lecture (jamais le jeton), et une
 * identité déclarée : rien n'est vérifié tant que Deciplus n'est pas branché.
 */
export type StoredThread = InboxThread & {
  app?: { anonHash: string; tokenHash: string; identity: 'declaree' };
};

/** Ce que le navigateur reçoit : jamais une empreinte. */
export type ThreadView = InboxThread & { declared: boolean };

export type Assignee = { id: string; name: string };

export type OutgoingDraft = {
  kind: 'membre' | 'groupe' | null;
  memberId: string;
  memberName: string;
  memberClub: ClubId | '';
  clubs: ClubId[] | 'all';
  statuts: Statut[];
  familles: Exclude<Famille, 'accesLibre'>[];
  text: string;
};

/** Un envoi, avec la notification qu'il a créée quand il vise un groupe. */
export type OutgoingRow = OutgoingMessage & { notificationId?: string; club?: ClubId; demo?: boolean };

export type Reach = { installs: number; measured: boolean };
