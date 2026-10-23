import { audit, type Actor } from './audit';
import { burnPasswordTime, hashPassword, hmac, newId, randomToken, secretsEqual, sha256, verifyPassword } from './crypto';
import { directionCredentials, sessionSecret } from './env';
import { readCollection, updateCollection } from './store';
import type { ClubId, Role, SessionUser, TeamAccount } from '@/lib/types';

/**
 * Les comptes de l'admin.
 *
 * Le compte Direction est celui du super administrateur de la boutique
 * (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD), lu dans l'environnement, jamais
 * copié dans la base. Les comptes personnels (communication, administratif,
 * coachs) sont créés ensuite par la Direction, avec un lien d'activation :
 * chaque personne choisit son mot de passe, et chaque action porte son nom.
 */
export const DIRECTION_ID = 'direction';
const ACTIVATION_HOURS = 72;

export function directionUser(): SessionUser | null {
  const c = directionCredentials();
  if (!c) return null;
  return { id: DIRECTION_ID, name: 'Direction', email: c.email, role: 'direction', clubs: 'all', signature: 'Direction · Boxing Center', source: 'env' };
}

/** Change dès que l'adresse ou le mot de passe de la boutique change : les sessions ouvertes meurent. */
export function directionVersion(): string | null {
  const c = directionCredentials();
  const secret = sessionSecret();
  if (!c || !secret) return null;
  return hmac(secret, `direction|${c.email}|${c.password}`).slice(0, 22);
}

export async function listAccounts(): Promise<TeamAccount[]> {
  return readCollection<TeamAccount[]>('comptes', () => []);
}

export async function getAccount(id: string): Promise<TeamAccount | null> {
  return (await listAccounts()).find((a) => a.id === id) ?? null;
}

export function toSessionUser(a: TeamAccount): SessionUser {
  return { id: a.id, name: a.name, email: a.email, role: a.role, clubs: a.clubs, signature: a.signature, source: 'store' };
}

export type LoginResult = { user: SessionUser; ver: string } | null;

export async function verifyLogin(emailInput: string, password: string): Promise<LoginResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password || password.length > 512) {
    await burnPasswordTime(password || 'x');
    return null;
  }
  const direction = directionCredentials();
  if (direction && secretsEqual(email, direction.email)) {
    const ok = secretsEqual(password, direction.password);
    // Même coût qu'un compte personnel : le temps de réponse ne dit pas quel compte existe.
    await burnPasswordTime(password);
    const user = directionUser();
    const ver = directionVersion();
    return ok && user && ver ? { user, ver } : null;
  }
  const account = (await listAccounts()).find((a) => a.email === email);
  if (!account || account.status !== 'actif' || !account.passwordHash) {
    await burnPasswordTime(password);
    return null;
  }
  if (!(await verifyPassword(password, account.passwordHash))) return null;
  await updateCollection<TeamAccount[], void>('comptes', () => [], (list) => ({
    next: list.map((a) => (a.id === account.id ? { ...a, lastLoginAt: new Date().toISOString() } : a)),
    result: undefined,
  }));
  return { user: toSessionUser(account), ver: String(account.sessionVersion) };
}

/* ------------------------------------------------------------------ */
/* Création, activation, suspension                                    */
/* ------------------------------------------------------------------ */

export type AccountInput = { name: string; email: string; role: Exclude<Role, 'direction'> | 'direction'; clubs: ClubId[] | 'all'; signature: string };

export class AccountError extends Error {
  constructor(public code: 'email-pris' | 'email-direction' | 'introuvable' | 'lien-expire' | 'statut') {
    super(code);
  }
}

function activation(): { token: string; record: { tokenHash: string; expiresAt: string } } {
  const token = randomToken(32);
  return { token, record: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + ACTIVATION_HOURS * 3600_000).toISOString() } };
}

export async function createAccount(input: AccountInput, actor: Actor): Promise<{ account: TeamAccount; token: string }> {
  const email = input.email.trim().toLowerCase();
  if (directionCredentials()?.email === email) throw new AccountError('email-direction');
  const { token, record } = activation();
  const now = new Date().toISOString();
  const account = await updateCollection<TeamAccount[], TeamAccount>('comptes', () => [], (list) => {
    if (list.some((a) => a.email === email)) throw new AccountError('email-pris');
    const created: TeamAccount = {
      id: newId('c'),
      name: input.name.trim(),
      email,
      role: input.role,
      clubs: input.clubs,
      signature: input.signature.trim(),
      status: 'invite',
      activation: record,
      sessionVersion: 1,
      createdAt: now,
      createdBy: actor.id,
      updatedAt: now,
    };
    return { next: [...list, created], result: created };
  });
  await audit(actor, 'compte.creation', account.id, `${account.name} · ${account.role}`);
  return { account, token };
}

export async function renewActivation(id: string, actor: Actor): Promise<string> {
  const { token, record } = activation();
  await updateCollection<TeamAccount[], void>('comptes', () => [], (list) => {
    const a = list.find((x) => x.id === id);
    if (!a) throw new AccountError('introuvable');
    return {
      next: list.map((x) => (x.id === id ? { ...x, activation: record, status: x.status === 'actif' ? 'actif' : 'invite', updatedAt: new Date().toISOString() } : x)),
      result: undefined,
    };
  });
  await audit(actor, 'compte.lien', id);
  return token;
}

/** Le jeton est-il valable ? Renvoie le compte sans rien changer. */
export async function findByActivation(token: string): Promise<TeamAccount | null> {
  if (!token || token.length > 128) return null;
  const hash = sha256(token);
  const a = (await listAccounts()).find((x) => x.activation && secretsEqual(hash, x.activation.tokenHash));
  if (!a?.activation || Date.parse(a.activation.expiresAt) < Date.now() || a.status === 'suspendu') return null;
  return a;
}

export async function activate(token: string, password: string): Promise<{ user: SessionUser; ver: string }> {
  const target = await findByActivation(token);
  if (!target) throw new AccountError('lien-expire');
  const passwordHash = await hashPassword(password);
  const account = await updateCollection<TeamAccount[], TeamAccount>('comptes', () => [], (list) => {
    const a = list.find((x) => x.id === target.id);
    if (!a?.activation || a.activation.tokenHash !== target.activation?.tokenHash) throw new AccountError('lien-expire');
    const updated: TeamAccount = { ...a, passwordHash, status: 'actif', activation: undefined, sessionVersion: a.sessionVersion + 1, updatedAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() };
    return { next: list.map((x) => (x.id === a.id ? updated : x)), result: updated };
  });
  await audit(toSessionUser(account), 'compte.activation', account.id);
  return { user: toSessionUser(account), ver: String(account.sessionVersion) };
}

export async function updateAccount(id: string, patch: Partial<Pick<TeamAccount, 'name' | 'role' | 'clubs' | 'signature'>>, actor: Actor): Promise<TeamAccount> {
  const account = await updateCollection<TeamAccount[], TeamAccount>('comptes', () => [], (list) => {
    const a = list.find((x) => x.id === id);
    if (!a) throw new AccountError('introuvable');
    const updated = { ...a, ...patch, updatedAt: new Date().toISOString() };
    return { next: list.map((x) => (x.id === id ? updated : x)), result: updated };
  });
  await audit(actor, 'compte.modification', id, Object.keys(patch).join(', '));
  return account;
}

/** Suspendre coupe toutes les sessions ouvertes de la personne, à la requête suivante. */
export async function setAccountStatus(id: string, status: 'actif' | 'suspendu', actor: Actor): Promise<TeamAccount> {
  const account = await updateCollection<TeamAccount[], TeamAccount>('comptes', () => [], (list) => {
    const a = list.find((x) => x.id === id);
    if (!a) throw new AccountError('introuvable');
    if (status === 'actif' && !a.passwordHash) throw new AccountError('statut');
    const updated: TeamAccount = { ...a, status, sessionVersion: a.sessionVersion + 1, updatedAt: new Date().toISOString() };
    return { next: list.map((x) => (x.id === id ? updated : x)), result: updated };
  });
  await audit(actor, status === 'suspendu' ? 'compte.suspension' : 'compte.reprise', id);
  return account;
}

export async function deleteAccount(id: string, actor: Actor): Promise<void> {
  const removed = await updateCollection<TeamAccount[], TeamAccount>('comptes', () => [], (list) => {
    const found = list.find((x) => x.id === id);
    if (!found) throw new AccountError('introuvable');
    return { next: list.filter((x) => x.id !== id), result: found };
  });
  // Le nom reste lisible dans le journal une fois le compte disparu ; jamais l'e-mail.
  await audit(actor, 'compte.suppression', id, `${removed.name} · ${removed.role}`);
}

/** Ce que la page « Comptes » montre : jamais l'empreinte du mot de passe ni du lien. */
export type PublicAccount = Omit<TeamAccount, 'passwordHash' | 'activation'> & { activationExpiresAt?: string; hasPassword: boolean };

export function publicAccount(a: TeamAccount): PublicAccount {
  const { passwordHash, activation: act, ...rest } = a;
  return { ...rest, hasPassword: Boolean(passwordHash), activationExpiresAt: act?.expiresAt };
}
