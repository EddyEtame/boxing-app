import type { PublicError } from '@/lib/public/comms';
import type { ParticipationResponse } from '@/lib/public/team';
import { isOn } from '@/server/collections';
import { clientIp, corsHeaders, json } from '@/server/http';
import { requireMember } from '@/server/member-auth';
import { setParticipation } from '@/server/moderation';
import { hit } from '@/server/rate-limit';

/**
 * « Je participe » (POST) et son annulation (DELETE), CDC §11 B, C.
 *
 * Réservé à l'adhérent actif de la session ; idempotent : le même appel
 * répété ne compte qu'une fois. Seul le prénom de la fiche est gardé pour
 * l'organisateur, avec l'heure d'inscription.
 *  - 404 `introuvable` : pas de proposition en ligne sous ce numéro ;
 *  - 403 `coupee` : la catégorie est coupée ; `age` : trop jeune pour ce type ;
 *  - 409 `passee` : la séance a commencé ; `organisateur` : c'est la sienne.
 */
const METHODS = 'POST, DELETE, OPTIONS';
const ID = /^[A-Za-z0-9_-]{1,80}$/;

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

async function handle(request: Request, params: Promise<{ id: string }>, join: boolean): Promise<Response> {
  const headers = corsHeaders(request, METHODS);
  const byIp = hit(`entrainements:participation:${clientIp(request.headers)}`, 60, 60_000);
  if (!byIp.ok) {
    headers.set('Retry-After', String(byIp.retryAfterSec));
    return json({ error: 'debit', retryAfter: byIp.retryAfterSec } satisfies PublicError, { status: 429, headers });
  }
  if (!(await isOn('entrainements'))) return json({ error: 'off' } satisfies PublicError, { status: 503, headers });
  const { id } = await params;
  if (!ID.test(id)) return json({ error: 'introuvable' } satisfies PublicError, { status: 404, headers });

  const auth = await requireMember(request, { actif: true });
  if (!auth.ok) return json({ error: auth.error } satisfies PublicError, { status: auth.status, headers });
  const { user, profile } = auth.member;

  // Trente changements par heure et par adhérent : assez pour hésiter, pas pour jouer avec le compteur.
  const byMember = hit(`entrainements:participation:membre:${user.id}`, 30, 3_600_000);
  if (!byMember.ok) {
    headers.set('Retry-After', String(byMember.retryAfterSec));
    return json({ error: 'debit', retryAfter: byMember.retryAfterSec } satisfies PublicError, { status: 429, headers });
  }

  const res = await setParticipation(id, { userId: user.id, prenom: profile.prenom, deciplusMemberId: profile.deciplusMemberId, ...(profile.age !== undefined ? { age: profile.age } : {}) }, join);
  if (!res.ok) {
    const status = res.error === 'introuvable' ? 404 : res.error === 'passee' || res.error === 'organisateur' ? 409 : 403;
    return json({ error: res.error, ...(res.quoi ? { quoi: res.quoi } : {}) } satisfies PublicError, { status, headers });
  }
  return json({ id: res.id, inscrit: res.inscrit, participants: res.participants } satisfies ParticipationResponse, { headers });
}

export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, true);
}

export function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, false);
}
