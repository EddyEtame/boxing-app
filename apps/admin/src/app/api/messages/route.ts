import { isClubId } from '@/lib/clubs';
import { LIMITS } from '@/lib/comms/types';
import { cleanText } from '@/lib/comms/validate';
import type { MemberMessageRequest, MemberMessageResponse, PublicError } from '@/lib/public/comms';
import { SUJETS, type Statut, type Sujet } from '@/lib/types';
import { isOn } from '@/server/collections';
import { appendFromApp, openThreadFromApp } from '@/server/comms-inbox';
import { clientIp, corsHeaders, json } from '@/server/http';
import { hit } from '@/server/rate-limit';

/**
 * L'adhérent écrit à la direction (CDC §10 : le seul canal où il écrit
 * librement). Garde-fous :
 *  - 20 envois par heure et par adresse ; 5 par 10 minutes et 30 par jour par installation ;
 *  - corps de 8 Ko au plus, texte de 2 000 caractères, sujet de la liste de l'app ;
 *  - messagerie coupée dans « Fonctions » : 503, rien n'est écrit ;
 *  - seul un adhérent actif écrit (l'app verrouille la messagerie aux autres) ;
 *  - l'identité (nom, numéro) est déclarée par l'app et marquée comme telle :
 *    rien n'est vérifié tant que Deciplus n'est pas branché.
 * Sans `threadId`, un fil s'ouvre et son jeton de lecture est rendu une seule
 * fois ; avec `threadId` et l'en-tête `x-bc-thread-token`, le message s'ajoute.
 */
const METHODS = 'POST, OPTIONS';
const MAX_BODY = 8 * 1024;
const ANON = /^[A-Za-z0-9-]{8,64}$/;
const MEMBER = /^\d{3,10}$/;
const THREAD = /^[A-Za-z0-9_-]{1,80}$/;
const STATUTS: Statut[] = ['invite', 'restreint', 'actif'];

function cors(request: Request): Headers {
  const h = corsHeaders(request, METHODS);
  if (h.has('Access-Control-Allow-Origin')) h.set('Access-Control-Allow-Headers', 'content-type, x-bc-thread-token');
  return h;
}

const refuse = (body: PublicError, status: number, headers: Headers) => json(body, { status, headers });

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function POST(request: Request) {
  const headers = cors(request);
  const ip = clientIp(request.headers);

  const byIp = hit(`messages:ip:${ip}`, 20, 60 * 60_000);
  if (!byIp.ok) {
    headers.set('Retry-After', String(byIp.retryAfterSec));
    return refuse({ error: 'debit', retryAfter: byIp.retryAfterSec }, 429, headers);
  }

  if (!(await isOn('messagerie'))) return refuse({ error: 'off' }, 503, headers);

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY) return refuse({ error: 'taille' }, 413, headers);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return refuse({ error: 'taille' }, 413, headers);

  let body: Partial<MemberMessageRequest>;
  try {
    body = JSON.parse(raw) as Partial<MemberMessageRequest>;
  } catch {
    return refuse({ error: 'invalide', fields: ['json'] }, 400, headers);
  }
  if (!body || typeof body !== 'object') return refuse({ error: 'invalide' }, 400, headers);

  const text = cleanText(body.text, true);
  const name = body.name === undefined ? undefined : cleanText(body.name, false);
  const fields: string[] = [];
  if (typeof body.anonId !== 'string' || !ANON.test(body.anonId)) fields.push('anonId');
  if (!isClubId(body.club)) fields.push('club');
  if (!STATUTS.includes(body.statut as Statut)) fields.push('statut');
  if (!SUJETS.includes(body.sujet as Sujet)) fields.push('sujet');
  if (!text || text.length > LIMITS.memberText) fields.push('text');
  if (name !== undefined && name.length > LIMITS.name) fields.push('name');
  if (body.memberId !== undefined && (typeof body.memberId !== 'string' || !MEMBER.test(body.memberId))) fields.push('memberId');
  if (body.threadId !== undefined && (typeof body.threadId !== 'string' || !THREAD.test(body.threadId))) fields.push('threadId');
  if (fields.length) return refuse({ error: 'invalide', fields }, 400, headers);
  if (body.statut !== 'actif') return refuse({ error: 'statut' }, 403, headers);

  const anonId = body.anonId!;
  const burst = hit(`messages:anon:${anonId}`, 5, 10 * 60_000);
  const daily = burst.ok ? hit(`messages:anon-jour:${anonId}`, 30, 86_400_000) : burst;
  if (!burst.ok || !daily.ok) {
    const wait = Math.max(burst.retryAfterSec, daily.retryAfterSec);
    headers.set('Retry-After', String(wait));
    return refuse({ error: 'debit', retryAfter: wait }, 429, headers);
  }

  const input = { anonId, club: body.club!, statut: body.statut, sujet: body.sujet!, text, name: name || undefined, memberId: body.memberId };

  if (body.threadId) {
    const token = request.headers.get('x-bc-thread-token') ?? '';
    const thread = token.length >= 16 && token.length <= 128 ? await appendFromApp(body.threadId, token, input) : null;
    if (!thread) return refuse({ error: 'introuvable' }, 404, headers);
    return json({ threadId: thread.id, status: thread.status } satisfies MemberMessageResponse, { status: 200, headers });
  }

  const { thread, token } = await openThreadFromApp(input);
  return json({ threadId: thread.id, token, status: thread.status } satisfies MemberMessageResponse, { status: 201, headers });
}
