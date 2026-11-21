import type { PublicError } from '@/lib/public/comms';
import { isOn } from '@/server/collections';
import { readForApp } from '@/server/comms-inbox';
import { clientIp, corsHeaders, json } from '@/server/http';
import { memberUser } from '@/server/member-auth';
import { hit } from '@/server/rate-limit';

/**
 * L'app relit un fil qu'elle a ouvert : les messages de l'adhérent et les
 * réponses signées de l'équipe, jamais une note interne ni le nom du compte
 * qui a répondu. Deux façons d'y avoir droit :
 *  - le jeton du fil, dans l'en-tête `x-bc-thread-token`, jamais dans
 *    l'adresse (qui finit dans les journaux) ;
 *  - la session du propriétaire (`Authorization: Bearer`), pour un fil ouvert
 *    avec une session : il se relit sur un autre téléphone.
 * Un mauvais jeton, ou la session d'un autre, répond comme un fil inexistant.
 */
const METHODS = 'GET, OPTIONS';
const THREAD = /^[A-Za-z0-9_-]{1,80}$/;

function cors(request: Request): Headers {
  const h = corsHeaders(request, METHODS);
  if (h.has('Access-Control-Allow-Origin')) h.set('Access-Control-Allow-Headers', 'authorization, x-bc-thread-token');
  return h;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = cors(request);
  const byIp = hit(`messages:read:${clientIp(request.headers)}`, 120, 60_000);
  if (!byIp.ok) {
    headers.set('Retry-After', String(byIp.retryAfterSec));
    return json({ error: 'debit', retryAfter: byIp.retryAfterSec } satisfies PublicError, { status: 429, headers });
  }
  if (!(await isOn('messagerie'))) return json({ error: 'off' } satisfies PublicError, { status: 503, headers });
  const { id } = await params;
  const raw = request.headers.get('x-bc-thread-token') ?? '';
  const token = raw.length >= 16 && raw.length <= 128 ? raw : null;
  if (!THREAD.test(id)) return json({ error: 'introuvable' } satisfies PublicError, { status: 404, headers });
  // Le jeton d'abord (aucun appel à Supabase) ; la session seulement s'il manque ou ne suffit pas.
  let thread = token ? await readForApp(id, { token }) : null;
  if (!thread) {
    const user = await memberUser(request);
    if (user) thread = await readForApp(id, { ownerId: user.id });
  }
  if (!thread) return json({ error: 'introuvable' } satisfies PublicError, { status: 404, headers });
  return json(thread, { headers });
}
