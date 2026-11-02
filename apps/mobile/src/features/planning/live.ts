/**
 * Ouvert, fermé, séance annulée. Hors ligne (pas d'horaires réseau), le calcul
 * reste celui de `clubs.ts` : horloge locale, semaine fixe. En ligne, l'horloge
 * est celle de Toulouse (Europe/Paris), comme les dates servies par l'admin.
 */

export type Plage = { jour: number; debut: number; fin: number };

export type LivePlanning = {
  horaires: Readonly<Record<string, readonly Plage[]>>;
  fermetures: readonly { club: string; date: string }[];
  cancellations: readonly { slotId: string; date: string }[];
};

export type LiveCours = { id: string; club: string; jour: number; debut: number };

export type Prochaine<T extends LiveCours> = {
  slot: T;
  offset: number;
  jour: number;
  dansMinutes: number;
  ymd: string;
};

const JOUR: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const x = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
}

/** Jour (0 = lundi), minutes et date civile à Toulouse. */
export function parisStamp(now: Date): { jour: number; min: number; ymd: string } {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0;
  return { jour: JOUR[get('weekday')] ?? 0, min: hour * 60 + Number(get('minute')), ymd };
}

function localStamp(now: Date): { jour: number; min: number; ymd: string } {
  return { jour: (now.getDay() + 6) % 7, min: now.getHours() * 60 + now.getMinutes(), ymd: ymdLocal(now) };
}

export function clubFermeLe(live: LivePlanning, club: string, ymd: string): boolean {
  return live.fermetures.some((f) => f.club === club && f.date === ymd);
}

export function seanceAnnulee(live: LivePlanning | null, slotId: string, ymd: string): boolean {
  if (!live) return false;
  return live.cancellations.some((c) => c.slotId === slotId && c.date === ymd);
}

/** Le club est-il ouvert à cet instant, et jusqu'à quelle minute. */
export function ouvertMaintenant(
  club: { id: string; ouverture: { jours: number[]; debut: number; fin: number } },
  now: Date,
  live: LivePlanning | null,
): { ouvert: boolean; jusqua: number | null } {
  if (!live) {
    const { jour, min } = localStamp(now);
    const ok = club.ouverture.jours.includes(jour) && min >= club.ouverture.debut && min < club.ouverture.fin;
    return { ouvert: ok, jusqua: ok ? club.ouverture.fin : null };
  }
  const stamp = parisStamp(now);
  if (clubFermeLe(live, club.id, stamp.ymd)) return { ouvert: false, jusqua: null };
  const plage = (live.horaires[club.id] ?? [])
    .filter((h) => h.jour === stamp.jour && stamp.min >= h.debut && stamp.min < h.fin)
    .reduce<Plage | null>((best, h) => (!best || h.fin > best.fin ? h : best), null);
  return plage ? { ouvert: true, jusqua: plage.fin } : { ouvert: false, jusqua: null };
}

/** Ce jour de semaine est-il un jour d'ouverture, compte tenu d'une fermeture datée. */
export function jourOuvert(
  club: { id: string; ouverture: { jours: number[] } },
  jour: number,
  ymd: string | null,
  live: LivePlanning | null,
): boolean {
  if (!live) return club.ouverture.jours.includes(jour);
  if (ymd && clubFermeLe(live, club.id, ymd)) return false;
  return (live.horaires[club.id] ?? []).some((h) => h.jour === jour);
}

/**
 * Le prochain créneau dans les sept jours. `live` à null : même parcours qu'avant
 * (horloge locale, aucune annulation). Sinon on saute le jour fermé et la séance annulée.
 */
export function prochaineCours<T extends LiveCours>(slots: readonly T[], now: Date, live: LivePlanning | null): Prochaine<T> | null {
  const stamp = live ? parisStamp(now) : localStamp(now);
  for (let offset = 0; offset < 7; offset++) {
    const jour = (stamp.jour + offset) % 7;
    const ymd = addDaysYmd(stamp.ymd, offset);
    const day = slots.filter((s) => s.jour === jour).sort((a, b) => a.debut - b.debut);
    for (const slot of day) {
      if (live && (clubFermeLe(live, slot.club, ymd) || seanceAnnulee(live, slot.id, ymd))) continue;
      if (offset === 0 && slot.debut <= stamp.min) continue;
      return { slot, offset, jour, dansMinutes: offset * 24 * 60 + slot.debut - stamp.min, ymd };
    }
  }
  return null;
}
