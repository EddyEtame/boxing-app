import type { ClubId } from '@bc/brand';

/**
 * Un passage : le badge lu par le lecteur d'un club (CDC §6). C'est la seule
 * matière des statistiques ; tout le reste se calcule.
 * `date` et `heure` sont l'heure locale du club (Europe/Paris), jamais UTC.
 */
export type Passage = {
  /** AAAA-MM-JJ, heure locale. */
  date: string;
  /** HH:MM, heure locale. */
  heure: string;
  club: ClubId;
};

export type Statut = 'invite' | 'restreint' | 'actif';

/** AAAA-MM-JJ en heure locale (toISOString décalerait d'un jour en France). */
export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/** Le passage en Date locale. */
export function passageDate(p: Passage): Date {
  const [y, m, d] = p.date.split('-').map(Number);
  const [h, min] = p.heure.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
}

/** Lundi 00:00 de la semaine de `d` (heure locale). */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** 0 = lundi … 6 = dimanche. */
export function weekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}
