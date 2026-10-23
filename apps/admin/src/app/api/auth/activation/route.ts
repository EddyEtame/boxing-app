import { AccountError, activate, findByActivation } from '@/server/accounts';
import { audit } from '@/server/audit';
import { sha256 } from '@/server/crypto';
import { clientIp, isSameOrigin, json } from '@/server/http';
import { hit } from '@/server/rate-limit';
import { startSession } from '@/server/session';
import { checkPassword, passwordOk, personalParts, PW_MAX } from '@/lib/team/password';

/**
 * Activation d'un compte d'équipe : le lien reçu de la direction, un mot de
 * passe choisi par la personne, et elle entre. Dix essais par appareil et
 * cinq par lien en quinze minutes ; les règles du mot de passe sont revérifiées
 * ici, quoi qu'ait affiché le navigateur.
 */
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'origine' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 4096) return json({ error: 'invalide' }, { status: 413 });
  let body: { token?: unknown; password?: unknown; confirm?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return json({ error: 'invalide' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token.slice(0, 128) : '';
  const password = typeof body.password === 'string' ? body.password.slice(0, PW_MAX + 1) : '';
  const confirm = typeof body.confirm === 'string' ? body.confirm.slice(0, PW_MAX + 1) : '';

  const byIp = hit(`activation:ip:${clientIp(request.headers)}`, 10, WINDOW_MS);
  const byToken = hit(`activation:lien:${sha256(token).slice(0, 24)}`, 5, WINDOW_MS);
  if (!byIp.ok || !byToken.ok) {
    const retryAfter = Math.max(byIp.retryAfterSec, byToken.retryAfterSec);
    return json({ error: 'verrou', retryAfter }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
  }

  const account = await findByActivation(token);
  if (!account) return json({ error: 'lien' }, { status: 410 });
  const checks = checkPassword(password, confirm, personalParts(account.name, account.email));
  if (!passwordOk(checks)) return json({ error: 'regles', checks }, { status: 400 });

  try {
    const { user, ver } = await activate(token, password);
    await startSession(user, ver);
    await audit(user, 'connexion');
    return json({ ok: true });
  } catch (err) {
    if (err instanceof AccountError) return json({ error: 'lien' }, { status: 410 });
    console.error(err);
    return json({ error: 'interne' }, { status: 500 });
  }
}
