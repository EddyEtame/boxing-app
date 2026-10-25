import type { Moment } from '@bc/contract';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { track } from '@/features/analytics';
import { shareText } from '@/features/planning/share';
import { useStats } from '@/features/stats/model';
import { auClub } from '@/features/planning/model';
import { longDate, monthName, monthShort, shortDay, WEEKDAYS, WEEKDAYS_SHORT } from '@/features/time';
import { useLocale, useT, type MessageKey } from '@/i18n';
import { selectStatut, useSession } from '@/state/session';
import { HorsLigne } from '@/ui/Offline';
import { useUsage } from '@/state/usage';
import { IconShare } from '@/ui/icons';
import { Button, Card, Chip, Section } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { ProgressRing } from '@/ui/ProgressRing';
import { Tap } from '@/ui/Tap';
import { Body, Heading, Mono } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme, type ClubId } from '@/ui/theme';

import { CountUp, MembersOnly } from './common/MembersOnly';
import { CLUB_HUE, Stamp, WeekBars } from './home/parts';

const ARRIVE = Easing.bezier(0.32, 0.72, 0, 1);
const MOMENT_KEY: Record<Moment, MessageKey> = { matin: 'stats.moments.matin', midi: 'stats.moments.midi', apresMidi: 'stats.moments.apresMidi', soir: 'stats.moments.soir' };

/**
 * Mes stats (CDC §6), repris le 22/10/2026 : un objectif hebdomadaire que
 * l'adhérent choisit, l'anneau qui le mesure, la série de semaines réussies,
 * la carte de régularité (un carré par jour), les semaines, le rythme, les
 * clubs, le carnet. Tout vient des passages lus ; rien n'est inventé.
 */
export function Screen() {
  const T = useT();
  const auth = useSession((s) => s.auth);
  const me = useSession((s) => s.me);
  const statut = useSession(selectStatut);
  if (auth === 'connecte' && !me) return <HorsLigne />;
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
  const clubActif = useSession((st) => st.clubActif);
  const me = useSession((st) => st.me);
  const goal = useUsage((st) => st.weeklyGoal);
  const setGoal = useUsage((st) => st.setGoal);
  const now = new Date();
  const stats = useStats({ weeks: 8, heatWeeks: 15 });
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const delta = stats.month - stats.monthPrev;
  const topClub = clubById(stats.byClub[0]?.club ?? me?.clubPrincipal ?? clubActif);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    track('stats_view', { value: goal });
  }, [goal]);

  const share = async () => {
    const text = T('stats.shareText', { n: stats.month, mois: monthName(now, lang), avg: stats.avgPerWeek, club: topClub.court });
    const ok = await shareText(text, T('stats.title'));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <Page title={T('stats.title')} subtitle={`${monthName(now, lang)} ${now.getFullYear()}`}>
      <Reveal>
        <Card style={s.hero}>
          <ProgressRing size={196} stroke={12} progress={Math.min(1, stats.week / goal)}>
            <CountUp value={stats.week} size="display1" tight upper={false} tone={stats.week >= goal ? 'positive' : 'text'} />
            <Body size="bodySmall" weight="semi" tone="muted">
              {T('stats.goalOf', { goal })}
            </Body>
          </ProgressRing>
          <Body weight="bold" style={s.heroLine}>
            {stats.streak > 0 ? T('stats.streak', { n: stats.streak }) : T('stats.streakZero')}
          </Body>
          <Body size="bodySmall" tone="muted" style={s.heroSub}>
            {stats.total === 0
              ? T('stats.empty')
              : `${stats.bestStreak > 1 ? `${T('stats.best', { n: stats.bestStreak })} · ` : ''}${T('stats.mostly', { club: lang === 'en' ? topClub.court : auClub(topClub.id, topClub.court) })}`}
          </Body>
          <View style={s.goalRow}>
            <Body size="caption" weight="bold" eyebrow tone="muted">
              {T('stats.goalPick')}
            </Body>
            <View style={s.goalChips}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Chip
                  key={n}
                  label={String(n)}
                  selected={n === goal}
                  onPress={() => {
                    setGoal(n);
                    track('stats_goal', { value: n });
                  }}
                  style={s.goalChip}
                />
              ))}
            </View>
          </View>
        </Card>
      </Reveal>

      <Reveal delay={80} style={s.kpis}>
        <Kpi value={stats.month} label={monthName(now, lang)} sub={stats.monthPrev || stats.month ? T('stats.vsPrev', { delta: `${delta > 0 ? '+' : ''}${delta}`, mois: monthShort(prevMonth, lang) }) : undefined} tone={delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'muted'} />
        <Kpi value={stats.avgPerWeek} label={T('stats.perWeek')} />
        <Kpi value={stats.total} label={T('stats.total')} />
      </Reveal>

      <Reveal>
        <Section title={T('stats.heat')} note={T('stats.heatNote')}>
          <Card>
            <Heatmap stats={stats} />
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('stats.weeks')} note={T('stats.weeksNote', { goal })}>
          <Card>
            <WeekBars stats={stats} goal={goal} weekLabel={(start) => T('stats.weekOf', { date: shortDay(start, lang) })} />
          </Card>
        </Section>
      </Reveal>

      {stats.topMoment && stats.topDay !== null ? (
        <Reveal>
          <Section title={T('stats.rhythm')}>
            <Card>
              <Heading level="card">{T('stats.rhythmLine', { moment: T(MOMENT_KEY[stats.topMoment]), day: WEEKDAYS[lang][stats.topDay].toLowerCase() })}</Heading>
              <View style={s.moments}>
                {(['matin', 'midi', 'apresMidi', 'soir'] as Moment[]).map((m, i) => (
                  <MomentBar key={m} label={T(MOMENT_KEY[m])} value={stats.moments[m]} max={Math.max(1, ...Object.values(stats.moments))} index={i} top={m === stats.topMoment} />
                ))}
              </View>
            </Card>
          </Section>
        </Reveal>
      ) : null}

      <Reveal>
        <Section title={T('stats.byClub')}>
          <Card>
            {stats.byClub.length ? (
              stats.byClub.map((c, i) => <ClubBar key={c.club} club={c.club} value={c.count} share={c.share} index={i} last={i === stats.byClub.length - 1} />)
            ) : (
              <Body tone="muted">{T('stats.byClubNone')}</Body>
            )}
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('stats.logbook')} note={T('stats.logbookNote')}>
          <Card padded={false} style={s.list}>
            {stats.recent.length ? (
              stats.recent.slice(0, 6).map((p, i, arr) => (
              <View key={p.date + p.heure} style={[s.entry, i < arr.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
                <Mono size="caption" tone="dim" style={s.entryNo}>
                  {String(stats.total - i).padStart(3, '0')}
                </Mono>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="bold">
                    {clubById(p.club).court} · {p.heure}
                  </Body>
                  <Body size="caption" tone="muted">
                    {longDate(p.date, lang)}
                  </Body>
                </View>
                <Stamp label={T('stats.present')} ink={i === 0} delay={i === 0 ? 400 : 0} />
              </View>
              ))
            ) : (
              <View style={s.entry}>
                <Body tone="muted">{T('stats.empty')}</Body>
              </View>
            )}
          </Card>
        </Section>
      </Reveal>

      {stats.total > 0 ? (
        <Reveal style={s.shareBlock}>
          <Button label={copied ? T('planning.copied') : T('stats.shareMonth')} icon={IconShare} variant="secondary" onPress={share} />
        </Reveal>
      ) : null}
    </Page>
  );
}

/* ------------------------------------------------------------------ */

function Kpi({ value, label, sub, tone = 'muted' }: { value: number; label: string; sub?: string; tone?: 'positive' | 'negative' | 'muted' }) {
  const s = useStyles();
  return (
    <View style={s.kpi}>
      <CountUp value={value} size="display4" tight upper={false} />
      <Body size="caption" weight="semi" tone="muted" style={s.kpiLabel} numberOfLines={1}>
        {label}
      </Body>
      {sub ? (
        <Body size="micro" weight="bold" tone={tone} style={s.kpiLabel} numberOfLines={1}>
          {sub}
        </Body>
      ) : null}
    </View>
  );
}

/** Quinze semaines, un carré par jour : la régularité se voit d'un coup d'œil, et chaque carré se touche. */
function Heatmap({ stats }: { stats: ReturnType<typeof useStats> }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const [picked, setPicked] = useState<string | null>(null);
  const cell = picked ? stats.heatmap.flat().find((d) => d.date === picked) : null;
  const monthOf = (iso: string) => new Date(iso + 'T12:00:00').getMonth();
  return (
    <View>
      <View style={s.heatRows}>
        <View style={s.heatDays}>
          {WEEKDAYS_SHORT[lang].map((d, i) => (
            <Body key={d} size="micro" weight="bold" tone="dim" style={s.heatDay}>
              {i % 2 === 0 ? d[0] : ''}
            </Body>
          ))}
        </View>
        <View style={s.heatGrid}>
          {stats.heatmap.map((col, i) => (
            <View key={col[0].date} style={s.heatCol}>
              {col.map((d, j) => {
                const on = d.count > 0;
                const bg = d.future ? 'transparent' : d.count >= 2 ? t.accent : on ? t.accentText : t.chip;
                return (
                  <Tap key={d.date} onPress={() => setPicked(d.date)} haptic="selection" scaleTo={0.8} disabled={d.future} accessibilityRole="button" accessibilityLabel={`${shortDay(d.date, lang)} : ${d.count}`}>
                    <HeatCell bg={bg} index={i * 7 + j} today={d.today} picked={d.date === picked} border={t.lineStrong} dashed={d.future} />
                  </Tap>
                );
              })}
              <Body size="micro" tone="dim" style={s.heatMonth} numberOfLines={1}>
                {i === 0 || monthOf(col[0].date) !== monthOf(stats.heatmap[i - 1][0].date) ? monthName(new Date(col[0].date + 'T12:00:00'), lang).slice(0, 3) : ''}
              </Body>
            </View>
          ))}
        </View>
      </View>
      <View style={s.heatCaption}>
        <Body size="caption" weight="semi" tone="muted" style={{ flex: 1 }}>
          {cell ? `${longDate(cell.date, lang)} · ${cell.count ? cell.clubs.map((c, k) => `${clubById(c).court} ${cell.heures[k]}`).join(', ') : T('stats.dayNone')}` : T('stats.heatHint')}
        </Body>
        <Body size="caption" weight="bold" tabular tone="muted">
          {stats.activeWeeks}/{stats.weeks.length}
        </Body>
      </View>
    </View>
  );
}

function HeatCell({ bg, index, today, picked, border, dashed }: { bg: string; index: number; today: boolean; picked: boolean; border: string; dashed: boolean }) {
  const s = useStyles();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(Math.min(index, 105) * 6, withTiming(1, { duration: 320, easing: ARRIVE }));
  }, [index, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.6 + p.value * 0.4 }] }));
  return <Animated.View style={[s.heatCell, { backgroundColor: bg }, dashed && { borderWidth: stroke.hair, borderColor: border, borderStyle: 'dashed' }, (today || picked) && { borderWidth: 2, borderColor: border }, style]} />;
}

function MomentBar({ label, value, max, index, top }: { label: string; value: number; max: number; index: number; top: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(120 + index * 70, withTiming(value / max, { duration: 700, easing: ARRIVE }));
  }, [value, max, index, h]);
  const style = useAnimatedStyle(() => ({ height: `${Math.max(4, h.value * 100)}%` }));
  return (
    <View style={s.moment}>
      <View style={[s.momentTrack, { backgroundColor: t.chip }]}>
        <Animated.View style={[s.momentFill, { backgroundColor: top ? t.accent : t.lineStrong }, style]} />
      </View>
      <Body size="micro" weight={top ? 'bold' : 'semi'} tone={top ? 'text' : 'dim'} numberOfLines={2} style={s.momentLabel}>
        {label}
      </Body>
      <Body size="micro" weight="bold" tone="muted" tabular>
        {value}
      </Body>
    </View>
  );
}

function ClubBar({ club, value, share, index, last }: { club: ClubId; value: number; share: number; index: number; last: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(120 + index * 83, withTiming(share, { duration: 900, easing: ARRIVE }));
  }, [share, index, w]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(3, w.value * 100)}%` }));
  return (
    <View style={[s.club, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
      <View style={[s.clubDot, { backgroundColor: CLUB_HUE[club] }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={s.clubHead}>
          <Heading level="card" style={{ flex: 1 }}>
            {clubById(club).court}
          </Heading>
          <Body size="caption" weight="bold" tone="muted" tabular>
            {Math.round(share * 100)} %
          </Body>
        </View>
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
  hero: { alignItems: 'center', paddingVertical: space[6] },
  heroLine: { marginTop: space[5], textAlign: 'center' },
  heroSub: { marginTop: 2, textAlign: 'center' },
  goalRow: { alignSelf: 'stretch', marginTop: space[5], paddingTop: space[4], borderTopWidth: stroke.hair, borderTopColor: t.line, gap: space[2], alignItems: 'center' },
  goalChips: { flexDirection: 'row', gap: 6 },
  goalChip: { minWidth: 42, justifyContent: 'center' },
  kpis: { flexDirection: 'row', gap: space[3], marginTop: space[3] },
  kpi: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space[4],
    paddingHorizontal: space[2],
    borderRadius: radius.card - 4,
    backgroundColor: t.card,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : { borderWidth: stroke.hair, borderColor: t.line }),
  },
  kpiLabel: { textAlign: 'center' },
  heatRows: { flexDirection: 'row', gap: 6 },
  heatDays: { justifyContent: 'flex-start', gap: 3, paddingTop: 0 },
  heatDay: { height: 15, lineHeight: 15, width: 10, textAlign: 'center' },
  heatGrid: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  heatCol: { gap: 3, alignItems: 'center', width: 18 },
  heatCell: { width: 15, height: 15, borderRadius: 4 },
  heatMonth: { fontSize: 9, lineHeight: 12, marginTop: 2, width: 26, textAlign: 'center' },
  heatCaption: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[3] },
  moments: { flexDirection: 'row', gap: space[3], marginTop: space[4], height: 124 },
  moment: { flex: 1, alignItems: 'center', gap: 4 },
  momentTrack: { flex: 1, width: '100%', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  momentFill: { width: '100%', borderRadius: 8 },
  momentLabel: { textAlign: 'center' },
  club: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  clubHead: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  clubDot: { width: 10, height: 10, borderRadius: 5 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  clubCount: { minWidth: 28, textAlign: 'right' },
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64, paddingVertical: space[3] },
  entryNo: { width: 34 },
  shareBlock: { marginTop: space[6] },
}));
