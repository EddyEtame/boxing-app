'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { isClubId } from '@/lib/clubs';
import { MESSAGE_STATUTS, type OutgoingDraft, type Reach } from '@/lib/comms/types';
import type { ClubId, InboxMessage, InboxThread, Statut } from '@/lib/types';
import { createOutgoing, estimateReach } from '@/server/comms';
import { assignThread, loadDemoThreads, noteThread, purgeDemoThreads, replyThread, restoreThreadStatus, setThreadStatus, setThreadUnread } from '@/server/comms-inbox';
import { actionUser, ActionError, errorCode } from '@/server/session';

/**
 * Les actions de la page Messages. La boîte de réception demande le droit
 * « messagerie » ; écrire à des adhérents demande « messages » (les coachs
 * l'ont, pas la boîte). Chaque action revérifie la session.
 */
const STATUSES: InboxThread['status'][] = ['nouveau', 'en-cours', 'traite'];
const ids = (v: unknown): string[] | null => (Array.isArray(v) && v.length <= 500 && v.every((x) => typeof x === 'string' && x.length <= 80) ? (v as string[]) : null);
const oneId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 80;

/** Une erreur de saisie levée par le serveur porte sa clé du dictionnaire dans son message. */
function caught<T>(err: unknown): ActionResult<T> {
  if (err instanceof ActionError && err.code === 'invalide' && err.message.startsWith('comms.err.')) return fail('invalide', { text: err.message });
  return fail(errorCode(err));
}

export async function replyToThread(threadId: string, text: string): Promise<ActionResult<InboxMessage>> {
  try {
    const user = await actionUser('messagerie');
    if (!oneId(threadId)) return fail('invalide');
    return ok(await replyThread(user, threadId, typeof text === 'string' ? text : ''));
  } catch (err) {
    return caught(err);
  }
}

export async function addNote(threadId: string, text: string): Promise<ActionResult<InboxMessage>> {
  try {
    const user = await actionUser('messagerie');
    if (!oneId(threadId)) return fail('invalide');
    return ok(await noteThread(user, threadId, typeof text === 'string' ? text : ''));
  } catch (err) {
    return caught(err);
  }
}

export async function changeStatus(list: string[], status: InboxThread['status']): Promise<ActionResult<{ ids: string[]; before: Record<string, InboxThread['status']> }>> {
  try {
    const user = await actionUser('messagerie');
    const wanted = ids(list);
    if (!wanted || !STATUSES.includes(status)) return fail('invalide');
    return ok(await setThreadStatus(user, wanted, status));
  } catch (err) {
    return caught(err);
  }
}

export async function undoStatus(before: Record<string, InboxThread['status']>): Promise<ActionResult<{ restored: number }>> {
  try {
    const user = await actionUser('messagerie');
    if (!before || typeof before !== 'object' || Object.keys(before).length > 500) return fail('invalide');
    return ok({ restored: await restoreThreadStatus(user, before) });
  } catch (err) {
    return caught(err);
  }
}

export async function changeUnread(list: string[], unread: boolean): Promise<ActionResult<{ changed: number }>> {
  try {
    const user = await actionUser('messagerie');
    const wanted = ids(list);
    if (!wanted || typeof unread !== 'boolean') return fail('invalide');
    return ok({ changed: await setThreadUnread(user, wanted, unread) });
  } catch (err) {
    return caught(err);
  }
}

export async function assignTo(threadId: string, assigneeId: string | null): Promise<ActionResult<null>> {
  try {
    const user = await actionUser('messagerie');
    if (!oneId(threadId) || (assigneeId !== null && !oneId(assigneeId))) return fail('invalide');
    await assignThread(user, threadId, assigneeId);
    return ok(null);
  } catch (err) {
    return caught(err);
  }
}

export async function loadDemo(): Promise<ActionResult<{ added: number }>> {
  try {
    const user = await actionUser('messagerie');
    return ok({ added: await loadDemoThreads(user) });
  } catch (err) {
    return caught(err);
  }
}

export async function purgeDemo(): Promise<ActionResult<{ removed: number }>> {
  try {
    const user = await actionUser('messagerie');
    return ok({ removed: await purgeDemoThreads(user) });
  } catch (err) {
    return caught(err);
  }
}

export async function sendToMembers(draft: OutgoingDraft): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser('messages');
    if (!draft || typeof draft !== 'object') return fail('invalide');
    const res = await createOutgoing(user, draft);
    if (!res.ok) return fail('invalide', res.errors);
    return ok({ id: res.row.id });
  } catch (err) {
    return caught(err);
  }
}

export async function reachOfMembers(target: { clubs: ClubId[] | 'all'; statuts: Statut[] }): Promise<ActionResult<Reach>> {
  try {
    await actionUser('messages');
    const clubs = target?.clubs === 'all' ? 'all' : Array.isArray(target?.clubs) ? target.clubs.filter(isClubId) : [];
    const statuts = Array.isArray(target?.statuts) ? MESSAGE_STATUTS.filter((s) => target.statuts.includes(s)) : [];
    if ((clubs !== 'all' && clubs.length === 0) || statuts.length === 0) return ok({ installs: 0, measured: true });
    return ok(await estimateReach({ clubs, statuts }));
  } catch (err) {
    return caught(err);
  }
}
