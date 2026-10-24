import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { usePrefs } from '@/state/prefs';
import { easing, themes } from '@/ui/theme';

/**
 * La largeur du logo de l'écran de lancement natif (`imageWidth` dans app.json).
 * Android 12+ découpe l'icône de lancement dans un cercle de 192 dp : à 220 dp,
 * le logo était rogné et paraissait « dans un carré » (Eddy, 24/10/2026). À
 * 168 dp, il tient entier dans le cercle, et l'écran de chargement le reprend à
 * la même taille, au même endroit : la relève ne se voit pas.
 */
export const BOOT_LOGO_WIDTH = 168;

const LOGO = require('@/assets/brand/logo-transparent-600.png');
const LOGO_RATIO = 280 / 600;
const STICKER = require('@/assets/brand/logo-sticker-1200.png');
const STICKER_RATIO = 573 / 1200;

const BAR_WIDTH = 112;
/** Assez pour que la barre se lise comme un chargement, pas assez pour faire attendre. */
const MIN_VISIBLE_MS = 520;
const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

type Props = {
  /** Polices, préférences, langue et session sont prêtes : l'app peut s'afficher dessous. */
  ready: boolean;
  onDone: () => void;
};

/**
 * L'écran de lancement (24/10/2026, Eddy : « the logo showing, a little bar
 * below, loading, like a proper app »). Il prend le relais de l'écran natif,
 * identique au pixel près, puis une fine barre rouge avance pendant que l'app
 * se prépare. Elle ne fait pas semblant : elle file vers 85 % puis se termine
 * quand tout est prêt. Le logo s'avance alors légèrement et s'efface sur l'app,
 * déjà dessinée dessous. Il prend l'ambiance choisie dans l'app (clair, sombre ou
 * celle du téléphone), comme l'écran natif d'Android 12+ qui la garde (features/ambiance).
 */
export function BootScreen({ ready, onDone }: Props) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const prefsReady = usePrefs((st) => st.hydrated);
  const appearance = usePrefs((st) => st.appearance);
  const dark = (appearance === 'system' ? system : appearance) === 'dark';
  const th = themes[dark ? 'dark' : 'light'];
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  const shownAt = useRef(0);
  const progress = useSharedValue(0);
  const barIn = useSharedValue(0);
  const out = useSharedValue(0);
  const logoW = BOOT_LOGO_WIDTH;
  const logoH = Math.round(logoW * (dark ? STICKER_RATIO : LOGO_RATIO));

  // Dessiné : l'écran natif peut partir, la barre arrive et avance.
  const onLayout = () => {
    if (shownAt.current) return;
    shownAt.current = Date.now();
    setShown(true);
    void SplashScreen.hideAsync();
    barIn.value = withTiming(1, { duration: 200 });
    progress.value = withTiming(0.85, { duration: 1100, easing: Easing.out(Easing.cubic) });
  };

  useEffect(() => {
    if (!ready || !shown) return undefined;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
    const timer = setTimeout(() => {
      progress.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }, (finished) => {
        if (!finished) return;
        out.value = withTiming(1, { duration: reduced ? 160 : 300, easing: ARRIVE }, (done) => {
          if (done) runOnJS(onDone)();
        });
      });
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, shown, reduced, onDone, progress, out]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - out.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : 1 + out.value * 0.06 }] }));
  const barStyle = useAnimatedStyle(() => ({ opacity: barIn.value * (1 - out.value * 2) }));
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (progress.value - 1) * BAR_WIDTH }] }));

  // Tant que l'ambiance enregistrée n'est pas lue, l'écran natif reste : jamais un logo sombre pour un choix clair.
  if (!prefsReady) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: th.bg }, rootStyle]} onLayout={onLayout} accessibilityRole="progressbar" accessibilityLabel="Boxing Center">
      <Animated.View style={[{ width: logoW, height: logoH }, logoStyle]}>
        <Image source={dark ? STICKER : LOGO} style={{ width: logoW, height: logoH }} contentFit="contain" />
        <Animated.View style={[styles.track, { top: logoH + 30, left: (logoW - BAR_WIDTH) / 2, backgroundColor: th.lineStrong }, barStyle]}>
          <Animated.View style={[styles.fill, { backgroundColor: th.accent }, fillStyle]} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 1000, alignItems: 'center', justifyContent: 'center' },
  track: { position: 'absolute', width: BAR_WIDTH, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { width: BAR_WIDTH, height: 3, borderRadius: 2 },
});
