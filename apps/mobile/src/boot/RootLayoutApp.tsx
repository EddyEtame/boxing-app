import { Sentry } from '@/lib/sentry';
// Une graisse par import : importer le paquet entier embarquait toutes ses graisses dans l'app.
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat/400Regular';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { PRET, noterEtape } from '@/boot/journal';
import { useBadgeClockTicker } from '@/features/badge/clock';
import { AppRealtimeRoot } from '@/components/AppRealtimeRoot';
import { useAdminBootstrap } from '@/lib/admin-bootstrap';
import { useI18nStore } from '@/i18n';
import { setAnalyticsScheme, startAnalytics, track, trackScreen } from '@/features/analytics';
import { configReady } from '@/lib/config';
import { demanderDroitsAppareil } from '@/lib/droits';
import '@/lib/background';
import { usePrefs } from '@/state/prefs';
import { bootSession, useSession } from '@/state/session';
import { useUsage } from '@/state/usage';
import { BootScreen } from '@/ui/BootScreen';
import { BandeauHorsLigne, BandeauServeurInactif } from '@/ui/Offline';
import { useTheme } from '@/ui/theme';

// L'écran natif reste jusqu'à ce que l'écran de lancement (identique) soit dessiné : c'est lui qui le congédie.
SplashScreen.preventAutoHideAsync();
// Sans fondu : l'écran de lancement est identique au pixel près, un fondu ne ferait que ralentir
// (sur Android, il passe par un transfert de la fenêtre qui expirait sur les téléphones lents, 24/10/2026).
SplashScreen.setOptions({ fade: false });

/**
 * Quand l'ambiance change (clair ou sombre), l'ancien fond s'efface en 320 ms
 * par-dessus le nouveau : un fondu, pas un clignement.
 */
function ThemeFade() {
  const t = useTheme();
  const reduced = useReducedMotion();
  const last = useRef(t.bg);
  const from = useSharedValue(t.bg);
  const o = useSharedValue(0);
  useEffect(() => {
    if (last.current === t.bg) return;
    from.value = last.current;
    last.current = t.bg;
    if (reduced) return;
    o.value = 1;
    o.value = withTiming(0, { duration: 320 });
  }, [t.bg, reduced, from, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, backgroundColor: from.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} />;
}

/** La mesure d'usage : l'écran vu, l'ouverture de l'app, l'envoi par lots. */
function useAnalyticsWiring() {
  const path = usePathname();
  const t = useTheme();
  const usageReady = useUsage((s) => s.hydrated);
  useEffect(() => setAnalyticsScheme(t.scheme), [t.scheme]);
  useEffect(() => {
    if (!usageReady) return undefined;
    useUsage.getState().noteOpen();
    track('app_open');
    return startAnalytics();
  }, [usageReady]);
  useEffect(() => {
    if (usageReady && path) trackScreen(path);
  }, [path, usageReady]);
}

function RootLayout() {
  useBadgeClockTicker();
  useAnalyticsWiring();
  const t = useTheme();
  const prefsReady = usePrefs((s) => s.hydrated);
  const localeReady = useI18nStore((s) => s.hydrated);
  const clubsReady = useSession((s) => s.clubsHydrated);
  const auth = useSession((s) => s.auth);
  const [loaded, error] = useFonts({
    BebasNeue_400Regular,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    IBMPlexMono_500Medium,
  });
  const ready = (loaded || !!error) && prefsReady && localeReady && clubsReady && auth !== 'chargement';
  const [booted, setBooted] = useState(false);
  const onBooted = useCallback(() => setBooted(true), []);

  useEffect(() => {
    if (configReady) bootSession();
  }, []);

  useEffect(() => {
    if (!booted) return;
    // L'app est à l'écran : le journal de démarrage le note, le prochain lancement n'aura rien à montrer.
    void noterEtape(PRET);
  }, [booted]);

  // Les autorisations attendent que la personne soit entree dans son compte, et ne sont demandees qu'une fois.
  useEffect(() => {
    if (booted && auth === 'connecte') void demanderDroitsAppareil();
  }, [booted, auth]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(t.bg);
  }, [t.bg]);

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      {ready ? <AppTree connecte={auth === 'connecte'} /> : null}
      {booted ? null : <BootScreen ready={ready} onDone={onBooted} />}
    </View>
  );
}

/** L'app elle-même, dessinée sous l'écran de lancement dès que tout est prêt. */
function AppTree({ connecte }: { connecte: boolean }) {
  const t = useTheme();
  useAdminBootstrap();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaProvider>
        <KeyboardProvider preload={false}>
          <AppRealtimeRoot>
            <StatusBar style={t.statusBar} />
            {!configReady ? <BandeauServeurInactif /> : null}
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: t.bg },
                animation: 'slide_from_right',
              }}>
              {/* L'entrée demande un compte quand le serveur est configuré. */}
              <Stack.Protected guard={configReady && !connecte}>
                <Stack.Screen name="preface" options={{ animation: 'fade', gestureEnabled: false }} />
              </Stack.Protected>
              <Stack.Protected guard={connecte || !configReady}>
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen name="alertes" />
                <Stack.Screen name="equipe" />
                <Stack.Screen name="disciplines" />
                <Stack.Screen name="combats" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="barre" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              </Stack.Protected>
              <Stack.Protected guard={connecte}>
                <Stack.Screen name="fil/[id]" />
                <Stack.Screen name="bienvenue" options={{ presentation: 'modal', animation: 'fade', gestureEnabled: false }} />
              </Stack.Protected>
              {/* Le formulaire reste ouvert quand la session arrive, jusqu'au résultat. */}
              <Stack.Protected guard={configReady}>
                <Stack.Screen name="connexion" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              </Stack.Protected>
            </Stack>
            <ThemeFade />
            {configReady ? <BandeauHorsLigne /> : null}
          </AppRealtimeRoot>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
