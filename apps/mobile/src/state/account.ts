import { clearAnalytics } from '@/features/analytics';

import { useMessages } from './messages';
import { usePrefs } from './prefs';
import { useSession } from './session';
import { useTrainings } from './trainings';
import { useUsage } from './usage';

/**
 * Supprimer le compte (Apple 5.1.1(v), CDC §17) : sans serveur, tout ce que
 * l'app garde sur la personne est effacé du téléphone. La langue, l'ambiance et
 * la barre restent : ce sont des réglages de l'appareil, pas des données sur
 * elle. En production, la même action demandera l'effacement au serveur ; le
 * club garde ses obligations comptables côté Deciplus.
 */
export function deleteLocalAccount() {
  useSession.getState().signOut();
  useUsage.getState().forget();
  clearAnalytics();
  useMessages.getState().reset();
  useTrainings.getState().reset();
  usePrefs.getState().resetNotif();
}
