// Declarations locales : le source de @bc/contract importe sans extension,
// ce que moduleResolution nodenext refuse de verifier. L'execution charge
// le vrai paquet (voir src/register.mjs).
type ClubId = 'minimes' | 'saint-cyprien' | 'etats-unis' | 'ramonville' | 'portet';
type Statut = 'invite' | 'restreint' | 'actif';

export type Passage = {
  date: string;
  heure: string;
  club: ClubId;
};

export type LinkStatus = 'en_attente' | 'lie' | 'a_revoir' | 'prospect';

export type MemberSnapshot = {
  abonnementActif: boolean;
  abonnementEnAttente: boolean;
  badgeEnregistre: boolean;
  contrats: string[];
  club: ClubId | null;
  readAt: string;
};

export type Me = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  statut: Exclude<Statut, 'invite'>;
  link: {
    status: LinkStatus;
    updatedAt: string | null;
  };
  clubPrincipal: ClubId | null;
  deciplusMemberId: string | null;
  snapshot: MemberSnapshot | null;
  consentementParentalRequis: boolean;
  passages: Passage[];
};

export const MEMBER_API: {
  readonly me: '/v1/me';
  readonly link: '/v1/link';
  readonly refresh: '/v1/me/refresh';
  readonly health: '/health';
  readonly checkoutSessions: '/v1/checkout/sessions';
  checkoutSession: (id: string) => string;
  readonly invoices: '/v1/me/invoices';
  readonly notices: '/v1/me/notices';
};

export const SNAPSHOT_REFRESH_MS: number;

export function statutFor(
  link: LinkStatus,
  snapshot: Pick<MemberSnapshot, 'abonnementActif'> | null,
): Exclude<Statut, 'invite'>;

export function clubFromDeciplusGym(gym: string | null | undefined): ClubId | null;

export const EVENT_NAMES: readonly [
  'app_open',
  'screen_view',
  'preface_step',
  'preface_done',
  'theme_change',
  'locale_change',
  'cta_create_account',
  'cta_sign_in',
  'offer_open',
  'planning_view',
  'planning_session_open',
  'planning_share',
  'session_share',
  'session_favorite',
  'stats_view',
  'stats_goal',
  'bar_save',
  'message_send',
  'video_open',
  'training_join',
  'training_publish',
  'badge_open',
];

export type EventName = (typeof EVENT_NAMES)[number];
export type EventPropKey = 'club' | 'mode' | 'famille' | 'step' | 'choice' | 'channel' | 'section' | 'from' | 'value' | 'locked' | 'count';
export type EventProps = Partial<Record<EventPropKey, string | number | boolean>>;

export type AnalyticsEvent = {
  id: string;
  name: EventName;
  at: string;
  anonId: string;
  visit: string;
  statut: Statut;
  locale: 'fr' | 'en';
  scheme: 'light' | 'dark';
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  path?: string;
  props?: EventProps;
};

export function cleanProps(props: Record<string, unknown> | undefined): EventProps | undefined;
