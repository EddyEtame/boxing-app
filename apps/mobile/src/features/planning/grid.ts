import type { Slot } from '@/data/planning';
import { normaliseActivite, slotsFor } from '@/features/planning/model';
import type { ClubId } from '@/ui/theme';

/**
 * LA GRILLE DE L'AFFICHE, portée dans l'app (22/10/2026, demande d'Eddy :
 * « le planning hebdo doit être le même que celui des affiches »).
 *
 * Mêmes règles que bc-plannings/src/lib/scheduleGrid.js :
 * - une BANDE horaire commence à chaque heure où quelque chose commence et
 *   finit à la première fin de séance qui la traverse (la colonne « Horaire »
 *   de l'ODS de la direction) ; toutes les bandes ont la même hauteur ;
 * - un jour où deux cours se chevauchent s'ouvre en SOUS-COLONNES ;
 * - les cours se posent d'abord, l'accès libre remplit ce qui reste.
 */
export type Band = { debut: number; fin: number };

export type GridColumn = { jour: number; sub: number; subCount: number };

export type GridCell =
  | { kind: 'empty' }
  | { kind: 'covered' }
  | { kind: 'free'; rowSpan: number; slot: Slot }
  | { kind: 'course'; rowSpan: number; slot: Slot };

export type WeekGrid = {
  bands: Band[];
  columns: GridColumn[];
  /** [ligne][colonne] */
  cells: GridCell[][];
  /** Jours présents (0 = lundi), le dimanche seulement s'il a des créneaux. */
  days: number[];
};

const isFree = (s: Slot) => normaliseActivite(s.activite).famille === 'accesLibre';

export function buildBands(slots: Slot[]): Band[] {
  if (!slots.length) return [];
  const starts = [...new Set(slots.map((s) => s.debut))].sort((a, b) => a - b);
  return starts.map((debut) => {
    let fin = Infinity;
    for (const s of slots) if (s.debut <= debut && debut < s.fin && s.fin < fin) fin = s.fin;
    return { debut, fin: Number.isFinite(fin) ? fin : debut + 60 };
  });
}

/** Les cours d'un jour rangés en sous-colonnes sans chevauchement (tri par début, première colonne libre). */
function assignSubColumns(courses: Slot[]): { bySlot: Map<string, number>; count: number } {
  const sorted = [...courses].sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  const ends: number[] = [];
  const bySlot = new Map<string, number>();
  for (const s of sorted) {
    let col = ends.findIndex((end) => end <= s.debut);
    if (col < 0) {
      col = ends.length;
      ends.push(0);
    }
    ends[col] = s.fin;
    bySlot.set(s.id, col);
  }
  return { bySlot, count: Math.max(1, ends.length) };
}

export function buildWeekGrid(club: ClubId, espace?: string): WeekGrid {
  const byDay = Array.from({ length: 7 }, (_, j) => slotsFor(club, j, espace));
  const days = [0, 1, 2, 3, 4, 5, ...(byDay[6].length ? [6] : [])];
  const all = days.flatMap((j) => byDay[j]);
  const bands = buildBands(all);
  const rowOf = new Map(bands.map((b, i) => [b.debut, i]));
  const spanOf = (s: Slot, rowStart: number) => {
    let n = 1;
    for (let i = rowStart + 1; i < bands.length && bands[i].debut < s.fin; i++) n++;
    return n;
  };

  const columns: GridColumn[] = [];
  const subOf = new Map<number, { bySlot: Map<string, number>; count: number }>();
  for (const j of days) {
    const a = assignSubColumns(byDay[j].filter((s) => !isFree(s)));
    subOf.set(j, a);
    for (let k = 0; k < a.count; k++) columns.push({ jour: j, sub: k, subCount: a.count });
  }
  const colIndex = (jour: number, sub: number) => columns.findIndex((c) => c.jour === jour && c.sub === sub);

  const cells: GridCell[][] = bands.map(() => columns.map(() => ({ kind: 'empty' }) as GridCell));

  // Les cours d'abord.
  for (const j of days) {
    const a = subOf.get(j)!;
    for (const s of byDay[j]) {
      if (isFree(s)) continue;
      const r0 = rowOf.get(s.debut);
      if (r0 === undefined) continue;
      const c = colIndex(j, a.bySlot.get(s.id) ?? 0);
      const span = spanOf(s, r0);
      cells[r0][c] = { kind: 'course', rowSpan: span, slot: s };
      for (let r = r0 + 1; r < r0 + span; r++) cells[r][c] = { kind: 'covered' };
    }
  }

  // Puis l'accès libre, dans chaque case encore vide de ses lignes, fusionné verticalement.
  for (const j of days) {
    const count = subOf.get(j)!.count;
    for (const s of byDay[j]) {
      if (!isFree(s)) continue;
      const r0 = rowOf.get(s.debut);
      if (r0 === undefined) continue;
      const span = spanOf(s, r0);
      for (let k = 0; k < count; k++) {
        const c = colIndex(j, k);
        let r = r0;
        while (r < r0 + span) {
          if (cells[r][c].kind !== 'empty') {
            r++;
            continue;
          }
          let n = 0;
          while (r + n < r0 + span && cells[r + n][c].kind === 'empty') n++;
          cells[r][c] = { kind: 'free', rowSpan: n, slot: s };
          for (let q = r + 1; q < r + n; q++) cells[q][c] = { kind: 'covered' };
          r += n;
        }
      }
    }
  }

  return { bands, columns, cells, days };
}

/** La bande qui contient l'heure donnée, ou -1. */
export function bandAt(bands: Band[], minute: number): number {
  return bands.findIndex((b) => b.debut <= minute && minute < b.fin);
}

/** Noir ou blanc, selon le fond (même règle que l'affiche). */
export function inkOn(hex: string): string {
  if (!hex || hex[0] !== '#' || hex.length < 7) return '#FFFFFF';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#0A0D1A' : '#FFFFFF';
}
