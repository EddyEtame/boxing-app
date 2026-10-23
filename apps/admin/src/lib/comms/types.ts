import type { ClubId, Famille, InboxThread, NotifType, OutgoingMessage, PushNotification, Statut } from '@/lib/types';

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
 * l'app qui permet de le couper (apps/mobile/src/app/notifications.tsx :
 * seuls les messages de l'équipe sont « Toujours actif »).
 */
export type AppPref = 'direction' | 'coach' | 'events' | 'promos' | 'videos' | 'trainings' | 'billing' | 'clubs';
export type NotifSource = 'admin' | 'messages' | 'deciplus' | 'propositions';

export const NOTIF_META: Record<NotifType, { source: NotifSource; pref: AppPref; essential: boolean; link: AppLink }> = {
  direction: { source: 'admin', pref: 'direction', essential: true, link: '/' },
  coach: { source: 'messages', pref: 'coach', essential: false, link: '/messages' },
  evenement: { source: 'admin', pref: 'events', essential: false, link: '/evenements' },
  promo: { source: 'admin', pref: 'promos', essential: false, link: '/actualites' },
  video: { source: 'admin', pref: 'videos', essential: false, link: '/videos' },
  club: { source: 'admin', pref: 'clubs', essential: false, link: '/' },
  rappel: { source: 'propositions', pref: 'trainings', essential: false, link: '/' },
  rencontre: { source: 'propositions', pref: 'trainings', essential: false, link: '/' },
  echeance: { source: 'deciplus', pref: 'billing', essential: false, link: '/' },
  impaye: { source: 'deciplus', pref: 'billing', essential: false, link: '/' },
};

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
