'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { asEventDraft, asIds } from '@/lib/content/rules';
import type { PublishStatus } from '@/lib/types';
import { duplicate, FieldsError, insertItems, purgeDemo, removeItems, saveEvent, setStatus, undo, type StatusTarget } from '@/server/content';
import { demoEvents } from '@/server/content-demo';
import { actionUser, errorCode } from '@/server/session';

/** Les actions de la rubrique Événements (CDC §8, forme des combats du §13). */
export type SavedEvent = { id: string; title: string; status: PublishStatus; publishAt?: string; important: boolean; created: boolean; undo: string };

const caught = (err: unknown) => (err instanceof FieldsError ? fail('invalide', err.fields) : fail(errorCode(err)));

export async function saveEventAction(raw: unknown): Promise<ActionResult<SavedEvent>> {
  try {
    const user = await actionUser('evenements');
    const r = await saveEvent(user, asEventDraft(raw));
    return ok({ id: r.item.id, title: r.item.title, status: r.item.status, publishAt: r.item.publishAt, important: r.item.important, created: r.created, undo: r.undo });
  } catch (err) {
    return caught(err);
  }
}

export async function setEventStatusAction(ids: unknown, to: StatusTarget): Promise<ActionResult<{ changed: number; skipped: number; noSource: number; undo: string }>> {
  try {
    const user = await actionUser('evenements');
    if (to !== 'publie' && to !== 'archive' && to !== 'brouillon') return fail('invalide');
    return ok(await setStatus(user, 'event', asIds(ids), to));
  } catch (err) {
    return caught(err);
  }
}

export async function deleteEventsAction(ids: unknown): Promise<ActionResult<{ removed: number; undo: string }>> {
  try {
    const user = await actionUser('evenements');
    return ok(await removeItems(user, 'event', asIds(ids)));
  } catch (err) {
    return caught(err);
  }
}

export async function duplicateEventAction(id: unknown): Promise<ActionResult<{ id: string; undo: string }>> {
  try {
    const user = await actionUser('evenements');
    if (typeof id !== 'string') return fail('invalide');
    const r = await duplicate(user, 'event', id);
    return ok({ id: r.item.id, undo: r.undo });
  } catch (err) {
    return caught(err);
  }
}

export async function undoEventAction(token: unknown): Promise<ActionResult<{ restored: number }>> {
  try {
    const user = await actionUser('evenements');
    if (typeof token !== 'string') return fail('invalide');
    return ok({ restored: (await undo(user, token, 'event')).restored });
  } catch (err) {
    return caught(err);
  }
}

/** Cinq exemples marqués « démo », jamais servis à l'app (sauf ?demo=1). */
export async function loadDemoEventsAction(): Promise<ActionResult<{ added: number; undo: string }>> {
  try {
    const user = await actionUser('evenements');
    if (user.clubs !== 'all') return fail('droits');
    return ok(await insertItems(user, 'event', demoEvents(user.name), 'demo'));
  } catch (err) {
    return caught(err);
  }
}

export async function purgeDemoEventsAction(): Promise<ActionResult<{ removed: number; undo: string }>> {
  try {
    const user = await actionUser('evenements');
    if (user.clubs !== 'all') return fail('droits');
    return ok(await purgeDemo(user, 'event'));
  } catch (err) {
    return caught(err);
  }
}
