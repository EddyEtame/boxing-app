'use client';

import { useRouter } from 'next/navigation';

import { saveModerationRules } from './actions';
import { AgeStepper } from '@/components/team/AgeStepper';
import { IconInfo, IconShieldCheck } from '@/components/icons';
import { Choices, Field, Review } from '@/components/wizard/fields';
import { Wizard, type Errors, type WizardStep } from '@/components/wizard/Wizard';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { AGE_BOUNDS, type QueueItem } from '@/lib/team/moderation';
import { SPARRING, type ModerationRules } from '@/lib/types';

/**
 * Les règles de la modération (CDC §11 E) : l'âge du sparring, l'âge des autres
 * catégories, et le passage obligé par l'équipe. L'aperçu compte, sur la file
 * réelle, ce que la nouvelle règle change avant qu'on l'enregistre.
 */
type Draft = { sparringMinAge: number; otherMinAge: number; premoderation: 'oui' | 'non' };

export function RulesWizard({ open, onClose, rules, items }: { open: boolean; onClose: () => void; rules: ModerationRules; items: QueueItem[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const initial: Draft = { sparringMinAge: rules.sparringMinAge, otherMinAge: rules.otherMinAge, premoderation: rules.premoderation ? 'oui' : 'non' };

  const under = (d: Pick<Draft, 'sparringMinAge' | 'otherMinAge'>) =>
    items.filter((p) => p.status !== 'retiree' && p.organizer.age !== undefined && p.organizer.age < (SPARRING.includes(p.type) ? d.sparringMinAge : d.otherMinAge)).length;

  const orderError = (s: Draft): Errors => (s.otherMinAge > s.sparringMinAge ? { otherMinAge: t('team.rules.err.order') } : {});

  const steps: WizardStep<Draft>[] = [
    {
      id: 'sparring',
      title: t('team.rules.sparring'),
      hint: t('team.rules.sparring.hint'),
      render: ({ state, set }) => (
        <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
          <Field id="sparringMinAge" label={t('team.rules.sparring.label')} hint={t('team.rules.sparring.help')}>
            <AgeStepper id="sparringMinAge" label={t('team.rules.sparring.label')} value={state.sparringMinAge} min={AGE_BOUNDS.sparring.min} max={AGE_BOUNDS.sparring.max} onChange={(v) => set({ sparringMinAge: v })} />
          </Field>
          <div className="callout" role="note">
            <IconInfo />
            <span>{t('team.rules.sparring.cdc')}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'autres',
      title: t('team.rules.other'),
      hint: t('team.rules.other.hint'),
      validate: orderError,
      render: ({ state, set, errors }) => (
        <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
          <Field id="otherMinAge" label={t('team.rules.other.label')} hint={t('team.rules.other.help')} error={errors.otherMinAge}>
            <AgeStepper id="otherMinAge" label={t('team.rules.other.label')} value={state.otherMinAge} min={AGE_BOUNDS.other.min} max={AGE_BOUNDS.other.max} onChange={(v) => set({ otherMinAge: v })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'premoderation',
      title: t('team.rules.premod'),
      hint: t('team.rules.premod.hint'),
      render: ({ state, set }) => (
        <Choices<'oui' | 'non'>
          name="premoderation"
          value={state.premoderation}
          min={260}
          onChange={(v) => set({ premoderation: v })}
          options={[
            { value: 'oui', title: t('team.rules.premod.on'), sub: t('team.rules.premod.on.sub') },
            { value: 'non', title: t('team.rules.premod.off'), sub: t('team.rules.premod.off.sub') },
          ]}
        />
      ),
    },
    {
      id: 'relire',
      title: t('wiz.review'),
      hint: t('wiz.reviewHint'),
      render: ({ state, goTo }) => (
        <Review
          goTo={goTo}
          rows={[
            { label: t('team.rules.sparring.label'), value: t('team.rules.ageValue', { n: state.sparringMinAge }), step: 'sparring' },
            { label: t('team.rules.other.label'), value: t('team.rules.ageValue', { n: state.otherMinAge }), step: 'autres' },
            { label: t('team.rules.premod'), value: state.premoderation === 'oui' ? t('team.rules.premod.on') : t('team.rules.premod.off'), step: 'premoderation' },
          ]}
        />
      ),
    },
  ];

  const preview = (s: Draft) => {
    const now = under({ sparringMinAge: rules.sparringMinAge, otherMinAge: rules.otherMinAge });
    const next = under(s);
    return (
      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <div className="team-rule-card">
          <p className="eyebrow">{t('team.rules.preview.sparring')}</p>
          <p className="team-rule-big">{t('team.rules.ageValue', { n: s.sparringMinAge })}</p>
          <p className="eyebrow">{t('team.rules.preview.other')}</p>
          <p className="team-rule-big">{t('team.rules.ageValue', { n: s.otherMinAge })}</p>
          <p className="small">{s.premoderation === 'oui' ? t('team.rules.premod.on.sub') : t('team.rules.premod.off.sub')}</p>
        </div>
        <div className="callout" data-kind={next > now ? 'warn' : 'pos'} role="status">
          <IconShieldCheck />
          <span>{next === now ? t('team.rules.preview.same', { n: next }) : t('team.rules.preview.change', { before: now, after: next })}</span>
        </div>
        <p className="small dim">{t('team.rules.preview.note')}</p>
      </div>
    );
  };

  return (
    <Wizard<Draft>
      open={open}
      onClose={onClose}
      kicker={t('team.rules.kicker')}
      title={t('team.rules.title')}
      icon={<IconShieldCheck />}
      steps={steps}
      initial={initial}
      preview={preview}
      previewLabel={t('team.rules.preview.label')}
      submitLabel={t('btn.save')}
      onSubmit={async (s) => {
        const res = await saveModerationRules({ sparringMinAge: s.sparringMinAge, otherMinAge: s.otherMinAge, premoderation: s.premoderation === 'oui' });
        if (!res.ok) {
          const fe = res.fieldErrors ? Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, t(v as MessageKey)])) : undefined;
          return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors: fe, step: fe?.otherMinAge ? 'autres' : fe?.sparringMinAge ? 'sparring' : undefined };
        }
        const before = { sparringMinAge: rules.sparringMinAge, otherMinAge: rules.otherMinAge, premoderation: rules.premoderation };
        return {
          ok: true,
          message: t('team.rules.saved'),
          undo: async () => {
            await saveModerationRules(before);
            router.refresh();
          },
        };
      }}
    />
  );
}
