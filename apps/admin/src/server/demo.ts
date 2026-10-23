import { DEMO_MEMBER_ID, generatePassages, type DemoMoment, type DemoPassagesResponse, type DemoPattern, type Passage } from '@bc/contract';

import { audit, type Actor } from './audit';
import { read, update } from './collections';
import { isClubId } from '@/lib/clubs';
import type { DemoState } from '@/lib/types';

/**
 * La démonstration des statistiques (CDC §6, compte de démonstration seul).
 * L'historique se fabrique avec `generatePassages` de @bc/contract — le même
 * générateur que l'app — et se sert au format `DemoPassagesResponse`.
 * « Glissant » : l'historique est refabriqué à chaque lecture avec la date du
 * jour, pour qu'une démo réglée lundi soit encore à jour vendredi.
 */
const MOMENTS: DemoMoment[] = ['matin', 'midi', 'soir', 'mixte'];
const MAX_PASSAGES = 2000;

export async function readDemo(): Promise<DemoState> {
  return read('demo');
}

export function servedPassages(state: DemoState, now = new Date()): Passage[] {
  return state.rolling ? generatePassages(state.pattern, now) : state.passages;
}

export function toResponse(state: DemoState, now = new Date()): DemoPassagesResponse {
  return { memberId: DEMO_MEMBER_ID, passages: servedPassages(state, now), updatedAt: state.updatedAt, source: 'demo' };
}

type Check<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : Number.NaN);

/** Le réglage reçu est-il un DemoPattern sain ? Codes d'erreur par champ, traduits par l'interface. */
export function checkPattern(input: unknown): Check<DemoPattern> {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') return { ok: false, errors: { pattern: 'invalide' } };
  const p = input as Record<string, unknown>;
  const perWeek = int(p.perWeek);
  const weeks = int(p.weeks);
  const jitter = p.jitter === undefined ? 1 : int(p.jitter);
  const seed = p.seed === undefined ? 20261020 : int(p.seed);
  if (!(perWeek >= 0 && perWeek <= 7)) errors.perWeek = 'bornes';
  if (!(weeks >= 1 && weeks <= 104)) errors.weeks = 'bornes';
  if (!(jitter >= 0 && jitter <= 3)) errors.jitter = 'bornes';
  if (!(seed >= 0 && seed <= 4294967295)) errors.seed = 'bornes';
  const moment = p.moment as DemoMoment;
  if (!MOMENTS.includes(moment)) errors.moment = 'invalide';
  const clubs: DemoPattern['clubs'] = [];
  if (!Array.isArray(p.clubs) || p.clubs.length > 5) errors.clubs = 'invalide';
  else {
    for (const c of p.clubs as unknown[]) {
      const o = c as { club?: unknown; weight?: unknown };
      const w = typeof o?.weight === 'number' ? o.weight : Number.NaN;
      if (!isClubId(o?.club) || !(w >= 0 && w <= 10)) {
        errors.clubs = 'invalide';
        break;
      }
      if (!clubs.some((x) => x.club === o.club)) clubs.push({ club: o.club, weight: w });
    }
    if (!errors.clubs && !clubs.some((c) => c.weight > 0)) errors.clubs = 'vide';
  }
  const gaps: number[] = [];
  if (p.gaps !== undefined) {
    if (!Array.isArray(p.gaps) || p.gaps.length > 104) errors.gaps = 'invalide';
    else
      for (const g of p.gaps as unknown[]) {
        const n = int(g);
        if (!(n >= 0 && n < 104)) {
          errors.gaps = 'invalide';
          break;
        }
        if (!gaps.includes(n)) gaps.push(n);
      }
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { perWeek, weeks, clubs, moment, jitter, gaps: gaps.sort((a, b) => a - b), seed } };
}

/** Des passages envoyés tels quels (import d'un historique) : formes et clubs vérifiés un par un. */
export function checkPassages(input: unknown): Check<Passage[]> {
  if (!Array.isArray(input) || input.length > MAX_PASSAGES) return { ok: false, errors: { passages: 'invalide' } };
  const out: Passage[] = [];
  for (const raw of input) {
    const p = raw as Record<string, unknown>;
    if (typeof p?.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || typeof p.heure !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.heure) || !isClubId(p.club)) {
      return { ok: false, errors: { passages: 'invalide' } };
    }
    out.push({ date: p.date, heure: p.heure, club: p.club });
  }
  return { ok: true, value: out.sort((a, b) => (a.date + a.heure < b.date + b.heure ? 1 : -1)) };
}

export async function saveDemo(input: { pattern: DemoPattern; rolling: boolean; passages?: Passage[] }, actor: Actor): Promise<DemoState> {
  const now = new Date();
  const passages = input.passages ?? generatePassages(input.pattern, now);
  const next: DemoState = { memberId: DEMO_MEMBER_ID, pattern: input.pattern, rolling: input.passages ? false : input.rolling, passages, updatedAt: now.toISOString(), updatedBy: actor.id };
  await update('demo', () => ({ next, result: undefined }));
  await audit(actor, 'demo.historique', DEMO_MEMBER_ID, `${passages.length} passages · ${input.pattern.perWeek}/sem · ${input.pattern.weeks} sem${next.rolling ? ' · glissant' : ''}`);
  return next;
}

/* ------------------------------------------------------------------ */
/* Ce que l'API publique a servi depuis le démarrage (preuve du branchement) */
/* ------------------------------------------------------------------ */

export type ApiReads = { count: number; lastAt: string | null; lastOrigin: string | null };
type ReadsByKind = Record<string, ApiReads>;
const g = globalThis as typeof globalThis & { __bcaReads?: ReadsByKind; __bcaBoot?: string };
g.__bcaBoot ??= new Date().toISOString();

export function noteApiRead(kind: string, request: Request) {
  g.__bcaReads ??= {};
  const r = (g.__bcaReads[kind] ??= { count: 0, lastAt: null, lastOrigin: null });
  r.count += 1;
  r.lastAt = new Date().toISOString();
  const ua = request.headers.get('user-agent') ?? '';
  r.lastOrigin = request.headers.get('origin') ?? (/Expo|okhttp|CFNetwork|Darwin/i.test(ua) ? 'app' : null);
}

export function apiReads(): { since: string; byKind: ReadsByKind } {
  return { since: g.__bcaBoot!, byKind: { ...(g.__bcaReads ?? {}) } };
}
