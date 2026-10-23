'use client';

import { useMemo, useState } from 'react';

import { Kpi } from '@/components/charts/Charts';
import { IconAlert, IconCheck, IconInfo } from '@/components/icons';
import { DataTable, type Column } from '@/components/table/DataTable';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { coachLoads, planningChecks, type CoachLoad, type PlanningCheck } from '@/lib/planning/checks';
import { duree, heure, isFree } from '@/lib/planning/model';
import type { Slot } from '@/lib/types';

/**
 * LES CONTRÔLES — l'admin relit le planning à chaque ouverture : un coach à
 * deux endroits au même moment, un trajet impossible entre deux clubs, un
 * libellé qui contredit son horaire, un doublon, des cours sans coach. Et la
 * charge de chaque coach sur la semaine type, pour équilibrer avant la rentrée.
 */
export function ControlsView({ slots, onOpen, onFocusCoach, onMove }: { slots: Slot[]; onOpen: (s: Slot) => void; onFocusCoach: (coach: string, club: Slot['club']) => void; onMove?: (s: Slot) => void }) {
  const { t } = useI18n();
  const checks = useMemo(() => planningChecks(slots), [slots]);
  const loads = useMemo(() => coachLoads(slots), [slots]);
  const courses = slots.filter((s) => !isFree(s));
  const minutes = courses.reduce((n, s) => n + s.fin - s.debut, 0);
  const missing = courses.filter((s) => !s.coach?.trim()).length;
  const blocking = checks.filter((c) => c.level === 'bloquant').length;

  const line = (s: Slot) => `${CLUB_LABEL[s.club]}${s.espace ? ` (${s.espace})` : ''} · ${t(`day.${s.jour}` as MessageKey)} ${heure(s.debut)}–${heure(s.fin)} · ${s.activite}`;

  const columns: Column<CoachLoad>[] = [
    { id: 'coach', header: t('planning.c.coach'), cell: (c) => <span className="row-title">{c.coach}</span>, sortValue: (c) => c.coach },
    { id: 'courses', header: t('planning.c.courses'), num: true, cell: (c) => c.courses, sortValue: (c) => c.courses },
    { id: 'hours', header: t('planning.c.hours'), num: true, cell: (c) => duree(c.minutes), sortValue: (c) => c.minutes },
    { id: 'clubs', header: t('planning.c.clubs'), cell: (c) => c.clubs.map((k) => CLUB_LABEL[k as Slot['club']]).join(', '), sortValue: (c) => c.clubs.length },
    { id: 'days', header: t('planning.c.days'), cell: (c) => c.days.map((j) => t(`planning.dayShort.${j}` as MessageKey)).join(' '), sortValue: (c) => c.days.length },
  ];

  return (
    <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
      <div className="grid grid-4">
        <Kpi label={t('planning.k.courses')} value={courses.length} sub={t('planning.k.courses.sub', { h: duree(minutes) })} />
        <Kpi label={t('planning.k.coaches')} value={loads.length} sub={t('planning.k.coaches.sub')} />
        <Kpi label={t('planning.k.blocking')} value={blocking} sub={blocking ? t('planning.k.blocking.sub') : t('planning.k.blocking.none')} />
        <Kpi label={t('planning.k.missing')} value={missing} sub={t('planning.k.missing.sub')} />
      </div>

      <section className="panel" aria-labelledby="checks-title">
        <div className="panel-head">
          <div>
            <h3 id="checks-title" className="panel-title">
              {t('planning.checks.title')}
            </h3>
            <p className="panel-sub">{t('planning.checks.sub')}</p>
          </div>
        </div>
        <div className="panel-body stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          {checks.length === 0 ? (
            <div className="callout" data-kind="pos">
              <IconCheck />
              <span>{t('planning.checks.none')}</span>
            </div>
          ) : null}
          {checks.map((c, i) => (
            <CheckCard key={`${c.kind}-${i}`} check={c} line={line} onOpen={onOpen} onMove={onMove} />
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="load-title">
        <div className="panel-head">
          <div>
            <h3 id="load-title" className="panel-title">
              {t('planning.load.title')}
            </h3>
            <p className="panel-sub">{t('planning.load.sub')}</p>
          </div>
        </div>
        <div className="panel-body">
          <DataTable<CoachLoad> rows={loads} columns={columns} rowKey={(c) => c.coach} rowName={(c) => c.coach} caption={t('planning.load.title')} initialSort={{ id: 'hours', dir: 'desc' }} onOpen={(c) => onFocusCoach(c.coach, c.slots[0].club)} />
        </div>
      </section>
    </div>
  );
}

function CheckCard({ check, line, onOpen, onMove }: { check: PlanningCheck; line: (s: Slot) => string; onOpen: (s: Slot) => void; onMove?: (s: Slot) => void }) {
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  const kind = check.level === 'bloquant' ? 'neg' : check.level === 'attention' ? 'warn' : undefined;
  const long = check.slots.length > 8;
  const shown = long && !all ? check.slots.slice(0, 6) : check.slots;
  return (
    <article className="callout check-card" data-kind={kind}>
      {check.level === 'info' ? <IconInfo /> : <IconAlert />}
      <div className="check-body">
        <p>
          <span className={`tag ${check.level === 'bloquant' ? 'tag-neg' : check.level === 'attention' ? 'tag-warn' : 'tag-ink'}`}>{t(`planning.level.${check.level}` as MessageKey)}</span>{' '}
          <span className="callout-title">
            {t(`planning.chk.${check.kind}` as MessageKey, {
              coach: check.coach ?? '',
              a: check.names?.[0] ?? '',
              b: check.names?.[1] ?? '',
              n: check.slots.length,
              written: check.written ? `${heure(check.written.debut)}–${heure(check.written.fin)}` : '',
            })}
          </span>
        </p>
        <p className="check-help">{t(`planning.chk.${check.kind}.help` as MessageKey)}</p>
        <ul className="check-slots">
          {shown.map((s) => (
            <li key={s.id}>
              <button type="button" className="linkish" onClick={() => onOpen(s)}>
                {line(s)}
              </button>
              {onMove && check.kind !== 'sans-coach' && check.kind !== 'homonyme' ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMove(s)}>
                  {t('planning.act.move')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {long ? (
          <button type="button" className="btn btn-ghost btn-sm check-more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? t('planning.chk.less') : t('planning.chk.more', { n: check.slots.length - 6 })}
          </button>
        ) : null}
      </div>
    </article>
  );
}
