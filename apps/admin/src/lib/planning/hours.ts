import { plagesLibres, type PlageLibre, type PublicHoraire } from '@bc/contract';

import { heure, isFree, minutesOf } from './model';
import type { ClubId, Closure, DayHours, Slot, WeekHours } from '@/lib/types';

/**
 * LES HEURES D'OUVERTURE ET L'ACCÈS LIBRE (CDC §7, §11 A.3).
 *
 * Eddy, 24/10/2026 : l'accès libre est toujours ouvert quand le club l'est, et
 * ses heures se règlent dans l'admin. La règle elle-même — les lignes « ACCES
 * LIBRE » du jour priment, sinon l'ouverture — n'est écrite qu'une fois, dans
 * @bc/contract (`plagesLibres`) : l'app et l'admin lisent la même.
 */

/** La règle publiée par les sites des clubs (relevée le 27/09/2026) : du lundi au samedi, de 10h à 21h30, fermé le dimanche. */
export const RESEAU: WeekHours = [0, 1, 2, 3, 4, 5, 6].map((j) => (j < 6 ? { debut: 10 * 60, fin: 21 * 60 + 30 } : null));

/** Une journée d'ouverture : entre 5h et minuit, au pas de 5 minutes, une heure au moins. */
export const HOURS_BOUNDS = { min: 5 * 60, max: 24 * 60, step: 5, minOpen: 60 } as const;

export const hoursOf = (horaires: Partial<Record<ClubId, WeekHours>> | undefined, club: ClubId): WeekHours => horaires?.[club] ?? RESEAU;

export const toPublic = (week: WeekHours): PublicHoraire[] => week.flatMap((d, jour) => (d ? [{ jour, debut: d.debut, fin: d.fin }] : []));

/** L'accès libre d'un club un jour de la semaine, d'après la règle partagée avec l'app. */
export const freeRanges = (slots: readonly Slot[], week: WeekHours, club: ClubId, jour: number): PlageLibre[] => plagesLibres(slots, toPublic(week), club, jour);

/** Le club a-t-il de l'accès libre au moins un jour de la semaine ? */
export const hasFreeAccess = (slots: readonly Slot[], week: WeekHours, club: ClubId) => [0, 1, 2, 3, 4, 5, 6].some((j) => freeRanges(slots, week, club, j).length > 0);

export const sameDay = (a: DayHours, b: DayHours) => (a === null || b === null ? a === b : a.debut === b.debut && a.fin === b.fin);
export const sameWeek = (a: WeekHours, b: WeekHours) => a.length === b.length && a.every((d, i) => sameDay(d, b[i] ?? null));

/** Les cours d'un club qui sortent de ses heures (jour fermé, début trop tôt, fin trop tard). Une ligne d'accès libre n'en est pas un. */
export function outsideHours(slots: readonly Slot[], week: WeekHours, club: ClubId): Slot[] {
  return slots
    .filter((s) => {
      if (s.club !== club || isFree(s)) return false;
      const d = week[s.jour];
      return !d || s.debut < d.debut || s.fin > d.fin;
    })
    .sort((a, b) => a.jour - b.jour || a.debut - b.debut);
}

/** La fermeture qui touche ce club à cette date, s'il y en a une. */
export const closureOn = (closures: readonly Closure[] | undefined, club: ClubId, date: string): Closure | undefined => closures?.find((c) => c.date === date && c.clubs.includes(club));

/** Ce que l'écran saisit pour un jour : des heures « 10:00 », ou rien (jour fermé). */
export type DayInput = { debut: string | number; fin: string | number } | null;

/**
 * Relit une semaine saisie : sept jours, chacun `null` (fermé) ou des heures
 * « 10:00 » / en minutes. Les erreurs sont des clés du dictionnaire, par jour
 * (`d0` … `d6`). « 00:00 » en fin de journée veut dire minuit.
 */
export function checkWeek(raw: unknown): { week: WeekHours | null; errors: Record<string, string> } {
  if (!Array.isArray(raw) || raw.length !== 7) return { week: null, errors: { week: 'planning.hours.err.week' } };
  const errors: Record<string, string> = {};
  const read = (v: unknown) => (typeof v === 'string' ? minutesOf(v) : Number.isInteger(v) ? (v as number) : null);
  const week: WeekHours = raw.map((d: unknown, j): DayHours => {
    if (d === null) return null;
    const o = (d ?? {}) as Record<string, unknown>;
    const debut = read(o.debut);
    let fin = read(o.fin);
    if (fin === 0) fin = 24 * 60;
    if (debut === null || fin === null) errors[`d${j}`] = 'planning.hours.err.time';
    else if (fin <= debut) errors[`d${j}`] = 'planning.hours.err.order';
    else if (debut < HOURS_BOUNDS.min || fin > HOURS_BOUNDS.max) errors[`d${j}`] = 'planning.hours.err.bounds';
    else if (debut % HOURS_BOUNDS.step || fin % HOURS_BOUNDS.step) errors[`d${j}`] = 'planning.hours.err.step';
    else if (fin - debut < HOURS_BOUNDS.minOpen) errors[`d${j}`] = 'planning.hours.err.short';
    return debut !== null && fin !== null ? { debut, fin } : null;
  });
  return Object.keys(errors).length ? { week: null, errors } : { week, errors };
}

/** « lun–ven 10h–21h30 · sam 10h–18h · dim fermé » : les jours qui se suivent avec les mêmes heures, regroupés. */
export function weekSummary(week: WeekHours, dayShort: (j: number) => string, closed: string): string {
  const groups: { from: number; to: number; d: DayHours }[] = [];
  week.forEach((d, j) => {
    const last = groups[groups.length - 1];
    if (last && last.to === j - 1 && sameDay(last.d, d)) last.to = j;
    else groups.push({ from: j, to: j, d });
  });
  return groups.map((g) => `${g.from === g.to ? dayShort(g.from) : `${dayShort(g.from)}–${dayShort(g.to)}`} ${g.d ? `${heure(g.d.debut)}–${heure(g.d.fin)}` : closed}`).join(' · ');
}
