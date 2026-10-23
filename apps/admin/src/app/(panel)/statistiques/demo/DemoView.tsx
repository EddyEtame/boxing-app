'use client';

import { API, DEFAULT_DEMO, DEMO_MEMBER_ID, type DemoPattern, type Passage } from '@bc/contract';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { DemoCharts } from './DemoCharts';
import { DemoPhone } from './DemoPhone';
import { DemoWizard, type DemoDraft } from './DemoWizard';
import { CopyButton } from '@/components/CopyButton';
import { Dialog } from '@/components/Dialog';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { IconAlert, IconPhone, IconPlug, IconRefresh, IconShield, IconSliders } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { PRESET_IDS, PRESETS, samePattern, type PresetId } from '@/lib/demo-presets';
import { fmtDate, relative } from '@/lib/format';
import type { ApiReads } from '@/server/demo';

type Props = {
  state: { pattern: DemoPattern; rolling: boolean; updatedAt: string; updatedBy: string };
  passages: Passage[];
  nowIso: string;
  featureOn: boolean;
  reads: { since: string; byKind: Record<string, ApiReads> };
  endpoints: { local: string; lan: string[]; route: string };
};

export function DemoView({ state, passages, nowIso, featureOn, reads: initialReads, endpoints }: Props) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [wizard, setWizard] = useState<DemoDraft | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [reads, setReads] = useState(initialReads);
  const now = useNow(5000);

  // Toutes les 5 s, comme l'app : la ligne « dernière lecture » bouge pendant qu'on présente.
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (document.hidden) return;
      const res = await fetch('/api/admin/reads').catch(() => null);
      if (res?.ok) setReads((await res.json()) as typeof initialReads);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const current: PresetId | 'custom' = useMemo(() => PRESET_IDS.find((id) => samePattern(PRESETS[id], state.pattern)) ?? 'custom', [state.pattern]);
  const demoReads = reads.byKind.demo;
  const last = passages[0];
  const first = passages[passages.length - 1];
  const short = (iso: string) => fmtDate(locale, iso, { day: 'numeric', month: 'short', year: 'numeric' });

  const open = (preset: PresetId | 'custom') => setWizard({ preset, pattern: preset === 'custom' ? structuredClone(state.pattern) : structuredClone(PRESETS[preset]), rolling: state.rolling });

  const reset = async () => {
    setConfirmReset(false);
    const res = await fetch(API.demoPassages(DEMO_MEMBER_ID), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pattern: DEFAULT_DEMO, rolling: true }) });
    if (res.ok) {
      toast({ text: t('demo.reset.done') });
      router.refresh();
    } else toast({ text: t('err.interne'), kind: 'err' });
  };

  return (
    <>
      <PageHeader
        kicker={t('demo.kicker', { id: DEMO_MEMBER_ID })}
        title={t('demo.title')}
        lead={t('demo.lead')}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(true)}>
              <IconRefresh size={17} />
              {t('demo.reset')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => open(current)}>
              <IconSliders size={17} />
              {t('demo.edit')}
            </button>
          </>
        }
      />

      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        <div className="callout" role="note">
          <IconShield />
          <span>
            <span className="callout-title">{t('demo.guard.title')}. </span>
            {t('demo.guard.body', { id: DEMO_MEMBER_ID })}
          </span>
        </div>

        {!featureOn ? (
          <div className="callout" data-kind="warn" role="status">
            <IconAlert />
            <span>{t('demo.state.off')}</span>
          </div>
        ) : null}

        <div className="grid grid-main">
          <section className="panel" aria-labelledby="demo-state">
            <div className="panel-head">
              <div>
                <h2 id="demo-state" className="panel-title">
                  {t('demo.state.title')}
                </h2>
                <p className="panel-sub">{state.rolling ? t('demo.state.rolling') : t('demo.state.fixed', { date: short(state.updatedAt) })}</p>
              </div>
              <span className="tag tag-demo">source : demo</span>
            </div>
            <div className="panel-body stack" style={{ '--gap': '14px' } as React.CSSProperties}>
              <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {t('demo.state.passages', { n: passages.length })}
                {first && last ? <span className="muted" style={{ fontSize: 15, fontWeight: 600, marginLeft: 10, letterSpacing: 0 }}>{t('demo.state.range', { from: short(first.date), to: short(last.date) })}</span> : null}
              </p>
              <p className="small muted">{t('demo.state.updated', { when: relative(t, locale, state.updatedAt, now), who: state.updatedBy })}</p>
              <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
                <span className="tag" data-live={Boolean(demoReads)}>
                  <span className={`dot${demoReads ? ' dot-live' : ''}`} style={{ color: demoReads ? 'var(--positive)' : 'var(--text-dim)' }} />
                  {demoReads ? `${t('demo.state.reads', { n: demoReads.count })} · ${t('demo.state.lastRead', { when: relative(t, locale, demoReads.lastAt ?? reads.since, now) })}` : t('demo.state.never')}
                </span>
              </div>
            </div>
          </section>

          <section className="panel" aria-labelledby="demo-connect">
            <div className="panel-head">
              <div>
                <h2 id="demo-connect" className="panel-title">
                  <IconPlug size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 8 }} />
                  {t('demo.connect.title')}
                </h2>
                <p className="panel-sub">{t('demo.connect.body')}</p>
              </div>
            </div>
            <div className="panel-body stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                <span className="small dim">{t('demo.connect.local')}</span>
                <div className="codebox" title={`EXPO_PUBLIC_API_URL=${endpoints.local}`}>
                  <code>{endpoints.local}</code>
                  <CopyButton value={`EXPO_PUBLIC_API_URL=${endpoints.local}`} />
                </div>
              </div>
              {endpoints.lan.map((url) => (
                <div key={url} className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                  <span className="small dim">
                    <IconPhone size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                    {t('demo.connect.lan')}
                  </span>
                  <div className="codebox" title={`EXPO_PUBLIC_API_URL=${url}`}>
                    <code>{url}</code>
                    <CopyButton value={`EXPO_PUBLIC_API_URL=${url}`} />
                  </div>
                </div>
              ))}
              <p className="small dim">
                {t('demo.connect.endpoint')} : <span className="mono">GET {endpoints.route}</span>
              </p>
            </div>
          </section>
        </div>

        <section aria-labelledby="demo-scenarios">
          <div className="section-title" style={{ marginTop: 18 }}>
            <div>
              <h2 id="demo-scenarios">{t('demo.scenarios')}</h2>
              <p>{t('demo.scenarios.sub')}</p>
            </div>
          </div>
          <div className="templates">
            {PRESET_IDS.map((id) => (
              <button key={id} type="button" className="template" onClick={() => open(id)} aria-current={id === current || undefined} style={id === current ? { borderStyle: 'solid', borderColor: 'var(--primary)', background: 'var(--card)' } : undefined}>
                <span className="row-between">
                  <span className="template-title">{t(`demo.preset.${id}` as MessageKey)}</span>
                  {id === current ? <span className="tag tag-ink">{t('demo.preset.current')}</span> : null}
                </span>
                <span className="template-sub">{t(`demo.preset.${id}.sub` as MessageKey)}</span>
              </button>
            ))}
          </div>
        </section>

        <DemoCharts passages={passages} nowIso={nowIso} />

        <section aria-labelledby="demo-phones">
          <div className="section-title">
            <div>
              <h2 id="demo-phones">{t('demo.phones')}</h2>
              <p>{t('demo.phones.sub')}</p>
            </div>
          </div>
          <div className="phones" style={{ justifyContent: 'flex-start', gap: 28 }}>
            <DemoPhone passages={passages} nowIso={nowIso} scheme="light" caption={`${t('theme.light')} · ${t('theme.lightSub')}`} />
            <DemoPhone passages={passages} nowIso={nowIso} scheme="dark" caption={`${t('theme.dark')} · ${t('theme.darkSub')}`} />
          </div>
        </section>
      </div>

      {wizard ? <DemoWizard open onClose={() => setWizard(null)} initial={wizard} /> : null}

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} className="modal" labelledBy="reset-title">
        <div className="modal-head">
          <h2 id="reset-title" className="modal-title">
            {t('demo.reset')}
          </h2>
        </div>
        <p className="modal-body">{t('demo.reset.confirm')}</p>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
            {t('btn.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void reset()}>
            {t('btn.confirm')}
          </button>
        </div>
      </Dialog>
    </>
  );
}
