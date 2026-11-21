import { readVideos } from '@/server/content';
import { digestEqual, hmac } from '@/server/crypto';
import { sessionSecret } from '@/server/env';
import { clientIp, corsHeaders, json } from '@/server/http';
import { memberCanWatch, memberUser } from '@/server/member-auth';
import { hit } from '@/server/rate-limit';

const METHODS = 'GET, OPTIONS';

function originOf(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || url.host;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.replace(':', '');
  const safeHost = /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) ? host : url.host;
  const safeProto = proto === 'https' || proto === 'http' ? proto : 'http';
  return `${safeProto}://${safeHost}`;
}

async function streamUrl(ref: string): Promise<string | null> {
  const account = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_STREAM_TOKEN?.trim();
  if (!account || !token || !ref) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/${encodeURIComponent(ref)}/token`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 15 * 60 }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { result?: { token?: string } };
  const signed = body.result?.token;
  return signed ? `https://iframe.cloudflarestream.com/${signed}` : null;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = corsHeaders(request, METHODS);
  const limit = hit(`videos:lecture:${clientIp(request.headers)}`, 60, 60_000);
  if (!limit.ok) {
    headers.set('Retry-After', String(limit.retryAfterSec));
    return json({ error: 'debit' }, { status: 429, headers });
  }
  const { id } = await params;
  const video = (await readVideos()).find((v) => v.id === id && v.status === 'publie' && v.source.ref);
  if (!video) return json({ error: 'introuvable' }, { status: 404, headers });
  if (!video.gratuite) {
    const uid = (await memberUser(request))?.id;
    if (!uid) return json({ error: 'session' }, { status: 401, headers });
    if (!(await memberCanWatch(uid))) return json({ error: 'droits' }, { status: 403, headers });
  }
  const secret = sessionSecret();
  if (!secret) return json({ error: 'off' }, { status: 503, headers });
  if (video.source.kind === 'stream') {
    const url = await streamUrl(video.source.ref);
    if (!url) return json({ error: 'stream' }, { status: 409, headers });
    return json({ url, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() }, { headers });
  }
  const exp = Date.now() + 15 * 60_000;
  const sig = hmac(secret, `${video.id}.${exp}`);
  const url = `${originOf(request)}/api/videos/${encodeURIComponent(video.id)}/fichier?exp=${exp}&sig=${encodeURIComponent(sig)}`;
  return json({ url, expiresAt: new Date(exp).toISOString() }, { headers });
}

export function signOk(secret: string, id: string, exp: string, sig: string): boolean {
  if (!/^\d+$/.test(exp) || Date.now() > Number(exp)) return false;
  return digestEqual(sig, hmac(secret, `${id}.${exp}`));
}
