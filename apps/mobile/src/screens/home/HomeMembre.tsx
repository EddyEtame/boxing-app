import { ageAt } from '@bc/contract';
import { router } from 'expo-router';
import { View } from 'react-native';

import { CLUBS, clubById, estOuvert } from '@/data/clubs';
import { PERSONNES } from '@/data/coachs';
import { auClub, jourFr, nextFavorite, nextSession, normaliseActivite, slotsFor, usePlanningSlots } from '@/features/planning/model';
import { useStats } from '@/features/stats/model';
import { fullDay, monthName } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { useUsage } from '@/state/usage';
import { IconBadge, IconBell, IconCard, IconChart, IconChevron, IconPlanning } from '@/ui/icons';
import { Card, Section } from '@/ui/kit';
import { HorsLigne } from '@/ui/Offline';
import { Page, Reveal, RoundButton } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Display } from '@/ui/Text';
import { makeStyles, space, useTheme } from '@/ui/theme';

import { ClubChips, Faces, NextSessionCard, QuickTile } from './parts';

/**
 * L'accueil de l'adherent : bonjour, la prochaine seance, les tuiles
 * (badge, planning, stats, abonnement) et les coachs du club actif.
 */
export function HomeMembre() {
  const me = useSession((st) => st.me);
  if (!me) return <HorsLigne />;
  return <Corps />;
}

function Corps() {
  const T = useT();
  usePlanningSlots();
  const lang = useLocale();
  const t = useTheme();
  const s = useStyles();
  const me = useSession((st) => st.me);
  const clubsChoisis = useSession((st) => st.clubsChoisis);
  const clubActif = useSession((st) => st.clubActif);
  const setClubActif = useSession((st) => st.setClubActif);
  const favorites = useUsage((st) => st.favorites);
  const stats = useStats();
  if (!me) return null;
  const now = new Date();
  const club = clubById(clubActif);
  const age = ageAt(me.dateNaissance, now);
  const fav = nextFavorite(favorites, now);
  const next = fav && fav.dansMinutes <= 7 * 24 * 60 ? fav : nextSession(clubActif, now, age);
  const nextClub = next ? clubById(next.slot.club) : club;
  const topClub = stats.byClub[0] ? clubById(stats.byClub[0].club) : club;
  const ouvert = estOuvert(club, now);
  const coursToday = slotsFor(clubActif, jourFr(now)).filter((sl) => normaliseActivite(sl.activite).famille !== 'accesLibre').length;
  const snap = me.snapshot;
  const coachs = PERSONNES.filter((p) => p.type === 'coach' && p.clubs.includes(clubActif));
  const initiale = `${me.prenom[0] ?? ''}${me.nom[0] ?? ''}`;
  const sousAbonnement = !snap ? T('home.tileSubUnknown') : snap.abonnementActif ? T('home.tileSubActive') : snap.abonnementEnAttente ? T('home.tileSubPending') : T('home.tileSubOff');

  return (
    <Page
      trailing={
        <>
          <RoundButton label={T('home.alerts')} onPress={() => router.push('/alertes')} badge>
            <IconBell size={21} />
          </RoundButton>
          <Tap onPress={() => router.navigate('/plus')} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={T('tabs.plus')}>
            <View style={[s.avatar, { backgroundColor: t.primary }]}>
              <Body weight="black" tone="onPrimary">
                {initiale}
              </Body>
            </View>
          </Tap>
        </>
      }>
      <Reveal style={s.head}>
        <Body size="bodySmall" weight="semi" tone="muted">
          {fullDay(now, lang)}
        </Body>
        <Display size="display3" tight>
          {T('home.hello', { prenom: me.prenom })}
        </Display>
        {me.consentementParentalRequis ? (
          <Body size="bodySmall" tone="muted">
            {T('plus.parental')}
          </Body>
        ) : null}
        {stats.week > 0 ? (
          <Body size="title" weight="medium" tone="muted" style={s.phrase}>
            <Body size="title" weight="black" tabular>
              {T('home.sessionsWeek', { n: stats.week })}
            </Body>
            {T('home.thisWeekMostly')}
            <Body size="title" weight="black">
              {lang === 'en' ? topClub.court : auClub(topClub.id, topClub.court)}
            </Body>
            .
          </Body>
        ) : (
          <Body size="title" weight="medium" tone="muted" style={s.phrase}>
            <Body size="title" weight="black" tabular>
              {T('home.sessionsWeek', { n: 0 })}
            </Body>
            {T('home.thisWeekEnd')}
          </Body>
        )}
      </Reveal>

      {clubsChoisis.length > 1 ? (
        <Reveal delay={60} style={s.block}>
          <ClubChips clubs={clubsChoisis.map((id) => CLUBS.find((c) => c.id === id)!)} actif={clubActif} onPick={setClubActif} label={T('home.myClubs')} />
        </Reveal>
      ) : null}

      <Reveal delay={120} style={s.block}>
        <NextSessionCard club={nextClub} next={next} ouvert={nextClub.id === club.id ? ouvert : estOuvert(nextClub, now)} onPress={() => router.navigate('/planning')} />
      </Reveal>

      <Reveal delay={180} style={s.tiles}>
        <QuickTile index={0} icon={IconBadge} tone="accent" title={T('home.tileBadge')} sub={snap?.badgeEnregistre ? T('home.tileBadgeOn') : T('home.tileBadgeOff')} subTone={snap?.badgeEnregistre ? 'accent' : 'muted'} onPress={() => router.navigate('/badge')} />
        <QuickTile index={1} icon={IconPlanning} title={T('home.tilePlanning')} sub={coursToday ? T('home.tilePlanningToday', { n: coursToday, club: club.court }) : T('home.tilePlanningNone', { club: club.court })} onPress={() => router.navigate('/planning')} />
        <QuickTile index={2} icon={IconChart} title={T('home.tileStats')} sub={T('home.tileStatsSub', { n: stats.month, mois: monthName(now, lang) })} onPress={() => router.navigate('/stats')} />
        <QuickTile index={3} icon={IconCard} tone={snap?.abonnementActif ? 'positive' : 'accent'} title={T('home.tileSub')} sub={sousAbonnement} subTone={snap?.abonnementActif ? 'positive' : 'muted'} onPress={() => router.navigate('/abonnement')} />
      </Reveal>

      {coachs.length ? (
        <Reveal>
          <Section title={T('home.coaches', { club: lang === 'en' ? club.court : auClub(club.id, club.court) })}>
            <Card onPress={() => router.push('/equipe')} accessibilityLabel={T('sections.team')}>
              <View style={s.coachRow}>
                <Faces people={coachs} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="bold" numberOfLines={2}>
                    {coachs.map((p) => p.nom).join(', ')}
                  </Body>
                  <Body size="caption" tone="muted">
                    {T('home.coachesSub')}
                  </Body>
                </View>
                <IconChevron size={18} color={t.textDim} />
              </View>
            </Card>
          </Section>
        </Reveal>
      ) : null}
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  head: { gap: space[1] },
  phrase: { marginTop: space[2] },
  block: { marginTop: space[6] },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space[3], marginTop: space[3] },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
}));
