/**
 * Limiteur de débit à fenêtre fixe, en mémoire (un seul processus en local).
 * Clés : « login:ip:… », « login:email:… », « events:ip:… ». Partagé via
 * globalThis pour survivre aux copies de modules que fait Next.
 */
type Bucket = { count: number; resetAt: number };

const g = globalThis as typeof globalThis & { __bcaBuckets?: Map<string, Bucket>; __bcaPruneAt?: number };
const buckets = (g.__bcaBuckets ??= new Map());

function prune(now: number) {
  if ((g.__bcaPruneAt ?? 0) > now) return;
  g.__bcaPruneAt = now + 60_000;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export type Verdict = { ok: boolean; remaining: number; retryAfterSec: number };

/** Compte un coup ; refuse au-delà de `limit` dans la fenêtre. */
export function hit(key: string, limit: number, windowMs: number, now = Date.now()): Verdict {
  prune(now);
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  const ok = b.count <= limit;
  return { ok, remaining: Math.max(0, limit - b.count), retryAfterSec: ok ? 0 : Math.ceil((b.resetAt - now) / 1000) };
}

/** Regarde sans compter. */
export function peek(key: string, limit: number, now = Date.now()): Verdict {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) return { ok: true, remaining: limit, retryAfterSec: 0 };
  const ok = b.count < limit;
  return { ok, remaining: Math.max(0, limit - b.count), retryAfterSec: ok ? 0 : Math.ceil((b.resetAt - now) / 1000) };
}

export function clear(key: string) {
  buckets.delete(key);
}
