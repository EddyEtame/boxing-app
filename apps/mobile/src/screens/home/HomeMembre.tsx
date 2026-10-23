import { router } from 'expo-router';
import { View } from 'react-native';

import { CLUBS, clubById, estOuvert } from '@/data/clubs';
import { PERSONNES } from '@/data/coachs';
import { ageOf } from '@/data/member';
import { NEWS } from '@/data/news';
import { formatClock, useBadgeClock } from '@/features/badge/clock';
import { auClub, jourFr, nextFavorite, nextSession, normaliseActivite, slotsFor } from '@/features/planning/model';
import { useStats } from '@/features/stats/model';
import { clock, dayLabel, daysUntil, fullDay, monthName } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useMessages, useMessageText } from '@/state/messages';
import { useSession } from '@/state/session';
import { useUsage } from '@/state/usage';
import { IconBadge, IconBell, IconCard, IconChart, IconChevron, IconPlanning } from '@/ui/icons';
import { Card, Section } from '@/ui/kit';
import { Page, Reveal, RoundButton } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Display, Heading } from '@/ui/Text';
import { makeStyles, space, stroke, useTheme } from '@/ui/theme';

import { ClubChips, Faces, NewsRow, NextSessionCard, QuickTile } from './parts';

/**
 * L'accueil de l'adhérent (refonte du 20/10) : il respire. Bonjour, la
 * prochaine séance, quatre tuiles qui portent chacune un chiffre vrai, le
 * dernier mot du club, les coachs, les actualités. Le carnet et les
 * statistiques ont leur écran (Mes stats).
 */
export function HomeMembre() {
  const T = useT();
  const lang = useLocale();
  const t = useTheme();
  const s = useStyles();
  const member = useSession((st) => st.member);
  const clubsChoisis = useSession((st) => st.clubsChoisis);
  const clubActif = useSession((st) => st.clubActif);
  const setClubActif = useSession((st) => st.setClubActif);
  const threads = useMessages((st) => st.threads);
  const messageText = useMessageText();
  const secondsLeft = useBadgeClock((st) => st.secondsLeft);
  const now = new Date();
  const club = clubById(clubActif);
  const favorites = useUsage((st) => st.favorites);
  // Un cours suivi passe devant le prochain cours du club : l'app apprend ce qu'on aime.
  const fav = nextFavorite(favorites, now);
  const next = fav && fav.dansMinutes <= 7 * 24 * 60 ? fav : nextSession(clubActif, now, ageOf(member, now));
  const nextClub = next ? clubById(next.slot.club) : club;
  const stats = useStats();
  const topClub = stats.byClub[0] ? clubById(stats.byClub[0].club) : club;
  const ouvert = estOuvert(club, now);
  const coursToday = slotsFor(clubActif, jourFr(now)).filter((sl) => normaliseActivite(sl.activite).famille !== 'accesLibre').length;
  const jours = member.abonnement.prochainPrelevement ? daysUntil(member.abonnement.prochainPrelevement, now) : null;
  const actif = member.statut === 'actif';
  const coachs = PERSONNES.filter((p) => p.type === 'coach' && p.clubs.includes(clubActif));
  const unreadThread = threads.find((th) => th.unread > 0) ?? threads[0];
  const lastMsg = unreadThread.messages[unreadThread.messages.length - 1];

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
                {member.prenom[0]}
                {member.nom[0]}
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
          {T('home.hello', { prenom: member.prenom })}
        </Display>
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
        <QuickTile
          index={0}
          icon={IconBadge}
          tone="accent"
          title={T('home.tileBadge')}
          sub={actif && member.badge.enregistre ? T('home.tileBadgeLive', { t: formatClock(secondsLeft) }) : T('home.tileBadgeOff')}
          subTone={actif && member.badge.enregistre ? 'accent' : 'muted'}
          live={actif && member.badge.enregistre}
          onPress={() => router.navigate('/badge')}
        />
        <QuickTile index={1} icon={IconPlanning} title={T('home.tilePlanning')} sub={coursToday ? T('home.tilePlanningToday', { n: coursToday, club: club.court }) : T('home.tilePlanningNone', { club: club.court })} onPress={() => router.navigate('/planning')} />
        <QuickTile index={2} icon={IconChart} title={T('home.tileStats')} sub={T('home.tileStatsSub', { n: stats.month, mois: monthName(now, lang) })} onPress={() => router.navigate('/stats')} />
        <QuickTile
          index={3}
          icon={IconCard}
          tone={member.abonnement.impaye > 0 ? 'accent' : 'positive'}
          title={T('home.tileSub')}
          sub={member.abonnement.impaye > 0 ? T('home.tileSubUnpaid') : jours !== null ? T('home.tileSubOk', { n: jours }) : T('home.tileSubOkNoDate')}
          subTone={member.abonnement.impaye > 0 ? 'negative' : 'positive'}
          onPress={() => router.navigate('/abonnement')}
        />
      </Reveal>

      <Reveal>
        <Section title={T('home.fromClub')} action={{ label: T('common.seeAll'), onPress: () => router.navigate('/messages') }}>
          <Card padded={false} onPress={() => router.push(`/fil/${unreadThread.id}`)} accessibilityLabel={unreadThread.title}>
            <View style={s.msg}>
              <View style={[s.msgDot, { backgroundColor: unreadThread.unread ? t.accent : 'transparent' }]} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={s.msgHead}>
                  <Heading level="card" numberOfLines={1} style={{ flex: 1 }}>
                    {unreadThread.title}
                  </Heading>
                  <Body size="caption" tone="dim">
                    {dayLabel(lastMsg.at, now, lang)} · {clock(lastMsg.at)}
                  </Body>
                </View>
                <Body size="bodySmall" tone="muted" numberOfLines={2}>
                  {messageText(lastMsg)}
                </Body>
              </View>
              <IconChevron size={18} color={t.textDim} />
            </View>
          </Card>
        </Section>
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

      <Reveal>
        <Section title={T('home.news')} action={{ label: T('common.seeAll'), onPress: () => router.navigate('/actualites') }}>
          <Card padded={false} style={s.listCard}>
            {NEWS.slice(0, 3).map((n, i, arr) => (
              <NewsRow key={n.id} item={n} last={i === arr.length - 1} onPress={() => router.navigate('/actualites')} />
            ))}
          </Card>
        </Section>
      </Reveal>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  head: { gap: space[1] },
  phrase: { marginTop: space[2] },
  block: { marginTop: space[6] },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space[3], marginTop: space[3] },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  msg: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[5] },
  msgDot: { width: 10, height: 10, borderRadius: 5 },
  msgHead: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  listCard: { paddingHorizontal: space[5], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
}));

