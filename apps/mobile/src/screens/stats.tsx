import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { useStats } from '@/features/stats/model';
import { monthName, shortDay } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { Card, Section } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { ProgressRing } from '@/ui/ProgressRing';
import { Body, Heading, Mono } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

import { CountUp, MembersOnly } from './common/MembersOnly';
import { CLUB_HUE, Stamp, WeekBars } from './home/parts';

const ARRIVE = Easing.bezier(0.32, 0.72, 0, 1);

/**
 * Mes stats (CDC §6) : un anneau qui se remplit (les semaines actives sur
 * huit), le nombre du mois qui compte jusqu'à sa valeur, les semaines, les
 * clubs, le carnet. Aucune flamme, aucun score inventé : des passages lus.
 */
export function Screen() {
  const T = useT();
  const statut = useSession((s) => s.member.statut);
  if (statut === 'invite') {
    return (
      <Page title={T('stats.title')}>
        <MembersOnly title={T('stats.lockedTitle')} body={T('stats.lockedBody')} />
      </Page>
    );
  }
  return <StatsBody />;
}

function StatsBody() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const member = useSession((st) => st.member);
  const now = new Date();
  const stats = useStats();
  const actives = stats.activeWeeks;
  const maxClub = Math.max(1, ...stats.byClub.map((c) => c.count));

  return (
    <Page title={T('stats.title')} subtitle={`${monthName(now, lang)} ${now.getFullYear()}`}>
      <Reveal>
        <Card style={s.hero}>
          <ProgressRing size={196} stroke={12} progress={actives / stats.weeks.length}>
            <CountUp value={stats.month} size="display1" tight upper={false} tone="text" />
            <Body size="bodySmall" weight="semi" tone="muted">
              {T('stats.sessionsIn', { n: stats.month, mois: monthName(now, lang) })}
            </Body>
          </ProgressRing>
          <Body weight="bold" style={s.heroLine}>
            {T('stats.activeWeeks', { n: actives, total: stats.weeks.length })}
          </Body>
          <Body size="bodySmall" tone="muted" style={s.heroSub}>
            {T('stats.mostly', { club: clubById(stats.byClub[0]?.club ?? member.clubPrincipal).court })}
          </Body>
        </Card>
      </Reveal>

      <Reveal delay={80} style={s.kpis}>
        <Kpi value={stats.total} label={T('stats.total')} />
        <Kpi value={stats.avgPerWeek} label={T('stats.perWeek')} />
        <Kpi value={stats.week} label={T('stats.thisWeek')} />
      </Reveal>

      <Reveal>
        <Section title={T('stats.weeks')}>
          <Card>
            <WeekBars stats={stats} weekLabel={(start) => T('stats.weekOf', { date: shortDay(start, lang) })} />
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('stats.byClub')}>
          <Card>
            {stats.byClub.map((c, i) => (
              <ClubBar key={c.club} club={c.club} value={c.count} max={maxClub} index={i} last={i === stats.byClub.length - 1} />
            ))}
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('stats.logbook')} note={T('stats.logbookNote')}>
          <Card padded={false} style={s.list}>
            {stats.recent.slice(0, 6).map((p, i, arr) => (
              <View key={p.date + p.heure} style={[s.entry, i < arr.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
                <Mono size="caption" tone="dim" style={s.entryNo}>
                  {String(stats.total - i).padStart(3, '0')}
                </Mono>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="bold">
                    {clubById(p.club).court} · {p.heure}
                  </Body>
                  <Body size="caption" tone="muted">
                    {shortDay(p.date, lang)}
                  </Body>
                </View>
                <Stamp label={T('stats.present')} ink={i === 0} delay={i === 0 ? 400 : 0} />
              </View>
            ))}
          </Card>
        </Section>
      </Reveal>
    </Page>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  const s = useStyles();
  return (
    <View style={s.kpi}>
      <CountUp value={value} size="display4" tight upper={false} />
      <Body size="caption" weight="semi" tone="muted" style={s.kpiLabel}>
        {label}
      </Body>
    </View>
  );
}

function ClubBar({ club, value, max, index, last }: { club: Parameters<typeof clubById>[0]; value: number; max: number; index: number; last: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(120 + index * 83, withTiming(value / max, { duration: 900, easing: ARRIVE }));
  }, [value, max, index, w]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(4, w.value * 100)}%` }));
  return (
    <View style={[s.club, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
      <View style={[s.clubDot, { backgroundColor: CLUB_HUE[club] }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <Heading level="card">{clubById(club).court}</Heading>
        <View style={[s.track, { backgroundColor: t.chip }]}>
          <Animated.View style={[s.fill, { backgroundColor: CLUB_HUE[club] }, style]} />
        </View>
      </View>
      <Body weight="black" tabular style={s.clubCount}>
        {value}
      </Body>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { alignItems: 'center', paddingVertical: space[7] },
  heroLine: { marginTop: space[5], textAlign: 'center' },
  heroSub: { marginTop: 2, textAlign: 'center' },
  kpis: { flexDirection: 'row', gap: space[3], marginTop: space[3] },
  kpi: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space[4],
    paddingHorizontal: space[2],
    borderRadius: radius.card - 4,
    backgroundColor: t.card,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : { borderWidth: stroke.hair, borderColor: t.line }),
  },
  kpiLabel: { textAlign: 'center' },
  club: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  clubDot: { width: 10, height: 10, borderRadius: 5 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  clubCount: { minWidth: 28, textAlign: 'right' },
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64, paddingVertical: space[3] },
  entryNo: { width: 34 },
}));

