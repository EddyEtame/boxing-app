import { isClubId } from '@/lib/clubs';
import type { NotificationsResponse, PublicError, PublicNotification } from '@/lib/public/comms';
import type { ClubId, Statut } from '@/lib/types';
import { isOn } from '@/server/collections';
import { readNotifications } from '@/server/comms';
import { clientIp, corsHeaders, json } from '@/server/http';
import { hit } from '@/server/rate-limit';

/**
 * Les notifications qui concernent un club et un statut, sur trente jours
 * (CDC §14) : en attendant Expo Push, l'app peut les lire et les montrer dans
 * sa liste. Aucune donnée personnelle : un titre, un texte, un écran, une date.
 * Sans `statut`, la réponse est celle d'un invité (le moins de droits) ; sans
 * `club`, seulement ce qui vise tout le réseau. Les offres disparaissent quand
 * « notifications.promo » est coupé dans « Fonctions ».
 */
const METHODS = 'GET, OPTIONS';
const STATUTS: Statut[] = ['invite', 'restreint', 'actif'];
const WINDOW = 30 * 86_400_000;

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function GET(request: Request) {
  const headers = corsHeaders(request, METHODS);
  const byIp = hit(`notifications:ip:${clientIp(request.headers)}`, 120, 60_000);
  if (!byIp.ok) {
    headers.set('Retry-After', String(byIp.retryAfterSec));
    return json({ error: 'debit', retryAfter: byIp.retryAfterSec } satisfies PublicError, { status: 429, headers });
  }
  const url = new URL(request.url);
  const clubParam = url.searchParams.get('club');
  const statutParam = url.searchParams.get('statut');
  const fields = [...(clubParam !== null && !isClubId(clubParam) ? ['club'] : []), ...(statutParam !== null && !STATUTS.includes(statutParam as Statut) ? ['statut'] : [])];
  if (fields.length) return json({ error: 'invalide', fields } satisfies PublicError, { status: 400, headers });
  const club = clubParam as ClubId | null;
  const statut = (statutParam ?? 'invite') as Statut;
  const promoOn = await isOn('notifications.promo');
  const now = Date.now();
  const items: PublicNotification[] = (await readNotifications(now))
    .filter((n) => n.status === 'en-file')
    .map((n) => ({ n, at: n.when.kind === 'scheduled' ? n.when.at : n.createdAt }))
    .filter(({ n, at }) => {
      const ts = Date.parse(at);
      if (ts > now || now - ts > WINDOW) return false;
      if (n.type === 'promo' && !promoOn) return false;
      if (!n.target.statuts.includes(statut)) return false;
      if (n.target.clubs === 'all') return true;
      return club !== null && n.target.clubs.includes(club);
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 50)
    .map(({ n, at }) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, at }));
  return json({ items, delivery: 'en-file' } satisfies NotificationsResponse, { headers });
}
