import { verifyLogin } from '@/server/accounts';
import { audit } from '@/server/audit';
import { configStatus, isProduction } from '@/server/env';
import { clientIp, isSameOrigin, json } from '@/server/http';
import { clear, hit, peek } from '@/server/rate-limit';
import { startSession } from '@/server/session';

/**
 * Connexion. Cinq échecs en quinze minutes, par appareil et par adresse, et
 * la porte se ferme jusqu'à la fin de la fenêtre (architecture §4 :
 * « connexion 5 / 15 min »). Les comparaisons sont à temps constant et une
 * adresse inconnue coûte le même temps qu'une connue.
 */
const LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'origine' }, { status: 403 });

  const cfg = configStatus();
  if (isProduction() && !cfg.secret) return json({ error: 'config', missing: ['secret'] }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 4096) return json({ error: 'invalide' }, { status: 413 });
  let body: { email?: unknown; password?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return json({ error: 'invalide' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 320) : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const ipKey = `login:ip:${clientIp(request.headers)}`;
  const emailKey = `login:email:${email}`;
  const byIp = peek(ipKey, LIMIT);
  const byEmail = peek(emailKey, LIMIT);
  if (!byIp.ok || !byEmail.ok) {
    const retryAfter = Math.max(byIp.retryAfterSec, byEmail.retryAfterSec);
    return json({ error: 'verrou', retryAfter }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
  }

  const result = await verifyLogin(email, password);
  if (!result) {
    hit(ipKey, LIMIT, WINDOW_MS);
    hit(emailKey, LIMIT, WINDOW_MS);
    const missing = cfg.direction ? [] : ['direction'];
    return json({ error: 'identifiants', missing }, { status: 401 });
  }

  clear(ipKey);
  clear(emailKey);
  await startSession(result.user, result.ver);
  await audit(result.user, 'connexion');
  return json({ ok: true });
}
