import { todayLocal } from '@/lib/format';
import { noteApiRead } from '@/server/demo';
import { corsHeaders, json } from '@/server/http';
import { publicPlanning, readPlanning } from '@/server/planning';

/**
 * Le planning que lit l'app (CDC §7) : les créneaux des cinq clubs et les
 * séances annulées des huit prochaines semaines — jamais le nom d'un coach.
 * Public, en lecture seule ; `If-None-Match` répond 304 tant que rien ne change.
 */
export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: Request) {
  const headers = corsHeaders(request, 'GET, OPTIONS');
  noteApiRead('plannings', request);
  const body = publicPlanning(await readPlanning(), todayLocal());
  const etag = `"${body.version}"`;
  headers.set('etag', etag);
  headers.set('cache-control', 'public, max-age=60, must-revalidate');
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return json(body, { headers });
}
