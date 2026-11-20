import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';

import { demanderNotifications } from '@/lib/notifications';

const CLE_DEMANDES = 'bc-droits-demandes-v2';
const CLE_FOND = 'bc-fond-sans-restriction';
const PAQUET = 'fr.boxingcenter.app';

/**
 * Autorisations demandees une seule fois, une fois la personne connectee :
 * notifications, puis position, puis donnees en arriere-plan. Un refus est respecte :
 * on ne redemande pas a chaque ouverture. Les documents et factures sont enregistres
 * dans le dossier de l'app, sans autorisation de stockage.
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
  await demanderFondSansRestriction();
}

/** Une seule fois : le systeme propose de ne plus endormir l'app ni couper ses donnees. */
async function demanderFondSansRestriction(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(CLE_FOND)) === '1') return;
    await AsyncStorage.setItem(CLE_FOND, '1');
    const IntentLauncher = await import('expo-intent-launcher');
    await IntentLauncher.startActivityAsync('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', {
      data: `package:${PAQUET}`,
    });
  } catch {
    // Intent refuse, module absent, ou deja tranche par Android.
  }
}
