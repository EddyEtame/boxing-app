import { requireOptionalNativeModule } from 'expo';

import type { Appearance } from '@/state/prefs';

/**
 * L'ambiance choisie dans l'app, confiée au système (Android 12+, module local
 * `modules/bc-ambiance`) : l'écran natif de démarrage la reprend au lancement
 * suivant (Eddy, 24/10/2026 : en clair dans l'app, le logo clair à l'ouverture).
 * Sur iOS, sur le web et avant Android 12, le module n'existe pas : l'écran natif
 * y suit le téléphone, puis l'écran de lancement prend l'ambiance de l'app.
 */
type AmbianceNative = { setAppNightMode(mode: Appearance): void };

const native = requireOptionalNativeModule<AmbianceNative>('BcAmbiance');

export function confierAmbiance(mode: Appearance): void {
  try {
    native?.setAppNightMode(mode);
  } catch {
    // Jamais bloquant : au pire, l'écran natif suit le téléphone.
  }
}
