import type { ClubId, Role, SessionUser } from './types';

/**
 * Les droits par profil (CDC §15 : « Les droits devront être adaptés aux
 * missions de chaque profil »). Une seule table, lue partout : le rail, les
 * pages, les actions serveur et l'API. Ce qui n'est pas listé est refusé.
 */
export const CAPABILITIES = [
  'aujourdhui',
  'actualites',
  'evenements',
  'videos',
  'plannings',
  'plannings.edit',
  'notifications',
  'messagerie',
  'messages',
  'moderation',
  'statistiques',
  'demo',
  'fonctions',
  'branchements',
  'deciplus',
  'comptes',
  'journal',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const MATRIX: Record<Role, readonly Capability[]> = {
  direction: CAPABILITIES,
  communication: ['aujourdhui', 'actualites', 'evenements', 'videos', 'plannings', 'notifications', 'statistiques'],
  administratif: ['aujourdhui', 'plannings', 'plannings.edit', 'messagerie', 'messages', 'moderation', 'deciplus'],
  coach: ['aujourdhui', 'plannings', 'messages', 'moderation'],
};

export function can(user: Pick<SessionUser, 'role'>, capability: Capability): boolean {
  return MATRIX[user.role].includes(capability);
}

/** Le club est-il dans le périmètre de la personne ? (coachs et accueil d'un club) */
export function inScope(user: Pick<SessionUser, 'clubs'>, club: ClubId): boolean {
  return user.clubs === 'all' || user.clubs.includes(club);
}

/** Les clubs que la personne peut viser ; `all` reste `all`. */
export function scopeClubs(user: Pick<SessionUser, 'clubs'>, wanted: ClubId[] | 'all'): ClubId[] | 'all' {
  if (user.clubs === 'all') return wanted;
  if (wanted === 'all') return user.clubs;
  return wanted.filter((c) => (user.clubs as ClubId[]).includes(c));
}
