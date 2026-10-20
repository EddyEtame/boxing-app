import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { IS_SERVER, persistStorage } from './storage';

/**
 * Les choix de l'utilisateur qui survivent à la fermeture de l'app : avoir vu
 * la préface, l'ambiance (clair, sombre, comme le téléphone), et la barre qu'il
 * s'est composée. Rien de sensible ici : le badge et la session vivent ailleurs
 * (SecureStore, .research/08-SECURITE.md).
 */
export type Appearance = 'light' | 'dark' | 'system';

/** Les rubriques qui peuvent occuper une place de la barre (entre Accueil et Plus). */
export type BarSlot = 'planning' | 'badge' | 'messages' | 'entrainer' | 'stats' | 'abonnement' | 'actualites';

export const BAR_SLOTS: BarSlot[] = ['planning', 'badge', 'messages', 'entrainer', 'stats', 'abonnement', 'actualites'];
export const DEFAULT_BAR: BarSlot[] = ['planning', 'badge', 'messages'];
export const BAR_SIZE = 3;

type PrefsState = {
  hydrated: boolean;
  onboarded: boolean;
  appearance: Appearance;
  bar: BarSlot[];
  setAppearance: (appearance: Appearance) => void;
  setOnboarded: (onboarded: boolean) => void;
  setBar: (bar: BarSlot[]) => void;
};

function cleanBar(bar: unknown): BarSlot[] {
  if (!Array.isArray(bar)) return DEFAULT_BAR;
  const list = bar.filter((s): s is BarSlot => BAR_SLOTS.includes(s as BarSlot));
  const unique = list.filter((s, i) => list.indexOf(s) === i).slice(0, BAR_SIZE);
  return unique.length === BAR_SIZE ? unique : DEFAULT_BAR;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      hydrated: false,
      onboarded: false,
      appearance: 'system',
      bar: DEFAULT_BAR,
      setAppearance: (appearance) => set({ appearance }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setBar: (bar) => set({ bar: cleanBar(bar) }),
    }),
    {
      name: 'bc-prefs',
      version: 1,
      storage: persistStorage,
      skipHydration: IS_SERVER,
      partialize: (s) => ({ onboarded: s.onboarded, appearance: s.appearance, bar: s.bar }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PrefsState>;
        return {
          ...current,
          onboarded: p.onboarded === true,
          appearance: p.appearance === 'light' || p.appearance === 'dark' || p.appearance === 'system' ? p.appearance : current.appearance,
          bar: cleanBar(p.bar),
        };
      },
      onRehydrateStorage: () => () => {
        usePrefs.setState({ hydrated: true });
      },
    },
  ),
);
