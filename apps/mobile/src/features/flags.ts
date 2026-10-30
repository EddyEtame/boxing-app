import type { FeatureKey } from '@bc/contract';

import type { SectionId } from '@/features/sections';
import type { BarSlot } from '@/state/prefs';

type Gated = SectionId | BarSlot;

/** Interrupteur admin associe a une rubrique de l'app. */
export function sectionFeature(id: Gated): FeatureKey | FeatureKey[] | null {
  switch (id) {
    case 'badge':
      return 'badge';
    case 'messages':
      return 'messagerie';
    case 'stats':
      return 'statistiques';
    case 'combats':
      return 'combats';
    case 'boutique':
      return 'boutique';
    case 'entrainer':
      return ['videos', 'entrainements'];
    default:
      return null;
  }
}

export function sectionVisible(id: Gated, features: Record<FeatureKey, boolean>): boolean {
  const key = sectionFeature(id);
  if (!key) return true;
  if (Array.isArray(key)) return key.some((k) => features[k] !== false);
  return features[key] !== false;
}
