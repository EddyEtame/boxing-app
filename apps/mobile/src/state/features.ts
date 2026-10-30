import { FEATURE_KEYS, type FeatureKey, type FeaturesResponse } from '@bc/contract';
import { create } from 'zustand';

import { sectionFeature, sectionVisible } from '@/features/flags';
import { lireFonctions } from '@/lib/admin-api';
import { API_URL } from '@/lib/config';
import { BAR_SIZE, DEFAULT_BAR, usePrefs, type BarSlot } from '@/state/prefs';

type FeaturesState = {
  features: Record<FeatureKey, boolean>;
  loaded: boolean;
  refresh: () => Promise<void>;
};

function defaults(): Record<FeatureKey, boolean> {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, true])) as Record<FeatureKey, boolean>;
}

function cleanBarAfterFeatures(features: Record<FeatureKey, boolean>): void {
  const allowed = (id: BarSlot) => sectionVisible(id, features);
  const current = usePrefs.getState().bar.filter(allowed);
  const fallback = DEFAULT_BAR.filter(allowed);
  const pick = [...current];
  for (const id of fallback) {
    if (pick.length >= BAR_SIZE) break;
    if (!pick.includes(id)) pick.push(id);
  }
  for (const id of ['planning', 'badge', 'messages', 'entrainer', 'stats', 'abonnement', 'actualites'] as BarSlot[]) {
    if (pick.length >= BAR_SIZE) break;
    if (allowed(id) && !pick.includes(id)) pick.push(id);
  }
  if (pick.length === BAR_SIZE && pick.join() !== usePrefs.getState().bar.join()) usePrefs.getState().setBar(pick);
}

export const useFeaturesStore = create<FeaturesState>((set, get) => ({
  features: defaults(),
  loaded: false,
  refresh: async () => {
    if (!API_URL) {
      set({ loaded: true });
      return;
    }
    try {
      const res: FeaturesResponse = await lireFonctions();
      const merged = { ...defaults(), ...res.features };
      set({ features: merged, loaded: true });
      cleanBarAfterFeatures(merged);
    } catch {
      set({ loaded: true });
    }
  },
}));

export function featureOn(key: FeatureKey): boolean {
  return useFeaturesStore.getState().features[key] !== false;
}

export function useFeature(key: FeatureKey): boolean {
  return useFeaturesStore((s) => s.features[key] !== false);
}

export function useSectionVisible(id: Parameters<typeof sectionVisible>[0]): boolean {
  return useFeaturesStore((s) => sectionVisible(id, s.features));
}

export { sectionFeature };
