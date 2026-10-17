import type { Member } from '@/data/member';
import type { ClubId } from '@/ui/theme';

/**
 * Statistiques de fréquentation calculées à partir des passages (§6 du cahier
 * des charges). Pures, testables, sans dépendance à l’écran.
 */

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type WeekPoint = { semaine: string; debut: Date; passages: number };

export type Stats = {
  semaine: number;
  mois: number;
  total: number;
  parClub: { club: ClubId; passages: number }[];
  moyenneParSemaine: number;
  serie: WeekPoint[];
  /** Semaines consécutives avec au moins un passage, jusqu’à la semaine courante. */
  regularite: number;
  moisLabel: string;
};

export function computeStats(member: Member, now = new Date()): Stats {
  const passages = member.passages.map((p) => ({ ...p, d: new Date(p.date + 'T' + p.heure + ':00') }));
  const thisWeek = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const semaine = passages.filter((p) => p.d >= thisWeek).length;
  const mois = passages.filter((p) => p.d >= monthStart).length;

  const parClubMap = new Map<ClubId, number>();
  for (const p of passages.filter((p) => p.d >= monthStart)) parClubMap.set(p.club, (parClubMap.get(p.club) ?? 0) + 1);
  const parClub = [...parClubMap.entries()].map(([club, n]) => ({ club, passages: n })).sort((a, b) => b.passages - a.passages);

  const serie: WeekPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const debut = new Date(thisWeek);
    debut.setDate(debut.getDate() - i * 7);
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 7);
    serie.push({ semaine: iso(debut), debut, passages: passages.filter((p) => p.d >= debut && p.d < fin).length });
  }

  let regularite = 0;
  for (let i = serie.length - 1; i >= 0; i--) {
    if (serie[i].passages > 0) regularite++;
    else if (i !== serie.length - 1) break;
  }

  const weeksWithData = serie.filter((w) => w.passages > 0).length || 1;
  const moyenneParSemaine = Math.round((serie.reduce((n, w) => n + w.passages, 0) / weeksWithData) * 10) / 10;

  const moisLabel = now.toLocaleDateString('fr-FR', { month: 'long' });

  return { semaine, mois, total: passages.length, parClub, moyenneParSemaine, serie, regularite, moisLabel };
}
