import { CLUB_IDS, isClubId } from '@/lib/clubs';
import { ROLES, type ClubId, type Role } from '@/lib/types';

/**
 * Ce qu'un compte d'équipe doit respecter, vérifié pareil dans l'assistant
 * (on n'avance pas avec une erreur) et sur le serveur (une action est une
 * porte publique : on ne croit jamais le navigateur). Les erreurs sont des
 * clés du dictionnaire ; chaque côté les traduit.
 */
export const NAME_MAX = 60;
export const SIGN_MAX = 48;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

export type AccountDraft = {
  name: string;
  email: string;
  role: Role | null;
  scope: 'all' | 'clubs';
  clubs: ClubId[];
  signature: string;
};

export type KeyErrors = Record<string, string>;

export function identityErrors(d: Pick<AccountDraft, 'name' | 'email'>, withEmail = true): KeyErrors {
  const e: KeyErrors = {};
  const name = d.name.trim();
  if (name.length < 2) e.name = 'team.err.name';
  else if (name.length > NAME_MAX) e.name = 'team.err.nameLong';
  if (withEmail) {
    const email = d.email.trim();
    if (!email) e.email = 'team.err.emailEmpty';
    else if (!EMAIL_RE.test(email) || email.length > 254) e.email = 'team.err.email';
  }
  return e;
}

export function roleErrors(d: Pick<AccountDraft, 'role'>): KeyErrors {
  return d.role && ROLES.includes(d.role) ? {} : { role: 'team.err.role' };
}

export function scopeErrors(d: Pick<AccountDraft, 'scope' | 'clubs' | 'role'>): KeyErrors {
  if (d.role === 'direction' || d.scope === 'all') return {};
  if (!d.clubs.length) return { clubs: 'team.err.clubs' };
  if (!d.clubs.every(isClubId)) return { clubs: 'team.err.clubs' };
  return {};
}

export function signatureErrors(d: Pick<AccountDraft, 'signature'>): KeyErrors {
  const s = d.signature.trim();
  if (s.length < 2) return { signature: 'team.err.signature' };
  if (s.length > SIGN_MAX) return { signature: 'team.err.signatureLong' };
  return {};
}

/** Le périmètre tel qu'il sera enregistré : la direction voit tout le réseau ; cinq clubs cochés, c'est « tout ». */
export function clubsOf(d: Pick<AccountDraft, 'scope' | 'clubs' | 'role'>): ClubId[] | 'all' {
  if (d.role === 'direction' || d.scope === 'all') return 'all';
  const unique = CLUB_IDS.filter((c) => d.clubs.includes(c));
  return unique.length === CLUB_IDS.length ? 'all' : unique;
}

/** Une signature proposée d'après le profil et le premier club (l'équipe la retouche si besoin). */
export function suggestSignature(d: Pick<AccountDraft, 'name' | 'role' | 'scope' | 'clubs'>, clubLabel: (c: ClubId) => string): string {
  const first = d.name.trim().split(/\s+/)[0] ?? '';
  const club = d.scope === 'clubs' && d.clubs.length === 1 ? clubLabel(d.clubs[0]!) : '';
  switch (d.role) {
    case 'coach':
      return [first, 'coach', club].filter(Boolean).join(' · ');
    case 'administratif':
      return club ? `Accueil · ${club}` : [first, 'accueil'].filter(Boolean).join(' · ');
    case 'communication':
      return [first, 'communication'].filter(Boolean).join(' · ');
    case 'direction':
      return [first, 'direction'].filter(Boolean).join(' · ');
    default:
      return first;
  }
}

/** Lecture tolérante de ce que le navigateur envoie, avant les vérifications. */
export function parseDraft(raw: unknown): AccountDraft {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  return {
    name: str(o.name, NAME_MAX + 20).replace(/\s+/g, ' '),
    email: str(o.email, 300).trim().toLowerCase(),
    role: ROLES.includes(o.role as Role) ? (o.role as Role) : null,
    scope: o.scope === 'clubs' ? 'clubs' : 'all',
    clubs: Array.isArray(o.clubs) ? (o.clubs.filter(isClubId) as ClubId[]) : [],
    signature: str(o.signature, SIGN_MAX + 20).replace(/\s+/g, ' '),
  };
}
