'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { asIds, asNewsDraft } from '@/lib/content/rules';
import type { PublishStatus } from '@/lib/types';
import { duplicate, FieldsError, insertItems, removeItems, saveNews, setStatus, undo, type StatusTarget } from '@/server/content';
import { newsFromApp } from '@/server/content-import';
import { actionUser, errorCode } from '@/server/session';

/**
 * Les actions de la rubrique Actualités (CDC §8). Points d'entrée publics :
 * la capacité est revérifiée, la saisie remise en forme puis rejugée.
 */
export type SavedNews = { id: string; title: string; status: PublishStatus; publishAt?: string; important: boolean; created: boolean; undo: string };

const caught = (err: unknown) => (err instanceof FieldsError ? fail('invalide', err.fields) : fail(errorCode(err)));

export async function saveNewsAction(raw: unknown): Promise<ActionResult<SavedNews>> {
  try {
    const user = await actionUser('actualites');
    const r = await saveNews(user, asNewsDraft(raw));
    return ok({ id: r.item.id, title: r.item.title, status: r.item.status, publishAt: r.item.publishAt, important: r.item.important, created: r.created, undo: r.undo });
  } catch (err) {
    return caught(err);
  }
}

export async function setNewsStatusAction(ids: unknown, to: StatusTarget): Promise<ActionResult<{ changed: number; skipped: number; noSource: number; undo: string }>> {
  try {
    const user = await actionUser('actualites');
    if (to !== 'publie' && to !== 'archive' && to !== 'brouillon') return fail('invalide');
    return ok(await setStatus(user, 'news', asIds(ids), to));
  } catch (err) {
    return caught(err);
  }
}

export async function deleteNewsAction(ids: unknown): Promise<ActionResult<{ removed: number; undo: string }>> {
  try {
    const user = await actionUser('actualites');
    return ok(await removeItems(user, 'news', asIds(ids)));
  } catch (err) {
    return caught(err);
  }
}

export async function duplicateNewsAction(id: unknown): Promise<ActionResult<{ id: string; undo: string }>> {
  try {
    const user = await actionUser('actualites');
    if (typeof id !== 'string') return fail('invalide');
    const r = await duplicate(user, 'news', id);
    return ok({ id: r.item.id, undo: r.undo });
  } catch (err) {
    return caught(err);
  }
}

export async function undoNewsAction(token: unknown): Promise<ActionResult<{ restored: number }>> {
  try {
    const user = await actionUser('actualites');
    if (typeof token !== 'string') return fail('invalide');
    const r = await undo(user, token, 'news');
    return ok({ restored: r.restored });
  } catch (err) {
    return caught(err);
  }
}

/** Reprend les actualités choisies dans apps/mobile/src/data/news.ts. */
export async function importNewsAction(ids: unknown): Promise<ActionResult<{ added: number; undo: string }>> {
  try {
    const user = await actionUser('actualites');
    if (user.clubs !== 'all') return fail('droits');
    const items = await newsFromApp(asIds(ids), user.name);
    return ok(await insertItems(user, 'news', items, 'reprise'));
  } catch (err) {
    return caught(err);
  }
}
