import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { CLUBS, clubById } from '@/data/clubs';
import { sectionVisible } from '@/features/flags';
import { PLUS_GRID, SECTIONS, urlBoutique, type SectionId } from '@/features/sections';
import { track } from '@/features/analytics';
import { ANGLAIS_ACTIF, useI18nStore, useT, type Locale } from '@/i18n';
import { useFeaturesStore } from '@/state/features';
import { usePrefs, type Appearance } from '@/state/prefs';
import { useUsage } from '@/state/usage';
import { useSession } from '@/state/session';
import { HorsLigne } from '@/ui/Offline';
import { GlassSurface } from '@/ui/Glass';
import { IconBell, IconChart, IconGlobe, IconLock, IconLogout, IconMoon, IconPhone, IconShield, IconSun, IconTrash } from '@/ui/icons';
import { Button, Card, Chip, IconTile, Row, Section, Segmented, Toggle } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Heading, Mono } from '@/ui/Text';
import { easing, GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stagger, stroke, TAB_BAR_HEIGHT, useTheme } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/**
 * Plus (20/10/2026) : ce qui n'est pas dans la barre est ici, rangé et visible.
 * Ta carte, toutes les rubriques, ta barre, ton ambiance, ta langue, tes
 * réglages. Rien n'est entassé sur l'accueil.
 */
export function Screen() {
  const T = useT();
  const s = useStyles();
  const auth = useSession((st) => st.auth);
  const me = useSession((st) => st.me);
  const actif = me?.statut === 'actif';
  const invite = auth !== 'connecte';
  const signOut = useSession((st) => st.signOut);
  const setOnboarded = usePrefs((st) => st.setOnboarded);
  const { width } = useWindowDimensions();
  const tileW = Math.floor((Math.min(width, MAX_CONTENT_WIDTH) - GUTTER * 2 - space[3] * 2) / 3);
  const features = useFeaturesStore((s) => s.features);
  const grid = PLUS_GRID.filter((id) => sectionVisible(id, features));

  return (
    <Page title={T('plus.title')}>
      <Reveal>{invite ? <GuestCard /> : me ? <MemberCard /> : <HorsLigne page={false} />}</Reveal>

      <Reveal>
        <Section title={T('plus.all')}>
          <View style={s.grid}>
            {grid.map((id, i) => (
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

      {ANGLAIS_ACTIF ? (
        <Reveal>
          <Section title={T('plus.language')}>
            <LanguagePicker />
          </Section>
        </Reveal>
      ) : null}

      <Reveal>
        <Section title={T('plus.settings')}>
          <Card padded={false} style={s.list}>
            <Row icon={IconBell} title={T('plus.notifications')} subtitle={T('plus.notificationsSub')} onPress={() => router.push('/notifications')} />
            <MyClubs />
            <Row icon={IconShield} title={T('plus.privacy')} subtitle={T('plus.privacySub')} />
            <Row icon={IconPhone} title={T('plus.replayIntro')} subtitle={T('plus.replayIntroSub')} onPress={() => setOnboarded(false)} />
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
              <SupprimerCompte />
            </Card>
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
  const me = useSession((st) => st.me);
  if (!me) return null;
  const clubId = me.clubPrincipal ?? me.snapshot?.club ?? null;
  const club = clubId ? clubById(clubId) : null;
  const actif = me.statut === 'actif';
  const lien =
    me.link.status === 'lie'
      ? T('plus.linked')
      : me.link.status === 'a_revoir'
        ? T('plus.review')
        : me.link.status === 'prospect'
          ? T('plus.prospect')
          : T('plus.pending');
  return (
    <Card onPress={() => router.navigate('/abonnement')} accessibilityLabel={`${me.prenom} ${me.nom}`}>
      <View style={s.me}>
        <View style={[s.meAvatar, { backgroundColor: t.primary }]}>
          <Heading level="section" tone="onPrimary">
            {me.prenom.slice(0, 1)}
            {me.nom.slice(0, 1)}
          </Heading>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Heading level="section" numberOfLines={1}>
            {me.prenom} {me.nom}
          </Heading>
          <Body size="bodySmall" tone="muted" numberOfLines={2}>
            {club ? club.court : T('plus.noClub')} · {lien}
          </Body>
          <View style={[s.status, { backgroundColor: actif ? t.positiveSoft : t.negativeSoft }]}>
            <Body size="caption" weight="bold" tone={actif ? 'positive' : 'negative'}>
              {me.consentementParentalRequis ? T('plus.parental') : actif ? T('plus.statusActive') : T('plus.statusEnded')}
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
  const clubActif = useSession((st) => st.clubActif);
  const section = SECTIONS[id];
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(Math.min(index, 8) * (stagger.step / 2), withTiming(1, { duration: 420, easing: ARRIVE }));
  }, [index, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.9 + p.value * 0.1 }] }));
  const open = () => {
    if (section.external || id === 'boutique') void Linking.openURL(id === 'boutique' ? urlBoutique({ club: clubActif }) : section.external!);
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

/** Deux confirmations, puis DELETE /v1/me et deconnexion. */
function SupprimerCompte() {
  const T = useT();
  const s = useStyles();
  const [confirme, setConfirme] = useState(false);
  const [busy, setBusy] = useState(false);
  const [echec, setEchec] = useState(false);
  const supprimer = useSession((st) => st.supprimer);
  if (!confirme) {
    return <Row icon={IconTrash} title={T('plus.delete')} subtitle={T('plus.deleteSub')} onPress={() => setConfirme(true)} />;
  }
  return (
    <View style={s.compte}>
      <Body weight="semi">{T('plus.delete')}</Body>
      <Body tone="muted">{T('plus.deleteConfirmBody')}</Body>
      {echec ? <Body tone="negative">{T('plus.deleteFail')}</Body> : null}
      <Button
        label={T('plus.deleteForever')}
        disabled={busy}
        onPress={() => {
          setBusy(true);
          setEchec(false);
          void supprimer()
            .then(() => router.navigate('/'))
            .catch(() => {
              setEchec(true);
              setBusy(false);
            });
        }}
      />
      <Button label={T('plus.cancel')} variant="secondary" disabled={busy} onPress={() => { setConfirme(false); setEchec(false); }} />
    </View>
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
  footer: { textAlign: 'center', marginTop: space[8] },
  compte: { gap: space[3] },
  compteTitre: { marginTop: space[3] },
}));
