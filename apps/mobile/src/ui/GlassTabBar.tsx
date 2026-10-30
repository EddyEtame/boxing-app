import * as Haptics from 'expo-haptics';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SECTIONS, type SectionId } from '@/features/sections';
import { sectionVisible } from '@/features/flags';
import { useT } from '@/i18n';
import { useFeaturesStore } from '@/state/features';
import { usePrefs } from '@/state/prefs';
import { useUnreadCount } from '@/state/messages';
import { selectStatut, useSession } from '@/state/session';
import { GlassSurface } from '@/ui/Glass';
import { IconLock } from '@/ui/icons';
import { scrollActiveToTop } from '@/ui/scrollTop';
import { CountBadge, LiveDot } from '@/ui/kit';
import { Body } from '@/ui/Text';
import { duration, radius, spring, TAB_BAR_HEIGHT, TAB_BAR_SIDE, useTheme } from '@/ui/theme';

/**
 * La barre d'onglets façon WhatsApp sur iOS 26 : une capsule de verre qui
 * flotte au-dessus du contenu, une pastille qui glisse sous l'onglet choisi.
 * Accueil et Plus sont fixes ; les trois du milieu, l'adhérent les choisit
 * (Plus → Ta barre). Une rubrique ouverte depuis Plus allume « Plus ».
 */
export function GlassTabBar() {
  const t = useTheme();
  const T = useT();
  const pathname = usePathname();
  const bar = usePrefs((s) => s.bar);
  const features = useFeaturesStore((s) => s.features);
  const unread = useUnreadCount();
  const statut = useSession(selectStatut);
  const insets = useSafeAreaInsets();
  const { width: screen } = useWindowDimensions();

  const middle = bar.filter((id) => sectionVisible(id, features));
  const items: SectionId[] = ['home', ...middle, 'plus'];
  const width = Math.min(screen - TAB_BAR_SIDE * 2, 460);
  const itemW = (width - 8) / items.length;
  const match = items.findIndex((id) => (id === 'home' ? pathname === '/' : pathname === SECTIONS[id].href || pathname.startsWith(SECTIONS[id].href + '/')));
  const active = match >= 0 ? match : items.length - 1;

  const x = useSharedValue(active * itemW);
  useEffect(() => {
    x.value = withSpring(active * itemW, spring.snappy);
  }, [active, itemW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const bottom = insets.bottom > 0 ? Math.max(insets.bottom - 6, 10) : 14;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={[styles.shadow, { width, boxShadow: t.shadowFloat }]}>
        <GlassSurface radius={TAB_BAR_HEIGHT / 2} style={StyleSheet.absoluteFill} />
        <Animated.View pointerEvents="none" style={[styles.pill, { width: itemW, backgroundColor: t.glassPill }, pill]} />
        <View style={styles.row} accessibilityRole="tablist">
          {items.map((id, i) => (
            <TabButton
              key={id}
              id={id}
              width={itemW}
              focused={i === active}
              here={i === match}
              label={T(SECTIONS[id].label)}
              count={id === 'messages' && statut === 'actif' ? unread : 0}
              locked={!!SECTIONS[id].members && statut !== 'actif'}
              live={false}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabButton({ id, width, focused, here, label, count, locked, live }: { id: SectionId; width: number; focused: boolean; here: boolean; label: string; count: number; locked: boolean; live: boolean }) {
  const t = useTheme();
  const Icon = SECTIONS[id].icon;
  const press = useSharedValue(0);
  const bump = useSharedValue(1);
  useEffect(() => {
    if (focused) {
      bump.value = 0.86;
      bump.value = withSpring(1, { damping: 14, stiffness: 320, mass: 0.7 });
    }
  }, [focused, bump]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value * (1 - press.value * 0.1) }] }));
  const tint = focused ? t.text : t.textMuted;
  return (
    <Pressable
      onPressIn={() => press.set(withTiming(1, { duration: duration.pressIn }))}
      onPressOut={() => press.set(withTiming(0, { duration: duration.pressOut }))}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        // Premier toucher : la rubrique. Toucher l'onglet de la page ouverte : retour en haut.
        // « Plus » allumé par défaut (rubrique ouverte depuis Plus) n'est pas « ici » : il ramène à Plus.
        if (here) {
          scrollActiveToTop();
          return;
        }
        router.navigate(SECTIONS[id].href as never);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={[styles.item, { width }]}>
      <Animated.View style={iconStyle}>
        <Icon size={25} color={tint} strokeWidth={focused ? 2 : 1.75} />
        {count > 0 ? <CountBadge count={count} style={styles.count} /> : null}
        {locked ? (
          <View style={[styles.lock, { backgroundColor: t.card, borderColor: t.line }]}>
            <IconLock size={10} color={t.textMuted} strokeWidth={2.2} />
          </View>
        ) : null}
        {live ? (
          <View style={styles.live}>
            <LiveDot size={7} />
          </View>
        ) : null}
      </Animated.View>
      <Body size="micro" weight="bold" numberOfLines={1} style={[styles.label, { color: tint }]}>
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 40 },
  shadow: { height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2 },
  pill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radius.pill },
  row: { flex: 1, flexDirection: 'row', paddingHorizontal: 4, alignItems: 'center' },
  item: { height: TAB_BAR_HEIGHT - 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
  count: { position: 'absolute', top: -6, right: -14 },
  lock: { position: 'absolute', top: -5, right: -9, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  live: { position: 'absolute', top: -2, right: -4 },
});
