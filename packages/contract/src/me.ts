import type { ClubId } from '@bc/brand';

import type { Passage, Statut } from './passages';

/**
 * Le compte de l'adhérent tel que le serveur le renvoie (`GET /v1/me`).
 *
 * Rapprochement avec Deciplus (CDC §2, règle validée le 23/10/2026) : le robot
 * BOXPLUS lie la fiche si l'e-mail vérifié et la date de naissance concordent,
 * plus le téléphone ou le nom. Sinon revue manuelle dans l'admin, ou prospect.
 */
export type LinkStatus = 'en_attente' | 'lie' | 'a_revoir' | 'prospect';

/** Ce que le robot a lu sur la fiche, avec sa date : rien d'autre n'est gardé. */
export type MemberSnapshot = {
  abonnementActif: boolean;
  abonnementEnAttente: boolean;
  badgeEnregistre: boolean;
  /** Libellés des contrats actifs, tels qu'affichés dans Deciplus (8 au plus). */
  contrats: string[];
  club: ClubId | null;
  /** ISO 8601 : la date de la lecture, affichée à l'adhérent. */
  readAt: string;
};

export type Me = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  /** AAAA-MM-JJ. */
  dateNaissance: string;
  statut: Exclude<Statut, 'invite'>;
  link: {
    status: LinkStatus;
    /** ISO 8601. */
    updatedAt: string | null;
  };
  clubPrincipal: ClubId | null;
  snapshot: MemberSnapshot | null;
  /** Moins de 15 ans (majorité numérique, CNIL) : le compte attend l'accord d'un parent. */
  consentementParentalRequis: boolean;
  /** Passages réellement lus ; vide tant que la source n'est pas branchée. */
  passages: Passage[];
};

export type LinkResponse = { status: LinkStatus };

/** Relire la fiche au plus toutes les 6 heures (livrable 2, §5). */
export const SNAPSHOT_REFRESH_MS = 6 * 60 * 60 * 1000;

/** L'espace intégral exige une fiche liée et un abonnement en cours ; tout le reste est restreint. */
export function statutFor(link: LinkStatus, snapshot: Pick<MemberSnapshot, 'abonnementActif'> | null): Exclude<Statut, 'invite'> {
  return link === 'lie' && snapshot?.abonnementActif === true ? 'actif' : 'restreint';
}

/** Les clés de salle du robot BOXPLUS vers les clubs de l'app. */
export function clubFromDeciplusGym(gym: string | null | undefined): ClubId | null {
  switch (String(gym ?? '').toLowerCase()) {
    case 'minimes':
      return 'minimes';
    case 'st-cyprien':
    case 'saint-cyprien':
      return 'saint-cyprien';
    case 'etats-unis':
      return 'etats-unis';
    case 'ramonville':
      return 'ramonville';
    case 'portet':
      return 'portet';
    default:
      return null;
  }
}

/** Âge révolu à une date, depuis AAAA-MM-JJ. */
export function ageAt(dateNaissance: string, now = new Date()): number {
  const [y, m, d] = dateNaissance.split('-').map(Number);
  let age = now.getFullYear() - (y ?? 0);
  const dm = now.getMonth() + 1 - (m ?? 1);
  if (dm < 0 || (dm === 0 && now.getDate() < (d ?? 1))) age--;
  return age;
}

export const PARENTAL_CONSENT_AGE = 15;
