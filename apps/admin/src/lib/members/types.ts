import type { LinkStatus, SubscriptionStatus } from '@bc/contract';

import type { ClubId, Statut } from '@/lib/types';

/**
 * LES ADHÉRENTS tels que l'admin les lit dans la base de l'app (Supabase,
 * schéma de Raphaël du 23–30/10/2026) : le profil déclaré à l'inscription, ce
 * que le robot a lu sur la fiche Deciplus, l'état de l'abonnement pris depuis
 * l'app, et les demandes de rapprochement qui attendent l'accueil (CDC §2 :
 * « une identification fiable, et non simplement un nom identique »).
 *
 * Lecture seule ici : toute décision passe par le serveur applicatif
 * (apps/bridge, `POST /internal/admin/link-resolution`), qui écrit la base.
 */
export type { LinkStatus, SubscriptionStatus };

export const LINK_STATUSES: readonly LinkStatus[] = ['en_attente', 'lie', 'a_revoir', 'prospect'];

export type MemberSnapshot = {
  abonnementActif: boolean;
  abonnementEnAttente: boolean;
  badgeEnregistre: boolean;
  contrats: string[];
  club: ClubId | null;
  readAt: string;
};

export type MemberSubscription = {
  status: SubscriptionStatus;
  planLabel: string | null;
  nextChargeDate: string | null;
  currentPeriodEnd: string | null;
  badgeActive: boolean;
};

export type Member = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  /** AAAA-MM-JJ, ou null si l'adhérent ne l'a pas donnée. */
  dateNaissance: string | null;
  clubPrincipal: ClubId | null;
  linkStatus: LinkStatus;
  linkUpdatedAt: string | null;
  deciplusMemberId: string | null;
  /** Moins de 15 ans : le compte attend l'accord d'un parent. */
  parental: boolean;
  createdAt: string;
  snapshot: MemberSnapshot | null;
  subscription: MemberSubscription | null;
  /** Ce que l'app ouvre : l'espace intégral exige une fiche liée et un abonnement en cours. */
  statut: Exclude<Statut, 'invite'>;
};

/** Une demande de rapprochement qui attend l'accueil, avec le compte qui l'a faite. */
export type LinkQueueItem = {
  id: string;
  orderId: string;
  createdAt: string;
  decidedAt: string | null;
  /** Le numéro de fiche que le robot a trouvé ; null : rien trouvé, on ne peut pas lier d'ici. */
  deciplusMemberId: string | null;
  /** Les champs qui ne concordent pas (e-mail, date de naissance, téléphone, nom…), tels que le robot les nomme. */
  mismatchFields: string[];
  reason: string | null;
  member: Member;
};

export type LinkDecision = LinkQueueItem & {
  resolution: 'lie' | 'refuse';
  resolvedBy: string | null;
  resolvedAt: string | null;
};

/** D'où viennent les comptes : la base de l'app, ou les exemples locaux tant qu'elle n'est pas branchée. */
export type MembersSource = 'supabase' | 'demo';

export type MembersOverview = {
  source: MembersSource;
  /** Faux seulement pour les exemples pas encore chargés : la rubrique propose alors de les charger. */
  seeded: boolean;
  readAt: string;
  total: number;
  byLink: Record<LinkStatus, number>;
  actifs: number;
  /** Comptes créés ces 7 derniers jours. */
  recent: number;
  queue: LinkQueueItem[];
  decisions: LinkDecision[];
  members: Member[];
};

/** Les champs de désaccord que le robot peut nommer ; un autre s'affiche tel quel. */
export const MISMATCH_FIELDS = ['email', 'date_naissance', 'telephone', 'nom', 'prenom'] as const;

/** Les raisons qu'un retour peut porter (robot ou serveur) ; une autre s'affiche telle quelle. */
export const LINK_REASONS = ['fiche_deja_liee', 'identifiant_manquant', 'robot_indisponible', 'aucune_fiche', 'plusieurs_fiches'] as const;

export type DecisionError = 'config' | 'introuvable' | 'deja_resolue' | 'identifiant_manquant' | 'fiche_deja_liee' | 'robot_indisponible' | 'pont';
