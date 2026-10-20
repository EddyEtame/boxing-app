import type { ClubId } from '@bc/brand';

import { addDays, passageDate, startOfWeek, weekday, ymd, type Passage } from './passages';

/**
 * Les statistiques de fréquentation (CDC §6), calculées une seule fois, ici,
 * pour l'app comme pour l'admin : l'adhérent et la direction lisent les mêmes
 * chiffres. Fonction pure : mêmes passages, même instant, même résultat.
 *
 * Exigences du CDC couvertes : semaine, mois, total, répartition par club,
 * historique, évolution de la régularité.
 */

export type Moment = 'matin' | 'midi' | 'apresMidi' | 'soir';

export function momentOf(hour: number): Moment {
  if (hour < 12) return 'matin';
  if (hour < 14) return 'midi';
  if (hour < 17) return 'apresMidi';
  return 'soir';
}

export type WeekPoint = {
  /** Lundi de la semaine, AAAA-MM-JJ. */
  start: string;
  count: number;
  goalMet: boolean;
  /** Semaine en cours (pas encore finie). */
  current: boolean;
};

export type DayCell = {
  date: string;
  count: number;
  clubs: ClubId[];
  heures: string[];
  /** Jour pas encore arrivé : on ne le compte pas comme manqué. */
  future: boolean;
  today: boolean;
};

export type ClubShare = { club: ClubId; count: number; share: number };

export type StatsOptions = {
  /** Objectif hebdomadaire choisi par l'adhérent (1 à 7). */
  goal?: number;
  /** Semaines de l'histogramme (la semaine en cours comprise). */
  weeks?: number;
  /** Semaines de la carte de régularité. */
  heatWeeks?: number;
  /** Mois affiché (0 = janvier) ; par défaut celui de `now`. */
  month?: { year: number; month: number };
};

export type Stats = {
  goal: number;
  week: number;
  month: number;
  monthPrev: number;
  total: number;
  byClub: ClubShare[];
  byClubAll: ClubShare[];
  weeks: WeekPoint[];
  /** Moyenne par semaine sur les semaines terminées de l'histogramme. */
  avgPerWeek: number;
  activeWeeks: number;
  heatmap: DayCell[][];
  /** Semaines d'affilée à l'objectif (la semaine en cours compte dès qu'il est atteint). */
  streak: number;
  bestStreak: number;
  bestWeek: WeekPoint | null;
  moments: Record<Moment, number>;
  topMoment: Moment | null;
  /** 0 = lundi … 6 = dimanche. */
  topDay: number | null;
  first: string | null;
  recent: Passage[];
};

function shares(list: Passage[]): ClubShare[] {
  const map = new Map<ClubId, number>();
  for (const p of list) map.set(p.club, (map.get(p.club) ?? 0) + 1);
  const total = list.length || 1;
  return [...map.entries()].map(([club, count]) => ({ club, count, share: count / total })).sort((a, b) => b.count - a.count);
}

export function computeStats(input: Passage[], now = new Date(), options: StatsOptions = {}): Stats {
  const goal = Math.min(7, Math.max(1, Math.round(options.goal ?? 3)));
  const nWeeks = Math.max(2, options.weeks ?? 8);
  const nHeat = Math.max(1, options.heatWeeks ?? 15);
  const passages = input
    .map((p) => ({ p, d: passageDate(p) }))
    .filter((x) => !Number.isNaN(x.d.getTime()) && x.d <= now)
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  const thisWeek = startOfWeek(now);
  const sel = options.month ?? { year: now.getFullYear(), month: now.getMonth() };
  const monthStart = new Date(sel.year, sel.month, 1);
  const monthEnd = new Date(sel.year, sel.month + 1, 1);
  const prevStart = new Date(sel.year, sel.month - 1, 1);

  const inMonth = passages.filter((x) => x.d >= monthStart && x.d < monthEnd).map((x) => x.p);
  const week = passages.filter((x) => x.d >= thisWeek).length;
  const monthPrev = passages.filter((x) => x.d >= prevStart && x.d < monthStart).length;

  // Comptes par semaine, depuis la première semaine de l'historique.
  const byWeek = new Map<string, number>();
  for (const x of passages) {
    const k = ymd(startOfWeek(x.d));
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }

  const weeks: WeekPoint[] = [];
  for (let i = nWeeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    const count = byWeek.get(ymd(start)) ?? 0;
    weeks.push({ start: ymd(start), count, goalMet: count >= goal, current: i === 0 });
  }
  const done = weeks.filter((w) => !w.current);
  const avgPerWeek = done.length ? Math.round((done.reduce((n, w) => n + w.count, 0) / done.length) * 10) / 10 : 0;
  const activeWeeks = weeks.filter((w) => w.count > 0).length;

  // Série : la semaine en cours compte si l'objectif est atteint, sinon elle ne casse rien.
  const met = (start: Date) => (byWeek.get(ymd(start)) ?? 0) >= goal;
  let streak = 0;
  let cursor = met(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  while (met(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  let bestStreak = 0;
  let bestWeek: WeekPoint | null = null;
  if (passages.length) {
    let run = 0;
    for (let w = startOfWeek(passages[0].d); w <= thisWeek; w = addDays(w, 7)) {
      const count = byWeek.get(ymd(w)) ?? 0;
      run = count >= goal ? run + 1 : 0;
      bestStreak = Math.max(bestStreak, run);
      if (!bestWeek || count > bestWeek.count) bestWeek = { start: ymd(w), count, goalMet: count >= goal, current: ymd(w) === ymd(thisWeek) };
    }
  }

  // Carte de régularité : colonnes = semaines, lignes = lundi → dimanche.
  const byDay = new Map<string, Passage[]>();
  for (const x of passages) {
    const list = byDay.get(x.p.date) ?? [];
    list.push(x.p);
    byDay.set(x.p.date, list);
  }
  const todayKey = ymd(now);
  const heatmap: DayCell[][] = [];
  for (let i = nHeat - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    const col: DayCell[] = [];
    for (let j = 0; j < 7; j++) {
      const day = addDays(start, j);
      const key = ymd(day);
      const list = byDay.get(key) ?? [];
      col.push({ date: key, count: list.length, clubs: list.map((p) => p.club), heures: list.map((p) => p.heure), future: key > todayKey, today: key === todayKey });
    }
    heatmap.push(col);
  }

  const moments: Record<Moment, number> = { matin: 0, midi: 0, apresMidi: 0, soir: 0 };
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const x of passages) {
    moments[momentOf(x.d.getHours())]++;
    days[weekday(x.d)]++;
  }
  const topMoment = passages.length ? (Object.entries(moments).sort((a, b) => b[1] - a[1])[0][0] as Moment) : null;
  const topDay = passages.length ? days.indexOf(Math.max(...days)) : null;

  return {
    goal,
    week,
    month: inMonth.length,
    monthPrev,
    total: passages.length,
    byClub: shares(inMonth),
    byClubAll: shares(passages.map((x) => x.p)),
    weeks,
    avgPerWeek,
    activeWeeks,
    heatmap,
    streak,
    bestStreak,
    bestWeek,
    moments,
    topMoment,
    topDay,
    first: passages[0]?.p.date ?? null,
    recent: passages.slice(-10).reverse().map((x) => x.p),
  };
}
