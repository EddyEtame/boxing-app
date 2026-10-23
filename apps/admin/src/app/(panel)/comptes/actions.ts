'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { clubsOf, identityErrors, parseDraft, roleErrors, scopeErrors, signatureErrors } from '@/lib/team/account-rules';
import type { TeamAccount } from '@/lib/types';
import { AccountError, createAccount, deleteAccount, DIRECTION_ID, getAccount, renewActivation, setAccountStatus, updateAccount } from '@/server/accounts';
import { actionUser, errorCode } from '@/server/session';

/**
 * Les actions de « Comptes et droits ». Chacune relit la session, revérifie
 * le droit « comptes » et la saisie. Le compte de la boutique ne se touche
 * pas ici ; personne ne peut se suspendre, se supprimer ni se retirer la
 * direction à soi-même (on ne s'enferme pas dehors).
 */

function accountFailure(err: unknown): ActionResult<never> {
  if (err instanceof AccountError) {
    if (err.code === 'email-pris') return fail('invalide', { email: 'team.err.emailTaken' });
    if (err.code === 'email-direction') return fail('invalide', { email: 'team.err.emailShop' });
    if (err.code === 'introuvable') return fail('introuvable');
    if (err.code === 'statut') return fail('invalide', { status: 'team.err.noPassword' });
    return fail('invalide');
  }
  return fail(errorCode(err));
}

export async function createMember(raw: unknown): Promise<ActionResult<{ id: string; token: string; expiresAt: string }>> {
  try {
    const user = await actionUser('comptes');
    const d = parseDraft(raw);
    const errors = { ...identityErrors(d), ...roleErrors(d), ...scopeErrors(d), ...signatureErrors(d) };
    if (Object.keys(errors).length) return fail('invalide', errors);
    const { account, token } = await createAccount({ name: d.name.trim(), email: d.email, role: d.role!, clubs: clubsOf(d), signature: d.signature.trim() }, user);
    return ok({ id: account.id, token, expiresAt: account.activation!.expiresAt });
  } catch (err) {
    return accountFailure(err);
  }
}

type Patch = Pick<TeamAccount, 'name' | 'role' | 'clubs' | 'signature'>;

export async function editMember(id: string, raw: unknown): Promise<ActionResult<{ before: Patch }>> {
  try {
    const user = await actionUser('comptes');
    if (id === DIRECTION_ID) return fail('droits');
    const current = await getAccount(id);
    if (!current) return fail('introuvable');
    const d = parseDraft(raw);
    const errors = { ...identityErrors(d, false), ...roleErrors(d), ...scopeErrors(d), ...signatureErrors(d) };
    if (id === user.id && d.role !== user.role) errors.role = 'team.err.selfRole';
    if (Object.keys(errors).length) return fail('invalide', errors);
    const before: Patch = { name: current.name, role: current.role, clubs: current.clubs, signature: current.signature };
    await updateAccount(id, { name: d.name.trim(), role: d.role!, clubs: clubsOf(d), signature: d.signature.trim() }, user);
    return ok({ before });
  } catch (err) {
    return accountFailure(err);
  }
}

/** Remet un compte comme il était (le bouton « Annuler l'action » après une modification). */
export async function revertMember(id: string, before: Patch): Promise<ActionResult> {
  const res = await editMember(id, { ...before, email: '', scope: before.clubs === 'all' ? 'all' : 'clubs', clubs: before.clubs === 'all' ? [] : before.clubs });
  return res.ok ? ok(undefined) : res;
}

export async function renewMemberLink(id: string): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  try {
    const user = await actionUser('comptes');
    if (id === DIRECTION_ID) return fail('droits');
    const current = await getAccount(id);
    if (!current) return fail('introuvable');
    if (current.status === 'suspendu') return fail('invalide', { status: 'team.err.suspended' });
    const token = await renewActivation(id, user);
    const after = await getAccount(id);
    return ok({ token, expiresAt: after?.activation?.expiresAt ?? new Date(Date.now() + 72 * 3600_000).toISOString() });
  } catch (err) {
    return accountFailure(err);
  }
}

export async function setMemberStatus(id: string, status: 'actif' | 'suspendu'): Promise<ActionResult<{ previous: TeamAccount['status'] }>> {
  try {
    const user = await actionUser('comptes');
    if (id === DIRECTION_ID) return fail('droits');
    if (id === user.id) return fail('invalide', { self: 'team.err.self' });
    if (status !== 'actif' && status !== 'suspendu') return fail('invalide');
    const current = await getAccount(id);
    if (!current) return fail('introuvable');
    if (current.status === status) return ok({ previous: current.status });
    await setAccountStatus(id, status, user);
    return ok({ previous: current.status });
  } catch (err) {
    return accountFailure(err);
  }
}

export async function deleteMember(id: string, typedName: string): Promise<ActionResult> {
  try {
    const user = await actionUser('comptes');
    if (id === DIRECTION_ID) return fail('droits');
    if (id === user.id) return fail('invalide', { self: 'team.err.self' });
    const current = await getAccount(id);
    if (!current) return fail('introuvable');
    const same = (a: string) => a.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');
    if (same(typedName) !== same(current.name)) return fail('invalide', { confirm: 'team.err.confirmName' });
    await deleteAccount(id, user);
    return ok(undefined);
  } catch (err) {
    return accountFailure(err);
  }
}
