import { DEFAULT_DEMO, type DemoPattern } from '@bc/contract';

/**
 * Des scénarios de présentation, prêts en un clic : chacun raconte une histoire
 * que les statistiques de l'app savent montrer (régularité, retour après une
 * pause, intensité, découverte, plusieurs clubs).
 */
export type PresetId = 'reguliere' | 'retour' | 'competitrice' | 'nouveau' | 'tour';

export const PRESETS: Record<PresetId, DemoPattern> = {
  reguliere: DEFAULT_DEMO,
  retour: {
    perWeek: 3,
    weeks: 26,
    clubs: [{ club: 'minimes', weight: 1 }],
    moment: 'soir',
    jitter: 1,
    gaps: [6, 7, 8, 9],
    seed: 31102026,
  },
  competitrice: {
    perWeek: 5,
    weeks: 26,
    clubs: [
      { club: 'minimes', weight: 2 },
      { club: 'etats-unis', weight: 2 },
      { club: 'portet', weight: 1 },
    ],
    moment: 'mixte',
    jitter: 1,
    gaps: [],
    seed: 5052026,
  },
  nouveau: {
    perWeek: 2,
    weeks: 3,
    clubs: [{ club: 'saint-cyprien', weight: 1 }],
    moment: 'midi',
    jitter: 0,
    gaps: [],
    seed: 1092026,
  },
  tour: {
    perWeek: 3,
    weeks: 12,
    clubs: [
      { club: 'minimes', weight: 1 },
      { club: 'saint-cyprien', weight: 1 },
      { club: 'etats-unis', weight: 1 },
      { club: 'ramonville', weight: 1 },
      { club: 'portet', weight: 1 },
    ],
    moment: 'mixte',
    jitter: 1,
    gaps: [],
    seed: 15052026,
  },
};

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

export function samePattern(a: DemoPattern, b: DemoPattern): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(p: DemoPattern) {
  return { ...p, clubs: [...p.clubs].filter((c) => c.weight > 0).sort((x, y) => x.club.localeCompare(y.club)), gaps: [...(p.gaps ?? [])].sort((x, y) => x - y), jitter: p.jitter ?? 1, seed: p.seed ?? 20261020 };
}
