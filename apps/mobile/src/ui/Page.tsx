import { router } from 'expo-router';
import { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { GlassSurface } from '@/ui/Glass';
import { IconBack, IconClose } from '@/ui/icons';
import { Tap } from '@/ui/Tap';
import { Body, Display } from '@/ui/Text';
import { easing, GUTTER, MAX_CONTENT_WIDTH, space, stroke, TAB_BAR_HEIGHT, useTheme } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/** Hauteur de la barre de titre compacte (sous la zone sûre). */
const BAR = 52;

type ScrollState = { y: SharedValue<number>; viewport: number };
const ScrollStateContext = createContext<ScrollState | null>(null);

/** Le défilement de la page courante (parallaxe des affiches, révélations). */
export function usePageScrollY(): SharedValue<number> | null {
  return useContext(ScrollStateContext)?.y ?? null;
}

/** Le haut de l'écran : la zone sûre, ou 24 pt sur le web pour que rien ne colle au bord. */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  return insets.top > 0 ? insets.top : Platform.OS === 'web' ? 24 : 20;
}

/** Ce que la capsule d'onglets occupe en bas, marge comprise. */
export function useBottomChrome(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 14) + 10;
}

type PageProps = PropsWithChildren<{
  /** Défilement vertical (par défaut). `false` pour un écran fixe. */
  scroll?: boolean;
  /** Gouttières standard (20 pt). `false` quand l'écran gère ses bords (photos pleine largeur). */
  padded?: boolean;
  /** L'écran commence sous la barre d'état (héros photo). */
  bleedTop?: boolean;
  /** Grand titre (Bebas) qui se replie en titre compact dans une barre dépolie au défilement. */
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  /** Bouton de gauche pour les écrans empilés. */
  leading?: 'back' | 'close';
  onLeading?: () => void;
  /** Boutons de droite (ronds, en verre). */
  trailing?: ReactNode;
  /** Réserver la place de la capsule d'onglets (défaut : oui). */
  tabBar?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

/**
 * Le gabarit de chaque écran. Ce qu'Eddy reprochait (20/10) : « trop serré en
 * haut ». Ici le haut respire (zone sûre + 16 pt), le grand titre se lit, et
 * il se replie dans une barre dépolie quand on descend, comme sur iOS 26.
 */
export function Page({ children, scroll = true, padded = true, bleedTop = false, title, eyebrow, subtitle, leading, onLeading, trailing, tabBar = true, style, contentStyle }: PageProps) {
  const t = useTheme();
  const T = useT();
  const top = useTopInset();
  const insets = useSafeAreaInsets();
  const bottom = tabBar ? bottomChrome(insets.bottom) : Math.max(insets.bottom, 16) + space[6];
  const { height: viewport } = useWindowDimensions();
  const y = useSharedValue(0);
  const titleBottom = useSharedValue(120);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const hasBarItems = !!leading || !!trailing;
  const contentTop = bleedTop ? 0 : top + (hasBarItems ? BAR : space[4]);

  // Jamais de titre compact à y = 0 : un titre court (sans sous-titre) donnait un
  // seuil sous zéro, et le compact apparaissait en filigrane sous le grand (22/10).
  const barStyle = useAnimatedStyle(() => {
    const start = Math.max(12, titleBottom.value - (top + BAR) - 24);
    return { opacity: interpolate(y.value, [start, start + 24], [0, 1], 'clamp') };
  });
  const compactTitleStyle = useAnimatedStyle(() => {
    const start = Math.max(24, titleBottom.value - (top + BAR));
    return {
      opacity: interpolate(y.value, [start - 8, start + 12], [0, 1], 'clamp'),
      transform: [{ translateY: interpolate(y.value, [start - 8, start + 12], [6, 0], 'clamp') }],
    };
  });

  const inner: ViewStyle = {
    paddingTop: contentTop,
    paddingBottom: bottom,
    paddingHorizontal: padded ? GUTTER : 0,
  };

  const header = title ? (
    <View
      style={[styles.header, !padded && styles.headerPadded]}
      onLayout={(e: LayoutChangeEvent) => {
        titleBottom.value = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
      }}>
      {eyebrow ? (
        <Body size="caption" weight="bold" eyebrow tone="muted">
          {eyebrow}
        </Body>
      ) : null}
      <Display size="display3" tight accessibilityRole="header">
        {title}
      </Display>
      {subtitle ? (
        <Body size="bodySmall" tone="muted" style={styles.subtitle}>
          {subtitle}
        </Body>
      ) : null}
    </View>
  ) : null;

  const leadingButton = leading ? (
    <RoundButton
      label={leading === 'back' ? T('common.back') : T('common.close')}
      onPress={onLeading ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}>
      {leading === 'back' ? <IconBack size={22} /> : <IconClose size={20} />}
    </RoundButton>
  ) : null;

  const bar = (
    <View pointerEvents="box-none" style={[styles.bar, { height: top + BAR, paddingTop: top }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.barBg, { borderBottomColor: t.line }, barStyle]}>
        <GlassSurface radius={0} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.barRow}>
        <View style={styles.barSide}>{leadingButton}</View>
        {title ? (
          <Animated.View pointerEvents="none" style={[styles.barTitle, compactTitleStyle]}>
            <Body weight="bold" numberOfLines={1}>
              {title}
            </Body>
          </Animated.View>
        ) : (
          <View style={styles.barTitle} />
        )}
        <View style={[styles.barSide, styles.barRight]}>{trailing}</View>
      </View>
    </View>
  );

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: t.bg }, style]}>
        <View style={[styles.column, inner, contentStyle]}>
          {header}
          {children}
        </View>
        {bar}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg }, style]}>
      <ScrollStateContext.Provider value={{ y, viewport }}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.column, inner, contentStyle]}>
          {header}
          {children}
        </Animated.ScrollView>
      </ScrollStateContext.Provider>
      {bar}
    </View>
  );
}

function bottomChrome(insetBottom: number): number {
  return TAB_BAR_HEIGHT + Math.max(insetBottom, 14) + 10 + space[7];
}

/** Bouton rond en verre (retour, fermer, cloche, réglages). Cible de 44 pt. */
export function RoundButton({ label, onPress, children, badge }: PropsWithChildren<{ label: string; onPress: () => void; badge?: boolean }>) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} scaleTo={0.9} haptic="light" accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <GlassSurface radius={22} strength="light" style={styles.round}>
        {children}
      </GlassSurface>
      {badge ? <View style={[styles.dot, { backgroundColor: t.accent, borderColor: t.bg }]} /> : null}
    </Tap>
  );
}

/**
 * Une section qui monte quand elle entre à l'écran (24 pt, 520 ms, décalage
 * optionnel). À poser comme enfant direct de la page. Rien ne bouge si le
 * téléphone demande de réduire les animations.
 */
export function Reveal({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const scrollState = useContext(ScrollStateContext);
  const reduced = useReducedMotion();
  const layoutY = useSharedValue(1e7);
  const shown = useSharedValue(reduced ? 1 : 0);
  const fallbackY = useSharedValue(0);
  const scrollY = scrollState?.y ?? fallbackY;
  const viewport = scrollState?.viewport ?? 2000;
  useAnimatedReaction(
    () => scrollY.value + viewport - layoutY.value,
    (visible) => {
      if (visible > 32 && shown.value === 0) {
        shown.value = withDelay(delay, withTiming(1, { duration: 520, easing: ARRIVE }));
      }
    },
  );
  const animated = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 24 }],
  }));
  return (
    <Animated.View
      style={[style, animated]}
      onLayout={(e) => {
        layoutY.value = e.nativeEvent.layout.y;
      }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', flexGrow: 1 },
  header: { gap: space[1], marginBottom: space[5] },
  headerPadded: { paddingHorizontal: GUTTER },
  subtitle: { marginTop: space[1] },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  barBg: { borderBottomWidth: stroke.hair },
  barRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], gap: space[2], width: '100%', maxWidth: MAX_CONTENT_WIDTH + 2 * space[4], alignSelf: 'center' },
  barSide: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  barRight: { justifyContent: 'flex-end' },
  barTitle: { flex: 1, alignItems: 'center' },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 6, right: 6, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
});
