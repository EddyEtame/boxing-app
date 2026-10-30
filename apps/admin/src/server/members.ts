import type { LinkStatus } from '@bc/contract';

import { audit } from './audit';
import { readDemoMembers, resolveDemo } from './members-demo';
import { supabaseAdmin, supabaseConfigured } from './supabase-admin';
import { bridgeErrorOf, signedHeaders } from '@/lib/bridge/sign';
import { buildOverview, type LinkRequestRow, type MemberRows, type ProfileRow, type SnapshotRow, type SubscriptionRow } from '@/lib/members/build';
import type { DecisionError, MembersOverview } from '@/lib/members/types';
import type { SessionUser } from '@/lib/types';

/**
 * LES ADHÉRENTS, côté serveur. Deux sources, la même vue :
 *  - la base de l'app (Supabase, clé de service, jamais côté navigateur), dès
 *    que SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont renseignées ; les
 *    décisions passent alors par le serveur applicatif (apps/bridge), qui écrit ;
 *  - sinon les exemples locaux (members-demo.ts), pour voir la rubrique à l'œuvre.
 * Ce fichier est la couture avec le serveur : les requêtes suivent
 * supabase/migrations et apps/bridge/src/app.ts, et se remplacent ici seulement.
 * Ce que le serveur doit encore fournir pour que l'admin cesse de lire la base
 * lui-même (route des demandes, acteur des décisions) est tenu dans ./couture.md.
 */

const PAGE = 1000;
const MAX_PAGES = 20;

type PageResult = { data: unknown; error: { message: string } | null };

/** Supabase rend 1 000 lignes par appel : on lit par pages jusqu'à la dernière (20 000 comptes au plus). */
async function paged<T>(label: string, page: (from: number, to: number) => PromiseLike<PageResult>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1);
    if (error) throw new Error(`${label} : ${error.message}`);
    const rows = Array.isArray(data) ? (data as T[]) : [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const PROFILE_COLS = 'id,prenom,nom,email,telephone,date_naissance,club_principal,link_status,link_updated_at,deciplus_member_id,consentement_parental_requis,created_at';
const SNAPSHOT_COLS = 'profile_id,abonnement_actif,abonnement_en_attente,badge_enregistre,contrats,club,read_at';
const SUBSCRIPTION_COLS = 'profile_id,status,plan_label,next_charge_date,current_period_end,badge_active';
const REQUEST_COLS = 'id,profile_id,order_id,status,deciplus_member_id,mismatch_fields,reason,resolution,resolved_by,created_at,decided_at,resolved_at';

async function readSupabaseRows(): Promise<MemberRows | null> {
  const sb = supabaseAdmin();
  if (!sb) return null;
  const [profiles, snapshots, subscriptions, queue, decided] = await Promise.all([
    paged<ProfileRow>('profils', (a, b) => sb.from('profiles').select(PROFILE_COLS).order('created_at', { ascending: false }).range(a, b)),
    paged<SnapshotRow>('fiches', (a, b) => sb.from('deciplus_snapshots').select(SNAPSHOT_COLS).order('profile_id').range(a, b)),
    paged<SubscriptionRow>('abonnements', (a, b) => sb.from('subscription_state').select(SUBSCRIPTION_COLS).order('profile_id').range(a, b)),
    paged<LinkRequestRow>('rapprochements', (a, b) => sb.from('link_requests').select(REQUEST_COLS).eq('status', 'a_revoir').order('created_at', { ascending: true }).range(a, b)),
    sb.from('link_requests').select(REQUEST_COLS).eq('status', 'resolu').order('resolved_at', { ascending: false }).limit(30),
  ]);
  if (decided.error) throw new Error(`décisions : ${decided.error.message}`);
  return { profiles, snapshots, subscriptions, requests: [...queue, ...((decided.data ?? []) as LinkRequestRow[])] };
}

export async function readMembers(now = new Date()): Promise<MembersOverview> {
  if (supabaseConfigured()) {
    const rows = await readSupabaseRows();
    if (rows) {
      const overview = buildOverview(rows, now, 'supabase');
      queueCache = { at: Date.now(), value: overview.queue.length };
      return overview;
    }
  }
  return buildOverview(await readDemoMembers(), now, 'demo');
}

/* ------------------------------------------------------------------ */
/* La pastille du rail et la ligne d'« Aujourd'hui »                     */
/* ------------------------------------------------------------------ */

let queueCache: { at: number; value: number } | null = null;
const QUEUE_TTL = 30_000;

/** Les demandes à revoir, comptées au plus toutes les 30 secondes : la pastille ne coûte pas une lecture par page. */
export async function queueCount(): Promise<number> {
  if (!supabaseConfigured()) {
    const demo = await readDemoMembers();
    const ids = new Set(demo.profiles.map((p) => p.id));
    return demo.requests.filter((r) => r.status === 'a_revoir' && ids.has(r.profile_id)).length;
  }
  if (queueCache && Date.now() - queueCache.at < QUEUE_TTL) return queueCache.value;
  const sb = supabaseAdmin();
  if (!sb) return 0;
  try {
    const { count, error } = await sb.from('link_requests').select('id', { count: 'exact', head: true }).eq('status', 'a_revoir');
    if (error) throw new Error(error.message);
    queueCache = { at: Date.now(), value: count ?? 0 };
  } catch (err) {
    console.error('[admin] file de rapprochement :', err instanceof Error ? err.message : err);
    queueCache = { at: Date.now(), value: 0 };
  }
  return queueCache.value;
}

/* ------------------------------------------------------------------ */
/* Décider : lier ou refuser                                            */
/* ------------------------------------------------------------------ */

export function adminBridge(): { base: string; secret: string } | null {
  const base = (process.env.MEMBER_BRIDGE_URL?.trim() || process.env.DECIPLUS_BRIDGE_URL?.trim() || '').replace(/\/+$/, '');
  const secret = process.env.ADMIN_BRIDGE_SECRET?.trim() ?? '';
  return base && secret ? { base, secret } : null;
}

export type DecisionOutcome = { ok: true; status: LinkStatus; warning?: 'robot_indisponible' } | { ok: false; code: DecisionError };

/**
 * Sur les exemples : la décision se joue en local. Sur la base de l'app :
 * `POST /internal/admin/link-resolution` du serveur applicatif. Lier exige que
 * le robot ait trouvé une fiche (sinon 409 identifiant_manquant) ; refuser rend
 * le compte prospect. Après un lien, le serveur relance une lecture de la fiche :
 * si le robot ne répond pas, le lien est fait mais la fiche attend (503).
 */
export async function decideLink(user: SessionUser, requestId: string, resolution: 'lie' | 'refuse', memberId: string | null): Promise<DecisionOutcome> {
  if (!supabaseConfigured()) return resolveDemo(user, requestId, resolution);
  const bridge = adminBridge();
  if (!bridge) return { ok: false, code: 'config' };
  const body = JSON.stringify({ link_request_id: requestId, resolution, actor: user.id.slice(0, 80) });
  let res: Response;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15_000);
    try {
      res = await fetch(`${bridge.base}/internal/admin/link-resolution`, { method: 'POST', headers: signedHeaders(bridge.secret, body), body, cache: 'no-store', signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { ok: false, code: 'pont' };
  }
  const payload: unknown = await res.json().catch(() => null);
  const action = resolution === 'lie' ? 'adherent.lien.valide' : 'adherent.lien.refuse';
  const detail = memberId ? `n° ${memberId}` : undefined;
  queueCache = null;
  if (res.ok) {
    const status = payload && typeof payload === 'object' && typeof (payload as { status?: unknown }).status === 'string' ? ((payload as { status: string }).status as LinkStatus) : resolution === 'lie' ? 'lie' : 'prospect';
    await audit(user, action, requestId, detail);
    return { ok: true, status };
  }
  const code = bridgeErrorOf(res.status, payload);
  if (code === 'robot_indisponible' && resolution === 'lie') {
    // Le lien est écrit ; seule la relecture de la fiche a échoué.
    await audit(user, action, requestId, detail ? `${detail} · fiche à relire` : 'fiche à relire');
    return { ok: true, status: 'lie', warning: 'robot_indisponible' };
  }
  if (code === 'signature_invalide' || code === 'requete_invalide') return { ok: false, code: 'config' };
  if (code === 'demande_inconnue' || code === 'profil_introuvable') return { ok: false, code: 'introuvable' };
  if (code === 'deja_resolue' || code === 'identifiant_manquant' || code === 'fiche_deja_liee' || code === 'robot_indisponible') return { ok: false, code };
  return { ok: false, code: 'pont' };
}
