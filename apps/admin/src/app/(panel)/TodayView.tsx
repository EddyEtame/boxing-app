'use client';

import Link from 'next/link';

import { Columns, Kpi } from '@/components/charts/Charts';
import { IconAlert, IconArrow, IconCheck } from '@/components/icons';
import { NavIcon } from '@/components/NavIcon';
import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CREATE_ACTIONS } from '@/lib/actions-registry';
import { CLUB_LABEL, CLUB_PHOTO, photoThumb } from '@/lib/clubs';
import { fmtDate } from '@/lib/format';
import { heure, normaliseActivite } from '@/lib/planning/model';
import type { TodayData } from '@/server/today';

/**
 * AUJOURD'HUI — le tableau du matin (CDC §15). Rien ne s'y modifie : chaque
 * ligne mène à sa rubrique. Dans l'ordre : ce qui attend une action, la journée
 * dans les cinq clubs, la vitrine de la semaine, l'état des branchements, et
 * pour la direction, les premiers pas tant qu'ils ne sont pas tous faits.
 */
export function TodayView({ data, name, actions, refused }: { data: TodayData; name: string | null; actions: string[]; refused: string | null }) {
  const { t, locale } = useI18n();
  const longDate = fmtDate(locale, data.date, { weekday: 'long', day: 'numeric', month: 'long' });
  const creates = CREATE_ACTIONS.filter((a) => actions.includes(a.id));
  const steps = data.firstSteps;
  const stepsDone = steps ? steps.filter((s) => s.done).length : 0;

  return (
    <>
      <PageHeader
        kicker={longDate}
        title={t('nav.aujourdhui')}
        lead={data.nowMin >= 18 * 60 ? (name ? t('today.evening', { name }) : t('today.eveningTeam')) : name ? t('today.hello', { name }) : t('today.helloTeam')}
      />

      <div className="stack today" style={{ '--gap': '26px' } as React.CSSProperties}>
        {refused ? (
          <div className="callout" data-kind="warn" role="status">
            <IconAlert />
            <span>{t('err.refus')}</span>
          </div>
        ) : null}

        <section aria-labelledby="todo-title" className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="section-title">
            <div>
              <h2 id="todo-title">{t('today.todo')}</h2>
              <p>{t('today.todo.sub')}</p>
            </div>
          </div>
          {data.todo.length ? (
            <ul className="todo-list">
              {data.todo.map((x) => (
                <li key={x.id}>
                  <Link href={x.href} className="todo" data-level={x.level}>
                    <span className="todo-count">{x.count}</span>
                    <span className="todo-text">
                      <b>{t(`today.todo.${x.id}` as MessageKey, { n: x.count })}</b>
                      <small>{t(`today.todo.${x.id}.sub` as MessageKey)}</small>
                    </span>
                    <IconArrow size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="callout" data-kind="pos">
              <IconCheck />
              <span>{t('today.todo.none')}</span>
            </div>
          )}
        </section>

        {data.clubs ? (
          <section aria-labelledby="clubs-title" className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            <div className="section-title">
              <div>
                <h2 id="clubs-title">{t('today.clubs')}</h2>
                <p>{t('today.clubs.sub')}</p>
              </div>
              <Link className="btn btn-ghost btn-sm" href="/plannings?vue=reseau">
                {t('today.clubs.network')}
                <IconArrow size={15} />
              </Link>
            </div>
            <div className="today-clubs">
              {data.clubs.map((c) => (
                <Link key={c.club} href={`/plannings?club=${c.club}`} className="today-club">
                  <span className="today-club-photo" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0) 20%, rgba(8,8,8,0.78)), url(${photoThumb(CLUB_PHOTO[c.club], 384)})` }}>
                    <b>{CLUB_LABEL[c.club]}</b>
                    <small>{c.total ? t('today.club.count', { n: c.total }) : t('today.club.none')}</small>
                  </span>
                  <span className="today-club-next">
                    {c.next ? (
                      <>
                        <span className="today-next-label">{c.next.debut <= data.nowMin ? t('today.club.now') : t('today.club.next')}</span>
                        <span className="today-next-time">
                          {heure(c.next.debut)}–{heure(c.next.fin)}
                        </span>
                        <span className="today-next-name">
                          {normaliseActivite(c.next.activite).libelle}
                          {c.next.espace ? ` · ${c.next.espace}` : ''}
                        </span>
                      </>
                    ) : (
                      <span className="today-next-label">{c.done ? t('today.club.done') : t('today.club.nothing')}</span>
                    )}
                    {c.cancelled ? <span className="tag tag-neg">{t('today.club.cancelled', { n: c.cancelled })}</span> : null}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.vitrine ? (
          <section aria-labelledby="vitrine-title" className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            <div className="section-title">
              <div>
                <h2 id="vitrine-title">{t('today.vitrine')}</h2>
                <p>{t('today.vitrine.sub')}</p>
              </div>
              <Link className="btn btn-ghost btn-sm" href="/statistiques?periode=7">
                {t('today.vitrine.more')}
                <IconArrow size={15} />
              </Link>
            </div>
            <div className="today-vitrine">
              <div className="grid grid-3" style={{ '--gap': '12px' } as React.CSSProperties}>
                <Kpi label={t('today.k.visitors')} value={data.vitrine.visitors} sub={t('today.k.visits', { n: data.vitrine.visits })} />
                <Kpi label={t('today.k.cta')} value={`${(data.vitrine.ctaRate * 100).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })} %`} sub={t('today.k.cta.sub')} />
                <Kpi label={t('today.k.plannings')} value={data.vitrine.plannings} sub={t('today.k.plannings.sub')} />
              </div>
              <div className="panel today-chart">
                <Columns
                  data={data.vitrine.perDay.map((p, i) => ({ key: p.day, label: fmtDate(locale, p.day, { weekday: 'long', day: 'numeric', month: 'long' }), axis: fmtDate(locale, p.day, { weekday: 'short' }), value: p.visits, soft: i === data.vitrine!.perDay.length - 1 }))}
                  height={150}
                  barWidth={22}
                  ariaLabel={t('today.vitrine')}
                />
              </div>
            </div>
            {data.vitrine.demoShare > 0.5 ? <p className="field-help">{t('today.vitrine.demo')}</p> : null}
          </section>
        ) : null}

        {data.connections ? (
          <section aria-labelledby="conn-title" className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            <div className="section-title">
              <div>
                <h2 id="conn-title">{t('today.conn')}</h2>
                <p>{t('today.conn.sub')}</p>
              </div>
              <Link className="btn btn-ghost btn-sm" href="/branchements">
                {t('btn.open')}
                <IconArrow size={15} />
              </Link>
            </div>
            <ul className="today-conns">
              {data.connections.map((c) => (
                <li key={c.id} data-state={c.state}>
                  <span className="conn-dot" aria-hidden="true" />
                  <span>{t(`sys.c.${c.id}` as MessageKey)}</span>
                  <small>{t(`sys.state.${c.state}` as MessageKey)}</small>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {steps ? (
          <section aria-labelledby="steps-title" className="panel today-steps">
            <div className="panel-head">
              <div>
                <h2 id="steps-title" className="panel-title">
                  {t('today.steps')}
                </h2>
                <p className="panel-sub">{t('today.steps.sub', { n: stepsDone, total: steps.length })}</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="steps-bar" aria-hidden="true">
                <span style={{ width: `${(stepsDone / steps.length) * 100}%` }} />
              </div>
              <ol className="steps">
                {steps.map((s) => (
                  <li key={s.id} data-done={s.done || undefined}>
                    <span className="step-check" aria-hidden="true">
                      {s.done ? <IconCheck size={14} /> : null}
                    </span>
                    <span className="step-text">
                      <b>{t(`today.step.${s.id}` as MessageKey)}</b>
                      <small>{t(`today.step.${s.id}.sub` as MessageKey)}</small>
                    </span>
                    {s.done ? <span className="sr-only">{t('today.step.done')}</span> : (
                      <Link className="btn btn-secondary btn-sm" href={s.href}>
                        {t('today.step.go')}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {creates.length ? (
          <section aria-labelledby="create-title" className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            <div className="section-title">
              <div>
                <h2 id="create-title">{t('today.create')}</h2>
                <p>{t('today.create.sub')}</p>
              </div>
            </div>
            <div className="templates">
              {creates.map((a) => (
                <Link key={a.id} href={a.href} className="template">
                  <span className="template-icon">
                    <NavIcon name={a.icon} size={20} />
                  </span>
                  <span className="template-title">{t(a.label)}</span>
                  <span className="template-sub">{t(a.hint)}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
