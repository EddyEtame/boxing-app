'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { FEATURE_KEYS, type FeatureKey } from '@/lib/types';
import { setFeature } from '@/server/features';
import { actionUser, errorCode } from '@/server/session';

/** Bascule un interrupteur ; renvoie l'état d'avant pour « Annuler l'action ». */
export async function toggleFeature(key: string, on: boolean): Promise<ActionResult<{ previous: boolean; changed: boolean }>> {
  try {
    const user = await actionUser('fonctions');
    if (!FEATURE_KEYS.includes(key as FeatureKey) || typeof on !== 'boolean') return fail('invalide');
    return ok(await setFeature(user, key as FeatureKey, on));
  } catch (err) {
    return fail(errorCode(err));
  }
}
