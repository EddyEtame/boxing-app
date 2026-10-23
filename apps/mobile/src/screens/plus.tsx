import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { CLUBS, clubById } from '@/data/clubs';
import { SECTIONS, PLUS_GRID, type SectionId } from '@/features/sections';
import { track } from '@/features/analytics';
import { useI18nStore, useT, type Locale } from '@/i18n';
import { usePrefs, type Appearance } from '@/state/prefs';
import { deleteLocalAccount } from '@/state/account';
import { useUsage } from '@/state/usage';
import { useSession } from '@/state/session';
import { GlassSurface } from '@/ui/Glass';
import { IconBell, IconChart, IconGlobe, IconLock, IconLogout, IconMoon, IconPhone, IconShield, IconSun, IconTrash } from '@/ui/icons';
import { Button, Card, Chip, IconTile, Row, Section, Segmented, Toggle } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Heading, Mono } from '@/ui/Text';
import { duration, easing, GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stagger, stroke, TAB_BAR_HEIGHT, useTheme } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/**
 * Plus (20/10/2026) : ce qui n'est pas dans la barre est ici, rangé et visible.
 * Ta carte, toutes les rubriques, ta barre, ton ambiance, ta langue, tes
 * réglages. Rien n'est entassé sur l'accueil.
 */
export function Screen() {
  const T = useT();
  const s = useStyles();
  const member = useSession((st) => st.member);
  const actif = member.statut === 'actif';
  const invite = member.statut === 'invite';
  const signOut = useSession((st) => st.signOut);
  const { width } = useWindowDimensions();
  const tileW = Math.floor((Math.min(width, MAX_CONTENT_WIDTH) - GUTTER * 2 - space[3] * 2) / 3);

  return (
    <Page title={T('plus.title')}>
      <Reveal>{invite ? <GuestCard /> : <MemberCard />}</Reveal>

      <Reveal>
        <Section title={T('plus.all')}>
          <View style={s.grid}>
            {PLUS_GRID.map((id, i) => (
              <GridTile key={id} id={id} index={i} width={tileW} locked={!!SECTIONS[id].members && !actif} />
            ))}
          </View>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('plus.yourBar')} note={T('plus.yourBarNote')}>
          <BarPreview />
          <Button label={T('plus.customize')} variant="secondary" onPress={() => router.push('/barre')} style={s.customize} />
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('plus.appearance')}>
          <AppearancePicker />
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('plus.language')}>
          <LanguagePicker />
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('plus.settings')}>
          <Card padded={false} style={s.list}>
            <Row icon={IconBell} title={T('plus.notifications')} subtitle={T('plus.notificationsSub')} onPress={() => router.push('/notifications')} />
            <MyClubs />
            <Row icon={IconShield} title={T('plus.privacy')} subtitle={T('plus.privacySub')} />
            <AnalyticsRow />
          </Card>
        </Section>
      </Reveal>

      {!invite ? (
        <Reveal>
          <Section title={T('plus.account')}>
            <Card padded={false} style={s.list}>
              <Row
                icon={IconLogout}
                title={T('plus.signOut')}
                subtitle={T('plus.signOutSub')}
                onPress={() => {
                  signOut();
                  router.navigate('/');
                }}
              />
              <HoldToDelete />
            </Card>
          </Section>
        </Reveal>
      ) : null}

      {__DEV__ ? (
        <Reveal>
          <Section title={T('plus.demo')}>
            <DemoStatut />
          </Section>
        </Reveal>
      ) : null}

      <Mono size="caption" tone="dim" style={s.footer}>
        SAS BOXING CENTER · v0.2
      </Mono>
    </Page>
  );
}

function MemberCard() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const member = useSession((st) => st.member);
  const account = useSession((st) => st.account);
  const club = clubById(member.clubPrincipal);
  const actif = member.statut === 'actif';
  const impaye = member.abonnement.impaye > 0;
  return (
    <Card onPress={() => router.navigate('/abonnement')} accessibilityLabel={`${member.prenom} ${member.nom}`}>
      <View style={s.me}>
        <View style={[s.meAvatar, { backgroundColor: t.primary }]}>
          <Heading level="section" tone="onPrimary">
            {member.prenom[0]}
            {member.nom[0]}
          </Heading>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Heading level="section" numberOfLines={1}>
            {member.prenom} {member.nom}
          </Heading>
          <Body size="bodySmall" tone="muted" numberOfLines={1}>
            {club.court} · {account.kind === 'demo' ? T('plus.demoAccount') : account.kind === 'created' ? T('plus.localAccount') : `Nº ${member.deciplusId}`}
          </Body>
          <View style={[s.status, { backgroundColor: !actif || impaye ? t.negativeSoft : t.positiveSoft }]}>
            <Body size="caption" weight="bold" tone={!actif || impaye ? 'negative' : 'positive'}>
              {!actif ? T('plus.statusEnded') : impaye ? T('plus.statusUnpaid') : T('plus.statusActive')}
            </Body>
          </View>
        </View>
      </View>
    </Card>
  );
}

function GuestCard() {
  const T = useT();
  const s = useStyles();
  return (
    <Card>
      <Heading level="section">{T('plus.guestTitle')}</Heading>
      <Body tone="muted" style={s.guestBody}>
        {T('plus.guestBody')}
      </Body>
      <Button label={T('guest.create')} onPress={() => {
              track('cta_create_account', { from: 'plus' });
              router.push('/connexion');
            }} />
      <Button label={T('guest.signIn')} variant="secondary" onPress={() => {
              track('cta_sign_in', { from: 'plus' });
              router.push('/connexion?mode=connexion');
            }} style={s.second} />
    </Card>
  );
}

function GridTile({ id, index, width, locked }: { id: SectionId; index: number; width: number; locked: boolean }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const section = SECTIONS[id];
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(Math.min(index, 8) * (stagger.step / 2), withTiming(1, { duration: 420, easing: ARRIVE }));
  }, [index, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.9 + p.value * 0.1 }] }));
  const open = () => {
    if (section.external) void Linking.openURL(section.external);
    else router.navigate(section.href as never);
  };
  return (
    <Animated.View style={[{ width }, style]}>
      <Tap onPress={open} scaleTo={0.94} haptic="light" accessibilityRole="button" accessibilityLabel={T(section.title)} style={s.tile}>
        <View>
          <IconTile icon={section.icon} size={44} tone={id === 'badge' ? 'accent' : 'neutral'} />
          {locked ? (
            <View style={[s.tileLock, { backgroundColor: t.card, borderColor: t.line }]}>
              <IconLock size={11} color={t.textMuted} strokeWidth={2.2} />
            </View>
          ) : null}
        </View>
        <Body size="caption" weight="bold" numberOfLines={2} style={s.tileLabel}>
          {T(section.title)}
        </Body>
      </Tap>
    </Animated.View>
  );
}

/** L'aperçu vivant de la barre de l'adhérent (la vraie capsule, en réduit). */
export function BarPreview({ bar }: { bar?: string[] }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const saved = usePrefs((st) => st.bar);
  const items = ['home', ...(bar ?? saved), 'plus'] as SectionId[];
  return (
    <View style={[s.preview, { boxShadow: t.shadowFloat }]}>
      <GlassSurface radius={TAB_BAR_HEIGHT / 2} style={StyleSheet.absoluteFill} />
      {items.map((id, i) => {
        const Icon = SECTIONS[id].icon;
        return (
          <View key={`${id}-${i}`} style={[s.previewItem, i === 0 && { backgroundColor: t.glassPill }]}>
            <Icon size={22} color={i === 0 ? t.text : t.textMuted} />
            <Body size="micro" weight="bold" numberOfLines={1} style={{ fontSize: 10.5, color: i === 0 ? t.text : t.textMuted }}>
              {T(SECTIONS[id].label)}
            </Body>
          </View>
        );
      })}
    </View>
  );
}

function AppearancePicker() {
  const T = useT();
  const s = useStyles();
  const appearance = usePrefs((st) => st.appearance);
  const setAppearance = usePrefs((st) => st.setAppearance);
  return (
    <View style={s.pickerBlock}>
      <Segmented<Appearance>
        full
        value={appearance}
        onChange={setAppearance}
        options={[
          { value: 'light', label: T('plus.light'), icon: IconSun },
          { value: 'dark', label: T('plus.dark'), icon: IconMoon },
          { value: 'system', label: T('plus.auto'), icon: IconPhone },
        ]}
      />
      <Body size="caption" tone="muted">
        {appearance === 'light' ? T('preface.lightSub') : appearance === 'dark' ? T('preface.darkSub') : T('preface.systemSub')}
      </Body>
    </View>
  );
}

function LanguagePicker() {
  const s = useStyles();
  const locale = useI18nStore((st) => st.locale);
  const setLocale = useI18nStore((st) => st.setLocale);
  return (
    <View style={s.pickerBlock}>
      <Segmented<Locale>
        full
        value={locale}
        onChange={setLocale}
        options={[
          { value: 'fr', label: 'Français', icon: IconGlobe },
          { value: 'en', label: 'English', icon: IconGlobe },
        ]}
      />
    </View>
  );
}

function AnalyticsRow() {
  const T = useT();
  const on = useUsage((st) => st.analytics);
  const setAnalytics = useUsage((st) => st.setAnalytics);
  return <Row icon={IconChart} title={T('plus.analytics')} subtitle={T('plus.analyticsSub')} right={<Toggle value={on} onChange={setAnalytics} label={T('plus.analytics')} />} last />;
}

function MyClubs() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const clubsChoisis = useSession((st) => st.clubsChoisis);
  const setClubs = useSession((st) => st.setClubs);
  return (
    <View style={[s.clubs, { borderBottomColor: t.line }]}>
      <Body weight="semi">{T('plus.myClubs')}</Body>
      <Body size="caption" tone="muted">
        {T('plus.myClubsSub')}
      </Body>
      <View style={s.clubChips}>
        {CLUBS.map((c) => {
          const on = clubsChoisis.includes(c.id);
          return <Chip key={c.id} label={c.court} selected={on} onPress={() => setClubs(on ? clubsChoisis.filter((x) => x !== c.id) : [...clubsChoisis, c.id])} />;
        })}
      </View>
    </View>
  );
}

/** Suppression de compte (Apple 5.1.1(v)) : maintenir 600 ms, le remplissage confirme. */
function HoldToDelete() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const fill = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={s.delete}>
      <IconTile icon={IconTrash} size={36} tone="accent" />
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="semi">{T('plus.delete')}</Body>
        <Body size="caption" tone="muted">
          {T('plus.deleteSub')}
        </Body>
      </View>
      <Pressable
        onPressIn={() => fill.set(withTiming(1, { duration: 600 }))}
        onPressOut={() => fill.set(withTiming(0, { duration: duration.jab }))}
        onLongPress={() => {
          deleteLocalAccount();
          router.navigate('/');
        }}
        delayLongPress={600}
        style={[s.hold, { borderColor: t.negative }]}
        accessibilityRole="button"
        accessibilityLabel={T('plus.deleteHold')}>
        <Animated.View style={[s.holdFill, { backgroundColor: t.negative }, style]} />
        <Body size="caption" weight="bold" tone="negative" style={{ zIndex: 1 }}>
          {T('plus.deleteHold')}
        </Body>
      </Pressable>
    </View>
  );
}

function DemoStatut() {
  const T = useT();
  const statut = useSession((st) => st.member.statut);
  const setStatut = useSession((st) => st.setStatut);
  return (
    <Segmented
      full
      value={statut}
      onChange={setStatut}
      options={[
        { value: 'actif', label: T('plus.statuses.actif') },
        { value: 'restreint', label: T('plus.statuses.restreint') },
        { value: 'invite', label: T('plus.statuses.invite') },
      ]}
    />
  );
}

const useStyles = makeStyles((t) => ({
  me: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  meAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  status: { alignSelf: 'flex-start', marginTop: space[2], paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  guestBody: { marginTop: space[2], marginBottom: space[5] },
  second: { marginTop: space[3] },
  // Trois tuiles par rang, alignées à gauche : un dernier rang de deux ne laisse plus de trou au milieu.
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[3], rowGap: space[3] },
  tile: {
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[4],
    paddingHorizontal: space[2],
    borderRadius: radius.card - 4,
    backgroundColor: t.card,
    minHeight: 112,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : { borderWidth: stroke.hair, borderColor: t.line }),
  },
  tileLabel: { textAlign: 'center' },
  tileLock: { position: 'absolute', top: -4, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  preview: { height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  previewItem: { flex: 1, height: TAB_BAR_HEIGHT - 8, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', gap: 2 },
  customize: { marginTop: space[4] },
  pickerBlock: { gap: space[3] },
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  clubs: { gap: 4, paddingVertical: space[4], borderBottomWidth: stroke.hair },
  clubChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
  delete: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  hold: { minWidth: 112, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: radius.control, borderWidth: 1.5, overflow: 'hidden' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  footer: { textAlign: 'center', marginTop: space[8] },
}));
