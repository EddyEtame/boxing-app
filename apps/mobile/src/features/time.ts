const JOURS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « SAM 17 OCT » */
export function dateLine(d: Date): string {
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function dateLineFromIso(iso: string): string {
  return dateLine(new Date(iso + 'T12:00:00'));
}

/** « 17 octobre 2026 » */
export function dateLong(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`;
}

export function moisLabel(d: Date): string {
  return MOIS_LONGS[d.getMonth()];
}

export function moisCourt(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Numéro de semaine ISO. */
export function isoWeek(d: Date): number {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** « 42 min », « 3 h 20 », « 2 j 4 h » — ce qui reste avant un événement. */
export function formatIn(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  const j = Math.floor(h / 24);
  const hr = h % 24;
  return hr ? `${j} j ${hr} h` : `${j} j`;
}

/** Jours jusqu’à une date ISO (arrondi au jour). */
export function daysUntil(iso: string, now = new Date()): number {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function euros(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' €';
}
