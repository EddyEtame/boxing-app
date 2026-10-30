import { createHmac, timingSafeEqual } from 'node:crypto';

type ClubId = 'minimes' | 'saint-cyprien' | 'etats-unis' | 'ramonville' | 'portet';

const CLUBS = new Set<ClubId>(['minimes', 'saint-cyprien', 'etats-unis', 'ramonville', 'portet']);

export function isClubId(value: string): value is ClubId {
  return CLUBS.has(value as ClubId);
}

export function normalizeOfferSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase().slice(0, 80);
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(slug)) return null;
  return slug;
}

/** Signature checkout : HMAC hex sur `sessionId.expiresUnix.profileId`. */
export function signCheckoutToken(secret: string, sessionId: string, profileId: string, expiresUnix: number): string {
  return createHmac('sha256', secret).update(`${sessionId}.${expiresUnix}.${profileId}`).digest('hex');
}

export function verifyCheckoutToken(
  secret: string,
  sessionId: string,
  profileId: string,
  expiresUnix: number,
  provided: string,
): boolean {
  const expected = signCheckoutToken(secret, sessionId, profileId, expiresUnix);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided.trim().toLowerCase());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildCheckoutUrl(
  base: string,
  sessionId: string,
  profileId: string,
  expiresUnix: number,
  secret: string,
  offerSlug: string,
  club: string,
): string {
  const sig = signCheckoutToken(secret, sessionId, profileId, expiresUnix);
  const url = new URL(base);
  url.searchParams.set('cs', sessionId);
  url.searchParams.set('pid', profileId);
  url.searchParams.set('exp', String(expiresUnix));
  url.searchParams.set('sig', sig);
  url.searchParams.set('offer', offerSlug);
  url.searchParams.set('club', club);
  return url.toString();
}
