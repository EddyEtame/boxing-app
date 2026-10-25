import { clearAnalytics } from '@/features/analytics';

import { usePrefs } from './prefs';
import { useSession } from './session';
import { useUsage } from './usage';

/** Efface ce que le telephone garde encore sur la personne. Le compte serveur passe par useSession.supprimer. */
export function deleteLocalAccount() {
  void useSession.getState().signOut();
  useUsage.getState().forget();
  clearAnalytics();
  usePrefs.getState().resetNotif();
}
