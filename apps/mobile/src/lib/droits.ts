import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';

import { demanderNotifications } from '@/lib/notifications';

const CLE_DEMANDES = 'bc-droits-demandes-v2';

/**
 * Autorisations demandees une seule fois, une fois la personne connectee :
 * notifications, puis position. Un refus est respecte :
 * on ne redemande pas a chaque ouverture. Les documents et factures sont enregistres
 * dans le dossier de l'app, sans autorisation de stockage. Pas de demande d'exemption
 * batterie : Google Play la refuse a une app de club, et la synchro de fond s'en passe.
 */
export async function demanderDroitsAppareil(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if ((await AsyncStorage.getItem(CLE_DEMANDES)) === '1') return;
    await AsyncStorage.setItem(CLE_DEMANDES, '1');
  } catch {
    return;
  }
  try {
    await demanderNotifications();
  } catch {
    // Le canal ou la demande peut echouer sans fichier Google : l'app continue.
  }
  try {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
  } catch {
    // Deja refusee, ou absente de cette version d'Android.
  }
}
