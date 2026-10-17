import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * Protection de l’écran badge, dans la mesure de ce que chaque système permet
 * (cahier des charges §4) :
 *  - Android : FLAG_SECURE tant que l’écran est monté (captures, enregistrements,
 *    aperçu du sélecteur d’apps en noir) ;
 *  - iOS : blocage « meilleur effort » des captures et enregistrements (iOS 13+),
 *    flou dans le sélecteur d’apps ;
 *  - partout : le badge se masque quand l’app passe en arrière-plan, et une
 *    capture détectée au premier plan est signalée.
 * La vraie sécurité reste le code tournant lié à l’appareil, pas l’écran.
 */
export function useBadgeProtection(active: boolean) {
  const [hidden, setHidden] = useState(false);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    let mounted = true;
    void ScreenCapture.preventScreenCaptureAsync('badge');
    if (Platform.OS === 'ios') void ScreenCapture.enableAppSwitcherProtectionAsync(0.9);

    const sub = ScreenCapture.addScreenshotListener(() => {
      if (mounted) setCaptured(true);
    });

    return () => {
      mounted = false;
      sub.remove();
      void ScreenCapture.allowScreenCaptureAsync('badge');
      if (Platform.OS === 'ios') void ScreenCapture.disableAppSwitcherProtectionAsync();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', (state) => {
      setHidden(state !== 'active');
    });
    return () => sub.remove();
  }, [active]);

  return { hidden, captured, acknowledgeCapture: () => setCaptured(false) };
}
