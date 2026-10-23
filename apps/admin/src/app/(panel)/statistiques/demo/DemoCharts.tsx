'use client';

import { computeStats, type Passage } from '@bc/contract';
import { useMemo } from 'react';

import { ChartFrame, Columns, Heatmap, HBars, Kpi } from '@/components/charts/Charts';
import { useI18n } from '@/i18n/client';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtDate } from '@/lib/format';

/**
 * Les statistiques d'un historique, calculées par `computeStats` de
 * @bc/contract : exactement les chiffres que l'app affichera.
 */
export function DemoCharts({ passages, nowIso, compact = false }: { passages: Passage[]; nowIso: string; compact?: boolean }) {
  const { t, locale } = useI18n();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const weeksShown = compact ? 8 : 12;
  const heatWeeks = compact ? 15 : 26;
  const stats = useMemo(() => computeStats(passages, now, { goal: 3, weeks: weeksShown, heatWeeks }), [passages, now, weeksShown, heatWeeks]);
  const short = (iso: string) => fmtDate(locale, iso, { day: 'numeric', month: 'short' });
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => t(`dayShort.${d}` as 'dayShort.0'));

  const weekCols = stats.weeks.map((w) => ({ key: w.start, label: t('demo.week', { date: short(w.start) }), axis: short(w.start), value: w.count, hi: w.current }));
  const clubBars = stats.byClubAll.map((c) => ({ key: c.club, label: CLUB_LABEL[c.club], value: c.count, note: `${Math.round(c.share * 100)} %` }));
  const heat = stats.heatmap.map((col) =>
    col.map((c) => ({
      date: c.date,
      count: c.count,
      future: c.future,
      today: c.today,
      label: `${fmtDate(locale, c.date, { weekday: 'long', day: 'numeric', month: 'long' })}${c.clubs.length ? ` · ${[...new Set(c.clubs)].map((k) => CLUB_LABEL[k]).join(', ')}` : ''}`,
    })),
  );

  const kpis = (
    <div className={`grid ${compact ? 'grid-2' : 'grid-4'}`} style={{ '--gap': compact ? '10px' : '16px' } as React.CSSProperties}>
      <Kpi label={t('demo.kpi.total')} value={stats.total} />
      <Kpi label={t('demo.kpi.month')} value={stats.month} sub={t('demo.kpi.prev', { n: stats.monthPrev })} />
      <Kpi label={t('demo.kpi.avg')} value={stats.avgPerWeek.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')} />
      <Kpi label={t('demo.kpi.streak')} value={stats.streak} sub={t('demo.kpi.best', { n: stats.bestStreak })} />
    </div>
  );

  const weeksChart = (
    <ChartFrame
      title={t('demo.chart.weeks')}
      sub={t('demo.chart.weeks.sub', { n: weeksShown })}
      table={{ head: [t('demo.col.week'), t('demo.col.count')], rows: stats.weeks.map((w) => [t('demo.week', { date: short(w.start) }), w.count]) }}
    >
      <Columns data={weekCols} height={compact ? 150 : 200} barWidth={compact ? 18 : 24} goal={stats.goal} goalLabel={t('demo.goal', { n: stats.goal })} labelEvery={compact ? 2 : 2} ariaLabel={t('demo.chart.weeks')} />
    </ChartFrame>
  );

  const clubsChart = (
    <ChartFrame
      title={t('demo.chart.clubs')}
      sub={t('demo.chart.clubs.sub')}
      table={{ head: [t('demo.col.club'), t('demo.col.count'), t('demo.col.share')], rows: stats.byClubAll.map((c) => [CLUB_LABEL[c.club], c.count, `${Math.round(c.share * 100)} %`]) }}
    >
      <HBars data={clubBars} ariaLabel={t('demo.chart.clubs')} />
    </ChartFrame>
  );

  const heatChart = (
    <ChartFrame
      title={t('demo.chart.heat')}
      sub={t('demo.chart.heat.sub', { n: heatWeeks })}
      table={{
        head: [t('demo.col.day'), t('demo.col.count')],
        rows: stats.heatmap
          .flat()
          .filter((c) => c.count > 0)
          .reverse()
          .map((c) => [fmtDate(locale, c.date, { weekday: 'short', day: 'numeric', month: 'short' }), c.count]),
      }}
    >
      <Heatmap columns={heat} dayLabels={days} ariaLabel={t('demo.chart.heat')} cell={compact ? 13 : 17} legend={{ less: t('chart.less'), more: t('chart.more') }} />
    </ChartFrame>
  );

  if (compact) {
    return (
      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        {kpis}
        {weeksChart}
        {heatChart}
        {clubsChart}
      </div>
    );
  }
  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      {kpis}
      <div className="grid grid-main">
        {weeksChart}
        {clubsChart}
      </div>
      {heatChart}
    </div>
  );
}
