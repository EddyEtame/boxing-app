'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { asIds, asVideoDraft } from '@/lib/content/rules';
import type { PublishStatus } from '@/lib/types';
import { duplicate, FieldsError, insertItems, readVideos, removeItems, saveVideo, setGratuite, setStatus, undo, type StatusTarget } from '@/server/content';
import { videosFromApp } from '@/server/content-import';
import { actionUser, errorCode } from '@/server/session';

/** Les actions de la vidéothèque (CDC §9). */
export type SavedVideo = { id: string; title: string; status: PublishStatus; created: boolean; undo: string };

const caught = (err: unknown) => (err instanceof FieldsError ? fail('invalide', err.fields) : fail(errorCode(err)));

export async function saveVideoAction(raw: unknown): Promise<ActionResult<SavedVideo>> {
  try {
    const user = await actionUser('videos');
    const r = await saveVideo(user, asVideoDraft(raw));
    return ok({ id: r.item.id, title: r.item.title, status: r.item.status, created: r.created, undo: r.undo });
  } catch (err) {
    return caught(err);
  }
}

export async function setVideoStatusAction(ids: unknown, to: StatusTarget): Promise<ActionResult<{ changed: number; skipped: number; noSource: number; undo: string }>> {
  try {
    const user = await actionUser('videos');
    if (to !== 'publie' && to !== 'archive' && to !== 'brouillon') return fail('invalide');
    return ok(await setStatus(user, 'video', asIds(ids), to));
  } catch (err) {
    return caught(err);
  }
}

export async function setVideoAccessAction(ids: unknown, gratuite: unknown): Promise<ActionResult<{ changed: number; undo: string }>> {
  try {
    const user = await actionUser('videos');
    if (typeof gratuite !== 'boolean') return fail('invalide');
    return ok(await setGratuite(user, asIds(ids), gratuite));
  } catch (err) {
    return caught(err);
  }
}

export async function deleteVideosAction(ids: unknown): Promise<ActionResult<{ removed: number; undo: string }>> {
  try {
    const user = await actionUser('videos');
    return ok(await removeItems(user, 'video', asIds(ids)));
  } catch (err) {
    return caught(err);
  }
}

export async function duplicateVideoAction(id: unknown): Promise<ActionResult<{ id: string; undo: string }>> {
  try {
    const user = await actionUser('videos');
    if (typeof id !== 'string') return fail('invalide');
    const r = await duplicate(user, 'video', id);
    return ok({ id: r.item.id, undo: r.undo });
  } catch (err) {
    return caught(err);
  }
}

export async function undoVideoAction(token: unknown): Promise<ActionResult<{ restored: number }>> {
  try {
    const user = await actionUser('videos');
    if (typeof token !== 'string') return fail('invalide');
    return ok({ restored: (await undo(user, token, 'video')).restored });
  } catch (err) {
    return caught(err);
  }
}

/** Reprend les fiches de apps/mobile/src/data/videos.ts, en brouillon (pas encore de fichier). */
export async function importVideosAction(ids: unknown): Promise<ActionResult<{ added: number; undo: string }>> {
  try {
    const user = await actionUser('videos');
    const taken = (await readVideos()).map((v) => v.numero);
    const items = await videosFromApp(asIds(ids), user.name, taken);
    return ok(await insertItems(user, 'video', items, 'reprise'));
  } catch (err) {
    return caught(err);
  }
}
