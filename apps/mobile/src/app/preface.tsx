import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/features/analytics';
import { useT } from '@/i18n';
import { usePrefs } from '@/state/prefs';
import { GlassSurface } from '@/ui/Glass';
import { IconChevron, IconMoon, IconSun } from '@/ui/icons';
import { Logo } from '@/ui/Logo';
import { LowerThird } from '@/ui/LowerThird';
import { useTopInset } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, OnPhotoContext } from '@/ui/Text';
import { easing, GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, useTheme } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);
/**
 * La salle, vide : le ring de Portet sous les drapeaux, BOXING CENTER peint au mur (BC-003, « le ring comme
 * maison »). Personne dessus : chacun s'y projette (Eddy, 24/10/2026 : « just the gym, nobody inside »).
 */
const SALLE = require('@/assets/photos/portet-ring-drapeaux.jpg');
const SALLE_CADRAGE = 'center';

/**
 * L'entrée, au premier lancement seulement (24/10/2026). Elle tenait en trois
 * étapes (langue, ambiance, profil) ; l'app parle désormais français, et
 * l'ambiance suit le téléphone : il ne reste qu'une question, « qui es-tu ? ».
 * Un seul écran, un seul toucher pour entrer. Le clair et le sombre se
 * changent d'un geste avec le bouton en haut à droite, et dans Plus.
 */
export default function Preface() {
  const T = useT();
  const s = useStyles();
  const top = useTopInset();
  const insets = useSafeAreaInsets();
  const setOnboarded = usePrefs((st) => st.setOnboarded);

  const enter = (who: 'member' | 'guest') => {
    track('preface_done', { choice: who });
    // « Je découvre » : la vitrine. Un compte déjà ouvert (l'entrée revue depuis Plus) reste ouvert ;
    // au premier lancement, il n'y en a pas. « Je suis membre » : invité tant que la connexion n'a pas abouti.
    setOnboarded(true);
    if (who === 'member') setTimeout(() => router.push('/connexion?mode=connexion'), 60);
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <Entrance />
      <View style={[s.topBar, { paddingTop: top + space[2] }]}>
        <AmbianceButton />
      </View>

      <OnPhotoContext.Provider value>
        <View style={s.hero}>
          <SpotLogo />
          <Animated.View entering={FadeInDown.delay(260).duration(560).easing(ARRIVE)} style={s.heroText}>
            <Display size="display2" tight style={s.center}>
              {T('preface.headline')}
            </Display>
            <Body weight="semi" tone="muted" style={[s.center, s.lead]}>
              {T('preface.lead')}
            </Body>
          </Animated.View>
        </View>
      </OnPhotoContext.Provider>

      <Animated.View entering={FadeInDown.delay(340).duration(560).easing(ARRIVE)} style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + space[3] }]}>
        <Door who="member" index={0} primary title={T('preface.member')} sub={T('preface.memberSub')} meta={T('preface.memberMeta')} onPress={enter} />
        <Door who="guest" index={1} title={T('preface.discover')} sub={T('preface.discoverSub')} meta={T('preface.discoverMeta')} onPress={enter} />
      </Animated.View>
    </View>
  );
}

/** La photo occupe le haut de l'écran et s'avance lentement (9 s), comme on entre dans une salle de gala. */
function Entrance() {
  const s = useStyles();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const z = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) z.value = withTiming(1, { duration: 9000, easing: Easing.out(Easing.cubic) });
  }, [z, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1.12 - z.value * 0.12 }, { translateY: (1 - z.value) * -14 }] }));
  return (
    <View pointerEvents="none" style={[s.entrance, { height: Math.round(height * 0.72) }]}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <Photo source={SALLE} style={StyleSheet.absoluteFill} contentPosition={SALLE_CADRAGE} darken={0.4} scrim={0.62} scrimTop={0.5} priority="high" />
      </Animated.View>
    </View>
  );
}

/** Le logo s'allume sous son projecteur : il monte de 0,9 à 1 et sort du noir. */
function SpotLogo() {
  const s = useStyles();
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.value = withDelay(120, withTiming(1, { duration: 900, easing: ARRIVE }));
  }, [p, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.9 + p.value * 0.1 }] }));
  return (
    <Animated.View style={[s.logo, style]}>
      <Logo width={196} variant="spot" />
    </Animated.View>
  );
}

/** Clair ↔ sombre d'un geste ; l'écran change sous le doigt. Par défaut, l'ambiance du téléphone. */
function AmbianceButton() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const appearance = usePrefs((st) => st.appearance);
  const setAppearance = usePrefs((st) => st.setAppearance);
  const current = appearance === 'system' ? system : appearance;
  const next = current === 'dark' ? 'light' : 'dark';
  const Icon = current === 'dark' ? IconSun : IconMoon;
  return (
    <Tap
      onPress={() => {
        setAppearance(next);
        track('theme_change', { value: next, step: 1 });
      }}
      scaleTo={0.9}
      haptic="selection"
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={next === 'dark' ? T('preface.toDark') : T('preface.toLight')}>
      <GlassSurface radius={22} strength="light" style={s.round}>
        <Icon size={20} color={t.text} />
      </GlassSurface>
    </Tap>
  );
}

type DoorProps = {
  who: 'member' | 'guest';
  index: number;
  primary?: boolean;
  title: string;
  sub: string;
  meta: string;
  onPress: (who: 'member' | 'guest') => void;
};

/** Une porte : ce qu'on est, ce qu'on y trouve. La première est pleine, la seconde en creux. */
function Door({ who, index, primary, title, sub, meta, onPress }: DoorProps) {
  const s = useStyles();
  const t = useTheme();
  const ink = primary ? t.onPrimary : t.text;
  return (
    <Animated.View entering={FadeInDown.delay(440 + index * 90).duration(480).easing(ARRIVE)}>
      <Tap onPress={() => onPress(who)} scaleTo={0.98} haptic="medium" accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} style={[s.door, primary ? { backgroundColor: t.primary } : s.doorQuiet]}>
        <View style={s.doorText}>
          <Display size="display4" tight style={{ color: ink }}>
            {title}
          </Display>
          <Body size="bodySmall" weight="semi" style={{ color: ink, opacity: 0.78 }}>
            {sub}
          </Body>
          <LowerThird meta={meta} compact ink={ink} style={s.doorMeta} />
        </View>
        <IconChevron size={22} color={ink} />
      </Tap>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  entrance: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  topBar: { position: 'absolute', top: 0, right: 0, zIndex: 2, paddingHorizontal: space[4] },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GUTTER, paddingTop: space[8], paddingBottom: space[7] },
  logo: { marginBottom: space[6] },
  heroText: { alignItems: 'center', gap: space[2], maxWidth: 360 },
  center: { textAlign: 'center' },
  lead: { marginTop: space[1] },
  sheet: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: space[3],
    paddingTop: space[5],
    paddingHorizontal: GUTTER,
    borderTopLeftRadius: radius.card + 10,
    borderTopRightRadius: radius.card + 10,
    backgroundColor: t.bg,
    boxShadow: t.scheme === 'light' ? '0px -8px 30px rgba(16,19,42,0.18)' : '0px -8px 30px rgba(0,0,0,0.5)',
  },
  door: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4], paddingHorizontal: space[5], borderRadius: radius.card },
  doorQuiet: {
    backgroundColor: t.card,
    borderWidth: 1.5,
    borderColor: t.scheme === 'light' ? 'transparent' : t.line,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : null),
  },
  doorText: { flex: 1, gap: 2 },
  doorMeta: { marginTop: space[2] },
}));
