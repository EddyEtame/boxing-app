import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Comparaison à temps constant, sans fuite de longueur : les deux chaînes
 * passent par un HMAC à clé fixe avant la comparaison (même mécanisme que la
 * boutique, box-plus/storefront/lib/security.js).
 */
export function secretsEqual(provided: string, expected: string): boolean {
  const key = Buffer.from(expected, 'utf8');
  if (!key.length) return false;
  const a = createHmac('sha256', key).update(Buffer.from(provided, 'utf8')).digest();
  const b = createHmac('sha256', key).update(key).digest();
  return timingSafeEqual(a, b);
}

/** Deux empreintes de même nature (signatures base64url). */
export function digestEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hmac(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Identifiant court, non devinable, sûr dans une URL. */
export function newId(prefix?: string): string {
  const id = randomBytes(9).toString('base64url');
  return prefix ? `${prefix}_${id}` : id;
}

/* ------------------------------------------------------------------ */
/* Mots de passe des comptes d'équipe : scrypt (aucune dépendance native) */
/* ------------------------------------------------------------------ */

const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 256 * N * R });
  return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (![n, r, p].every((x) => Number.isInteger(x) && x > 0) || n > 1 << 20) return false;
  const salt = Buffer.from(parts[4] ?? '', 'base64url');
  const expected = Buffer.from(parts[5] ?? '', 'base64url');
  if (!salt.length || !expected.length) return false;
  const key = await scryptAsync(password, salt, expected.length, { N: n, r, p, maxmem: 256 * n * r });
  return timingSafeEqual(key, expected);
}

/** Calcul factice de même coût : une adresse inconnue répond aussi lentement qu'une connue. */
const DUMMY = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86);
export async function burnPasswordTime(password: string): Promise<void> {
  await verifyPassword(password, DUMMY).catch(() => false);
}
