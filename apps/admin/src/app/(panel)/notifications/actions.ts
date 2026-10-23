'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { isClubId } from '@/lib/clubs';
import { STATUTS, type NotifDraft, type Reach } from '@/lib/comms/types';
import type { ClubId, PushNotification, Statut } from '@/lib/types';
import { cancelNotifications, createNotification, estimateReach, restoreNotifications } from '@/server/comms';
import { actionUser, errorCode } from '@/server/session';

/**
 * Les actions de la page Notifications. Chacune revérifie la session et le
 * droit « notifications » : une action serveur est une porte publique.
 */
const ids = (v: unknown): string[] | null => (Array.isArray(v) && v.length <= 500 && v.every((x) => typeof x === 'string' && x.length <= 80) ? (v as string[]) : null);

export async function sendNotification(draft: NotifDraft): Promise<ActionResult<{ id: string; status: PushNotification['status']; at?: string }>> {
  try {
    const user = await actionUser('notifications');
    if (!draft || typeof draft !== 'object') return fail('invalide');
    const res = await createNotification(user, draft);
    if (!res.ok) return fail('invalide', res.errors);
    return ok({ id: res.notif.id, status: res.notif.status, at: res.notif.when.kind === 'scheduled' ? res.notif.when.at : undefined });
  } catch (err) {
    return fail(errorCode(err));
  }
}

export async function reachOf(target: { clubs: ClubId[] | 'all'; statuts: Statut[] }): Promise<ActionResult<Reach>> {
  try {
    await actionUser('notifications');
    const clubs = target?.clubs === 'all' ? 'all' : Array.isArray(target?.clubs) ? target.clubs.filter(isClubId) : [];
    const statuts = Array.isArray(target?.statuts) ? STATUTS.filter((s) => target.statuts.includes(s)) : [];
    if ((clubs !== 'all' && clubs.length === 0) || statuts.length === 0) return ok({ installs: 0, measured: true });
    return ok(await estimateReach({ clubs, statuts }));
  } catch (err) {
    return fail(errorCode(err));
  }
}

export async function cancelNotifs(list: string[]): Promise<ActionResult<{ cancelled: string[]; skipped: number }>> {
  try {
    const user = await actionUser('notifications');
    const wanted = ids(list);
    if (!wanted) return fail('invalide');
    return ok(await cancelNotifications(user, wanted));
  } catch (err) {
    return fail(errorCode(err));
  }
}

export async function restoreNotifs(list: string[]): Promise<ActionResult<{ restored: number }>> {
  try {
    const user = await actionUser('notifications');
    const wanted = ids(list);
    if (!wanted) return fail('invalide');
    return ok({ restored: await restoreNotifications(user, wanted) });
  } catch (err) {
    return fail(errorCode(err));
  }
}
