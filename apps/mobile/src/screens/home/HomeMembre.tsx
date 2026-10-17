import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { clubById, estOuvert } from '@/data/clubs';
import { ageOf, INVOICES } from '@/data/member';
import { NEWS } from '@/data/news';
import { auClub, heure, nextSession } from '@/features/planning/model';
import { computeStats } from '@/features/stats/model';
import { dateLine, formatIn, isoWeek } from '@/features/time';
import { useSession } from '@/state/session';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Body, Display, Mono } from '@/ui/Text';
import { duration, ink, radius, space, stroke } from '@/ui/theme';

import { ClubChips, LedgerRow, NewsRow, StatsFigure, TokenCard, type Entry } from './parts';

/**
 * L’accueil de l’adhérent : le coin entre deux rounds et le carnet, fondus.
 * Le temps en rouge (ce qui compte à rebours), tes chiffres en blanc, le passé
 * en gris. Tout suit le club actif, que l’adhérent choisit.
 */
export function HomeMembre() {
  const member = useSession((s) => s.member);
  const clubsChoisis = useSession((s) => s.clubsChoisis);
  const clubActif = useSession((s) => s.clubActif);
  const setClubActif = useSession((s) => s.setClubActif);
  const club = clubById(clubActif);
  const now = new Date();
  const next = nextSession(clubActif, now, ageOf(member, now));
  const stats = computeStats(member, now);
  const topClub = stats.parClub[0] ? clubById(stats.parClub[0].club) : club;
  const ouvert = estOuvert(club, now);
  const entries: Entry[] = [
    ...member.passages.map((p) => ({ kind: 'passage' as const, date: p.date, club: p.club, heure: p.heure })),
    ...INVOICES.filter((f) => f.origine === 'Deciplus').map((f) => ({ kind: 'facture' as const, date: f.date, numero: f.numero, montant: f.montant, origine: f.origine })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 4);

  return (
    <Page padded={false}>
      <Animated.View entering={FadeIn.duration(duration.jab)} style={styles.head}>
        <Mono size="micro">
          {dateLine(now)} · SEMAINE {isoWeek(now)}
        </Mono>
        <Display size="display3">Salut {member.prenom}</Display>
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

      <Animated.View entering={FadeIn.duration(duration.jab).delay(83)} style={styles.chipsWrap}>
        <Mono size="micro" style={styles.chipsLabel}>
          TES CLUBS
        </Mono>
        <ClubChips clubs={clubsChoisis} actif={clubActif} onPick={setClubActif} onMore={() => router.push('/moi')} />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(duration.jab).delay(166)}>
        <Photo source={club.photo} style={styles.plate} darken={0.45} scrim={0.72} scrimTop={0.25}>
          <View style={styles.plateTop}>
            <Mono size="micro" tone="text">
              {String(clubsChoisis.indexOf(clubActif) + 1).padStart(2, '0')} — {clubActif === member.clubPrincipal ? 'TON CLUB' : 'TES CLUBS'}
            </Mono>
            <Mono size="micro" tone={ouvert ? 'text' : 'muted'}>
              {ouvert ? `OUVERT · JUSQU’À ${heure(club.ouverture.fin).toUpperCase()}` : 'FERMÉ'}
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

      <Animated.View entering={FadeIn.duration(duration.jab).delay(249)} style={styles.tokenWrap}>
        <TokenCard clubCourt={club.court} />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(duration.jab).delay(332)} style={styles.section}>
        <View style={styles.hero}>
          <Display size="display1" tabular tight>
            {stats.mois}
          </Display>
          <View style={styles.heroText}>
            <Body size="title" weight="semi">
              {stats.mois > 1 ? 'séances' : 'séance'} en {stats.moisLabel}
            </Body>
            <Body size="bodySmall" tone="muted">
              {stats.total} depuis la rentrée · {stats.moyenneParSemaine} par semaine
            </Body>
          </View>
        </View>
        <StatsFigure stats={stats} />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(duration.jab).delay(415)} style={styles.section}>
        <View style={styles.sectionHead}>
          <Mono size="micro">TON CARNET</Mono>
          <Mono size="micro">LE LECTEUR DE LA PORTE L’ÉCRIT</Mono>
        </View>
        {entries.map((e, i) => (
          <LedgerRow key={`${e.kind}-${e.date}-${i}`} entry={e} index={i} numero={member.passages.length + 4 - i} latest={i === 0} />
        ))}
      </Animated.View>

      <Animated.View entering={FadeIn.duration(duration.jab).delay(498)} style={styles.section}>
        <View style={styles.sectionHead}>
          <Mono size="micro">ACTUALITÉS</Mono>
          <Mono size="micro">{NEWS.length} ENTRÉES</Mono>
        </View>
        {NEWS.map((n, i) => (
          <NewsRow key={n.id} item={n} index={i} total={NEWS.length} now={now} />
        ))}
      </Animated.View>
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space[4], gap: space[2], marginBottom: space[4] },
  chipsWrap: { gap: space[2], marginBottom: space[3] },
  chipsLabel: { paddingHorizontal: space[4] },
  plate: { marginHorizontal: space[4], height: 360, borderRadius: radius.sm, justifyContent: 'space-between' },
  plateTop: { flexDirection: 'row', justifyContent: 'space-between', padding: space[4] },
  plateBottom: { padding: space[4], gap: space[2] },
  next: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3], marginTop: space[1] },
  nextHour: { marginBottom: -4 },
  nextText: { flex: 1, gap: 2, paddingBottom: 4 },
  tokenWrap: { marginTop: space[4] },
  section: { paddingHorizontal: space[4], marginTop: space[6] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3], marginBottom: space[3] },
  heroText: { paddingBottom: 6, gap: 2, flex: 1 },
});
