import { PermissionsAndroid, Platform, type Permission } from 'react-native';

import { demanderNotifications } from '@/lib/notifications';

/**
 * Autorisations demandees une fois l'app ouverte : notifications, position,
 * et stockage des documents. Un refus ne ferme pas l'application.
 * Le systeme ne reaffiche pas une demande deja tranchee.
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
}
