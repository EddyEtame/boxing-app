import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/features/analytics';
import { useI18nStore, useT, type Locale } from '@/i18n';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { GlassSurface } from '@/ui/Glass';
import { IconBack, IconCheck, IconMoon, IconSun } from '@/ui/icons';
import { Button, Toggle } from '@/ui/kit';
import { Logo } from '@/ui/Logo';
import { useTopInset } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display } from '@/ui/Text';
import { easing, GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stroke, themes, useTheme, type Scheme } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);
const STEPS = 3;

/**
 * La préface (20/10/2026, demande d'Eddy) : avant d'entrer, l'utilisateur
 * choisit sa langue, son ambiance (clair ou sombre), et dit qui il est.
 * Rien n'attend pour rien : pas de barre de chargement, chaque écran sert.
 */
export default function Preface() {
  const T = useT();
  const s = useStyles();
  const top = useTopInset();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const setOnboarded = usePrefs((st) => st.setOnboarded);
  const setStatut = useSession((st) => st.setStatut);

  const go = (n: number) => {
    track('preface_step', { step: n + 1 });
    setStep(n);
  };
  const finish = (who: 'member' | 'guest') => {
    track('preface_done', { choice: who });
    // Les deux entrent sans session ; l'adhérent se connecte juste après (CDC §2).
    setStatut('invite');
    setOnboarded(true);
    if (who === 'member') setTimeout(() => router.push('/connexion?mode=connexion'), 60);
  };

  return (
    <View style={s.root}>
      <View style={[s.top, { paddingTop: top + space[2] }]}>
        <View style={s.topSide}>
          {step > 0 ? (
            <Tap onPress={() => setStep(step - 1)} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={T('common.back')} hitSlop={8}>
              <GlassSurface radius={22} strength="light" style={s.round}>
                <IconBack size={22} />
              </GlassSurface>
            </Tap>
          ) : null}
        </View>
        <Progress step={step} />
        <View style={[s.topSide, s.topRight]}>
          {step < STEPS - 1 ? (
            <Pressable onPress={() => setStep(STEPS - 1)} hitSlop={10} accessibilityRole="button" accessibilityLabel={T('preface.skip')}>
              <Body size="bodySmall" weight="bold" tone="muted">
                {T('preface.skip')}
              </Body>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + space[6] }]} showsVerticalScrollIndicator={false}>
        <Animated.View key={step} entering={FadeInDown.duration(420).easing(ARRIVE)} exiting={FadeOut.duration(120)} style={s.stepBox}>
          {step === 0 ? <StepLangue onNext={() => go(1)} /> : step === 1 ? <StepAmbiance onNext={() => go(2)} /> : <StepProfil onPick={finish} />}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Progress({ step }: { step: number }) {
  const t = useTheme();
  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS, now: step + 1 }}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <ProgressDot key={i} on={i <= step} current={i === step} color={t.text} track={t.lineStrong} />
      ))}
    </View>
  );
}

function ProgressDot({ on, current, color, track }: { on: boolean; current: boolean; color: string; track: string }) {
  const w = useSharedValue(current ? 28 : 8);
  useEffect(() => {
    w.value = withTiming(current ? 28 : 8, { duration: 320, easing: ARRIVE });
  }, [current, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: on ? color : track }, style]} />;
}

/* --------------------------------------------------------------- */

function StepLangue({ onNext }: { onNext: () => void }) {
  const s = useStyles();
  const T = useT();
  const locale = useI18nStore((st) => st.locale);
  const setLocale = useI18nStore((st) => st.setLocale);
  const reduced = useReducedMotion();
  const logo = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) logo.value = withDelay(80, withTiming(1, { duration: 700, easing: ARRIVE }));
  }, [logo, reduced]);
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ scale: 0.92 + logo.value * 0.08 }] }));
  const options: { value: Locale; label: string; sub: string }[] = [
    { value: 'fr', label: 'Français', sub: 'Continuer en français' },
    { value: 'en', label: 'English', sub: 'Continue in English' },
  ];
  return (
    <>
      <Animated.View style={[s.logoBox, logoStyle]}>
        <Logo width={236} />
      </Animated.View>
      <Display size="display3" tight style={s.center}>
        Bienvenue · Welcome
      </Display>
      <Body tone="muted" style={[s.center, s.lead]}>
        Cinq clubs à Toulouse, une seule app.{'\n'}Five clubs in Toulouse, one app.
      </Body>
      <View style={s.choices}>
        {options.map((o, i) => (
          <Animated.View key={o.value} entering={FadeInDown.delay(160 + i * 83).duration(420).easing(ARRIVE)}>
            <Choice label={o.label} sub={o.sub} selected={locale === o.value} onPress={() => {
              setLocale(o.value);
              track('locale_change', { value: o.value, step: 1 });
            }} />
          </Animated.View>
        ))}
      </View>
      <Body size="caption" tone="dim" style={[s.center, s.note]}>
        {T('preface.langNote')}
      </Body>
      <View style={s.push} />
      <Button label={T('preface.continue')} onPress={onNext} />
    </>
  );
}

function StepAmbiance({ onNext }: { onNext: () => void }) {
  const s = useStyles();
  const T = useT();
  const appearance = usePrefs((st) => st.appearance);
  const setAppearance = usePrefs((st) => st.setAppearance);
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const current: Scheme = appearance === 'system' ? system : appearance;
  const { width } = useWindowDimensions();
  const col = Math.min(width, MAX_CONTENT_WIDTH) - GUTTER * 2;
  const cardW = (col - space[3]) / 2;
  return (
    <>
      <Body size="caption" weight="bold" eyebrow tone="muted">
        {T('preface.step', { n: 2, total: STEPS })}
      </Body>
      <Display size="display3" tight>
        {T('preface.lookTitle')}
      </Display>
      <Body tone="muted" style={s.lead}>
        {T('preface.lookSub')}
      </Body>
      <View style={s.previews}>
        {(['light', 'dark'] as const).map((scheme, i) => (
          <Animated.View key={scheme} entering={FadeInDown.delay(120 + i * 83).duration(440).easing(ARRIVE)}>
            <ThemePreview scheme={scheme} width={cardW} selected={current === scheme} onPress={() => {
              setAppearance(scheme);
              track('theme_change', { value: scheme, step: 2 });
            }} label={scheme === 'light' ? T('preface.light') : T('preface.dark')} sub={scheme === 'light' ? T('preface.lightSub') : T('preface.darkSub')} />
          </Animated.View>
        ))}
      </View>
      <View style={s.systemRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body weight="semi">{T('preface.system')}</Body>
          <Body size="caption" tone="muted">
            {T('preface.systemSub')}
          </Body>
        </View>
        <Toggle value={appearance === 'system'} onChange={(v) => setAppearance(v ? 'system' : current)} label={T('preface.system')} />
      </View>
      <View style={s.push} />
      <Button label={T('preface.continue')} onPress={onNext} />
    </>
  );
}

function StepProfil({ onPick }: { onPick: (who: 'member' | 'guest') => void }) {
  const s = useStyles();
  const T = useT();
  const cards = [
    { who: 'member' as const, title: T('preface.member'), sub: T('preface.memberSub'), photo: require('@/assets/photos/minimes-sacs.jpg') },
    { who: 'guest' as const, title: T('preface.discover'), sub: T('preface.discoverSub'), photo: require('@/assets/photos/ring-drapeaux-vide.jpg') },
  ];
  return (
    <>
      <Body size="caption" weight="bold" eyebrow tone="muted">
        {T('preface.step', { n: 3, total: STEPS })}
      </Body>
      <Display size="display3" tight>
        {T('preface.whoTitle')}
      </Display>
      <Body tone="muted" style={s.lead}>
        {T('preface.whoSub')}
      </Body>
      <View style={s.whoList}>
        {cards.map((c, i) => (
          <Animated.View key={c.who} entering={FadeInDown.delay(120 + i * 83).duration(440).easing(ARRIVE)}>
            <Tap onPress={() => onPick(c.who)} scaleTo={0.98} haptic="medium" accessibilityRole="button" accessibilityLabel={c.title}>
              <Photo source={c.photo} style={s.whoCard} darken={0.45} scrim={0.8} vignette={false}>
                <View style={s.whoText}>
                  <Display size="display4" tight>
                    {c.title}
                  </Display>
                  <Body size="bodySmall" tone="muted">
                    {c.sub}
                  </Body>
                </View>
              </Photo>
            </Tap>
          </Animated.View>
        ))}
      </View>
      <Body size="caption" tone="dim" style={[s.center, s.note]}>
        {T('preface.changeLater')}
      </Body>
    </>
  );
}

/* --------------------------------------------------------------- */

function Choice({ label, sub, selected, onPress }: { label: string; sub: string; selected: boolean; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Tap onPress={onPress} scaleTo={0.98} haptic="selection" accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} style={[s.choice, selected && s.choiceOn]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body size="title" weight="bold">
          {label}
        </Body>
        <Body size="bodySmall" tone="muted">
          {sub}
        </Body>
      </View>
      <View style={[s.radio, selected && { backgroundColor: t.primary, borderColor: t.primary }]}>{selected ? <IconCheck size={16} color={t.onPrimary} strokeWidth={2.2} /> : null}</View>
    </Tap>
  );
}

/** Une vraie mini-accueil rendue avec les jetons de l'ambiance : l'aperçu est l'app. */
function ThemePreview({ scheme, width, selected, onPress, label, sub }: { scheme: Scheme; width: number; selected: boolean; onPress: () => void; label: string; sub: string }) {
  const s = useStyles();
  const t = useTheme();
  const p = themes[scheme];
  const Icon = scheme === 'light' ? IconSun : IconMoon;
  return (
    <Tap onPress={onPress} scaleTo={0.97} haptic="selection" accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} style={{ width }}>
      <View style={[s.preview, { backgroundColor: p.bg, borderColor: selected ? t.text : t.line }, selected && s.previewOn]}>
        <View style={[s.pvLine, { width: '42%', backgroundColor: p.textDim, opacity: 0.5 }]} />
        <View style={[s.pvTitle, { backgroundColor: p.text }]} />
        <Photo source={require('@/assets/photos/minimes-ring-drapeau.jpg')} style={s.pvPhoto} darken={0.35} scrim={0.6} grain={false} vignette={false}>
          <View style={s.pvPhotoText}>
            <View style={[s.pvLine, { width: '55%', backgroundColor: '#F5F5F5' }]} />
            <View style={[s.pvLine, { width: '30%', backgroundColor: '#FF4D5E', marginTop: 4 }]} />
          </View>
        </Photo>
        <View style={s.pvTiles}>
          {[0, 1].map((k) => (
            <View key={k} style={[s.pvTile, { backgroundColor: p.card, borderColor: p.line }]}>
              <View style={[s.pvDot, { backgroundColor: p.tint }]} />
              <View style={[s.pvLine, { width: '70%', backgroundColor: p.text, opacity: 0.85 }]} />
              <View style={[s.pvLine, { width: '45%', backgroundColor: p.textDim, opacity: 0.6 }]} />
            </View>
          ))}
        </View>
        <View style={[s.pvBar, { backgroundColor: p.glass, borderColor: p.glassBorder }]}>
          {[0, 1, 2, 3, 4].map((k) => (
            <View key={k} style={[s.pvBarItem, k === 0 && { backgroundColor: p.glassPill }]}>
              <View style={[s.pvBarIcon, { backgroundColor: k === 0 ? p.text : p.textMuted }]} />
            </View>
          ))}
        </View>
        {selected ? (
          <Animated.View entering={FadeIn.duration(200)} style={[s.check, { backgroundColor: t.text }]}>
            <IconCheck size={14} color={t.bg} strokeWidth={2.4} />
          </Animated.View>
        ) : null}
      </View>
      <View style={s.pvLabel}>
        <Icon size={18} />
        <Body weight="bold">{label}</Body>
      </View>
      <Body size="caption" tone="muted">
        {sub}
      </Body>
    </Tap>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
});

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingBottom: space[2], width: '100%', maxWidth: MAX_CONTENT_WIDTH + 2 * space[4], alignSelf: 'center' },
  topSide: { width: 80, flexDirection: 'row' },
  topRight: { justifyContent: 'flex-end' },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: space[4], width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  stepBox: { gap: space[2], flexGrow: 1 },
  // Le bouton descend sous le pouce ; sur un petit écran, il suit le contenu.
  push: { flexGrow: 1, minHeight: space[7] },
  logoBox: { alignItems: 'center', marginTop: space[6], marginBottom: space[6] },
  center: { textAlign: 'center' },
  lead: { marginTop: space[1] },
  note: { marginTop: space[4] },
  choices: { gap: space[3], marginTop: space[6] },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 76,
    paddingHorizontal: space[5],
    borderRadius: radius.card,
    backgroundColor: t.card,
    borderWidth: 1.5,
    borderColor: t.scheme === 'light' ? 'transparent' : t.line,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : null),
  },
  choiceOn: { borderColor: t.text },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: t.lineStrong, alignItems: 'center', justifyContent: 'center' },
  previews: { flexDirection: 'row', gap: space[3], marginTop: space[5] },
  preview: { height: 236, borderRadius: radius.card, padding: 12, borderWidth: 1.5, overflow: 'hidden', gap: 6 },
  previewOn: { borderWidth: 2.5 },
  pvTitle: { height: 12, width: '68%', borderRadius: 3, marginBottom: 4 },
  pvLine: { height: 6, borderRadius: 3 },
  pvPhoto: { height: 70, borderRadius: 12, justifyContent: 'flex-end' },
  pvPhotoText: { padding: 8 },
  pvTiles: { flexDirection: 'row', gap: 6 },
  pvTile: { flex: 1, height: 52, borderRadius: 10, padding: 7, gap: 5, borderWidth: stroke.hair },
  pvDot: { width: 14, height: 14, borderRadius: 4 },
  pvBar: { position: 'absolute', left: 10, right: 10, bottom: 10, height: 30, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, borderWidth: stroke.hair },
  pvBarItem: { flex: 1, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pvBarIcon: { width: 10, height: 10, borderRadius: 3 },
  check: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pvLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space[3] },
  systemRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[5], paddingVertical: space[3], borderTopWidth: stroke.hair, borderBottomWidth: stroke.hair, borderColor: t.line },
  whoList: { gap: space[3], marginTop: space[5] },
  whoCard: { height: 196, borderRadius: radius.card, justifyContent: 'flex-end' },
  whoText: { padding: space[5], gap: space[1] },
}));
