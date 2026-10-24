import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, View, useWindowDimensions } from 'react-native';

import { CLUBS, estOuvert } from '@/data/clubs';
import { PERSONNES } from '@/data/coachs';
import { DISCIPLINES } from '@/data/disciplines';
import { NEWS, OFFRES } from '@/data/news';
import { useCombats } from '@/features/combats/useCombats';
import { clubsProposant, heure } from '@/features/planning/model';
import { shortDay } from '@/features/time';
import { track } from '@/features/analytics';
import { ANGLAIS_ACTIF, useI18nStore, useInLocale, useLocale, useT } from '@/i18n';
import { GlassSurface } from '@/ui/Glass';
import { IconChevron, IconGlobe } from '@/ui/icons';
import { Button, Card, Section } from '@/ui/kit';
import { Logo } from '@/ui/Logo';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Heading } from '@/ui/Text';
import { GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stroke, useTheme } from '@/ui/theme';

import { CarouselHead, NewsRow, Poster } from './parts';

/**
 * L'accueil de l'invité : la vitrine (CDC §3A, outil commercial). Le choix de
 * la langue est en haut à droite, visible ; la porte d'entrée (compte) juste
 * après la première affiche ; puis les salles, les disciplines, les visages,
 * l'actualité. Tout mène à la porte.
 */
export function HomeInvite() {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const col = Math.min(width, MAX_CONTENT_WIDTH) - GUTTER * 2;
  const combats = useCombats();
  const [clubIndex, setClubIndex] = useState(0);
  const loc = useInLocale();
  const [offre, ...others] = OFFRES.map(loc);
  const plateW = Math.round(col * 0.82);
  const discW = Math.round(col * 0.56);
  const portraitW = Math.round(col * 0.5);
  const portraits = PERSONNES.filter((p) => p.photo).slice(0, 10);

  return (
    <Page trailing={ANGLAIS_ACTIF ? <LangPill /> : undefined}>
      <Reveal style={s.head}>
        <Logo width={132} style={s.logo} />
        <Display size="display2" tight>
          {T('guest.title')}
        </Display>
        <Body size="title" weight="medium" tone="muted">
          {T('guest.lead')}
        </Body>
      </Reveal>

      <Reveal delay={80} style={s.block}>
        <Poster index={0} height={Math.round(col * 1.02)} photo={offre.photo} cornerLeft={T('guest.offer')} cornerRight={T('guest.shop')} title={offre.titre} meta={offre.meta} sub={offre.accroche} onPress={() => void Linking.openURL(offre.lien)} />
      </Reveal>

      <Reveal delay={120} style={s.block}>
        <Card>
          <Heading level="section">{T('guest.ctaTitle')}</Heading>
          <Body tone="muted" style={s.ctaBody}>
            {T('guest.ctaBody')}
          </Body>
          <Button label={T('guest.create')} onPress={() => {
              track('cta_create_account', { from: 'home' });
              router.push('/connexion');
            }} />
          <Button label={T('guest.signIn')} variant="secondary" onPress={() => {
              track('cta_sign_in', { from: 'home' });
              router.push('/connexion?mode=connexion');
            }} style={s.ctaSecond} />
        </Card>
      </Reveal>

      <Reveal style={s.section}>
        <CarouselHead title={T('guest.offers')} index={0} total={others.length} action={{ label: T('guest.shop'), onPress: () => void Linking.openURL('https://boutique.boxingcenter.fr/') }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={plateW + space[3]} decelerationRate="fast" style={s.carousel} contentContainerStyle={s.carouselContent}>
          {others.map((o, i) => (
            <Poster key={o.id} index={i + 1} width={plateW} height={Math.round(plateW * 1.1)} photo={o.photo} cornerLeft={T('guest.offer')} title={o.titre} meta={o.meta} sub={o.accroche} onPress={() => void Linking.openURL(o.lien)} />
          ))}
        </ScrollView>
      </Reveal>

      <Reveal style={s.section}>
        <CarouselHead title={T('guest.clubs')} index={clubIndex} total={CLUBS.length} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={plateW + space[3]}
          decelerationRate="fast"
          style={s.carousel}
          contentContainerStyle={s.carouselContent}
          onScroll={(e) => setClubIndex(Math.min(CLUBS.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / (plateW + space[3])))))}
          scrollEventThrottle={32}>
          {CLUBS.map((c) => {
            const open = estOuvert(c);
            return (
              <Tap key={c.id} style={{ width: plateW }} onPress={() => router.navigate('/planning')} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={c.nom}>
                <Photo source={c.photo} style={s.club} darken={0.38} scrim={0.72}>
                  <View style={s.clubTop}>
                    <View style={s.openPill}>
                      <View style={[s.openDot, { backgroundColor: open ? '#3DDC84' : 'rgba(245,245,245,0.55)' }]} />
                      <Body size="caption" weight="bold">
                        {open ? T('home.openUntil', { h: heure(c.ouverture.fin) }) : T('home.closed')}
                      </Body>
                    </View>
                  </View>
                  <View style={s.clubBottom}>
                    <Display size="display4" tight>
                      {c.court}
                    </Display>
                    <Body size="bodySmall" tone="muted" numberOfLines={1}>
                      {c.rue}, {c.ville}
                    </Body>
                    <Body size="caption" weight="bold" tone="muted">
                      {T('guest.hours')}
                    </Body>
                  </View>
                </Photo>
              </Tap>
            );
          })}
        </ScrollView>
      </Reveal>

      <Reveal style={s.section}>
        <CarouselHead title={T('guest.disciplines')} index={0} total={DISCIPLINES.length} action={{ label: T('common.seeAll'), onPress: () => router.push('/disciplines') }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={discW + space[3]} decelerationRate="fast" style={s.carousel} contentContainerStyle={s.carouselContent}>
          {DISCIPLINES.map(loc).map((d) => {
            const n = clubsProposant(d.famille).length;
            return (
              <Tap key={d.famille} style={{ width: discW }} onPress={() => router.push('/disciplines')} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={d.nom}>
                <Photo source={d.photo} style={s.disc} darken={0.38} scrim={0.8}>
                  <View style={s.cardBottom}>
                    <Heading level="card" numberOfLines={2}>
                      {d.nom}
                    </Heading>
                    <Body size="caption" weight="bold" tone="muted">
                      {n ? T('guest.inClubs', { n }) : T('guest.onRequest')}
                    </Body>
                  </View>
                </Photo>
              </Tap>
            );
          })}
        </ScrollView>
      </Reveal>

      <Reveal style={s.section}>
        <CarouselHead title={T('guest.team')} index={0} total={portraits.length} action={{ label: T('common.seeAll'), onPress: () => router.push('/equipe') }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={portraitW + space[3]} decelerationRate="fast" style={s.carousel} contentContainerStyle={s.carouselContent}>
          {portraits.map((p) => (
            <Tap key={p.id} style={{ width: portraitW }} onPress={() => router.push('/equipe')} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={p.nom}>
              <Photo source={p.photo!} style={s.portrait} darken={0.12} scrim={0.6} vignette={false} contentPosition="top">
                <View style={s.cardBottom}>
                  <Heading level="card" numberOfLines={1}>
                    {p.nom}
                  </Heading>
                  <Body size="caption" tone="muted" numberOfLines={2}>
                    {loc(p).role}
                  </Body>
                </View>
              </Photo>
            </Tap>
          ))}
        </ScrollView>
      </Reveal>

      <Reveal>
        <Section title={T('guest.fights')} action={{ label: T('common.seeAll'), onPress: () => router.push('/combats') }}>
          <Card padded={false} style={s.listCard}>
            {combats.items.slice(0, 3).map((c, i) => (
              <Tap key={c.lien} onPress={() => router.push('/combats')} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={c.titre} style={[s.fight, i < 2 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Body weight="bold" numberOfLines={2}>
                    {c.titre}
                  </Body>
                  <Body size="caption" weight="semi" tone="dim">
                    {c.date ? shortDay(c.date, lang) : ''} · actu-mma.com{lang === 'en' ? ` · ${T('fights.inFrench')}` : ''}
                  </Body>
                </View>
                <IconChevron size={18} color={t.textDim} />
              </Tap>
            ))}
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('guest.now')}>
          <Card padded={false} style={s.listCard}>
            {NEWS.filter((n) => n.publique).map((n, i, arr) => (
              <NewsRow key={n.id} item={n} last={i === arr.length - 1} onPress={n.lien ? () => void Linking.openURL(n.lien!) : undefined} />
            ))}
          </Card>
        </Section>
      </Reveal>
    </Page>
  );
}

/** La langue, visible en haut à droite : un geste, et toute l'app change. */
function LangPill() {
  const s = useStyles();
  const T = useT();
  const locale = useI18nStore((st) => st.locale);
  const setLocale = useI18nStore((st) => st.setLocale);
  return (
    <Tap onPress={() => setLocale(locale === 'fr' ? 'en' : 'fr')} scaleTo={0.92} haptic="selection" accessibilityRole="button" accessibilityLabel={T('plus.language')}>
      <GlassSurface radius={22} strength="light" style={s.lang}>
        <IconGlobe size={18} />
        <Body size="bodySmall" weight="bold" tone={locale === 'fr' ? 'text' : 'dim'}>
          FR
        </Body>
        <Body size="bodySmall" weight="bold" tone="dim">
          ·
        </Body>
        <Body size="bodySmall" weight="bold" tone={locale === 'en' ? 'text' : 'dim'}>
          EN
        </Body>
      </GlassSurface>
    </Tap>
  );
}

const useStyles = makeStyles((t) => ({
  head: { gap: space[2] },
  logo: { marginBottom: space[2] },
  block: { marginTop: space[6] },
  section: { marginTop: space[8] },
  ctaBody: { marginTop: space[2], marginBottom: space[5] },
  ctaSecond: { marginTop: space[3] },
  carousel: { marginHorizontal: -GUTTER },
  carouselContent: { paddingHorizontal: GUTTER, gap: space[3] },
  club: { height: 230, borderRadius: radius.card, justifyContent: 'space-between' },
  clubTop: { padding: space[4], alignItems: 'flex-start' },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(8,8,8,0.45)' },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  clubBottom: { padding: space[4], gap: 2 },
  disc: { height: 220, borderRadius: radius.card, justifyContent: 'flex-end' },
  portrait: { height: 250, borderRadius: radius.card, justifyContent: 'flex-end' },
  cardBottom: { padding: space[4], gap: 3 },
  listCard: { paddingHorizontal: space[5], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  fight: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  lang: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 },
}));
