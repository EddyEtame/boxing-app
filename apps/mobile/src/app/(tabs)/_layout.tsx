import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useEffect, type ComponentProps, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Screen } from 'react-native-screens';

import { GlassTabBar } from '@/ui/GlassTabBar';
import { ProfileSwitch } from '@/ui/ProfileSwitch';
import { easing, useTheme } from '@/ui/theme';

type RenderTab = NonNullable<ComponentProps<typeof TabSlot>['renderFn']>;

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/**
 * L'onglet qui arrive monte de 10 pt et s'éclaire en 260 ms : on sent qu'on a
 * changé de pièce, sans glissement latéral (réservé aux écrans empilés).
 */
function TabScene({ focused, children }: PropsWithChildren<{ focused: boolean }>) {
  const reduced = useReducedMotion();
  const p = useSharedValue(1);
  useEffect(() => {
    if (!focused) return;
    if (reduced) {
      p.value = 1;
      return;
    }
    p.value = 0;
    p.value = withTiming(1, { duration: 260, easing: ARRIVE });
  }, [focused, reduced, p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.2 + p.value * 0.8, transform: [{ translateY: (1 - p.value) * 10 }] }));
  return <Animated.View style={[styles.scene, style]}>{children}</Animated.View>;
}

/**
 * Le rendu d'onglet par défaut d'expo-router pose chaque écran en `flexGrow 1,
 * flexShrink 0` : sur le web, un onglet plus haut que la fenêtre ne défilait
 * pas (18/10). Chaque écran est posé en plein cadre.
 */
const renderTab: RenderTab = (descriptor, { isFocused, loaded, detachInactiveScreens }) => {
  const { lazy = true, unmountOnBlur } = descriptor.options;
  if (unmountOnBlur && !isFocused) return null;
  if (lazy && !loaded && !isFocused) return null;
  return (
    <Screen key={descriptor.route.key} enabled={detachInactiveScreens} activityState={isFocused ? 2 : 0} freezeOnBlur={false} style={[StyleSheet.absoluteFill, isFocused ? styles.focused : styles.unfocused]}>
      <TabScene focused={isFocused}>{descriptor.render()}</TabScene>
    </Screen>
  );
};

/**
 * Les onglets : la liste des déclencheurs reste cachée (elle déclare les
 * routes) ; la barre visible est la capsule de verre, composée par l'adhérent.
 */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <Tabs options={{ backBehavior: 'history' }} style={styles.root}>
        <TabSlot renderFn={renderTab} />
        <TabList style={styles.hidden}>
          <TabTrigger name="index" href="/" />
          <TabTrigger name="planning" href="/planning" />
          <TabTrigger name="badge" href="/badge" />
          <TabTrigger name="messages" href="/messages" />
          <TabTrigger name="entrainer" href="/entrainer" />
          <TabTrigger name="stats" href="/stats" />
          <TabTrigger name="abonnement" href="/abonnement" />
          <TabTrigger name="actualites" href="/actualites" />
          <TabTrigger name="plus" href="/plus" />
        </TabList>
        <GlassTabBar />
      </Tabs>
      <ProfileSwitch />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scene: { flex: 1 },
  hidden: { display: 'none' },
  focused: { zIndex: 1, display: 'flex' },
  unfocused: { zIndex: 0, display: 'none' },
});
