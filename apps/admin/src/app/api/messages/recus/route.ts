import type { PublicError, ReceivedMessagesResponse } from '@/lib/public/comms';
import { isOn } from '@/server/collections';
import { readReceivedFor } from '@/server/comms';
import { clientIp, corsHeaders, json } from '@/server/http';
import { requireMember } from '@/server/member-auth';
import { hit } from '@/server/rate-limit';

/**
 * Ce que les coachs et l'équipe ont écrit à l'adhérent de la session (CDC §10,
 * « Écrire à des adhérents ») : à lui seul, par son numéro Deciplus, ou à un
 * groupe qui le comprend (club principal, statut). À sens unique : on n'y
 * répond pas. Ce segment statique passe avant /api/messages/[id].
 *
 * Un adhérent restreint garde l'accès à ce qui lui a été écrit (les envois
 * peuvent viser les restreints) : seule une session valable est demandée.
 */
const METHODS = 'GET, OPTIONS';

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function GET(request: Request) {
  const headers = corsHeaders(request, METHODS);
  const byIp = hit(`messages:recus:${clientIp(request.headers)}`, 120, 60_000);
  if (!byIp.ok) {
    headers.set('Retry-After', String(byIp.retryAfterSec));
    return json({ error: 'debit', retryAfter: byIp.retryAfterSec } satisfies PublicError, { status: 429, headers });
  }
  if (!(await isOn('messagerie'))) return json({ error: 'off' } satisfies PublicError, { status: 503, headers });
  const auth = await requireMember(request);
  if (!auth.ok) return json({ error: auth.error } satisfies PublicError, { status: auth.status, headers });
  const items = await readReceivedFor(auth.member.profile);
  return json({ items } satisfies ReceivedMessagesResponse, { headers });
}
