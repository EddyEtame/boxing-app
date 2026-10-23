import { isFree } from './model';
import type { Slot } from '@/lib/types';

/**
 * LES CONTRÔLES DU PLANNING — ce que l'admin relève tout seul dans les créneaux,
 * sans attendre qu'un adhérent le découvre devant une salle vide.
 * Mesuré sur l'import du 22/10/2026 : un coach compté deux fois au même moment
 * (Portet, mardi 19 h, SAMUEL dans deux espaces), 22 cours sans coach, deux
 * libellés dont l'horaire écrit contredit l'horaire du créneau.
 */
export type CheckKind = 'coach-double' | 'coach-trajet' | 'libelle-horaire' | 'doublon' | 'homonyme' | 'sans-coach';

export type PlanningCheck = {
  kind: CheckKind;
  /** `bloquant` : impossible tel quel ; `attention` : à vérifier ; `info` : à compléter. */
  level: 'bloquant' | 'attention' | 'info';
  slots: Slot[];
  /** Pour `libelle-horaire` : l'horaire lu dans le libellé, en minutes. */
  written?: { debut: number; fin: number };
  coach?: string;
  /** Pour `homonyme` : les deux graphies d'un même nom probable. */
  names?: [string, string];
};

const norm = (s?: string) => (s ?? '').trim().toUpperCase();

/** « 18H45/20H15 », « 18H/20H » dans un libellé → minutes ; null s'il n'y en a pas. */
export function hoursInLabel(label: string): { debut: number; fin: number } | null {
  const m = /(\d{1,2})\s*H\s*(\d{2})?\s*[/–-]\s*(\d{1,2})\s*H\s*(\d{2})?/i.exec(label);
  if (!m) return null;
  const debut = Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
  const fin = Number(m[3]) * 60 + (m[4] ? Number(m[4]) : 0);
  return fin > debut ? { debut, fin } : null;
}

export function planningChecks(slots: Slot[]): PlanningCheck[] {
  const out: PlanningCheck[] = [];
  const courses = slots.filter((s) => !isFree(s));

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i];
      const b = courses[j];
      if (a.jour !== b.jour) continue;
      const overlap = a.debut < b.fin && b.debut < a.fin;
      const coach = norm(a.coach);
      if (coach && coach === norm(b.coach)) {
        if (overlap) out.push({ kind: 'coach-double', level: 'bloquant', slots: [a, b], coach: a.coach });
        else if (a.club !== b.club && (Math.abs(a.debut - b.fin) < 30 || Math.abs(b.debut - a.fin) < 30)) out.push({ kind: 'coach-trajet', level: 'attention', slots: [a, b], coach: a.coach });
      }
      if (a.club === b.club && a.debut === b.debut && a.fin === b.fin && norm(a.activite) === norm(b.activite) && (a.espace ?? '') !== (b.espace ?? '') && !(coach && coach === norm(b.coach))) {
        out.push({ kind: 'doublon', level: 'attention', slots: [a, b] });
      }
    }
  }

  for (const s of courses) {
    const w = hoursInLabel(s.activite);
    if (w && (w.debut !== s.debut || w.fin !== s.fin)) out.push({ kind: 'libelle-horaire', level: 'attention', slots: [s], written: w });
  }

  // « VALENTIN G » et « VALENTIN GUTH » : le même prénom, et un nom qui commence par l'initiale de l'autre.
  const names = [...new Set(courses.map((s) => norm(s.coach)).filter(Boolean))];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const [a, b] = names[i].length <= names[j].length ? [names[i], names[j]] : [names[j], names[i]];
      const pa = a.split(' ');
      const pb = b.split(' ');
      if (pa.length < 2 || pb.length < 2 || pa[0] !== pb[0]) continue;
      const restA = pa.slice(1).join(' ').replace(/\.$/, '');
      const restB = pb.slice(1).join(' ');
      if (restA.length < restB.length && restB.startsWith(restA)) {
        out.push({ kind: 'homonyme', level: 'attention', slots: courses.filter((s) => norm(s.coach) === a || norm(s.coach) === b), names: [a, b] });
      }
    }
  }

  const missing = courses.filter((s) => !norm(s.coach));
  if (missing.length) out.push({ kind: 'sans-coach', level: 'info', slots: missing });

  const order = { bloquant: 0, attention: 1, info: 2 } as const;
  return out.sort((x, y) => order[x.level] - order[y.level]);
}

export type CoachLoad = { coach: string; courses: number; minutes: number; clubs: string[]; days: number[]; slots: Slot[] };

/** La charge de chaque coach sur la semaine type (l'accès libre ne compte pas). */
export function coachLoads(slots: Slot[]): CoachLoad[] {
  const by = new Map<string, CoachLoad>();
  for (const s of slots) {
    const coach = norm(s.coach);
    if (!coach || isFree(s)) continue;
    const cur = by.get(coach) ?? { coach: s.coach!.trim(), courses: 0, minutes: 0, clubs: [], days: [], slots: [] };
    cur.courses++;
    cur.minutes += s.fin - s.debut;
    if (!cur.clubs.includes(s.club)) cur.clubs.push(s.club);
    if (!cur.days.includes(s.jour)) cur.days.push(s.jour);
    cur.slots.push(s);
    by.set(coach, cur);
  }
  return [...by.values()].map((c) => ({ ...c, days: c.days.sort((a, b) => a - b) })).sort((a, b) => b.minutes - a.minutes);
}
