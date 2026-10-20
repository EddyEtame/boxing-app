import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { useBadgeClockTicker } from '@/features/badge/clock';
import { useI18nStore } from '@/i18n';
import { usePrefs } from '@/state/prefs';
import { useTheme } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 360 });

/**
 * Quand l'ambiance change (clair ↔ sombre), l'ancien fond s'efface en 320 ms
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

export default function RootLayout() {
  useBadgeClockTicker();
  const t = useTheme();
  const prefsReady = usePrefs((s) => s.hydrated);
  const localeReady = useI18nStore((s) => s.hydrated);
  const onboarded = usePrefs((s) => s.onboarded);
  const [loaded, error] = useFonts({
    BebasNeue_400Regular,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    IBMPlexMono_500Medium,
  });
  const ready = (loaded || !!error) && prefsReady && localeReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(t.bg);
  }, [t.bg]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaProvider>
        <StatusBar style={t.statusBar} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.bg },
            animation: 'slide_from_right',
          }}>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="preface" options={{ animation: 'fade', gestureEnabled: false }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="fil/[id]" />
            <Stack.Screen name="alertes" />
            <Stack.Screen name="equipe" />
            <Stack.Screen name="disciplines" />
            <Stack.Screen name="combats" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="barre" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="connexion" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack.Protected>
        </Stack>
        <ThemeFade />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
