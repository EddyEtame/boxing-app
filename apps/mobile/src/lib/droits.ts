import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform, type Permission } from 'react-native';

import { demanderNotifications } from '@/lib/notifications';

const CLE_FOND = 'bc-fond-sans-restriction';
const PAQUET = 'fr.boxingcenter.app';

/**
 * Autorisations demandees une fois l'app ouverte : notifications, position,
 * stockage des documents, et lecture des donnees en arriere-plan sans restriction
 * (economie de batterie Android). Un refus ne ferme pas l'application.
 */
export async function demanderDroitsAppareil(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await demanderNotifications();
  } catch {
    // Le canal ou la demande peut echouer sans fichier Google : l'app continue.
  }
  const api = typeof Platform.Version === 'number' ? Platform.Version : 0;
  const liste: Permission[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ];
  if (api >= 33) {
    liste.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
    liste.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
    liste.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO);
  } else {
    liste.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
    liste.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  }
  try {
    await PermissionsAndroid.requestMultiple(liste);
  } catch {
    // Deja refusees, ou absentes de cette version d'Android.
  }
  await demanderFondSansRestriction();
}

/** Une seule fois : le systeme propose de ne plus endormir l'app ni couper ses donnees. */
async function demanderFondSansRestriction(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(CLE_FOND)) === '1') return;
    const IntentLauncher = await import('expo-intent-launcher');
    await IntentLauncher.startActivityAsync('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', {
      data: `package:${PAQUET}`,
    });
    await AsyncStorage.setItem(CLE_FOND, '1');
  } catch {
    // Intent refuse, module absent, ou deja tranche par Android.
  }
}
