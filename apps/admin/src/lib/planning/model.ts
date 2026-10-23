import { discipline } from '@bc/brand';

import type { ClubId, Famille, Slot } from '@/lib/types';

/**
 * LE MODÈLE DU PLANNING, côté admin. Mêmes règles, au caractère près, que
 * l'app (apps/mobile/src/features/planning/model.ts et grid.ts), pour que la
 * grille de l'admin, l'aperçu « comme l'adhérent » et l'écran de l'app ne
 * puissent pas se contredire. Une divergence se voit dans « Branchements » :
 * l'empreinte des deux fichiers de l'app y est comparée à celle du portage.
 */

/* ------------------------------------------------------------------ */
/* Activités : les libellés de la direction ramenés à une famille       */
/* ------------------------------------------------------------------ */

export type Activite = {
  famille: Famille;
  libelle: string;
  public?: string;
  niveau?: string;
  ages?: [number, number];
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s/(-])([a-zà-ÿ])/g, (_m, p: string, c: string) => p + c.toUpperCase())
    .replace(/\bK1\b/gi, 'K1')
    .replace(/\bMma\b/g, 'MMA')
    .replace(/\bHiit\b/g, 'HIIT');
}

export function normaliseActivite(raw: string): Activite {
  const s = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  const age = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*ANS/);
  const publicAge = age ? `${age[1]}–${age[2]} ans` : undefined;
  const ages: [number, number] | undefined = age ? [Number(age[1]), Number(age[2])] : undefined;

  if (s.startsWith('ACCES LIBRE')) return { famille: 'accesLibre', libelle: 'Accès libre' };
  if (s.startsWith('BABY')) return { famille: 'baby', libelle: 'Baby boxe', public: publicAge ?? '3–6 ans', ages: ages ?? [3, 6] };
  if (s.includes('BOXING CAMP')) return { famille: 'boxingCamp', libelle: 'Boxing camp' };
  if (s.includes('HYROX')) return { famille: 'hyrox', libelle: 'Hyrox' };
  if (s.includes('CROSS')) return { famille: 'crossTraining', libelle: 'Cross-training' };
  if (s.includes('PREPARATION PHYSIQUE')) return { famille: 'crossTraining', libelle: 'Préparation physique' };
  if (s.includes('HIIT')) return { famille: 'crossTraining', libelle: 'Boxing HIIT' };
  if (s.includes('LADY')) {
    if (s.includes('KICK')) return { famille: 'ladyPunch', libelle: 'Lady kick' };
    return { famille: 'ladyPunch', libelle: s.includes('PUNCH') ? 'Lady punch' : 'Boxing lady' };
  }
  if (s.includes('GRAPPLING') || s.includes('JIU')) return { famille: 'grappling', libelle: s.includes('JIU') ? 'Jiu-jitsu brésilien' : 'Grappling' };
  if (s.includes('MMA')) {
    const enfants = s.includes('ENFANT');
    const ados = s.includes('ADOS');
    return { famille: 'mma', libelle: s.includes('ASSO') ? 'MMA (association)' : 'MMA', public: enfants ? (publicAge ?? '10–16 ans') : ados ? 'Ados' : undefined, ages: ages ?? (enfants ? [10, 16] : ados ? [12, 17] : undefined) };
  }
  if (s.includes('EDUCATIVE')) {
    const niveau = s.includes('COMP') ? 'Compétiteurs' : s.includes('CONFIRM') ? 'Confirmés' : undefined;
    const ados = s.includes('ADOS');
    const enfants = s.includes('ENFANT');
    const pub = publicAge ?? (ados ? '12–16 ans' : enfants ? '7–11 ans' : undefined);
    return { famille: 'educative', libelle: 'Boxe éducative', public: pub, niveau, ages: ages ?? (ados ? [12, 16] : enfants ? [7, 11] : [7, 16]) };
  }
  if (s.includes('PIEDS') || s.includes('KICK') || s.includes('THAI') || s.includes('K1') || s.includes('FRANCAISE')) {
    const lib = s.includes('THAI') ? 'Boxe thaï / K1' : s.includes('FRANCAISE') ? 'Boxe française' : s.includes('KICK') ? 'Kick-boxing / K1' : 'Boxe pieds-poings';
    const ados = s.includes('ADOS');
    const enfants = s.includes('ENFANT');
    return { famille: 'piedsPoings', libelle: lib, public: publicAge ?? (ados ? 'Ados' : enfants ? 'Enfants' : undefined), ages: ages ?? (ados ? [12, 17] : enfants ? [7, 11] : undefined) };
  }
  if (s.includes('SPARRING')) return { famille: 'anglaise', libelle: 'Open sparring', niveau: 'Confirmés' };
  if (s.includes('ANGLAISE') || s.includes('BOXE')) {
    const niveau = s.includes('COMP') ? 'Compétiteurs' : s.includes('LOISIR') ? 'Loisirs' : s.includes('PRO') ? 'Amateurs et pros' : undefined;
    return { famille: 'anglaise', libelle: 'Boxe anglaise', niveau };
  }
  return { famille: 'anglaise', libelle: titleCase(raw) };
}

export const isFree = (s: Pick<Slot, 'activite'>): boolean => normaliseActivite(s.activite).famille === 'accesLibre';

/** La couleur de la famille : celle des affiches de bc-plannings et de l'app (@bc/brand). */
export function familleColor(f: Famille): string {
  return discipline[f];
}

/** Noir ou blanc, selon le fond (même règle que l'affiche). */
export function inkOn(hex: string): string {
  if (!hex || hex[0] !== '#' || hex.length < 7) return '#FFFFFF';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#0A0D1A' : '#FFFFFF';
}

/* ------------------------------------------------------------------ */
/* Heures et jours                                                      */
/* ------------------------------------------------------------------ */

/** 1110 → « 18h30 », 1080 → « 18h » : la forme des affiches du club. */
export function heure(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** 1110 → « 18:30 », pour les champs `type="time"`. */
export function hhmmOf(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** « 18:30 » ou « 18h30 » → 1110 ; null si l'heure n'existe pas. */
export function minutesOf(v: string): number | null {
  const m = /^\s*(\d{1,2})\s*[:hH]\s*(\d{0,2})\s*$/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

export function duree(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** 0 = lundi … 6 = dimanche, pour une date locale. */
export function jourOf(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/* ------------------------------------------------------------------ */
/* Espaces                                                              */
/* ------------------------------------------------------------------ */

export function espacesFor(slots: Slot[], club: ClubId): string[] {
  return [...new Set(slots.filter((s) => s.club === club && s.espace).map((s) => s.espace!))].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function slotsFor(slots: Slot[], club: ClubId, jour: number, espace?: string): Slot[] {
  return slots.filter((s) => s.club === club && s.jour === jour && (!espace || !s.espace || s.espace === espace)).sort((a, b) => a.debut - b.debut);
}

/* ------------------------------------------------------------------ */
/* La grille de l'affiche (apps/mobile/src/features/planning/grid.ts)   */
/* ------------------------------------------------------------------ */

export type Band = { debut: number; fin: number };
export type GridColumn = { jour: number; sub: number; subCount: number };
export type GridCell = { kind: 'empty' } | { kind: 'covered' } | { kind: 'free'; rowSpan: number; slot: Slot } | { kind: 'course'; rowSpan: number; slot: Slot };
export type WeekGrid = { bands: Band[]; columns: GridColumn[]; cells: GridCell[][]; days: number[] };

export function buildBands(slots: Slot[]): Band[] {
  if (!slots.length) return [];
  const starts = [...new Set(slots.map((s) => s.debut))].sort((a, b) => a - b);
  return starts.map((debut) => {
    let fin = Infinity;
    for (const s of slots) if (s.debut <= debut && debut < s.fin && s.fin < fin) fin = s.fin;
    return { debut, fin: Number.isFinite(fin) ? fin : debut + 60 };
  });
}

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

export function buildWeekGrid(all: Slot[], club: ClubId, espace?: string): WeekGrid {
  const byDay = Array.from({ length: 7 }, (_, j) => slotsFor(all, club, j, espace));
  const days = [0, 1, 2, 3, 4, 5, ...(byDay[6].length ? [6] : [])];
  const flat = days.flatMap((j) => byDay[j]);
  const bands = buildBands(flat);
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

/* ------------------------------------------------------------------ */
/* Conflits                                                             */
/* ------------------------------------------------------------------ */

export type SlotDraft = Omit<Slot, 'id'> & { id?: string };

export type Conflicts = {
  /** Un autre cours dans le même espace au même moment (la salle peut-elle accueillir les deux ?). */
  room: Slot[];
  /** Le même coach ailleurs au même moment : impossible sans remplaçant. */
  coach: Slot[];
  /** Le même coach dans un autre club moins de 30 minutes avant ou après. */
  travel: Slot[];
};

const sameCoach = (a?: string, b?: string) => Boolean(a && b) && a!.trim().toUpperCase() === b!.trim().toUpperCase() && a!.trim().toUpperCase() !== 'ACCES LIBRE';

export function conflictsFor(all: Slot[], draft: SlotDraft, ignoreId?: string): Conflicts {
  const others = all.filter((s) => s.id !== ignoreId && s.id !== draft.id && s.jour === draft.jour);
  const overlaps = (s: Slot) => s.debut < draft.fin && draft.debut < s.fin;
  const room = isFree(draft)
    ? []
    : others.filter((s) => s.club === draft.club && overlaps(s) && !isFree(s) && (!draft.espace || !s.espace || s.espace === draft.espace));
  const coach = others.filter((s) => sameCoach(s.coach, draft.coach) && overlaps(s));
  const travel = others.filter((s) => sameCoach(s.coach, draft.coach) && s.club !== draft.club && !overlaps(s) && (Math.abs(s.debut - draft.fin) < 30 || Math.abs(draft.debut - s.fin) < 30));
  return { room, coach, travel };
}

/* ------------------------------------------------------------------ */
/* Semaine et séances datées                                            */
/* ------------------------------------------------------------------ */

/** « 2026-10-26 » d'une date, en heure locale (Europe/Paris côté navigateur). */
export function ymdOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Le lundi de la semaine de `ymd`. */
export function mondayOf(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() - jourOf(date));
  return ymdOf(date);
}

export function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + n);
  return ymdOf(date);
}

/** Les prochaines dates (AAAA-MM-JJ) où un créneau du jour `jour` a lieu, à partir de `fromYmd`. */
export function nextDates(jour: number, fromYmd: string, count: number): string[] {
  const out: string[] = [];
  let cur = fromYmd;
  for (let i = 0; i < 7; i++) {
    const [y, m, d] = cur.split('-').map(Number);
    if (jourOf(new Date(y, m - 1, d, 12)) === jour) break;
    cur = addDaysYmd(cur, 1);
  }
  for (let i = 0; i < count; i++) out.push(addDaysYmd(cur, i * 7));
  return out;
}

/* ------------------------------------------------------------------ */
/* Contraste réel (WCAG) pour l'admin                                   */
/* ------------------------------------------------------------------ */

function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

const INK_DARK = '#0A0D1A';

/**
 * L'encre qui se lit le mieux sur `hex`, au sens du rapport de contraste WCAG.
 * L'app choisit sur la luminosité perçue (seuil 0,62) : sur le vert Hyrox ou le
 * bleu pieds-poings, elle écrit en blanc à moins de 3:1. L'admin choisit ici le
 * meilleur des deux ; l'aperçu « comme l'adhérent » garde la règle de l'app.
 */
export function inkContrast(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#FFFFFF';
  const l = luminance(hex);
  const white = 1.05 / (l + 0.05);
  const dark = (l + 0.05) / (luminance(INK_DARK) + 0.05);
  return white >= dark ? '#FFFFFF' : INK_DARK;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
