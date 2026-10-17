import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { ageOf } from '@/data/member';
import { NEWS } from '@/data/news';
import { formatClock, useBadgeClock } from '@/features/badge/clock';
import { auClub, heure, nextSession } from '@/features/planning/model';
import { computeStats } from '@/features/stats/model';
import { dateLine, dateLineFromIso, daysUntil, formatIn, isoWeek } from '@/features/time';
import { useSession } from '@/state/session';
import { LifeLine } from '@/ui/LifeLine';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

/**
 * Direction A — « Le Coin » : le temps est l’ossature.
 * Tout ce qui compte à rebours est rouge ; le reste est blanc (maintenant) ou gris (passé).
 * Entrées en coupes, jamais en fondus.
 */
export function HomeA() {
  const member = useSession((s) => s.member);
  const club = clubById(member.clubPrincipal);
  const now = new Date();
  const next = nextSession(member.clubPrincipal, now, ageOf(member, now));
  const stats = computeStats(member, now);
  const secondsLeft = useBadgeClock((s) => s.secondsLeft);
  const windowSeconds = useBadgeClock((s) => s.windowSeconds);
  const topClub = stats.parClub[0] ? clubById(stats.parClub[0].club) : club;

  return (
    <Page padded={false}>
      <Animated.View entering={FadeIn.duration(duration.jab)} style={styles.head}>
        <Mono size="micro">
          {dateLine(now)} · SEMAINE {isoWeek(now)}
        </Mono>
        <Display size="display3" style={styles.greeting}>
          Salut {member.prenom}
        </Display>
        <Body tone="muted">Ton coin entre deux rounds : la prochaine séance, ton badge, les nouvelles.</Body>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(duration.jab).delay(83)}>
        <Photo source={club.photo} style={styles.plate} darken={0.45} scrim={0.72} scrimTop={0.25}>
          <View style={styles.plateTop}>
            <Mono size="micro" tone="text">
              01 — TON CLUB
            </Mono>
            <Mono size="micro" tone="text">
              {club.ville.toUpperCase()}
            </Mono>
          </View>
          <View style={styles.plateBottom}>
            <Display size="display4" tight>
              {club.court}
            </Display>
            {next ? (
              <View style={styles.next}>
                <Display size="display1" tabular upper={false} tight style={styles.nextHour}>
                  {heure(next.slot.debut)}
                </Display>
                <View style={styles.nextText}>
                  <Body weight="semi">{next.activite.libelle}</Body>
                  <Body size="caption" tone="muted">
                    {next.jourLabel}
                    {next.activite.public ? ` · ${next.activite.public}` : next.activite.niveau ? ` · ${next.activite.niveau}` : ''}
                    {' · '}
                    {next.slot.fin - next.slot.debut} min
                  </Body>
                  <Mono size="caption" tone="accent">
                    DANS {formatIn(next.dansMinutes).toUpperCase()}
                  </Mono>
                </View>
              </View>
            ) : (
              <Body tone="muted">Pas de cours à venir cette semaine dans ce club.</Body>
            )}
          </View>
        </Photo>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(duration.jab).delay(166)} style={styles.section}>
        <Body size="title" weight="medium" tone="muted">
          <Body size="title" weight="bold" tabular>
            {stats.semaine} {stats.semaine > 1 ? 'séances' : 'séance'}
          </Body>{' '}
          cette semaine,{' '}
          <Body size="title" weight="bold" tabular>
            {stats.mois}
          </Body>{' '}
          en {stats.moisLabel}, surtout{' '}
          <Body size="title" weight="bold">
            {auClub(topClub.id, topClub.court)}
          </Body>
          .
        </Body>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(duration.jab).delay(249)}>
        <Tap onPress={() => router.push('/badge')} style={styles.token} accessibilityRole="button" accessibilityLabel="Ouvrir mon badge">
          <View style={styles.tokenRow}>
            <View style={styles.tokenText}>
              <Mono size="micro">JETON D’ACCÈS · {club.court.toUpperCase()}</Mono>
              <Body size="bodySmall" tone="muted">
                Nouveau code à la cloche
              </Body>
            </View>
            <Display size="display4" tabular upper={false} tone="accent" tight>
              {formatClock(secondsLeft)}
            </Display>
          </View>
          <LifeLine secondsLeft={secondsLeft} windowSeconds={windowSeconds} height={2} />
        </Tap>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(duration.jab).delay(332)} style={styles.section}>
        <View style={styles.sectionHead}>
          <Mono size="micro">ACTUALITÉS</Mono>
          <Mono size="micro">{NEWS.length} ENTRÉES</Mono>
        </View>
        {NEWS.map((n, i) => {
          const d = daysUntil(n.date, now);
          const future = d > 0;
          return (
            <Tap key={n.id} style={[styles.news, i === 0 && styles.newsFirst]} accessibilityRole="button" accessibilityLabel={n.titre}>
              <View style={styles.newsIndex}>
                <Mono size="micro">Nº {String(NEWS.length - i).padStart(3, '0')}</Mono>
                <Mono size="micro" tone={future ? 'accent' : 'dim'}>
                  {future ? `DANS ${d} J` : dateLineFromIso(n.date)}
                </Mono>
              </View>
              <View style={styles.newsBody}>
                <Body weight="semi" numberOfLines={2}>
                  {n.titre}
                </Body>
                <Body size="caption" tone="muted" numberOfLines={2}>
                  {n.accroche}
                </Body>
              </View>
              <Photo source={n.photo} style={styles.newsThumb} darken={0.2} scrim={0} vignette={false} grain={false} />
            </Tap>
          );
        })}
      </Animated.View>
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space[4], gap: space[2], marginBottom: space[4] },
  greeting: { marginTop: space[1] },
  plate: { marginHorizontal: space[4], height: 360, borderRadius: radius.sm, justifyContent: 'space-between' },
  plateTop: { flexDirection: 'row', justifyContent: 'space-between', padding: space[4] },
  plateBottom: { padding: space[4], gap: space[2] },
  next: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3], marginTop: space[1] },
  nextHour: { marginBottom: -4 },
  nextText: { flex: 1, gap: 2, paddingBottom: 4 },
  section: { paddingHorizontal: space[4], marginTop: space[6] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  token: { marginHorizontal: space[4], marginTop: space[6], backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: whiteAlpha[6], overflow: 'hidden' },
  tokenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4], gap: space[3] },
  tokenText: { flex: 1, gap: 2 },
  news: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  newsFirst: {},
  newsIndex: { width: 64, gap: 2 },
  newsBody: { flex: 1, gap: 2 },
  newsThumb: { width: 64, height: 64, borderRadius: radius.xs },
  _unused: { color: color.text },
});
