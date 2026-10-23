import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { DIRECTION_ID, directionUser, directionVersion, getAccount, toSessionUser } from './accounts';
import { isProduction, sessionSecret } from './env';
import { decodeSession, encodeSession, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from './token';
import { can, type Capability } from '@/lib/permissions';
import type { SessionUser } from '@/lib/types';

/**
 * La session, relue à chaque requête : la signature du cookie, puis le compte
 * lui-même (existe-t-il encore ? est-il actif ? sa version a-t-elle changé ?).
 * Suspendre un compte ou changer le mot de passe de la boutique coupe donc
 * toutes les sessions ouvertes au clic suivant.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const secret = sessionSecret();
  if (!secret) return null;
  const jar = await cookies();
  const payload = decodeSession(jar.get(SESSION_COOKIE)?.value, secret);
  if (!payload) return null;
  if (payload.src === 'env') {
    const user = directionUser();
    if (!user || payload.sub !== DIRECTION_ID || payload.ver !== directionVersion()) return null;
    return user;
  }
  const account = await getAccount(payload.sub);
  if (!account || account.status !== 'actif' || String(account.sessionVersion) !== payload.ver) return null;
  return toSessionUser(account);
});

/** Pour une page : sans session, la connexion ; sans le droit, l'accueil avec un mot d'explication. */
export async function requireUser(capability?: Capability): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect('/connexion');
  if (capability && !can(user, capability)) redirect(`/?refus=${encodeURIComponent(capability)}`);
  return user;
}

export class ActionError extends Error {
  constructor(public code: 'session' | 'droits' | 'invalide' | 'introuvable' | 'conflit' | 'interne', message?: string) {
    super(message ?? code);
  }
}

/** Une erreur attrapée dans une action serveur, réduite à son code ; l'imprévu part dans le journal du serveur. */
export function errorCode(err: unknown): ActionError['code'] {
  if (err instanceof ActionError) return err.code;
  console.error(err);
  return 'interne';
}

/** Pour une action serveur : les actions sont des points d'entrée publics, on revérifie tout. */
export async function actionUser(capability: Capability): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new ActionError('session');
  if (!can(user, capability)) throw new ActionError('droits');
  return user;
}

export async function startSession(user: SessionUser, ver: string): Promise<void> {
  const secret = sessionSecret();
  if (!secret) throw new ActionError('interne', 'secret de session absent');
  const now = Math.floor(Date.now() / 1000);
  const token = encodeSession({ sub: user.id, src: user.source, ver, iat: now, exp: now + SESSION_MAX_AGE_SEC }, secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: isProduction(), path: '/', maxAge: SESSION_MAX_AGE_SEC });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'strict', secure: isProduction(), path: '/', maxAge: 0 });
}
