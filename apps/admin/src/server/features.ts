import { audit } from './audit';
import { readFeatures, update } from './collections';
import type { FeaturesResponse } from '@/lib/public/team';
import { FEATURE_META } from '@/lib/team/features';
import { FEATURE_KEYS, type FeatureKey, type SessionUser } from '@/lib/types';

/**
 * Les interrupteurs de l'app (CDC §15 « activation ou désactivation de
 * certaines fonctionnalités », §11 E « désactiver certaines catégories »).
 * Une clé absente de la collection reste allumée (readFeatures) : une
 * fonction ajoutée à l'app n'est jamais coupée par surprise.
 */
export async function setFeature(user: SessionUser, key: FeatureKey, on: boolean): Promise<{ previous: boolean; changed: boolean }> {
  if (!FEATURE_KEYS.includes(key)) throw new Error('clé inconnue');
  const before = (await readFeatures())[key].on;
  if (before === on) return { previous: before, changed: false };
  await update('fonctions', (cur) => ({ next: { ...cur, [key]: { on, updatedAt: new Date().toISOString(), updatedBy: user.name } }, result: undefined }));
  await audit(user, on ? 'fonction.allumage' : 'fonction.coupure', key);
  return { previous: before, changed: true };
}

/** L'état effectif, celui que l'app applique : une catégorie ne vaut que si sa rubrique est allumée. */
export async function publicFeatures(): Promise<FeaturesResponse> {
  const state = await readFeatures();
  const features = {} as Record<FeatureKey, boolean>;
  let updatedAt: string | null = null;
  for (const key of FEATURE_KEYS) {
    const parent = FEATURE_META[key].parent;
    features[key] = state[key].on && (!parent || state[parent].on);
    const at = state[key].updatedAt;
    if (at && (!updatedAt || at > updatedAt)) updatedAt = at;
  }
  return { features, updatedAt };
}
