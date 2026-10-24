import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import { displayPath, mobilePath } from './paths';
import { extractArray } from './ts-literal';
import { CLUB_IDS, isClubId } from '@/lib/clubs';
import { RESEAU } from '@/lib/planning/hours';
import type { ClubId, WeekHours } from '@/lib/types';

/**
 * Les heures d'ouverture que l'app affiche aujourd'hui (apps/mobile/src/data/
 * clubs.ts : « du lundi au samedi, de 10h00 à 21h30, fermé le dimanche »),
 * lues sans jamais y écrire : le point de départ des horaires de l'admin.
 * Comme pour le planning, seuls des littéraux sont évalués, dans un contexte
 * vide et avec une limite de temps. Illisible : la règle publiée du réseau,
 * et l'admin dit pourquoi.
 */
export type AppHours = { hours: Record<ClubId, WeekHours>; path: string; from: 'app' | 'regle'; error?: string };

const SOURCE = () => mobilePath('src', 'data', 'clubs.ts');

const int = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/** `{ jours: [0…5], debut: 600, fin: 1290 }` (la forme de l'app) → sept jours. */
function toWeek(raw: unknown, where: string): WeekHours {
  const o = (raw ?? {}) as { jours?: unknown; debut?: unknown; fin?: unknown };
  if (!Array.isArray(o.jours) || !o.jours.every((j) => int(j, 0, 6)) || !int(o.debut, 0, 1439) || !int(o.fin, 1, 1440) || (o.fin as number) <= (o.debut as number)) {
    throw new Error(`${where} : ouverture illisible`);
  }
  const jours = o.jours as number[];
  return [0, 1, 2, 3, 4, 5, 6].map((j) => (jours.includes(j) ? { debut: o.debut as number, fin: o.fin as number } : null));
}

export async function readAppHours(): Promise<AppHours> {
  const file = SOURCE();
  const path = displayPath(file);
  try {
    const text = await readFile(file, 'utf8');
    // Les ouvertures partagées (`const SEMAINE: Ouverture = { … };`) et un `require` muet pour les photos, définis dans le contexte lui-même.
    const consts = [...text.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*:\s*Ouverture\s*=\s*(\{[^;]*\})\s*;/g)].map((m) => `const ${m[1]} = ${m[2]};`).join('\n');
    const literal = extractArray(text, 'export const CLUBS');
    const value: unknown = vm.runInNewContext(`${consts}\nconst require = () => null;\n(${literal})`, Object.create(null), { timeout: 500 });
    if (!Array.isArray(value)) throw new Error('CLUBS n’est pas un tableau');
    const hours: Partial<Record<ClubId, WeekHours>> = {};
    value.forEach((raw, i) => {
      const c = (raw ?? {}) as { id?: unknown; ouverture?: unknown };
      if (isClubId(c.id)) hours[c.id] = toWeek(c.ouverture, `club n° ${i + 1} (${c.id})`);
    });
    const missing = CLUB_IDS.filter((c) => !hours[c]);
    if (missing.length) throw new Error(`sans heures d’ouverture : ${missing.join(', ')}`);
    return { hours: hours as Record<ClubId, WeekHours>, path, from: 'app' };
  } catch (err) {
    return { hours: Object.fromEntries(CLUB_IDS.map((c) => [c, RESEAU])) as Record<ClubId, WeekHours>, path, from: 'regle', error: err instanceof Error ? err.message : String(err) };
  }
}
