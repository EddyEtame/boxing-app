import type { ClubId } from '@bc/brand';

import { addDays, startOfWeek, ymd, type Passage } from './passages';

/**
 * MODE DÉMONSTRATION (demande d'Eddy, 20/10/2026) : l'équipe de construction
 * fabrique un historique de passages pour montrer les statistiques bouger.
 *
 * Garde-fou CDC §6 : en production, les statistiques viennent des passages
 * réellement lus (Deciplus ou contrôle d'accès). Un historique de démonstration
 * ne s'écrit que pour un compte de démonstration, porte `source: 'demo'`, et
 * l'admin refuse de l'appliquer à un adhérent réel.
 */
export type DemoMoment = 'matin' | 'midi' | 'soir' | 'mixte';

export type DemoPattern = {
  /** Séances visées par semaine (0 à 7). */
  perWeek: number;
  /** Semaines d'historique à fabriquer, la semaine en cours comprise. */
  weeks: number;
  /** Poids de chaque club ; les absents ne sont jamais tirés. */
  clubs: { club: ClubId; weight: number }[];
  moment: DemoMoment;
  /** Écart possible autour de `perWeek` (0 = régulier comme une horloge). */
  jitter?: number;
  /** Semaines sans aucun passage, comptées depuis la semaine en cours (0). */
  gaps?: number[];
  /** Même graine, même historique. */
  seed?: number;
};

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WINDOWS: Record<Exclude<DemoMoment, 'mixte'>, [number, number]> = {
  matin: [9 * 60 + 30, 11 * 60 + 30],
  midi: [12 * 60 + 10, 13 * 60 + 20],
  soir: [17 * 60 + 45, 20 * 60 + 30],
};

function pickClub(clubs: DemoPattern['clubs'], r: () => number): ClubId | null {
  const pool = clubs.filter((c) => c.weight > 0);
  const total = pool.reduce((n, c) => n + c.weight, 0);
  if (!total) return null;
  let x = r() * total;
  for (const c of pool) {
    x -= c.weight;
    if (x <= 0) return c.club;
  }
  return pool[pool.length - 1].club;
}

export function generatePassages(pattern: DemoPattern, now = new Date()): Passage[] {
  const r = rng(pattern.seed ?? 20261020);
  const weeks = Math.min(104, Math.max(1, Math.round(pattern.weeks)));
  const per = Math.min(7, Math.max(0, Math.round(pattern.perWeek)));
  const jitter = Math.max(0, Math.round(pattern.jitter ?? 1));
  const gaps = new Set(pattern.gaps ?? []);
  const thisWeek = startOfWeek(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const out: Passage[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    if (gaps.has(i)) continue;
    const start = addDays(thisWeek, -7 * i);
    const delta = jitter ? Math.round((r() * 2 - 1) * jitter) : 0;
    const count = Math.min(7, Math.max(0, per + delta));
    // Jours tirés sans remise, du lundi au samedi d'abord (le dimanche, la plupart des clubs ferment).
    // Mélange de Fisher-Yates : un tri à comparateur aléatoire donnerait un
    // historique différent sous Hermes (l'app) et sous V8 (l'admin).
    const weekdays = [0, 1, 2, 3, 4, 5];
    for (let k = weekdays.length - 1; k > 0; k--) {
      const m = Math.floor(r() * (k + 1));
      [weekdays[k], weekdays[m]] = [weekdays[m], weekdays[k]];
    }
    const chosen = [...weekdays, 6].slice(0, count).sort((a, b) => a - b);
    for (const j of chosen) {
      const day = addDays(start, j);
      const moment = pattern.moment === 'mixte' ? (['matin', 'midi', 'soir'] as const)[Math.floor(r() * 3)] : pattern.moment;
      const [from, to] = WINDOWS[moment];
      const minute = Math.round(from + r() * (to - from));
      const isToday = ymd(day) === ymd(now);
      if (day > now && !isToday) continue;
      if (isToday && minute > nowMin) continue;
      const club = pickClub(pattern.clubs, r);
      if (!club) continue;
      out.push({ date: ymd(day), heure: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`, club });
    }
  }
  return out.sort((a, b) => (a.date + a.heure < b.date + b.heure ? 1 : -1));
}

/** Les réglages de la démo par défaut : une adhérente régulière, surtout aux Minimes, le soir. */
export const DEFAULT_DEMO: DemoPattern = {
  perWeek: 3,
  weeks: 26,
  clubs: [
    { club: 'minimes', weight: 3 },
    { club: 'saint-cyprien', weight: 1 },
  ],
  moment: 'soir',
  jitter: 1,
  gaps: [5],
  seed: 20261020,
};
