'use client';

import { IconBell, IconCalendarPlus, IconCheck, IconEdit, IconSend } from '@/components/icons';
import { Choices, Field, Select, Switch, TextInput } from '@/components/wizard/fields';
import { frTypoChanges } from '@/i18n/core';
import { useI18n } from '@/i18n/client';
import { CLUB_IDS, CLUB_LABEL } from '@/lib/clubs';
import { parisToInstant, todayParis, wallNowParis } from '@/lib/content/rules';
import type { PublishMode } from '@/lib/content/types';
import { fmtDateTime } from '@/lib/format';
import type { Audience, ClubId } from '@/lib/types';

/**
 * Les étapes que partagent les assistants de contenus : la publication
 * (maintenant, programmée, brouillon), la diffusion (club, public,
 * importance) et la note de typographie française.
 */

function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Les raccourcis, calculés au clic (jamais au rendu serveur). */
function quick(kind: 'evening' | 'morning' | 'saturday'): { date: string; time: string } {
  const today = todayParis();
  const now = wallNowParis();
  if (kind === 'evening') return now.slice(11) < '17:45' ? { date: today, time: '18:00' } : { date: shiftYmd(today, 1), time: '18:00' };
  if (kind === 'morning') return { date: shiftYmd(today, 1), time: '08:00' };
  const days = (6 - weekdayOf(today) + 7) % 7 || 7;
  return { date: shiftYmd(today, days), time: '10:00' };
}

export function PublishFields({
  mode,
  date,
  time,
  onChange,
  errors,
  wasPublished,
  allowSchedule = true,
}: {
  mode: PublishMode;
  date: string;
  time: string;
  onChange: (patch: { mode?: PublishMode; publishDate?: string; publishTime?: string }) => void;
  errors: Record<string, string>;
  wasPublished: boolean;
  allowSchedule?: boolean;
}) {
  const { t, locale } = useI18n();
  const at = mode === 'programme' ? parisToInstant(date, time) : null;
  return (
    <>
      <Field id="mode" label={t('contenu.step.publication')} error={errors.mode}>
        <Choices<PublishMode>
          name="mode"
          value={mode}
          min={180}
          onChange={(v) => onChange({ mode: v })}
          options={[
            { value: 'publie', title: wasPublished ? t('contenu.pub.keep') : t('contenu.pub.now'), sub: wasPublished ? t('contenu.pub.keep.sub') : t('contenu.pub.now.sub'), icon: <IconSend size={20} /> },
            ...(allowSchedule ? [{ value: 'programme' as const, title: t('contenu.pub.later'), sub: t('contenu.pub.later.sub'), icon: <IconCalendarPlus size={20} /> }] : []),
            { value: 'brouillon', title: t('contenu.pub.draft'), sub: t('contenu.pub.draft.sub'), icon: <IconEdit size={20} /> },
          ]}
        />
      </Field>
      {mode === 'programme' ? (
        <div className="card card-pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <div className="form-grid ct-grid">
            <Field id="publishDate" label={t('contenu.pub.date')} error={errors.publishDate}>
              <TextInput id="publishDate" type="date" value={date} error={errors.publishDate} onChange={(e) => onChange({ publishDate: e.target.value })} />
            </Field>
            <Field id="publishTime" label={t('contenu.pub.time')} error={errors.publishTime}>
              <TextInput id="publishTime" type="time" step={300} value={time} error={errors.publishTime} onChange={(e) => onChange({ publishTime: e.target.value })} />
            </Field>
          </div>
          <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
            <span className="small dim">{t('contenu.pub.quick')}</span>
            {(['evening', 'morning', 'saturday'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className="chip ct-chip-sm"
                onClick={() => {
                  const q = quick(k);
                  onChange({ publishDate: q.date, publishTime: q.time });
                }}
              >
                {t(`contenu.pub.quick.${k}`)}
              </button>
            ))}
          </div>
          {at && !errors.publishDate && !errors.publishTime ? (
            <p className="small ct-when">
              <IconCheck size={15} />
              {t('contenu.pub.when', { when: fmtDateTime(locale, at.toISOString()) })}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Club, public, importance : à qui parle ce contenu. */
export function DiffusionFields({
  club,
  audience,
  important,
  onChange,
  errors,
  scope,
  showClub = true,
}: {
  club: ClubId | 'reseau';
  audience: Audience;
  important: boolean;
  onChange: (patch: { club?: ClubId | 'reseau'; audience?: Audience; important?: boolean }) => void;
  errors: Record<string, string>;
  scope: ClubId[] | 'all';
  showClub?: boolean;
}) {
  const { t } = useI18n();
  const clubs = scope === 'all' ? CLUB_IDS : CLUB_IDS.filter((c) => scope.includes(c));
  return (
    <>
      {showClub ? (
        <Field id="club" label={t('contenu.f.club')} hint={t('contenu.f.club.help')} error={errors.club}>
          <Select<ClubId | 'reseau'>
            id="club"
            value={club}
            error={errors.club}
            onChange={(v) => onChange({ club: v })}
            options={[...(scope === 'all' ? [{ value: 'reseau' as const, label: t('club.all') }] : []), ...clubs.map((c) => ({ value: c, label: CLUB_LABEL[c] }))]}
          />
        </Field>
      ) : null}
      <Field id="audience" label={t('contenu.f.audience')} error={errors.audience}>
        <Choices<Audience>
          name="audience"
          value={audience}
          min={220}
          onChange={(v) => onChange({ audience: v })}
          options={[
            { value: 'tous', title: t('audience.tous'), sub: t('contenu.audience.tous.sub') },
            { value: 'actifs', title: t('audience.actifs'), sub: t('contenu.audience.actifs.sub') },
          ]}
        />
      </Field>
      <div className="card card-pad row ct-switch-card">
        <Switch id="important" checked={important} onChange={(v) => onChange({ important: v })} label={t('contenu.f.important')} />
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <p className="strong row" style={{ '--gap': '6px' } as React.CSSProperties}>
            <IconBell size={16} />
            {t('contenu.f.important')}
          </p>
          <p className="small muted">{t('contenu.f.important.sub')}</p>
        </div>
      </div>
    </>
  );
}

/** Ce que la typographie française corrigera à l'enregistrement. */
export function TypoNote({ texts }: { texts: string[] }) {
  const { t } = useI18n();
  const n = texts.reduce((sum, s) => sum + frTypoChanges(s), 0);
  return (
    <p className="small ct-typo" data-on={n > 0 || undefined} aria-live="polite">
      <IconCheck size={15} />
      {n > 0 ? t('contenu.typo', { n }) : t('contenu.typo.none')}
    </p>
  );
}
