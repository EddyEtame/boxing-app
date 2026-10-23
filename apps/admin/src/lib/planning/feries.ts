/**
 * Les jours fériés en France métropolitaine, calculés (Pâques par l'algorithme
 * de Meeus) : l'assistant « Fermer un jour » les propose avant qu'on y pense.
 */
export type FerieKey = 'jourAn' | 'paques' | 'travail' | 'victoire' | 'ascension' | 'pentecote' | 'nationale' | 'assomption' | 'toussaint' | 'armistice' | 'noel';
export type Ferie = { date: string; key: FerieKey };

const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function easter(y: number): { m: number; d: number } {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { m: month, d: day };
}

function plusDays(y: number, m: number, d: number, n: number): string {
  const x = new Date(y, m - 1, d + n, 12);
  return ymd(x.getFullYear(), x.getMonth() + 1, x.getDate());
}

export function feries(year: number): Ferie[] {
  const e = easter(year);
  return [
    { date: ymd(year, 1, 1), key: 'jourAn' },
    { date: plusDays(year, e.m, e.d, 1), key: 'paques' },
    { date: ymd(year, 5, 1), key: 'travail' },
    { date: ymd(year, 5, 8), key: 'victoire' },
    { date: plusDays(year, e.m, e.d, 39), key: 'ascension' },
    { date: plusDays(year, e.m, e.d, 50), key: 'pentecote' },
    { date: ymd(year, 7, 14), key: 'nationale' },
    { date: ymd(year, 8, 15), key: 'assomption' },
    { date: ymd(year, 11, 1), key: 'toussaint' },
    { date: ymd(year, 11, 11), key: 'armistice' },
    { date: ymd(year, 12, 25), key: 'noel' },
  ];
}

/** Les prochains fériés à partir de `fromYmd` (inclus). */
export function nextFeries(fromYmd: string, count: number): Ferie[] {
  const y = Number(fromYmd.slice(0, 4));
  return [...feries(y), ...feries(y + 1)].filter((f) => f.date >= fromYmd).slice(0, count);
}
