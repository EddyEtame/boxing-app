import type { PublicError } from '@/lib/public/comms';
import type { ParticipantsResponse } from '@/lib/public/team';
import { isOn, read } from '@/server/collections';
import { clientIp, corsHeaders, json } from '@/server/http';
import { requireMember } from '@/server/member-auth';
import { isOrganizer } from '@/server/moderation';
import { hit } from '@/server/rate-limit';

/**
 * Les inscrits d'une séance, pour son organisateur seul (CDC §11 C, D) : le
 * prénom et l'heure d'inscription, rien d'autre (ni nom, ni numéro, ni
 * identifiant). Un autre adhérent reçoit 403 `droits`.
 */
const METHODS = 'GET, OPTIONS';
const ID = /^[A-Za-z0-9_-]{1,80}$/;

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = corsHeaders(request, METHODS);
  const byIp = hit(`entrainements:participants:${clientIp(request.headers)}`, 120, 60_000);
  if (!byIp.ok) {
    headers.set('Retry-After', String(byIp.retryAfterSec));
    return json({ error: 'debit', retryAfter: byIp.retryAfterSec } satisfies PublicError, { status: 429, headers });
  }
  if (!(await isOn('entrainements'))) return json({ error: 'off' } satisfies PublicError, { status: 503, headers });
  const { id } = await params;
  if (!ID.test(id)) return json({ error: 'introuvable' } satisfies PublicError, { status: 404, headers });

  const auth = await requireMember(request);
  if (!auth.ok) return json({ error: auth.error } satisfies PublicError, { status: auth.status, headers });
  const { user, profile } = auth.member;

  const p = (await read('propositions')).find((x) => x.id === id && x.status !== 'retiree');
  if (!p) return json({ error: 'introuvable' } satisfies PublicError, { status: 404, headers });
  if (!isOrganizer(p, { userId: user.id, deciplusMemberId: profile.deciplusMemberId })) return json({ error: 'droits' } satisfies PublicError, { status: 403, headers });

  const items = [...(p.inscrits ?? [])].sort((a, b) => a.at.localeCompare(b.at)).map((i) => ({ prenom: i.prenom, at: i.at }));
  return json({ id: p.id, participants: p.participants, items } satisfies ParticipantsResponse, { headers });
}
