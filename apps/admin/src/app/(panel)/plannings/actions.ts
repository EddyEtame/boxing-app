'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { todayLocal } from '@/lib/format';
import { inScope } from '@/lib/permissions';
import { isClubId } from '@/lib/clubs';
import { addSlot, applyAppChanges, cancelOccurrence, checkDraft, closeDay, conflictsOf, moveSlot, readPlanning, removeSlot, restoreOccurrence, undoChange, MOTIFS_ANNULATION } from '@/server/planning';
import { actionUser, errorCode } from '@/server/session';

/**
 * Les changements du planning. Chaque action relit tout côté serveur : le
 * créneau saisi (bornes, espace du club, durée), le périmètre de la personne
 * (un administratif des Minimes ne touche pas Portet) et les conflits — un
 * coach déjà pris ailleurs n'est accepté que confirmé explicitement.
 */

type Draft = Record<string, unknown>;

async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (err) {
    return fail(errorCode(err));
  }
}

export async function addCourse(input: Draft, confirmCoach: boolean): Promise<ActionResult<{ id: string; changeId: string }>> {
  return guarded(async () => {
    const user = await actionUser('plannings.edit');
    const st = await readPlanning();
    const { draft, errors } = checkDraft(input, st.slots);
    if (!draft) return fail('invalide', errors);
    if (!inScope(user, draft.club)) return fail('droits');
    const c = conflictsOf(st.slots, draft);
    if (c.coach.length && !confirmCoach) return fail('conflit', { coach: 'planning.err.coachBusy' });
    const { slot, change } = await addSlot(user, draft);
    return ok({ id: slot.id, changeId: change.id });
  });
}

export async function moveCourse(id: string, input: Draft, confirmCoach: boolean): Promise<ActionResult<{ changeId: string }>> {
  return guarded(async () => {
    const user = await actionUser('plannings.edit');
    const st = await readPlanning();
    const before = st.slots.find((s) => s.id === id);
    if (!before) return fail('introuvable');
    const { draft, errors } = checkDraft({ ...input, club: before.club }, st.slots);
    if (!draft) return fail('invalide', errors);
    if (!inScope(user, before.club)) return fail('droits');
    const c = conflictsOf(st.slots, draft, id);
    if (c.coach.length && !confirmCoach) return fail('conflit', { coach: 'planning.err.coachBusy' });
    const { change } = await moveSlot(user, id, draft);
    return ok({ changeId: change.id });
  });
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function cancelCourse(slotId: string, date: string, motif: string, note: string): Promise<ActionResult<{ changeId: string; exceptionId: string }>> {
  return guarded(async () => {
    const user = await actionUser('plannings.edit');
    const st = await readPlanning();
    const slot = st.slots.find((s) => s.id === slotId);
    if (!slot) return fail('introuvable');
    if (!inScope(user, slot.club)) return fail('droits');
    const errors: Record<string, string> = {};
    if (!YMD.test(date)) errors.date = 'planning.err.date';
    else {
      const [y, m, d] = date.split('-').map(Number);
      const day = new Date(y, m - 1, d, 12);
      if ((day.getDay() + 6) % 7 !== slot.jour) errors.date = 'planning.err.dateJour';
      // « Aujourd'hui » à Toulouse, quel que soit le fuseau du serveur.
      if (date < todayLocal()) errors.date = 'planning.err.datePassee';
    }
    if (!(MOTIFS_ANNULATION as readonly string[]).includes(motif)) errors.motif = 'planning.err.motif';
    const cleanNote = note.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (motif === 'autre' && !cleanNote) errors.note = 'planning.err.note';
    if (Object.keys(errors).length) return fail('invalide', errors);
    const label = cleanNote ? `${motif} · ${cleanNote}` : motif;
    const { change, exception } = await cancelOccurrence(user, slotId, date, label);
    return ok({ changeId: change.id, exceptionId: exception.id });
  });
}

export async function removeCourse(slotId: string, note: string): Promise<ActionResult<{ changeId: string }>> {
  return guarded(async () => {
    const user = await actionUser('plannings.edit');
    const st = await readPlanning();
    const slot = st.slots.find((s) => s.id === slotId);
    if (!slot) return fail('introuvable');
    if (!inScope(user, slot.club)) return fail('droits');
    const { change } = await removeSlot(user, slotId, note.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined);
    return ok({ changeId: change.id });
  });
}

export async function restoreSession(exceptionId: string): Promise<ActionResult<{ changeId: string }>> {
  return guarded(async () => {
    const user = await actionUser('plannings.edit');
    const st = await readPlanning();
    const exc = st.exceptions.find((e) => e.id === exceptionId);
    if (!exc) return fail('introuvable');
    const slot = st.slots.find((s) => s.id === exc.slotId);
    if (slot && !inScope(user, slot.club)) return fail('droits');
    const { change } = await restoreOccurrence(user, exceptionId);
    return ok({ changeId: change.id });
  });
}

export async function undoPlanning(changeId: string): Promise<ActionResult<{ changeId: string }>> {
  return guarded(async () => {
    const user = await actionUser('plannings.edit');
    const st = await readPlanning();
    const ch = st.history.find((h) => h.id === changeId);
    if (!ch) return fail('introuvable');
    const club = ch.after?.club ?? ch.before?.club;
    if (club && !inScope(user, club)) return fail('droits');
    const change = await undoChange(user, changeId);
    return ok({ changeId: change.id });
  });
}

export async function takeAppChanges(prefer: 'admin' | 'app'): Promise<ActionResult<{ added: number; removed: number; changed: number; kept: number }>> {
  return guarded(async () => {
    const user = await actionUser('plannings.edit');
    if (user.clubs !== 'all') return fail('droits');
    if (prefer !== 'admin' && prefer !== 'app') return fail('invalide');
    return ok(await applyAppChanges(user, prefer));
  });
}

export async function closeClubsDay(date: string, clubs: string[], motif: string, note: string): Promise<ActionResult<{ changeId: string; count: number }>> {
  return guarded(async () => {
    const user = await actionUser('plannings.edit');
    const errors: Record<string, string> = {};
    if (!YMD.test(date) || date < todayLocal()) errors.date = 'planning.err.datePassee';
    const chosen = [...new Set(clubs)].filter(isClubId);
    if (!chosen.length || chosen.length !== clubs.length) errors.clubs = 'planning.err.clubs';
    if (chosen.some((c) => !inScope(user, c))) return fail('droits');
    if (!(MOTIFS_ANNULATION as readonly string[]).includes(motif)) errors.motif = 'planning.err.motif';
    const cleanNote = note.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (motif === 'autre' && !cleanNote) errors.note = 'planning.err.note';
    if (Object.keys(errors).length) return fail('invalide', errors);
    const { change, count } = await closeDay(user, date, chosen, cleanNote ? `${motif} · ${cleanNote}` : motif);
    return ok({ changeId: change.id, count });
  });
}
