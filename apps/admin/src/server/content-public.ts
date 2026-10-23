import { isOn } from './collections';
import { readEvents, readNews, readVideos } from './content';
import { sha256 } from './crypto';
import { clientIp, corsHeaders } from './http';
import { hit } from './rate-limit';
import { wallNowParis } from '@/lib/content/rules';
import type { ContentList, PublicEvent, PublicMedia, PublicNews, PublicVideo } from '@/lib/public/content';
import type { ClubEvent, Media, NewsItem, VideoItem } from '@/lib/types';

/**
 * Ce que l'app lit : publié seulement, trié comme l'app l'affiche, images en
 * adresses absolues. Jamais un nom de l'équipe, jamais une note interne. Les
 * exemples marqués « démo » ne sortent qu'avec `?demo=1` (tests de l'app).
 */

/** L'origine vue par l'app (derrière un proxy, celle qu'il annonce). */
function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || url.host;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.replace(':', '');
  const safeHost = /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) ? host : url.host;
  const safeProto = proto === 'https' || proto === 'http' ? proto : 'http';
  return `${safeProto}://${safeHost}`;
}

function media(origin: string, m: Media | undefined): PublicMedia | null {
  if (!m) return null;
  const path = m.kind === 'upload' ? `/api/media/uploads/${encodeURIComponent(m.file)}` : `/api/media/app/photos/${encodeURIComponent(m.file)}`;
  return { url: `${origin}${path}`, alt: m.alt };
}

const latest = (items: { updatedAt: string }[]) => items.reduce<string | null>((max, i) => (!max || i.updatedAt > max ? i.updatedAt : max), null);

function toNews(origin: string, n: NewsItem): PublicNews {
  return {
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    date: n.date,
    photo: media(origin, n.photo),
    video: n.video ?? null,
    link: n.link ?? null,
    club: n.club,
    audience: n.audience,
    important: n.important,
    publishedAt: n.publishedAt ?? n.updatedAt,
  };
}

function toEvent(origin: string, e: ClubEvent): PublicEvent {
  return {
    id: e.id,
    kind: e.kind,
    title: e.title,
    body: e.body,
    startsAt: e.startsAt,
    endsAt: e.endsAt ?? null,
    club: e.club,
    venue: e.venue ?? null,
    photo: media(origin, e.photo),
    ticketUrl: e.ticketUrl ?? null,
    fight: e.fight ? { fighter: e.fight.fighter, opponent: e.fight.opponent, weightClass: e.fight.weightClass ?? null, title: e.fight.title ?? null, broadcaster: e.fight.broadcaster ?? null } : null,
    audience: e.audience,
    important: e.important,
    publishedAt: e.publishedAt ?? e.updatedAt,
  };
}

function toVideo(origin: string, v: VideoItem): PublicVideo {
  return {
    id: v.id,
    numero: v.numero,
    title: v.title,
    famille: v.famille,
    niveau: v.niveau,
    dureeMin: v.dureeMin,
    objectif: v.objectif,
    securite: v.securite,
    gratuite: v.gratuite,
    coach: v.coach ?? null,
    poster: media(origin, v.poster),
    // Une vidéo réservée ne donne jamais son adresse ici : elle se lira par une adresse signée, demandée connecté.
    source: v.gratuite && v.source.ref ? { kind: v.source.kind, ref: v.source.ref } : null,
    publishedAt: v.publishedAt ?? v.updatedAt,
  };
}

const withDemo = (request: Request) => new URL(request.url).searchParams.get('demo') === '1';

export async function publicNews(request: Request): Promise<ContentList<PublicNews>> {
  const origin = publicOrigin(request);
  const demo = withDemo(request);
  const items = (await readNews())
    .filter((n) => n.status === 'publie' && (demo || !n.demo))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  return { items: items.map((n) => toNews(origin, n)), enabled: true, updatedAt: latest(items) };
}

/** Les événements à venir (le plus proche d'abord), puis les 60 derniers jours (le plus récent d'abord). */
export async function publicEvents(request: Request): Promise<ContentList<PublicEvent>> {
  const origin = publicOrigin(request);
  const demo = withDemo(request);
  const now = wallNowParis();
  const horizon = wallNowParis(new Date(Date.now() - 60 * 86_400_000));
  const live = (await readEvents()).filter((e) => e.status === 'publie' && (demo || !e.demo));
  const ends = (e: ClubEvent) => e.endsAt ?? e.startsAt;
  const upcoming = live.filter((e) => ends(e) >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = live.filter((e) => ends(e) < now && e.startsAt >= horizon).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const items = [...upcoming, ...past];
  return { items: items.map((e) => toEvent(origin, e)), enabled: true, updatedAt: latest(items) };
}

export async function publicVideos(request: Request): Promise<ContentList<PublicVideo>> {
  const origin = publicOrigin(request);
  const demo = withDemo(request);
  const enabled = await isOn('videos');
  const items = enabled ? (await readVideos()).filter((v) => v.status === 'publie' && Boolean(v.source.ref) && (demo || !v.demo)).sort((a, b) => b.numero - a.numero) : [];
  return { items: items.map((v) => toVideo(origin, v)), enabled, updatedAt: latest(items) };
}

/** La réponse HTTP : CORS de l'app, cache court, ETag (une app qui relit sans changement reçoit 304). */
export async function respond<T>(request: Request, build: (r: Request) => Promise<ContentList<T>>): Promise<Response> {
  const headers = corsHeaders(request, 'GET, OPTIONS');
  headers.set('x-content-type-options', 'nosniff');
  const verdict = hit(`contenus:ip:${clientIp(request.headers)}`, 240, 60_000);
  if (!verdict.ok) {
    headers.set('retry-after', String(verdict.retryAfterSec));
    return new Response(JSON.stringify({ error: 'trop_de_requetes' }), { status: 429, headers });
  }
  const body = JSON.stringify(await build(request));
  const etag = `"${sha256(body).slice(0, 24)}"`;
  headers.set('etag', etag);
  headers.set('cache-control', 'public, max-age=60, stale-while-revalidate=300');
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(body, { status: 200, headers });
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}
