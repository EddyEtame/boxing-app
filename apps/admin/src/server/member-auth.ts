import { statutFor, type LinkStatus } from '@bc/contract';

import { sha256 } from './crypto';
import { isClubId } from '@/lib/clubs';
import type { ClubId } from '@/lib/types';

/**
 * L'ADHÉRENT QUI APPELLE L'API PUBLIQUE (CDC §10, §11).
 *
 * L'app envoie `Authorization: Bearer <jeton Supabase>`. On demande à
 * Supabase à qui il appartient (/auth/v1/user), puis on lit sa fiche avec la
 * clé service : lien Deciplus, club principal, prénom, numéro, abonnement.
 * Rien de tout cela ne sort tel quel : les routes n'en renvoient que ce que le
 * contrat prévoit.
 *
 * Sans Supabase configuré, les routes membres répondent 503 `off` ; sans
 * jeton valable, 401 `session` ; si Supabase ne répond pas, 503 `indisponible`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMEOUT_MS = 5000;

export type MemberUser = { id: string; email: string | null };

export type MemberProfile = {
  id: string;
  prenom: string;
  nom: string;
  club: ClubId | null;
  deciplusMemberId: string | null;
  linkStatus: LinkStatus;
  abonnementActif: boolean;
  badgeEnregistre: boolean;
  /** La même règle que l'app (statutFor du contrat) : fiche liée et abonnement en cours. */
  statut: 'actif' | 'restreint';
  /** En années, d'après la date de naissance de la fiche ; absent si elle n'est pas connue. */
  age?: number;
};

export type Member = { user: MemberUser; profile: MemberProfile };

export type MemberRefusal = { ok: false; status: 401 | 403 | 503; error: 'session' | 'statut' | 'off' | 'indisponible' };
export type MemberAuth = { ok: true; member: Member } | MemberRefusal;

function supabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
}

function anonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

function serviceKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

/** Assez pour vérifier un jeton et lire une fiche. */
export function memberAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && anonKey() && serviceKey());
}

export function bearerOf(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length >= 20 && token.length <= 4096 ? token : null;
}

/* Un petit cache des jetons déjà vérifiés : l'app enchaîne souvent plusieurs appels. */
const USER_TTL_MS = 30_000;
const USER_CACHE_MAX = 500;
const userCache = new Map<string, { user: MemberUser; until: number }>();

class Unavailable extends Error {}

/** null : jeton refusé par Supabase. Lève Unavailable si Supabase ne répond pas. */
async function fetchUser(token: string): Promise<MemberUser | null> {
  const key = sha256(`bc-bearer|${token}`);
  const now = Date.now();
  const cached = userCache.get(key);
  if (cached && cached.until > now) return cached.user;
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl()}/auth/v1/user`, { headers: { apikey: anonKey(), authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new Unavailable();
  }
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Unavailable();
  const body = (await res.json().catch(() => null)) as { id?: unknown; email?: unknown } | null;
  if (!body || typeof body.id !== 'string' || !UUID.test(body.id)) return null;
  const user: MemberUser = { id: body.id, email: typeof body.email === 'string' ? body.email : null };
  if (userCache.size >= USER_CACHE_MAX) userCache.clear();
  userCache.set(key, { user, until: now + USER_TTL_MS });
  return user;
}

/** L'identifiant Supabase du porteur du jeton, ou null (jeton absent, refusé, ou Supabase muet). */
export async function memberUser(request: Request): Promise<MemberUser | null> {
  const token = bearerOf(request);
  if (!token || !supabaseUrl() || !anonKey()) return null;
  try {
    return await fetchUser(token);
  } catch {
    return null;
  }
}

async function rest<T>(path: string): Promise<T[]> {
  const key = serviceKey();
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl()}/rest/v1/${path}`, { headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new Unavailable();
  }
  if (!res.ok) throw new Unavailable();
  const rows = (await res.json().catch(() => null)) as unknown;
  if (!Array.isArray(rows)) throw new Unavailable();
  return rows as T[];
}

/** L'âge à aujourd'hui (heure de Toulouse), pour une date « AAAA-MM-JJ ». */
function ageFrom(ymd: unknown): number | undefined {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return undefined;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty! - y!;
  if (tm! < m! || (tm === m && td! < d!)) age--;
  return age >= 0 && age < 130 ? age : undefined;
}

type ProfileRow = { id: string; prenom?: string | null; nom?: string | null; club_principal?: string | null; deciplus_member_id?: string | null; link_status?: string | null; date_naissance?: string | null };
type SnapshotRow = { abonnement_actif?: boolean | null; badge_enregistre?: boolean | null };

const LINK_STATUSES: LinkStatus[] = ['en_attente', 'lie', 'a_revoir', 'prospect'];

/** La fiche d'un adhérent ; sans ligne `profiles`, un compte restreint sans rien de connu. */
async function fetchProfile(userId: string): Promise<MemberProfile> {
  if (!UUID.test(userId)) throw new Unavailable();
  const id = encodeURIComponent(userId);
  const [profiles, snapshots] = await Promise.all([
    rest<ProfileRow>(`profiles?id=eq.${id}&select=id,prenom,nom,club_principal,deciplus_member_id,link_status,date_naissance&limit=1`),
    rest<SnapshotRow>(`deciplus_snapshots?profile_id=eq.${id}&select=abonnement_actif,badge_enregistre&limit=1`),
  ]);
  const p = profiles[0];
  const s = snapshots[0];
  const linkStatus = LINK_STATUSES.includes(p?.link_status as LinkStatus) ? (p!.link_status as LinkStatus) : 'en_attente';
  const abonnementActif = s?.abonnement_actif === true;
  const age = ageFrom(p?.date_naissance);
  return {
    id: userId,
    prenom: (p?.prenom ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
    nom: (p?.nom ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
    club: isClubId(p?.club_principal) ? (p!.club_principal as ClubId) : null,
    deciplusMemberId: typeof p?.deciplus_member_id === 'string' && p.deciplus_member_id.trim() ? p.deciplus_member_id.trim() : null,
    linkStatus,
    abonnementActif,
    badgeEnregistre: s?.badge_enregistre === true,
    statut: statutFor(linkStatus, { abonnementActif }),
    ...(age !== undefined ? { age } : {}),
  };
}

/**
 * L'adhérent de la requête, avec sa fiche. `actif: true` refuse (403 `statut`)
 * celui dont l'abonnement n'est pas en cours.
 */
export async function requireMember(request: Request, opts: { actif?: boolean } = {}): Promise<MemberAuth> {
  if (!memberAuthConfigured()) return { ok: false, status: 503, error: 'off' };
  const token = bearerOf(request);
  if (!token) return { ok: false, status: 401, error: 'session' };
  try {
    const user = await fetchUser(token);
    if (!user) return { ok: false, status: 401, error: 'session' };
    const profile = await fetchProfile(user.id);
    if (opts.actif && profile.statut !== 'actif') return { ok: false, status: 403, error: 'statut' };
    return { ok: true, member: { user, profile } };
  } catch (e) {
    if (e instanceof Unavailable) return { ok: false, status: 503, error: 'indisponible' };
    throw e;
  }
}

/**
 * Pour les routes où la session est un plus et pas une condition (l'app déjà
 * en ligne n'en envoie pas toujours) : l'adhérent s'il est reconnu, sinon null,
 * sans jamais faire échouer la requête.
 */
export async function optionalMember(request: Request): Promise<Member | null> {
  if (!bearerOf(request) || !memberAuthConfigured()) return null;
  const auth = await requireMember(request).catch(() => null);
  return auth?.ok ? auth.member : null;
}

/**
 * Les vidéos réservées (CDC §9) : un abonnement en cours ou un badge
 * enregistré suffit (la règle d'origine de /api/videos/[id]/lecture).
 */
export async function memberCanWatch(userId: string): Promise<boolean> {
  if (!supabaseUrl() || !serviceKey() || !UUID.test(userId)) return false;
  try {
    const rows = await rest<SnapshotRow>(`deciplus_snapshots?profile_id=eq.${encodeURIComponent(userId)}&select=abonnement_actif,badge_enregistre&limit=1`);
    const row = rows[0];
    return Boolean(row?.abonnement_actif || row?.badge_enregistre);
  } catch {
    return false;
  }
}

