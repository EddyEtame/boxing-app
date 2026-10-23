import type { AnalyticsEvent, EventBatch } from '@bc/contract';

import { MAX_BATCH, MAX_BODY_BYTES, sanitizeEvent } from '@/lib/events';
import { isOn } from '@/server/collections';
import { clientIp, corsHeaders, json } from '@/server/http';
import { hit } from '@/server/rate-limit';
import { appendEvents } from '@/server/usage';

/**
 * API.events du contrat : l'app envoie ses événements d'usage par lots
 * (`EventBatch`) et attend 204. Garde-fous :
 *  - lot plafonné à 100 événements, corps à 128 Ko ;
 *  - 60 lots par minute et par adresse, 3 000 événements par heure et par installation ;
 *  - chaque événement vérifié (nom dans EVENT_NAMES, props passées par cleanProps,
 *    dates plausibles) ; un événement faux est écarté, les autres sont gardés ;
 *  - mesure coupée dans « Fonctions » : réponse 204, rien n'est écrit, et l'app
 *    vide sa file (la personne n'est pas mesurée, et son téléphone ne garde rien en attente).
 */
const METHODS = 'POST, OPTIONS';

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request, METHODS);
  const ip = clientIp(request.headers);

  const byIp = hit(`events:ip:${ip}`, 60, 60_000);
  if (!byIp.ok) {
    headers.set('Retry-After', String(byIp.retryAfterSec));
    return json({ error: 'debit' }, { status: 429, headers });
  }

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return json({ error: 'trop_gros' }, { status: 413, headers });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'trop_gros' }, { status: 413, headers });

  let body: Partial<EventBatch>;
  try {
    body = JSON.parse(raw) as Partial<EventBatch>;
  } catch {
    return json({ error: 'json' }, { status: 400, headers });
  }
  if (!body || !Array.isArray(body.events)) return json({ error: 'forme', message: 'Attendu : { events: AnalyticsEvent[] }' }, { status: 400, headers });
  if (body.events.length > MAX_BATCH) return json({ error: 'lot', max: MAX_BATCH }, { status: 413, headers });

  if (!(await isOn('mesure'))) {
    headers.set('x-bc-mesure', 'off');
    return new Response(null, { status: 204, headers });
  }

  const now = Date.now();
  const accepted: AnalyticsEvent[] = [];
  let rejected = 0;
  for (const raw of body.events) {
    const res = sanitizeEvent(raw, now);
    if (!res.ok) {
      rejected++;
      continue;
    }
    const perInstall = hit(`events:anon:${res.event.anonId}`, 3000, 3_600_000);
    if (!perInstall.ok) {
      rejected++;
      continue;
    }
    accepted.push(res.event);
  }

  const written = await appendEvents(accepted, 'app');
  headers.set('x-bc-accepted', String(written));
  headers.set('x-bc-rejected', String(rejected));
  return new Response(null, { status: 204, headers });
}
