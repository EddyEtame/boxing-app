import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { lienSur } from '@/lib/liens';

/**
 * Boutique et pages web : onglet dans l'app, bouton Fermer pour revenir.
 * `createTask: false` evite de basculer vers Chrome comme une autre application.
 */
const OPTIONS: WebBrowser.WebBrowserOpenOptions = {
  presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  dismissButtonStyle: 'close',
  toolbarColor: '#F4F2EE',
  controlsColor: '#E8001C',
  enableBarCollapsing: false,
  showTitle: true,
  createTask: false,
};

/** Rend false, sans rien ouvrir, si l'adresse n'est pas une adresse web en https (`lib/liens`). */
export async function ouvrirDansApp(url: string | null | undefined): Promise<boolean> {
  const sur = lienSur(url);
  if (!sur) return false;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.open(sur, '_blank', 'noopener');
    return true;
  }
  await WebBrowser.openBrowserAsync(sur, OPTIONS);
  return true;
}

/** Un lien venu du serveur que le téléphone ouvre lui-même (billetterie, article) : https seulement. */
export function ouvrirLien(url: string | null | undefined): void {
  const sur = lienSur(url);
  if (sur) void Linking.openURL(sur);
}
