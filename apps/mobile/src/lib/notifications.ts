import { getPermissionsAsync, requestPermissionsAsync, setNotificationChannelAsync } from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { Platform } from 'react-native';

export type DroitNotifications = 'granted' | 'denied' | 'undetermined';

/** Pas de jeton push : aucun identifiant EAS n'est configure pour l'instant. */

export async function preparerCanalNotifications(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync('default', {
    name: 'Boxing Center',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function lireDroitNotifications(): Promise<DroitNotifications> {
  const actuel = await getPermissionsAsync();
  if (actuel.granted) return 'granted';
  if (actuel.status === 'denied') return 'denied';
  return 'undetermined';
}

/** A appeler seulement apres l'ecran qui explique pourquoi. */
export async function demanderNotifications(): Promise<DroitNotifications> {
  await preparerCanalNotifications();
  const actuel = await getPermissionsAsync();
  if (actuel.granted) return 'granted';
  const suivant = await requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (suivant.granted) return 'granted';
  if (suivant.status === 'denied') return 'denied';
  return 'undetermined';
}
