import type { PlanningResponse, PublicSlot } from '@bc/contract';
import { readFile, stat } from 'node:fs/promises';
import vm from 'node:vm';

import { audit, type Actor } from './audit';
import { read, update } from './collections';
import { newId, sha256 } from './crypto';
import { displayPath, mobilePath } from './paths';
import { ActionError } from './session';
import { CLUB_IDS, isClubId } from '@/lib/clubs';
import { conflictsFor, espacesFor, isFree, type Conflicts, type SlotDraft } from '@/lib/planning/model';
import type { ClubId, PlanningChange, PlanningState, SessionUser, Slot, SlotException } from '@/lib/types';

/**
 * LES PLANNINGS, côté serveur (CDC §7 : « mis à jour facilement par la
 * direction depuis une interface d'administration »).
 *
 * La source de départ est le fichier de l'app (apps/mobile/src/data/planning.ts,
 * 188 créneaux générés depuis bc-plannings), lu sans jamais y écrire. Au premier
 * accès, l'admin en garde une copie (`base`) et sert ensuite SA version : la
 * base plus les changements de l'équipe. Si le fichier de l'app change (nouvel
 * export de bc-plannings), l'empreinte diffère : l'admin le dit, montre les
 * différences, et ne les reprend que sur demande — un changement fait ici
 * n'est jamais écrasé en silence.
 */

const MAX_HISTORY = 500;
const SOURCE = () => mobilePath('src', 'data', 'planning.ts');

/* ------------------------------------------------------------------ */
/* Lecture du fichier de l'app                                          */
/* ------------------------------------------------------------------ */

/** Le littéral `[ … ]` qui suit `marker`, en sautant chaînes et commentaires. */
function extractArray(text: string, marker: string): string {
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`« ${marker} » introuvable dans le fichier`);
  const open = text.indexOf('[', text.indexOf('=', at));
  if (open < 0) throw new Error('tableau introuvable après « = »');
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl < 0 ? text.length : nl;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 1;
    } else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return text.slice(open, i + 1);
  }
  throw new Error('tableau non refermé');
}

const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const int = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function checkSourceSlot(raw: unknown, i: number): Slot {
  const o = raw as Record<string, unknown>;
  const where = `créneau n° ${i + 1}`;
  if (!o || typeof o !== 'object') throw new Error(`${where} : pas un objet`);
  if (!str(o.id, 80)) throw new Error(`${where} : identifiant absent`);
  if (!isClubId(o.club)) throw new Error(`${where} (${o.id}) : club inconnu « ${String(o.club)} »`);
  if (!int(o.jour, 0, 6)) throw new Error(`${where} (${o.id}) : jour hors de 0…6`);
  if (!int(o.debut, 0, 1439) || !int(o.fin, 1, 1440) || (o.fin as number) <= (o.debut as number)) throw new Error(`${where} (${o.id}) : horaires incohérents`);
  if (!str(o.activite, 120)) throw new Error(`${where} (${o.id}) : activité absente`);
  if (o.espace !== undefined && !str(o.espace, 40)) throw new Error(`${where} (${o.id}) : espace invalide`);
  if (o.coach !== undefined && typeof o.coach !== 'string') throw new Error(`${where} (${o.id}) : coach invalide`);
  const slot: Slot = { id: o.id, club: o.club, jour: o.jour as number, debut: o.debut as number, fin: o.fin as number, activite: o.activite.trim() };
  if (o.espace) slot.espace = (o.espace as string).trim();
  if (typeof o.coach === 'string' && o.coach.trim()) slot.coach = o.coach.trim();
  return slot;
}

export type AppPlanning = { slots: Slot[]; hash: string; path: string; mtimeMs: number };

type SourceCache = { mtimeMs: number; size: number; value: AppPlanning };
const g = globalThis as unknown as { __bcPlanningSource?: SourceCache };

/**
 * Les créneaux de l'app. Le fichier est du TypeScript ; on n'en évalue que le
 * tableau `SLOTS` (un littéral d'objets), dans un contexte vide, avec une limite
 * de temps — jamais un `import` du fichier, jamais de compilateur à l'exécution.
 */
export async function readAppPlanning(): Promise<AppPlanning> {
  const file = SOURCE();
  const info = await stat(file);
  const cached = g.__bcPlanningSource;
  if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) return cached.value;
  const text = await readFile(file, 'utf8');
  const literal = extractArray(text, 'export const SLOTS');
  const value: unknown = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 500 });
  if (!Array.isArray(value)) throw new Error('SLOTS n’est pas un tableau');
  const seen = new Set<string>();
  const slots = value.map((raw, i) => {
    const s = checkSourceSlot(raw, i);
    if (seen.has(s.id)) throw new Error(`identifiant en double : ${s.id}`);
    seen.add(s.id);
    return s;
  });
  const result: AppPlanning = { slots, hash: sha256(text).slice(0, 16), path: displayPath(file), mtimeMs: info.mtimeMs };
  g.__bcPlanningSource = { mtimeMs: info.mtimeMs, size: info.size, value: result };
  return result;
}

/* ------------------------------------------------------------------ */
/* L'état de l'admin                                                    */
/* ------------------------------------------------------------------ */

const SYSTEME: Actor = { id: 'systeme', name: 'Système', role: 'systeme' };

/** Le planning servi. Au tout premier accès, il reprend les créneaux de l'app. */
export async function readPlanning(): Promise<PlanningState> {
  const state = await read('plannings');
  if (state.source.hash) return state;
  const src = await readAppPlanning();
  const imported = await update('plannings', (cur) => {
    if (cur.source.hash) return { next: cur, result: false };
    const at = new Date().toISOString();
    const next: PlanningState = {
      slots: src.slots,
      base: src.slots,
      exceptions: [],
      history: [{ id: newId('chg'), at, by: 'Système', kind: 'import', note: `${src.slots.length} créneaux repris de ${src.path}` }],
      source: { path: src.path, hash: src.hash, importedAt: at, count: src.slots.length },
    };
    return { next, result: true };
  });
  if (imported) await audit(SYSTEME, 'planning.import', src.path, `${src.slots.length} créneaux`);
  return read('plannings');
}

export async function currentSlots(): Promise<Slot[]> {
  return (await readPlanning()).slots;
}

/* ------------------------------------------------------------------ */
/* Divergence avec le fichier de l'app                                  */
/* ------------------------------------------------------------------ */

export type SlotDiff = { added: Slot[]; removed: Slot[]; changed: { before: Slot; after: Slot }[] };

const FIELDS: (keyof Slot)[] = ['club', 'espace', 'jour', 'debut', 'fin', 'activite', 'coach'];
export const sameSlot = (a: Slot, b: Slot) => FIELDS.every((k) => (a[k] ?? '') === (b[k] ?? ''));

export function diffSlots(from: Slot[], to: Slot[]): SlotDiff {
  const a = new Map(from.map((s) => [s.id, s]));
  const b = new Map(to.map((s) => [s.id, s]));
  const added = to.filter((s) => !a.has(s.id));
  const removed = from.filter((s) => !b.has(s.id));
  const changed = to.filter((s) => a.has(s.id) && !sameSlot(a.get(s.id)!, s)).map((s) => ({ before: a.get(s.id)!, after: s }));
  return { added, removed, changed };
}

export type SourceStatus =
  | { kind: 'identique'; hash: string; path: string; importedAt: string; count: number; local: SlotDiff }
  | { kind: 'diverge'; hash: string; importedHash: string; path: string; importedAt: string; app: SlotDiff; local: SlotDiff; conflicts: string[] }
  | { kind: 'illisible'; path: string; error: string };

export async function sourceStatus(state?: PlanningState): Promise<SourceStatus> {
  const st = state ?? (await readPlanning());
  const base = st.base ?? [];
  const local = diffSlots(base, st.slots);
  let src: AppPlanning;
  try {
    src = await readAppPlanning();
  } catch (err) {
    return { kind: 'illisible', path: st.source.path || 'apps/mobile/src/data/planning.ts', error: err instanceof Error ? err.message : String(err) };
  }
  if (src.hash === st.source.hash) return { kind: 'identique', hash: src.hash, path: src.path, importedAt: st.source.importedAt, count: src.slots.length, local };
  const app = diffSlots(base, src.slots);
  const touchedLocally = new Set([...local.changed.map((c) => c.after.id), ...local.removed.map((s) => s.id)]);
  const conflicts = [...app.changed.map((c) => c.after.id), ...app.removed.map((s) => s.id)].filter((id) => touchedLocally.has(id));
  return { kind: 'diverge', hash: src.hash, importedHash: st.source.hash, path: src.path, importedAt: st.source.importedAt, app, local, conflicts };
}

/**
 * Reprend les changements du fichier de l'app. Un créneau modifié des deux
 * côtés garde la version de l'admin, sauf si `prefer` vaut `app`.
 */
export async function applyAppChanges(user: SessionUser, prefer: 'admin' | 'app'): Promise<{ added: number; removed: number; changed: number; kept: number }> {
  const src = await readAppPlanning();
  const counts = await update('plannings', (st) => {
    const base = st.base ?? [];
    const app = diffSlots(base, src.slots);
    const local = diffSlots(base, st.slots);
    const touched = new Set([...local.changed.map((c) => c.after.id), ...local.removed.map((s) => s.id)]);
    let slots = [...st.slots];
    let kept = 0;
    const ids = new Set(slots.map((s) => s.id));
    const added = app.added.filter((s) => !ids.has(s.id));
    slots.push(...added);
    let removed = 0;
    for (const s of app.removed) {
      if (touched.has(s.id) && prefer === 'admin') {
        kept++;
        continue;
      }
      if (slots.some((x) => x.id === s.id)) removed++;
      slots = slots.filter((x) => x.id !== s.id);
    }
    let changed = 0;
    for (const { after } of app.changed) {
      if (touched.has(after.id) && prefer === 'admin') {
        kept++;
        continue;
      }
      const i = slots.findIndex((x) => x.id === after.id);
      if (i >= 0) {
        slots[i] = after;
        changed++;
      } else if (prefer === 'app') {
        slots.push(after);
        changed++;
      }
    }
    const at = new Date().toISOString();
    const entry: PlanningChange = { id: newId('chg'), at, by: user.name, kind: 'reprise', note: `${added.length} ajout(s), ${removed} retrait(s), ${changed} modification(s) reprises de l'app${kept ? `, ${kept} changement(s) de l'admin gardé(s)` : ''}` };
    const next: PlanningState = {
      ...st,
      slots,
      base: src.slots,
      source: { path: src.path, hash: src.hash, importedAt: at, count: src.slots.length },
      history: [entry, ...st.history].slice(0, MAX_HISTORY),
    };
    return { next, result: { added: added.length, removed, changed, kept } };
  });
  await audit(user, 'planning.reprise', src.path, `${counts.added} ajouts · ${counts.removed} retraits · ${counts.changed} modifications · ${counts.kept} gardés`);
  return counts;
}

/* ------------------------------------------------------------------ */
/* Validation d'un créneau saisi dans l'admin                           */
/* ------------------------------------------------------------------ */

/** Les erreurs portent une clé du dictionnaire (`planning.err.*`) : le navigateur la traduit. */
export type FieldErrors = Record<string, string>;

export function checkDraft(raw: unknown, all: Slot[]): { draft: SlotDraft | null; errors: FieldErrors } {
  const o = (raw ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};
  if (!isClubId(o.club)) errors.club = 'planning.err.club';
  const club = o.club as ClubId;
  const espaces = isClubId(o.club) ? espacesFor(all, club) : [];
  const espace = typeof o.espace === 'string' && o.espace.trim() ? o.espace.trim() : undefined;
  if (espaces.length && !espace) errors.espace = 'planning.err.espace';
  if (espace && espaces.length && !espaces.includes(espace)) errors.espace = 'planning.err.espaceInconnu';
  if (espace && !espaces.length) errors.espace = 'planning.err.espaceInconnu';
  if (!int(o.jour, 0, 6)) errors.jour = 'planning.err.jour';
  const activite = typeof o.activite === 'string' ? o.activite.replace(/\s+/g, ' ').trim().toUpperCase() : '';
  if (!activite) errors.activite = 'planning.err.activite';
  else if (activite.length > 60) errors.activite = 'planning.err.activiteLong';
  const debut = o.debut;
  const fin = o.fin;
  if (!int(debut, 6 * 60, 23 * 60 + 30) || (debut as number) % 5) errors.debut = 'planning.err.debut';
  if (!int(fin, 6 * 60 + 15, 24 * 60) || (fin as number) % 5) errors.fin = 'planning.err.fin';
  if (!errors.debut && !errors.fin) {
    const d = (fin as number) - (debut as number);
    const libre = isFree({ activite });
    if (d < 20) errors.fin = 'planning.err.court';
    else if (d > (libre ? 12 * 60 : 4 * 60)) errors.fin = 'planning.err.long';
  }
  const coach = typeof o.coach === 'string' ? o.coach.replace(/\s+/g, ' ').trim().toUpperCase() : '';
  if (coach.length > 40) errors.coach = 'planning.err.coachLong';
  if (Object.keys(errors).length) return { draft: null, errors };
  const draft: SlotDraft = { club, jour: o.jour as number, debut: debut as number, fin: fin as number, activite };
  if (espace) draft.espace = espace;
  if (coach && !isFree({ activite })) draft.coach = coach;
  if (isFree({ activite })) draft.coach = 'ACCES LIBRE';
  if (typeof o.id === 'string') draft.id = o.id;
  return { draft, errors };
}

export function conflictsOf(all: Slot[], draft: SlotDraft, ignoreId?: string): Conflicts {
  return conflictsFor(all, draft, ignoreId);
}

/* ------------------------------------------------------------------ */
/* Changements                                                          */
/* ------------------------------------------------------------------ */

function pushHistory(st: PlanningState, entry: Omit<PlanningChange, 'id' | 'at'>): { state: PlanningState; change: PlanningChange } {
  const change: PlanningChange = { id: newId('chg'), at: new Date().toISOString(), ...entry };
  return { state: { ...st, history: [change, ...st.history].slice(0, MAX_HISTORY) }, change };
}

export async function addSlot(user: SessionUser, draft: SlotDraft): Promise<{ slot: Slot; change: PlanningChange }> {
  const out = await update('plannings', (st) => {
    const slot: Slot = { ...draft, id: newId('adm') };
    const { state, change } = pushHistory({ ...st, slots: [...st.slots, slot] }, { by: user.name, kind: 'ajout', slotId: slot.id, after: slot });
    return { next: state, result: { slot, change } };
  });
  await audit(user, 'planning.ajout', out.slot.id, `${out.slot.activite} · ${out.slot.club}`);
  return out;
}

export async function moveSlot(user: SessionUser, id: string, draft: SlotDraft): Promise<{ slot: Slot; before: Slot; change: PlanningChange }> {
  const out = await update('plannings', (st) => {
    const before = st.slots.find((s) => s.id === id);
    if (!before) throw new ActionError('introuvable');
    const slot: Slot = { ...draft, id };
    if (sameSlot(before, slot)) return { next: st, result: { slot, before, change: null as PlanningChange | null } };
    const { state, change } = pushHistory({ ...st, slots: st.slots.map((s) => (s.id === id ? slot : s)) }, { by: user.name, kind: 'deplacement', slotId: id, before, after: slot });
    return { next: state, result: { slot, before, change: change as PlanningChange | null } };
  });
  if (!out.change) throw new ActionError('invalide', 'rien ne change');
  await audit(user, 'planning.deplacement', id, `${out.before.activite} · ${out.before.jour}/${out.before.debut} → ${out.slot.jour}/${out.slot.debut}`);
  return out as { slot: Slot; before: Slot; change: PlanningChange };
}

export async function removeSlot(user: SessionUser, id: string, note?: string): Promise<{ before: Slot; change: PlanningChange }> {
  const out = await update('plannings', (st) => {
    const before = st.slots.find((s) => s.id === id);
    if (!before) throw new ActionError('introuvable');
    const { state, change } = pushHistory(
      { ...st, slots: st.slots.filter((s) => s.id !== id), exceptions: st.exceptions.filter((e) => e.slotId !== id) },
      { by: user.name, kind: 'suppression', slotId: id, before, note },
    );
    return { next: state, result: { before, change } };
  });
  await audit(user, 'planning.suppression', id, out.before.activite);
  return out;
}

export const MOTIFS_ANNULATION = ['coach-absent', 'salle', 'ferie', 'evenement', 'vacances', 'autre'] as const;
export type MotifAnnulation = (typeof MOTIFS_ANNULATION)[number];

export async function cancelOccurrence(user: SessionUser, slotId: string, date: string, motif: string): Promise<{ exception: SlotException; change: PlanningChange; slot: Slot }> {
  const out = await update('plannings', (st) => {
    const slot = st.slots.find((s) => s.id === slotId);
    if (!slot) throw new ActionError('introuvable');
    if (st.exceptions.some((e) => e.slotId === slotId && e.date === date)) throw new ActionError('conflit', 'déjà annulée');
    const exception: SlotException = { id: newId('exc'), slotId, date, motif, createdAt: new Date().toISOString(), createdBy: user.name };
    const { state, change } = pushHistory({ ...st, exceptions: [...st.exceptions, exception] }, { by: user.name, kind: 'annulation', slotId, date, before: slot, note: motif });
    return { next: state, result: { exception, change, slot } };
  });
  await audit(user, 'planning.annulation', slotId, `${out.slot.activite} · ${date} · ${motif}`);
  return out;
}

export async function restoreOccurrence(user: SessionUser, exceptionId: string): Promise<{ exception: SlotException; change: PlanningChange }> {
  const out = await update('plannings', (st) => {
    const exception = st.exceptions.find((e) => e.id === exceptionId);
    if (!exception) throw new ActionError('introuvable');
    const slot = st.slots.find((s) => s.id === exception.slotId);
    const { state, change } = pushHistory({ ...st, exceptions: st.exceptions.filter((e) => e.id !== exceptionId) }, { by: user.name, kind: 'retablissement', slotId: exception.slotId, date: exception.date, before: slot });
    return { next: state, result: { exception, change } };
  });
  await audit(user, 'planning.retablissement', out.exception.slotId, out.exception.date);
  return out;
}

/**
 * Ferme une journée (férié, gala, travaux) : toutes les séances de ce jour de la
 * semaine dans les clubs choisis sont annulées pour cette date, en un geste et
 * un seul changement d'historique — qui se défait d'un coup.
 */
export async function closeDay(user: SessionUser, date: string, clubs: ClubId[], motif: string): Promise<{ change: PlanningChange; count: number }> {
  const [y, m, d] = date.split('-').map(Number);
  const jour = (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
  const out = await update('plannings', (st) => {
    const targets = st.slots.filter((s) => clubs.includes(s.club) && s.jour === jour && !isFree(s) && !st.exceptions.some((e) => e.slotId === s.id && e.date === date));
    if (!targets.length) throw new ActionError('invalide', 'aucune séance ce jour-là');
    const at = new Date().toISOString();
    const created: SlotException[] = targets.map((s) => ({ id: newId('exc'), slotId: s.id, date, motif, createdAt: at, createdBy: user.name }));
    const { state, change } = pushHistory({ ...st, exceptions: [...st.exceptions, ...created] }, { by: user.name, kind: 'fermeture', date, note: motif, clubs, exceptionIds: created.map((e) => e.id) });
    return { next: state, result: { change, count: created.length } };
  });
  await audit(user, 'planning.fermeture', clubs.join(','), `${date} · ${out.count} séances · ${motif}`);
  return out;
}

/** Défait un changement, tant que personne n'a retouché le créneau depuis. */
export async function undoChange(user: SessionUser, changeId: string): Promise<PlanningChange> {
  const out = await update('plannings', (st) => {
    const ch = st.history.find((h) => h.id === changeId);
    if (!ch) throw new ActionError('introuvable');
    if (st.history.some((h) => h.undoOf === ch.id)) throw new ActionError('conflit', 'déjà défait');
    const later = st.history.slice(0, st.history.indexOf(ch)).some((h) => (h.slotId && h.slotId === ch.slotId) || (ch.kind === 'fermeture' && h.kind === 'fermeture' && h.date === ch.date));
    if (later) throw new ActionError('conflit', 'le créneau a changé depuis');
    let next = st;
    if (ch.kind === 'ajout' && ch.slotId) next = { ...st, slots: st.slots.filter((s) => s.id !== ch.slotId) };
    else if (ch.kind === 'deplacement' && ch.before) next = { ...st, slots: st.slots.map((s) => (s.id === ch.slotId ? ch.before! : s)) };
    else if (ch.kind === 'suppression' && ch.before) next = st.slots.some((s) => s.id === ch.before!.id) ? st : { ...st, slots: [...st.slots, ch.before] };
    else if (ch.kind === 'annulation') next = { ...st, exceptions: st.exceptions.filter((e) => !(e.slotId === ch.slotId && e.date === ch.date)) };
    else if (ch.kind === 'fermeture' && ch.exceptionIds) next = { ...st, exceptions: st.exceptions.filter((e) => !ch.exceptionIds!.includes(e.id)) };
    else throw new ActionError('invalide', 'ce changement ne se défait pas');
    const { state, change } = pushHistory(next, { by: user.name, kind: 'restauration', slotId: ch.slotId, before: ch.after, after: ch.before, date: ch.date, note: `défait : ${ch.kind}`, undoOf: ch.id });
    return { next: state, result: change };
  });
  await audit(user, 'planning.restauration', out.slotId, out.note);
  return out;
}

/* ------------------------------------------------------------------ */
/* Ce que l'app lit                                                     */
/* ------------------------------------------------------------------ */

export type { PlanningResponse, PublicSlot } from '@bc/contract';

/** Le planning public : jamais le nom d'un coach (il reste dans l'admin). */
export function publicPlanning(st: PlanningState, todayYmd: string): PlanningResponse {
  // Liste blanche des champs : un champ ajouté demain au créneau (le coach aujourd'hui) ne sort jamais par mégarde.
  const slots: PublicSlot[] = st.slots
    .map((s): PublicSlot => ({ id: s.id, club: s.club, ...(s.espace ? { espace: s.espace } : {}), jour: s.jour, debut: s.debut, fin: s.fin, activite: s.activite }))
    .sort((a, b) => a.club.localeCompare(b.club) || a.jour - b.jour || a.debut - b.debut);
  const horizon = (() => {
    const [y, m, d] = todayYmd.split('-').map(Number);
    const x = new Date(y, m - 1, d + 56, 12);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  })();
  const cancellations = st.exceptions.filter((e) => e.date >= todayYmd && e.date <= horizon).map(({ slotId, date, motif }) => ({ slotId, date, motif })).sort((a, b) => a.date.localeCompare(b.date));
  const version = sha256(JSON.stringify({ slots, cancellations })).slice(0, 16);
  const updatedAt = st.history[0]?.at ?? st.source.importedAt;
  return { version, updatedAt, clubs: CLUB_IDS, slots, cancellations };
}
