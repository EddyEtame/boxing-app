import type { PublicError } from '@/lib/public/comms';
import { isOn } from '@/server/collections';
import { readForApp } from '@/server/comms-inbox';
import { clientIp, corsHeaders, json } from '@/server/http';
import { hit } from '@/server/rate-limit';

/**
 * L'app relit un fil qu'elle a ouvert : les messages de l'adhérent et les
 * réponses signées de l'équipe, jamais une note interne ni le nom du compte
 * qui a répondu. Le jeton voyage dans l'en-tête `x-bc-thread-token`, jamais
 * dans l'adresse (qui finit dans les journaux) ; un mauvais jeton répond comme
 * un fil inexistant.
 */
const METHODS = 'GET, OPTIONS';
const THREAD = /^[A-Za-z0-9_-]{1,80}$/;

function cors(request: Request): Headers {
  const h = corsHeaders(request, METHODS);
  if (h.has('Access-Control-Allow-Origin')) h.set('Access-Control-Allow-Headers', 'x-bc-thread-token');
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
  const token = request.headers.get('x-bc-thread-token') ?? '';
  if (!THREAD.test(id) || token.length < 16 || token.length > 128) return json({ error: 'introuvable' } satisfies PublicError, { status: 404, headers });
  const thread = await readForApp(id, token);
  if (!thread) return json({ error: 'introuvable' } satisfies PublicError, { status: 404, headers });
  return json(thread, { headers });
}
