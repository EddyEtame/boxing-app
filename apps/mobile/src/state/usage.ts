import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { IS_SERVER, persistStorage } from './storage';

/**
 * Ce que l'app apprend de la personne qui s'en sert, sur le téléphone
 * seulement (20/10/2026, Eddy : « plus on s'en sert, plus l'app devient la
 * sienne »). Des compteurs, jamais de contenu : quelles rubriques, quels clubs,
 * quelles disciplines, à quelle heure. Ils servent à ranger l'app pour elle.
 * Seuls les événements anonymes de mesure d'audience sortent du téléphone, et
 * la personne peut les couper (Plus → Réglages).
 */
type Counts = Record<string, number>;
type Kind = 'sections' | 'clubs' | 'familles';

type UsageState = {
  hydrated: boolean;
  /** Tirage aléatoire propre à cette installation ; aucun lien avec le compte. */
  anonId: string;
  analytics: boolean;
  /** Objectif de séances par semaine, choisi dans Mes stats. */
  weeklyGoal: number;
  sections: Counts;
  clubs: Counts;
  familles: Counts;
  /** Ouvertures de l'app par heure de la journée (0 → 23). */
  hours: number[];
  /** Créneaux du planning suivis (identifiants de créneau). */
  favorites: string[];
  opens: number;
  bump: (kind: Kind, key: string) => void;
  noteOpen: (at?: Date) => void;
  toggleFavorite: (slotId: string) => void;
  setGoal: (n: number) => void;
  setAnalytics: (on: boolean) => void;
  forget: () => void;
};

function newId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

const EMPTY = { sections: {}, clubs: {}, familles: {}, hours: Array.from({ length: 24 }, () => 0), favorites: [] as string[], opens: 0 };

export const useUsage = create<UsageState>()(
  persist(
    (set) => ({
      hydrated: false,
      anonId: newId(),
      analytics: true,
      weeklyGoal: 3,
      ...EMPTY,
      bump: (kind, key) => set((s) => ({ [kind]: { ...s[kind], [key]: (s[kind][key] ?? 0) + 1 } }) as Pick<UsageState, Kind>),
      noteOpen: (at = new Date()) =>
        set((s) => {
          const hours = s.hours.length === 24 ? [...s.hours] : [...EMPTY.hours];
          hours[at.getHours()] += 1;
          return { hours, opens: s.opens + 1 };
        }),
      toggleFavorite: (slotId) => set((s) => ({ favorites: s.favorites.includes(slotId) ? s.favorites.filter((x) => x !== slotId) : [...s.favorites, slotId].slice(-40) })),
      setGoal: (n) => set({ weeklyGoal: Math.min(7, Math.max(1, Math.round(n))) }),
      setAnalytics: (on) => set({ analytics: on }),
      forget: () => set({ ...EMPTY, anonId: newId() }),
    }),
    {
      name: 'bc-usage',
      version: 1,
      storage: persistStorage,
      skipHydration: IS_SERVER,
      partialize: ({ hydrated: _h, bump: _b, noteOpen: _n, toggleFavorite: _t, setGoal: _g, setAnalytics: _a, forget: _f, ...rest }) => rest,
      onRehydrateStorage: () => () => {
        useUsage.setState({ hydrated: true });
      },
    },
  ),
);

/** Les clés les plus fréquentes, de la plus utilisée à la moins utilisée. */
export function topKeys(counts: Counts, n = 3, min = 1): string[] {
  return Object.entries(counts)
    .filter(([, v]) => v >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}
