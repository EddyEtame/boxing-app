import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

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

export async function ouvrirDansApp(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
    return;
  }
  await WebBrowser.openBrowserAsync(url, OPTIONS);
}
