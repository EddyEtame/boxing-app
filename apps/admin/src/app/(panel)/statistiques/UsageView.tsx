'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { purgeDemo } from './actions';
import { ChartFrame, Columns, Funnel, HBars, Kpi } from '@/components/charts/Charts';
import { Dialog } from '@/components/Dialog';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { Segmented, Switch } from '@/components/wizard/fields';
import { IconAlert, IconChart, IconDownload, IconShield, IconTrash, IconUsers } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtDate, relative } from '@/lib/format';
import type { UsageReport } from '@/server/usage';

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export function UsageView({ report, period, includeDemo }: { report: UsageReport; period: number; includeDemo: boolean }) {
  const { t, locale, messages } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const now = useNow();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const g = report.guests;
  const m = report.members;

  const go = (p: number, demo: boolean) => start(() => router.push(`${pathname}?periode=${p}${demo ? '' : '&demo=0'}`, { scroll: false }));
  const has = (key: string): key is MessageKey => key in messages;
  const sectionLabel = (k: string) => (has(`stats.section.${k}`) ? t(`stats.section.${k}` as MessageKey) : k);
  const fromLabel = (k: string) => (has(`stats.from.${k}`) ? t(`stats.from.${k}` as MessageKey) : k);
  const day = (d: string) => fmtDate(locale, d, { day: 'numeric', month: 'short' });
  const dayLong = (d: string) => fmtDate(locale, d, { weekday: 'long', day: 'numeric', month: 'long' });
  const demoPct = pct(report.totals.demo, report.totals.all);
  const planningViews = g.plannings.reduce((n, p) => n + p.views, 0);
  const planningShares = g.plannings.reduce((n, p) => n + p.shares, 0);
  const badge = m.actions.find((a) => a.key === 'badge_open');
  const statsViews = m.actions.find((a) => a.key === 'stats_view');
  const labelEvery = period > 30 ? 14 : period > 7 ? 5 : 1;

  const funnelLabel: Record<string, string> = {
    open: t('stats.funnel.open'),
    ambiance: t('stats.funnel.ambiance'),
    profil: t('stats.funnel.profil'),
    done: t('stats.funnel.done'),
    explore: t('stats.funnel.explore'),
    cta: t('stats.funnel.cta'),
  };

  const split = (title: string, rows: { key: string; label: string; value: number }[]) => {
    const total = rows.reduce((n, r) => n + r.value, 0);
    return (
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <p className="small strong">{title}</p>
        <HBars data={rows.map((r) => ({ key: r.key, label: r.label, value: r.value, display: `${pct(r.value, total)} %` }))} max={total || 1} ariaLabel={title} />
      </div>
    );
  };

  const doPurge = async () => {
    setConfirm(false);
    const res = await purgeDemo();
    if (res.ok) {
      toast({ text: t('stats.purge.done', { n: res.data.removed }) });
      router.refresh();
    } else toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
  };

  return (
    <>
      <PageHeader
        kicker={t('stats.kicker')}
        title={t('stats.title')}
        lead={t('stats.lead')}
        actions={
          <>
            {report.totals.demo > 0 ? (
              <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
                <IconTrash size={17} />
                {t('stats.purge')}
              </button>
            ) : null}
            <a className="btn btn-secondary" href={`/api/admin/usage-csv?periode=${period}${includeDemo ? '' : '&demo=0'}`} download>
              <IconDownload size={17} />
              {t('stats.export')}
            </a>
          </>
        }
      />

      <div className="filters" role="group" aria-label={t('stats.period')}>
        <Segmented label={t('stats.period')} value={String(period)} onChange={(v) => go(Number(v), includeDemo)} options={[7, 30, 90].map((p) => ({ value: String(p), label: t(`stats.period.${p}` as MessageKey) }))} />
        <label className="row" style={{ '--gap': '10px', cursor: 'pointer' } as React.CSSProperties}>
          <Switch checked={includeDemo} onChange={(v) => go(period, v)} label={t('stats.includeDemo')} />
          <span className="small strong">{t('stats.includeDemo')}</span>
        </label>
        <span className="spacer" />
        <span className="small dim">
          {t('stats.provenance', { n: report.totals.inPeriod })}
          {report.firstInPeriodAt && Date.parse(report.firstInPeriodAt) - Date.parse(report.from) > 2 * 86_400_000 ? ` · ${t('stats.since', { date: fmtDate(locale, report.firstInPeriodAt, { day: 'numeric', month: 'long' }) })}` : ''}
          {report.totals.demo ? ` · ${t('stats.demoShare', { p: demoPct })}` : ''} · {report.lastAppEventAt ? t('stats.lastApp', { when: relative(t, locale, report.lastAppEventAt, now) }) : t('stats.lastApp.never')}
        </span>
      </div>

      {report.totals.demo > 0 && includeDemo ? (
        <div className="callout" data-kind="warn" role="note" style={{ marginBottom: 18 }}>
          <IconAlert />
          <span>
            <span className="callout-title">{t('stats.demoBanner.title')}. </span>
            {t('stats.demoBanner')}
          </span>
        </div>
      ) : null}

      {report.totals.inPeriod === 0 ? (
        <div className="panel">
          <div className="empty">
            <p className="empty-def">{t('stats.empty.def')}</p>
            <p className="empty-title">{t('stats.empty.title')}</p>
            <p className="empty-text">{t('stats.empty.body')}</p>
            <div className="codebox" style={{ width: 'min(520px, 100%)' }}>
              <code>npm run seed:events --workspace apps/admin</code>
            </div>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ '--gap': '18px', opacity: pending ? 0.55 : 1, transition: 'opacity var(--d-cross) var(--e-standard)' } as React.CSSProperties} aria-busy={pending}>
          <section aria-labelledby="guests-title" className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
            <div className="section-title" style={{ marginTop: 6 }}>
              <div>
                <h2 id="guests-title">
                  <IconChart size={18} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 8 }} />
                  {t('stats.guests.title')}
                </h2>
                <p>{t('stats.guests.sub')}</p>
              </div>
            </div>
            <div className="grid grid-4">
              <Kpi label={t('stats.kpi.visitors')} value={g.visitors} sub={t('stats.kpi.visitors.sub')} />
              <Kpi label={t('stats.kpi.visits')} value={g.visits} sub={t('stats.kpi.visits.sub', { n: g.visitors ? Math.round((g.visits / g.visitors) * 10) / 10 : 0 })} />
              <Kpi label={t('stats.kpi.cta')} value={`${(g.cta.rate * 100).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })} %`} sub={t('stats.kpi.cta.sub', { n: g.cta.clickers, total: g.visitors })} hero />
              <Kpi label={t('stats.kpi.plannings')} value={planningViews} sub={t('stats.kpi.plannings.sub', { n: planningShares })} />
            </div>

            <ChartFrame
              title={t('stats.funnel.title')}
              sub={t('stats.funnel.sub')}
              table={{ head: [t('stats.col.step'), t('stats.col.visitors')], rows: g.funnel.map((f) => [funnelLabel[f.key] ?? f.key, f.value]) }}
            >
              <Funnel
                ariaLabel={t('stats.funnel.title')}
                hiLast
                steps={g.funnel.map((f) => ({ key: f.key, label: funnelLabel[f.key] ?? f.key, value: f.value, sub: f.key === 'done' ? t('stats.funnel.done.sub', { guest: g.prefaceChoice.guest, member: g.prefaceChoice.member }) : undefined }))}
              />
            </ChartFrame>

            <ChartFrame
              title={t('stats.perDay.title')}
              sub={t('stats.perDay.sub')}
              table={{ head: [t('stats.col.day'), t('stats.col.visits'), t('stats.col.visitors')], rows: g.perDay.map((d) => [dayLong(d.day), d.visits, d.visitors]) }}
            >
              <Columns data={g.perDay.map((d, i) => (i === g.perDay.length - 1 ? { key: d.day, label: `${dayLong(d.day)} · ${t('stats.perDay.today')}`, axis: day(d.day), value: d.visits, soft: true } : { key: d.day, label: dayLong(d.day), axis: day(d.day), value: d.visits }))} height={200} barWidth={period > 30 ? 8 : period > 7 ? 16 : 28} gap={period > 30 ? 2 : 4} labelEvery={labelEvery} ariaLabel={t('stats.perDay.title')} />
            </ChartFrame>

            <div className="grid grid-2">
              <ChartFrame
                title={t('stats.sections.title')}
                sub={t('stats.sections.sub')}
                table={{ head: [t('stats.col.section'), t('stats.col.views'), t('stats.col.visitors')], rows: g.sections.map((s) => [sectionLabel(s.key), s.views, s.visitors]) }}
              >
                <HBars data={g.sections.slice(0, 9).map((s) => ({ key: s.key, label: sectionLabel(s.key), value: s.views, note: t('stats.who', { n: s.visitors }) }))} ariaLabel={t('stats.sections.title')} />
              </ChartFrame>
              <ChartFrame
                title={t('stats.plannings.title')}
                sub={t('stats.plannings.sub')}
                table={{ head: [t('stats.col.club'), t('stats.col.views'), t('stats.col.visitors'), t('stats.col.shares'), t('stats.col.sessions')], rows: g.plannings.map((p) => [CLUB_LABEL[p.club], p.views, p.visitors, p.shares, p.sessions]) }}
              >
                <HBars data={g.plannings.map((p) => ({ key: p.club, label: CLUB_LABEL[p.club], value: p.views, note: t('stats.shared', { n: p.shares }) }))} ariaLabel={t('stats.plannings.title')} />
              </ChartFrame>
            </div>

            <div className="grid grid-2">
              <ChartFrame
                title={t('stats.ctaFrom.title')}
                sub={t('stats.ctaFrom.sub')}
                table={{ head: [t('stats.col.from'), t('stats.col.clicks')], rows: g.cta.from.map((f) => [fromLabel(f.key), f.count]) }}
              >
                <HBars data={g.cta.from.map((f) => ({ key: f.key, label: fromLabel(f.key), value: f.count, note: `${pct(f.count, g.cta.clicks)} %` }))} ariaLabel={t('stats.ctaFrom.title')} />
              </ChartFrame>
              <ChartFrame
                title={t('stats.screens.title')}
                sub={t('stats.screens.sub')}
                table={{ head: [t('stats.col.screen'), t('stats.col.views'), t('stats.col.visitors')], rows: g.screens.map((s) => [s.key, s.views, s.visitors]) }}
              >
                <HBars data={g.screens.slice(0, 8).map((s) => ({ key: s.key, label: s.key, value: s.views, note: t('stats.who', { n: s.visitors }) }))} ariaLabel={t('stats.screens.title')} />
              </ChartFrame>
            </div>

            <section className="panel" aria-labelledby="split-title">
              <div className="panel-head">
                <h3 id="split-title" className="panel-title">
                  {t('stats.split.title')}
                </h3>
              </div>
              <div className="panel-body grid grid-3" style={{ '--gap': '28px' } as React.CSSProperties}>
                {split(t('stats.split.locale'), [
                  { key: 'fr', label: t('lang.fr'), value: g.locales.fr },
                  { key: 'en', label: t('lang.en'), value: g.locales.en },
                ])}
                {split(t('stats.split.scheme'), [
                  { key: 'light', label: t('theme.light'), value: g.schemes.light },
                  { key: 'dark', label: t('theme.dark'), value: g.schemes.dark },
                ])}
                {split(t('stats.split.platform'), [
                  { key: 'ios', label: t('stats.platform.ios'), value: g.platforms.ios },
                  { key: 'android', label: t('stats.platform.android'), value: g.platforms.android },
                  { key: 'web', label: t('stats.platform.web'), value: g.platforms.web },
                ])}
              </div>
            </section>
          </section>

          <section aria-labelledby="members-title" className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
            <div className="section-title">
              <div>
                <h2 id="members-title">
                  <IconUsers size={18} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 8 }} />
                  {t('stats.members.title')}
                </h2>
                <p>{t('stats.members.sub')}</p>
              </div>
            </div>
            <div className="grid grid-4">
              <Kpi label={t('stats.kpi.members')} value={m.visitors} sub={t('stats.kpi.members.sub', { actif: m.byStatut.actif, restreint: m.byStatut.restreint })} />
              <Kpi label={t('stats.kpi.visits')} value={m.visits} sub={t('stats.kpi.visits.sub', { n: m.visitors ? Math.round((m.visits / m.visitors) * 10) / 10 : 0 })} />
              <Kpi label={t('stats.kpi.badge')} value={badge?.count ?? 0} sub={t('stats.kpi.badge.sub', { n: badge?.visitors ?? 0 })} />
              <Kpi label={t('stats.kpi.statsViews')} value={statsViews?.count ?? 0} sub={t('stats.kpi.statsViews.sub', { n: statsViews?.visitors ?? 0 })} />
            </div>
            <ChartFrame
                title={t('stats.perDay.title')}
                sub={t('stats.membersPerDay.sub')}
                table={{ head: [t('stats.col.day'), t('stats.col.visits'), t('stats.col.visitors')], rows: m.perDay.map((d) => [dayLong(d.day), d.visits, d.visitors]) }}
              >
                <Columns data={m.perDay.map((d, i) => (i === m.perDay.length - 1 ? { key: d.day, label: `${dayLong(d.day)} · ${t('stats.perDay.today')}`, axis: day(d.day), value: d.visits, soft: true } : { key: d.day, label: dayLong(d.day), axis: day(d.day), value: d.visits }))} height={180} barWidth={period > 30 ? 8 : period > 7 ? 16 : 28} gap={period > 30 ? 2 : 4} labelEvery={labelEvery} ariaLabel={t('stats.perDay.title')} />
            </ChartFrame>
            <div className="grid grid-2">
              <ChartFrame
                title={t('stats.actions.title')}
                sub={t('stats.actions.sub')}
                table={{ head: [t('stats.col.action'), t('stats.col.count'), t('stats.col.visitors')], rows: m.actions.map((a) => [t(`stats.action.${a.key}` as MessageKey), a.count, a.visitors]) }}
              >
                <HBars data={m.actions.map((a) => ({ key: a.key, label: t(`stats.action.${a.key}` as MessageKey), value: a.count, note: t('stats.who', { n: a.visitors }) }))} ariaLabel={t('stats.actions.title')} />
              </ChartFrame>
              <ChartFrame
                title={t('stats.sections.title')}
                sub={t('stats.sections.sub')}
                table={{ head: [t('stats.col.section'), t('stats.col.views'), t('stats.col.visitors')], rows: m.sections.map((s) => [sectionLabel(s.key), s.views, s.visitors]) }}
              >
                <HBars data={m.sections.slice(0, 9).map((s) => ({ key: s.key, label: sectionLabel(s.key), value: s.views, note: t('stats.who', { n: s.visitors }) }))} ariaLabel={t('stats.sections.title')} />
              </ChartFrame>
            </div>
          </section>

          <div className="callout" role="note">
            <IconShield />
            <span>
              <span className="callout-title">{t('stats.privacy.title')}. </span>
              {t('stats.privacy')}
            </span>
          </div>
        </div>
      )}

      <Dialog open={confirm} onClose={() => setConfirm(false)} className="modal" labelledBy="purge-title">
        <div className="modal-head">
          <h2 id="purge-title" className="modal-title">
            {t('stats.purge')}
          </h2>
        </div>
        <p className="modal-body">{t('stats.purge.confirm', { n: report.totals.demo })}</p>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
            {t('btn.cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={() => void doPurge()}>
            <IconTrash size={16} />
            {t('stats.purge')}
          </button>
        </div>
      </Dialog>
    </>
  );
}
