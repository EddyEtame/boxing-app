'use client';

import type { ClubId } from '@bc/brand';
import { addDays, API, DEMO_MEMBER_ID, generatePassages, startOfWeek, type DemoMoment, type DemoPassagesResponse, type DemoPattern } from '@bc/contract';
import { useMemo, useState } from 'react';

import { DemoCharts } from './DemoCharts';
import { DemoPhone } from './DemoPhone';
import { IconMinus, IconPlus, IconRefresh, IconSliders } from '@/components/icons';
import { Choices, Chips, Field, Review, Segmented, Switch, TextInput } from '@/components/wizard/fields';
import { Wizard, type Errors, type WizardStep } from '@/components/wizard/Wizard';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL, photoUrl, CLUB_PHOTO } from '@/lib/clubs';
import { PRESET_IDS, PRESETS, type PresetId } from '@/lib/demo-presets';
import { fmtDate } from '@/lib/format';

export type DemoDraft = { preset: PresetId | 'custom'; pattern: DemoPattern; rolling: boolean };

const MOMENTS: DemoMoment[] = ['matin', 'midi', 'soir', 'mixte'];

function weightOf(p: DemoPattern, club: ClubId): number {
  return p.clubs.find((c) => c.club === club)?.weight ?? 0;
}

function withWeight(p: DemoPattern, club: ClubId, weight: number): DemoPattern {
  const others = p.clubs.filter((c) => c.club !== club);
  const clubs = weight > 0 ? [...others, { club, weight }] : others;
  return { ...p, clubs: CLUB_IDS.map((id) => clubs.find((c) => c.club === id)).filter((c): c is { club: ClubId; weight: number } => Boolean(c)) };
}

export function DemoWizard({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: DemoDraft }) {
  const { t, locale } = useI18n();
  const [nowIso] = useState(() => new Date().toISOString());
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const short = (d: Date | string) => fmtDate(locale, typeof d === 'string' ? d : d.toISOString(), { day: 'numeric', month: 'short' });

  const steps: WizardStep<DemoDraft>[] = [
    {
      id: 'scenario',
      title: t('demo.step.scenario'),
      hint: t('demo.step.scenario.hint'),
      render: ({ state, set }) => (
        <Choices<PresetId | 'custom'>
          name="preset"
          value={state.preset}
          min={230}
          onChange={(v) => set(v === 'custom' ? { preset: v } : { preset: v, pattern: structuredClone(PRESETS[v]) })}
          options={[
            ...PRESET_IDS.map((id) => ({ value: id, title: t(`demo.preset.${id}` as MessageKey), sub: t(`demo.preset.${id}.sub` as MessageKey) })),
            { value: 'custom' as const, title: t('demo.preset.custom'), sub: t('demo.preset.custom.sub'), icon: <IconSliders size={20} /> },
          ]}
        />
      ),
    },
    {
      id: 'rythme',
      title: t('demo.step.rythme'),
      hint: t('demo.step.rythme.hint'),
      validate: (s) => {
        const e: Record<string, string> = {};
        if (!Number.isInteger(s.pattern.weeks) || s.pattern.weeks < 1 || s.pattern.weeks > 104) e.weeks = t('demo.err.weeks');
        return e;
      },
      render: ({ state, set, errors }) => (
        <>
          <Field id="perWeek" label={t('demo.f.perWeek')} hint={t('demo.f.perWeek.help')}>
            <Segmented
              label={t('demo.f.perWeek')}
              value={String(state.pattern.perWeek)}
              onChange={(v) => set((s) => ({ preset: 'custom', pattern: { ...s.pattern, perWeek: Number(v) } }))}
              options={[0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: <span className="mono" style={{ fontSize: 14, minWidth: 14 }}>{n}</span> }))}
            />
          </Field>
          <Field id="weeks" label={t('demo.f.weeks')} hint={t('demo.f.weeks.help')} error={errors.weeks}>
            <div className="row" style={{ '--gap': '14px' } as React.CSSProperties}>
              <input
                type="range"
                min={1}
                max={104}
                value={state.pattern.weeks}
                aria-label={t('demo.f.weeks')}
                onChange={(e) => set((s) => ({ preset: 'custom', pattern: { ...s.pattern, weeks: Number(e.target.value) } }))}
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
              <TextInput
                id="weeks"
                type="number"
                min={1}
                max={104}
                inputMode="numeric"
                value={Number.isNaN(state.pattern.weeks) ? '' : state.pattern.weeks}
                error={errors.weeks}
                hint
                style={{ width: 96 }}
                onChange={(e) => set((s) => ({ preset: 'custom', pattern: { ...s.pattern, weeks: e.target.value === '' ? Number.NaN : Math.round(Number(e.target.value)) } }))}
              />
            </div>
          </Field>
          <Field id="jitter" label={t('demo.f.jitter')}>
            <Segmented
              label={t('demo.f.jitter')}
              value={String(state.pattern.jitter ?? 1)}
              onChange={(v) => set((s) => ({ preset: 'custom', pattern: { ...s.pattern, jitter: Number(v) } }))}
              options={[0, 1, 2, 3].map((n) => ({ value: String(n), label: t(`demo.jitter.${n}` as MessageKey) }))}
            />
          </Field>
        </>
      ),
    },
    {
      id: 'clubs',
      title: t('demo.step.clubs'),
      hint: t('demo.step.clubs.hint'),
      validate: (s): Errors => (s.pattern.clubs.some((c) => c.weight > 0) ? {} : { clubs: t('demo.err.clubs') }),
      render: ({ state, set, errors }) => {
        const total = state.pattern.clubs.reduce((n, c) => n + c.weight, 0) || 1;
        return (
          <Field id="clubs" label={t('demo.f.clubs')} hint={t('demo.f.clubs.help')} error={errors.clubs}>
            <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties} data-field="clubs">
              {CLUB_IDS.map((club, i) => {
                const w = weightOf(state.pattern, club);
                return (
                  <div key={club} className="card" style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', alignItems: 'center', gap: 14, padding: 10, borderRadius: 16 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- photothèque locale */}
                    <img src={photoUrl(CLUB_PHOTO[club])} alt="" width={56} height={42} style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 10 }} />
                    <div style={{ minWidth: 0 }}>
                      <p className="strong">{CLUB_LABEL[club]}</p>
                      <div className="row" style={{ '--gap': '10px', marginTop: 6 } as React.CSSProperties}>
                        <span className="hbar-track" style={{ flex: 1, display: 'block' }}>
                          <span className="hbar-fill" style={{ display: 'block', width: `${(w / total) * 100}%`, animation: 'none', transition: 'width var(--d-cross) var(--e-standard)' }} />
                        </span>
                        <span className="mono small" style={{ minWidth: 38, textAlign: 'right' }}>
                          {Math.round((w / total) * 100)} %
                        </span>
                      </div>
                    </div>
                    <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                      <button type="button" className="btn btn-secondary btn-sm btn-icon" id={i === 0 ? 'f-clubs' : undefined} aria-label={t('demo.club.less', { club: CLUB_LABEL[club] })} disabled={w <= 0} onClick={() => set((s) => ({ preset: 'custom', pattern: withWeight(s.pattern, club, Math.max(0, w - 1)) }))}>
                        <IconMinus size={16} />
                      </button>
                      <span className="mono strong" style={{ minWidth: 18, textAlign: 'center' }} aria-live="polite">
                        {w}
                      </span>
                      <button type="button" className="btn btn-secondary btn-sm btn-icon" aria-label={t('demo.club.more', { club: CLUB_LABEL[club] })} disabled={w >= 5} onClick={() => set((s) => ({ preset: 'custom', pattern: withWeight(s.pattern, club, Math.min(5, w + 1)) }))}>
                        <IconPlus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>
        );
      },
    },
    {
      id: 'moment',
      title: t('demo.step.moment'),
      hint: t('demo.step.moment.hint'),
      validate: (s): Errors => ((s.pattern.gaps ?? []).filter((g) => g < s.pattern.weeks).length >= s.pattern.weeks ? { gaps: t('demo.err.gaps') } : {}),
      render: ({ state, set, errors }) => {
        const monday = startOfWeek(now);
        const shown = Math.min(state.pattern.weeks, 26);
        return (
          <>
            <Field id="moment" label={t('demo.f.moment')}>
              <Choices<DemoMoment>
                name="moment"
                value={state.pattern.moment}
                min={150}
                onChange={(v) => set((s) => ({ preset: 'custom', pattern: { ...s.pattern, moment: v } }))}
                options={MOMENTS.map((m) => ({ value: m, title: t(`demo.moment.${m}` as MessageKey), sub: t(`demo.moment.${m}.sub` as MessageKey) }))}
              />
            </Field>
            <Field id="gaps" label={t('demo.f.gaps')} hint={t('demo.f.gaps.help')} error={errors.gaps}>
              <Chips<string>
                id="gaps"
                values={(state.pattern.gaps ?? []).map(String)}
                onChange={(v) => set((s) => ({ preset: 'custom', pattern: { ...s.pattern, gaps: v.map(Number).sort((a, b) => a - b) } }))}
                options={Array.from({ length: shown }, (_, n) => ({ value: String(n), label: n === 0 ? t('demo.gap.current') : t('demo.gap.label', { n, date: short(addDays(monday, -7 * n)) }) }))}
              />
            </Field>
          </>
        );
      },
    },
    {
      id: 'tirage',
      title: t('demo.step.tirage'),
      hint: t('demo.step.tirage.hint'),
      validate: (s): Errors => (Number.isInteger(s.pattern.seed) && (s.pattern.seed ?? -1) >= 0 && (s.pattern.seed ?? 0) <= 4294967295 ? {} : { seed: t('demo.err.seed') }),
      render: ({ state, set, errors }) => (
        <>
          <Field id="seed" label={t('demo.f.seed')} hint={t('demo.f.seed.help')} error={errors.seed}>
            <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
              <TextInput
                id="seed"
                className="input mono"
                inputMode="numeric"
                value={Number.isNaN(state.pattern.seed ?? 0) ? '' : String(state.pattern.seed ?? '')}
                error={errors.seed}
                hint
                style={{ maxWidth: 220 }}
                onChange={(e) => set((s) => ({ preset: 'custom', pattern: { ...s.pattern, seed: e.target.value.trim() === '' ? Number.NaN : Number(e.target.value.replace(/\s/g, '')) } }))}
              />
              <button type="button" className="btn btn-secondary" onClick={() => set((s) => ({ preset: 'custom', pattern: { ...s.pattern, seed: Math.floor(Math.random() * 2147483647) } }))}>
                <IconRefresh size={17} />
                {t('demo.seed.new')}
              </button>
            </div>
          </Field>
          <div className="card card-pad row" style={{ '--gap': '16px', alignItems: 'flex-start', flexWrap: 'nowrap' } as React.CSSProperties}>
            <Switch id="rolling" checked={state.rolling} onChange={(v) => set({ rolling: v })} label={t('demo.f.rolling')} />
            <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
              <p className="strong">{t('demo.f.rolling')}</p>
              <p className="small muted">{state.rolling ? t('demo.f.rolling.on') : t('demo.f.rolling.off')}</p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'relire',
      title: t('demo.step.relire'),
      hint: t('wiz.reviewShort'),
      lead: t('wiz.reviewHint'),
      render: ({ state, goTo }) => {
        const p = state.pattern;
        const passages = generatePassages(p, now);
        const last = passages[0];
        const first = passages[passages.length - 1];
        const total = p.clubs.reduce((n, c) => n + c.weight, 0) || 1;
        return (
          <>
            <Review
              goTo={goTo}
              rows={[
                { label: t('demo.r.scenario'), step: 'scenario', value: state.preset === 'custom' ? t('demo.preset.custom') : t(`demo.preset.${state.preset}` as MessageKey) },
                { label: t('demo.r.rythme'), step: 'rythme', value: t('demo.r.rythme.value', { per: p.perWeek, weeks: p.weeks, jitter: t(`demo.jitter.${p.jitter ?? 1}` as MessageKey) }) },
                { label: t('demo.r.clubs'), step: 'clubs', value: p.clubs.filter((c) => c.weight > 0).map((c) => `${CLUB_LABEL[c.club]} ${Math.round((c.weight / total) * 100)} %`).join(' · ') },
                { label: t('demo.r.moment'), step: 'moment', value: t(`demo.moment.${p.moment}` as MessageKey) },
                { label: t('demo.r.gaps'), step: 'moment', value: (p.gaps ?? []).length ? (p.gaps ?? []).map((g) => (g === 0 ? t('demo.gap.current') : `S−${g}`)).join(', ') : t('demo.r.gaps.none') },
                { label: t('demo.r.tirage'), step: 'tirage', value: t('demo.r.tirage.value', { seed: String(p.seed ?? ''), mode: state.rolling ? t('demo.r.mode.rolling') : t('demo.r.mode.fixed') }) },
              ]}
            />
            <div className="callout" data-kind={passages.length ? 'pos' : 'warn'}>
              <IconSliders />
              <span>
                <span className="callout-title">{t('demo.r.result')} — </span>
                {passages.length && first && last ? t('demo.r.result.value', { n: passages.length, from: short(first.date), to: short(last.date) }) : t('demo.r.empty')}
              </span>
            </div>
          </>
        );
      },
    },
  ];

  return (
    <Wizard<DemoDraft>
      open={open}
      onClose={onClose}
      kicker={t('demo.wiz.kicker', { id: DEMO_MEMBER_ID })}
      title={t('demo.wiz.title')}
      icon={<IconSliders size={22} />}
      steps={steps}
      initial={initial}
      draftKey="demo"
      submitLabel={t('demo.submit')}
      preview={(state) => {
        const passages = safeGenerate(state.pattern, now);
        return (
          <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
            <DemoCharts passages={passages} nowIso={nowIso} compact />
            <div className="phones">
              <DemoPhone passages={passages} nowIso={nowIso} scheme="light" size="sm" caption={`${t('theme.light')} · ${t('theme.lightSub')}`} />
            </div>
          </div>
        );
      }}
      onSubmit={async (state) => {
        const res = await fetch(API.demoPassages(DEMO_MEMBER_ID), {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pattern: state.pattern, rolling: state.rolling }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
          return { ok: false, error: t('demo.err.api', { why: body.fields ? Object.keys(body.fields).join(', ') : (body.error ?? String(res.status)) }) };
        }
        const body = (await res.json()) as DemoPassagesResponse;
        return { ok: true, message: t('demo.saved', { n: body.passages.length }) };
      }}
    />
  );
}

/** Un réglage en cours de saisie peut être incomplet (champ vidé) : l'aperçu ne doit jamais casser. */
function safeGenerate(p: DemoPattern, now: Date) {
  const weeks = Number.isFinite(p.weeks) ? Math.min(104, Math.max(1, p.weeks)) : 1;
  const seed = Number.isFinite(p.seed ?? 0) ? p.seed : 1;
  return generatePassages({ ...p, weeks, seed }, now);
}
