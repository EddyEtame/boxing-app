import { publicFeatures } from '@/server/features';
import { clientIp, corsHeaders, json } from '@/server/http';
import { hit } from '@/server/rate-limit';

/**
 * GET /api/fonctions — ce que l'app doit allumer ou couper (CDC §15). Public :
 * aucune donnée personnelle, seulement des interrupteurs. État effectif : une
 * catégorie d'entraînement est fausse si la rubrique entière est coupée.
 */
const METHODS = 'GET, OPTIONS';

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function GET(request: Request) {
  const headers = corsHeaders(request, METHODS);
  const v = hit(`fonctions:ip:${clientIp(request.headers)}`, 120, 60_000);
  if (!v.ok) {
    headers.set('Retry-After', String(v.retryAfterSec));
    return json({ error: 'debit' }, { status: 429, headers });
  }
  return json(await publicFeatures(), { headers });
}
