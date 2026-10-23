'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import type { CheckCode } from '@/lib/team/moderation';
import { can } from '@/lib/permissions';
import { RETRAIT_MOTIFS, type ModerationRules, type RetraitMotif, type TrainingProposal } from '@/lib/types';
import { checkRules, decide, purgeDemo, restore, saveRules, seedDemo, type Snapshot } from '@/server/moderation';
import { actionUser, errorCode } from '@/server/session';

/**
 * Les décisions de modération. La file est filtrée par périmètre : un coach
 * des Minimes ne décide que pour les Minimes (le serveur le revérifie). Les
 * règles du club et les exemples relèvent de la direction.
 */

const idsOf = (raw: unknown): string[] | null => (Array.isArray(raw) && raw.length > 0 && raw.length <= 200 && raw.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 80) ? (raw as string[]) : null);

export async function approve(rawIds: unknown, force?: { note: string }): Promise<ActionResult<{ done: Snapshot[]; skipped: { id: string; codes: CheckCode[] }[] }>> {
  try {
    const user = await actionUser('moderation');
    const ids = idsOf(rawIds);
    if (!ids) return fail('invalide');
    if (force !== undefined && (typeof force?.note !== 'string' || force.note.trim().length < 5)) return fail('invalide', { note: 'team.mod.err.forceNote' });
    return ok(await decide(user, ids, { status: 'en-ligne', ...(force ? { force: { note: force.note.slice(0, 280) } } : {}) }));
  } catch (err) {
    return fail(errorCode(err));
  }
}

export async function withdraw(rawIds: unknown, motif: unknown, note?: unknown): Promise<ActionResult<{ done: Snapshot[] }>> {
  try {
    const user = await actionUser('moderation');
    const ids = idsOf(rawIds);
    if (!ids) return fail('invalide');
    if (!RETRAIT_MOTIFS.includes(motif as RetraitMotif)) return fail('invalide', { motif: 'team.mod.err.motif' });
    const text = typeof note === 'string' ? note.slice(0, 280) : undefined;
    if (motif === 'autre' && !text?.trim()) return fail('invalide', { note: 'team.mod.err.otherNote' });
    const res = await decide(user, ids, { status: 'retiree', motif: motif as RetraitMotif, note: text });
    return ok({ done: res.done });
  } catch (err) {
    return fail(errorCode(err));
  }
}

const STATUSES: TrainingProposal['status'][] = ['a-verifier', 'en-ligne', 'retiree'];

export async function undoDecision(raw: unknown): Promise<ActionResult<{ n: number }>> {
  try {
    const user = await actionUser('moderation');
    if (!Array.isArray(raw) || !raw.length || raw.length > 200) return fail('invalide');
    const snaps: Snapshot[] = [];
    for (const r of raw as Record<string, unknown>[]) {
      if (!r || typeof r.id !== 'string' || !STATUSES.includes(r.status as TrainingProposal['status'])) return fail('invalide');
      const d = r.decision as Record<string, unknown> | undefined;
      if (d !== undefined && (typeof d !== 'object' || typeof d.by !== 'string' || typeof d.at !== 'string')) return fail('invalide');
      snaps.push({ id: r.id, status: r.status as TrainingProposal['status'], ...(d ? { decision: d as unknown as NonNullable<TrainingProposal['decision']> } : {}) });
    }
    return ok({ n: await restore(user, snaps) });
  } catch (err) {
    return fail(errorCode(err));
  }
}

export async function saveModerationRules(raw: unknown): Promise<ActionResult<ModerationRules>> {
  try {
    const user = await actionUser('moderation');
    if (!can(user, 'fonctions')) return fail('droits');
    const { rules, errors } = checkRules(raw);
    if (!rules) return fail('invalide', errors);
    return ok(await saveRules(user, rules));
  } catch (err) {
    return fail(errorCode(err));
  }
}

export async function loadDemo(): Promise<ActionResult<{ n: number }>> {
  try {
    const user = await actionUser('moderation');
    if (!can(user, 'fonctions')) return fail('droits');
    return ok({ n: await seedDemo(user) });
  } catch (err) {
    return fail(errorCode(err));
  }
}

export async function removeDemo(): Promise<ActionResult<{ n: number }>> {
  try {
    const user = await actionUser('moderation');
    if (!can(user, 'fonctions')) return fail('droits');
    return ok({ n: await purgeDemo(user) });
  } catch (err) {
    return fail(errorCode(err));
  }
}
