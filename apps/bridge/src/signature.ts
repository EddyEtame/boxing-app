import { createHmac, timingSafeEqual } from 'node:crypto';

const WEBHOOK_PREFIX = 'v1,whsec_';

/** Comparaison en temps constant. Une longueur differente est un echec. */
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function hmacHex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Cle du crochet Supabase : base64 de ce qui suit `v1,whsec_`. */
export function webhookKey(secret: string): Buffer {
  const encoded = secret.startsWith(WEBHOOK_PREFIX) ? secret.slice(WEBHOOK_PREFIX.length) : secret;
  return Buffer.from(encoded, 'base64');
}

export function verifyBridgeSignature(input: {
  secret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  nowSec: number;
  toleranceSec?: number;
}): boolean {
  const tolerance = input.toleranceSec ?? 300;
  const expected = hmacHex(input.secret, `${input.timestamp}.${input.rawBody}`);
  const provided = input.signature.trim().toLowerCase();
  const match = safeEqual(expected, provided);
  const ts = Number(input.timestamp);
  const fresh = Number.isFinite(ts) && Math.abs(input.nowSec - ts) <= tolerance;
  return match && fresh;
}

/**
 * Standard Webhooks (crochet Send Email) : HMAC-SHA256 du
 * `${id}.${timestamp}.${corps}`, signature `v1,<base64>`.
 */
export function verifyStandardWebhook(input: {
  secret: string;
  id: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  nowSec: number;
  toleranceSec?: number;
}): boolean {
  const tolerance = input.toleranceSec ?? 300;
  const expected = createHmac('sha256', webhookKey(input.secret))
    .update(`${input.id}.${input.timestamp}.${input.rawBody}`)
    .digest('base64');
  const parts = input.signature.split(' ').map((part) => part.trim()).filter((part) => part.startsWith('v1,'));
  let match = false;
  if (parts.length === 0) safeEqual(expected, expected);
  for (const part of parts) {
    if (safeEqual(expected, part.slice(3))) match = true;
  }
  const ts = Number(input.timestamp);
  const fresh = Number.isFinite(ts) && Math.abs(input.nowSec - ts) <= tolerance;
  return match && fresh;
}
