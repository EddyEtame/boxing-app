import { digestEqual, hmac } from './crypto';

/**
 * Le jeton de session : charge utile en base64url, point, signature HMAC-SHA-256.
 * Il ne prouve qu'une chose : l'admin l'a émis. Le compte est relu à chaque
 * requête (session.ts) — un cookie signé n'est pas un compte valide.
 */
export const SESSION_COOKIE = 'bca_session';
export const SESSION_MAX_AGE_SEC = 12 * 60 * 60;

export type SessionPayload = {
  /** Identifiant du compte (« direction » pour le compte de la boutique). */
  sub: string;
  src: 'env' | 'store';
  /** Version du compte : empreinte des identifiants (env) ou compteur (store). */
  ver: string;
  iat: number;
  exp: number;
};

export function encodeSession(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${hmac(secret, body)}`;
}

export function decodeSession(token: string | undefined | null, secret: string, now = Date.now()): SessionPayload | null {
  if (!token || token.length > 2048) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!digestEqual(sig, hmac(secret, body))) return null;
  let p: unknown;
  try {
    p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  if (typeof o.sub !== 'string' || (o.src !== 'env' && o.src !== 'store') || typeof o.ver !== 'string' || typeof o.iat !== 'number' || typeof o.exp !== 'number') return null;
  if (o.exp * 1000 <= now) return null;
  return { sub: o.sub, src: o.src, ver: o.ver, iat: o.iat, exp: o.exp };
}
