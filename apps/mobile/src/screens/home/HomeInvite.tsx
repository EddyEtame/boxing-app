import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { CLUBS } from '@/data/clubs';
import { PERSONNES } from '@/data/coachs';
import { DISCIPLINES } from '@/data/disciplines';
import { useCombats } from '@/features/combats/useCombats';
import { ouvertMaintenant } from '@/features/planning/live';
import { clubsProposant, heure, useLivePlanning } from '@/features/planning/model';
import { shortDay } from '@/features/time';
import { ouvrirOffres } from '@/features/offres';
import { useInLocale, useLocale, useT } from '@/i18n';
import { lireMe } from '@/lib/api';
import { selectAcces, useSession } from '@/state/session';
import { Anneau } from '@/ui/Etincelles';
import { IconChevron } from '@/ui/icons';
import { Button, Card, Section } from '@/ui/kit';
import { Logo } from '@/ui/Logo';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Heading } from '@/ui/Text';
import { GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stroke, useTheme } from '@/ui/theme';

import { ActionsDecouverte } from '../common/ActionsDecouverte';
import { LangPill } from '../common/LangPill';
import { CarouselHead, Poster } from './parts';

const SONDE_MS = 5_000;
const ATTENTE_MS = 3 * 60 * 1000;
/** BOXING CENTER écrit sur le tapis : l'affiche de l'invitation à s'abonner. */
const AFFICHE = require('@/assets/photos/ring-gants.jpg');

/**
 * L'accueil sans abonnement actif : la découverte (CDC §3A, outil commercial). Le
 * choix de la langue est en haut à droite, visible ; l'invitation à s'abonner juste
 * après le titre ; puis les salles, les disciplines, les visages, l'actualité.
 */
export function HomeInvite() {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const col = Math.min(width, MAX_CONTENT_WIDTH) - GUTTER * 2;
  const derniersCombats = useCombats().items.slice(0, 3);
  const [clubIndex, setClubIndex] = useState(0);
  const loc = useInLocale();
  const plateW = Math.round(col * 0.82);
  const discW = Math.round(col * 0.56);
  const portraitW = Math.round(col * 0.5);
  const portraits = PERSONNES.filter((p) => p.photo).slice(0, 10);
  const live = useLivePlanning();
  const maintenant = new Date();

  return (
    <Page trailing={<LangPill />}>
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
        <CarteAcces />
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
            const etat = ouvertMaintenant(c, maintenant, live);
            return (
              <Tap key={c.id} style={{ width: plateW }} onPress={() => router.navigate('/planning')} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={c.nom}>
                <Photo source={c.photo} style={s.club} darken={0.38} scrim={0.72}>
                  <View style={s.clubTop}>
                    <View style={s.openPill}>
                      <View style={[s.openDot, { backgroundColor: etat.ouvert ? '#3DDC84' : 'rgba(245,245,245,0.55)' }]} />
                      <Body size="caption" weight="bold">
                        {etat.ouvert ? T('home.openUntil', { h: heure(etat.jusqua ?? c.ouverture.fin) }) : T('home.closed')}
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
            {derniersCombats.map((c, i) => (
              <Tap key={c.id} onPress={() => router.push('/combats')} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={c.titre} style={[s.fight, i < derniersCombats.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Body weight="bold" numberOfLines={2}>
                    {c.titre}
                  </Body>
                  <Body size="caption" weight="semi" tone="dim">
                    {c.date ? shortDay(c.date, lang) : ''} · {c.source}
                    {lang === 'en' && !c.duClub ? ` · ${T('fights.inFrench')}` : ''}
                  </Body>
                </View>
                <IconChevron size={18} color={t.textDim} />
              </Tap>
            ))}
          </Card>
        </Section>
      </Reveal>

    </Page>
  );
}

/**
 * La carte sous le titre : où en est le compte, et le chemin vers l'abonnement
 * (Eddy, 30/10/2026 : sans abonnement, on visite l'app et on est invité à s'abonner).
 */
function CarteAcces() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const me = useSession((st) => st.me);
  const applyMe = useSession((st) => st.applyMe);
  const declare = useSession((st) => st.abonnementDeclare);
  const clubActif = useSession((st) => st.clubActif);
  const acces = useSession(selectAcces);
  const lien = me?.link.status;
  const enAttente = lien === 'en_attente';
  const { width } = useWindowDimensions();
  const col = Math.min(width, MAX_CONTENT_WIDTH) - GUTTER * 2;
  const [long, setLong] = useState(false);
  const depuis = enAttente ? me?.link.updatedAt : undefined;

  // Trois minutes sans réponse : le robot a pu échouer, la carte le dit et propose de relancer.
  useEffect(() => {
    if (!depuis) return undefined;
    const minuteur = setTimeout(() => setLong(true), Math.max(0, ATTENTE_MS - (Date.now() - Date.parse(depuis))));
    return () => clearTimeout(minuteur);
  }, [depuis]);

  // Le robot répond en quelques minutes : l'espace adhérent s'ouvre tout seul dès que la fiche est trouvée.
  useEffect(() => {
    if (!enAttente) return undefined;
    const debut = Date.now();
    const sonde = setInterval(() => {
      if (Date.now() - debut >= ATTENTE_MS) clearInterval(sonde);
      else void lireMe().then(applyMe).catch(() => undefined);
    }, SONDE_MS);
    return () => clearInterval(sonde);
  }, [enAttente, applyMe]);

  if (me?.consentementParentalRequis) {
    return (
      <Card>
        <Body tone="muted">{T('auth.parental')}</Body>
      </Card>
    );
  }
  if (acces === 'ancien') {
    return (
      <View style={s.invitation}>
        <Poster
          index={0}
          height={Math.round(col * 0.92)}
          photo={AFFICHE}
          cornerLeft={T('guest.offer')}
          cornerRight={T('guest.shop')}
          title={T('guest.renewTitle')}
          sub={T('guest.renewBody')}
          meta={T('guest.promptMeta')}
          onPress={() => ouvrirOffres(clubActif, 'home')}
        />
        <Button label={T('messages.renew')} onPress={() => ouvrirOffres(clubActif, 'home')} />
      </View>
    );
  }
  if (acces === 'verification') {
    return (
      <Card>
        <View style={s.checkingTete}>
          <Heading level="section" style={s.checkingTitre}>
            {T('guest.checkingTitle')}
          </Heading>
          <Anneau couleur={t.accent} fond={t.line} />
        </View>
        <Body tone="muted" style={s.checkingBody}>
          {lien === 'a_revoir' ? T('auth.resultReview') : long && enAttente ? T('guest.checkingLong') : T('guest.checkingBody')}
        </Body>
        {long && enAttente ? (
          <View style={s.checkingActions}>
            <ActionsDecouverte from="home" />
          </View>
        ) : null}
      </Card>
    );
  }
  if (lien === 'prospect' && declare === true) {
    return (
      <Card>
        <Heading level="section">{T('guest.notFoundTitle')}</Heading>
        <Body tone="muted" style={s.ctaBody}>
          {T('auth.resultNotFound')}
        </Body>
        <ActionsDecouverte from="home" />
      </Card>
    );
  }
  return (
    <View style={s.invitation}>
      <Poster
        index={0}
        height={Math.round(col * 0.92)}
        photo={AFFICHE}
        cornerLeft={T('guest.offer')}
        cornerRight={T('guest.shop')}
        title={T('guest.promptTitle')}
        sub={T('guest.promptBody')}
        meta={T('guest.promptMeta')}
        onPress={() => ouvrirOffres(clubActif, 'home')}
      />
      <ActionsDecouverte from="home" />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  head: { gap: space[2] },
  logo: { marginBottom: space[2] },
  block: { marginTop: space[6] },
  section: { marginTop: space[8] },
  ctaBody: { marginTop: space[2], marginBottom: space[5] },
  checkingTete: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  checkingTitre: { flex: 1 },
  checkingBody: { marginTop: space[2] },
  checkingActions: { marginTop: space[4] },
  invitation: { gap: space[4] },
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
}));
