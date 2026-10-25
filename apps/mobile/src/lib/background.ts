import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

/** Intervalle minimal accepte par le systeme (minutes). La fiche, elle, ne part qu'apres 6 h. */
const INTERVALLE_MIN = 15;
export const TACHE_FICHE = 'bc-rafraichir-fiche';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(TACHE_FICHE, async () => {
    try {
      const { rafraichirSiAncien } = await import('@/state/session');
      const ok = await rafraichirSiAncien();
      return ok ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function activerRafraichissementFond(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    const deja = await TaskManager.isTaskRegisteredAsync(TACHE_FICHE);
    if (deja) return;
    await BackgroundTask.registerTaskAsync(TACHE_FICHE, { minimumInterval: INTERVALLE_MIN });
  } catch {
    // Le systeme peut refuser la tache (simulateur iOS, economie d'energie).
  }
}

export async function arreterRafraichissementFond(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const deja = await TaskManager.isTaskRegisteredAsync(TACHE_FICHE);
    if (deja) await BackgroundTask.unregisterTaskAsync(TACHE_FICHE);
  } catch {
    // Deja absente.
  }
}
