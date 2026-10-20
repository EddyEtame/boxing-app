import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Le stockage des préférences (langue, ambiance, barre), sûr partout.
 *
 * 20/10/2026 : le serveur Expo est tombé (« window is not defined ») parce que
 * le rendu web préparé côté Node a voulu écrire dans le localStorage, et que la
 * promesse rejetée n'était rattrapée par personne. Deux règles en sortent :
 * - sans navigateur (rendu Node), on ne lit ni n'écrit rien ;
 * - une écriture qui échoue (navigation privée, quota plein) ne casse jamais
 *   l'app : l'état reste en mémoire pour la session.
 */
export const IS_SERVER = Platform.OS === 'web' && typeof window === 'undefined';

const safe: StateStorage = {
  getItem: async (name) => {
    if (IS_SERVER) return null;
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    if (IS_SERVER) return;
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // L'état reste en mémoire ; il sera réécrit au prochain changement.
    }
  },
  removeItem: async (name) => {
    if (IS_SERVER) return;
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Rien à défaire.
    }
  },
};

export const persistStorage = createJSONStorage(() => safe);
