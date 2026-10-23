'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { IconAlert, IconArrow, IconCheck, IconClock, IconRefresh } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { useNow } from '@/components/useNow';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { fmtDateTime, relative } from '@/lib/format';
import type { Connection, ConnectionsReport, ConnId, ConnState, Fact } from '@/server/branchements';

const GROUPS: { id: string; items: ConnId[] }[] = [
  { id: 'app', items: ['app-mesure', 'app-lecture'] },
  { id: 'planning', items: ['planning-source', 'planning-regle'] },
  { id: 'services', items: ['deciplus', 'push', 'video', 'erreurs', 'boutique', 'combats'] },
  { id: 'admin', items: ['session', 'base', 'sauvegardes'] },
];

const STATES: ConnState[] = ['ok', 'attente', 'off', 'erreur'];

/**
 * BRANCHEMENTS (CDC §17) — l'état réel de tout ce à quoi l'admin est relié.
 * Une ligne par système : son état, la preuve (les chiffres mesurés), ce qui
 * manque pour le brancher (le nom des variables, jamais leurs valeurs).
 */
export function ConnectionsView({ report }: { report: ConnectionsReport }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const now = useNow(15_000);
  const [pending, start] = useTransition();
  const byId = new Map(report.items.map((c) => [c.id, c]));
  const count = (s: ConnState) => report.items.filter((c) => c.state === s).length;

  return (
    <>
      <PageHeader
        kicker={t('sys.conn.kicker')}
        title={t('sys.conn.title')}
        lead={t('sys.conn.lead')}
        actions={
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => start(() => router.refresh())}>
            {pending ? <span className="spinner" aria-hidden="true" /> : <IconRefresh size={18} />}
            {t('btn.check')}
          </button>
        }
        meta={
          <p className="conn-checked">
            <IconClock size={14} />
            {t('sys.conn.checked', { when: relative(t, locale, report.checkedAt, now) })}
          </p>
        }
      />

      <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
        <div className="conn-summary" role="list" aria-label={t('sys.conn.summary')}>
          {STATES.map((s) => (
            <div key={s} role="listitem" className="conn-sum" data-state={s}>
              <span className="conn-dot" aria-hidden="true" />
              <b>{count(s)}</b>
              <span>{t(`sys.state.${s}` as MessageKey)}</span>
            </div>
          ))}
        </div>

        {GROUPS.map((g) => (
          <section key={g.id} aria-labelledby={`conn-${g.id}`} className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <div className="section-title">
              <div>
                <h2 id={`conn-${g.id}`}>{t(`sys.group.${g.id}` as MessageKey)}</h2>
                <p>{t(`sys.group.${g.id}.sub` as MessageKey)}</p>
              </div>
            </div>
            <div className="conn-list">
              {g.items.map((id) => {
                const c = byId.get(id);
                return c ? <ConnectionRow key={id} c={c} /> : null;
              })}
            </div>
          </section>
        ))}

        <p className="field-help">{t('sys.conn.foot', { time: fmtDateTime(locale, report.checkedAt) })}</p>
      </div>
    </>
  );
}

function ConnectionRow({ c }: { c: Connection }) {
  const { t, locale } = useI18n();
  const now = useNow(30_000);
  const fact = (f: Fact) => {
    if (f.as === 'date' && typeof f.v === 'string') return `${fmtDateTime(locale, f.v)} (${relative(t, locale, f.v, now)})`;
    if (f.as === 'num' && typeof f.v === 'number') return f.v.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB');
    if (f.as === 'ms') return `${f.v} ms`;
    if (f.as === 'bytes' && typeof f.v === 'number') {
      const fmt = (n: number) => n.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 });
      return f.v > 1_048_576 ? `${fmt(f.v / 1_048_576)} ${locale === 'fr' ? 'Mo' : 'MB'}` : `${fmt(Math.max(1, Math.round(f.v / 1024)))} ${locale === 'fr' ? 'ko' : 'kB'}`;
    }
    if (f.as === 'key' && typeof f.v === 'string') return t(f.v as MessageKey);
    return String(f.v);
  };
  return (
    <article className="conn" data-state={c.state} aria-labelledby={`c-${c.id}`}>
      <div className="conn-state">
        <span className="conn-badge" data-state={c.state}>
          {c.state === 'ok' ? <IconCheck size={14} /> : c.state === 'erreur' ? <IconAlert size={14} /> : <span className="conn-dot" aria-hidden="true" />}
          {t(`sys.state.${c.state}` as MessageKey)}
        </span>
      </div>
      <div className="conn-main">
        <h3 id={`c-${c.id}`} className="conn-title">
          {t(`sys.c.${c.id}` as MessageKey)}
        </h3>
        <p className="conn-what">{t(`sys.c.${c.id}.what` as MessageKey)}</p>
        {c.facts.length ? (
          <dl className="conn-facts">
            {c.facts.map((f, i) => (
              <div key={`${f.k}-${i}`}>
                <dt>{t(f.k as MessageKey)}</dt>
                <dd>{fact(f)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {c.error ? (
          <p className="conn-error">
            <IconAlert size={14} />
            {c.error}
          </p>
        ) : null}
        {c.state !== 'ok' ? <p className="conn-next">{t(`sys.c.${c.id}.${c.state}` as MessageKey)}</p> : null}
      </div>
      <div className="conn-side">
        {c.env?.length ? (
          <ul className="conn-env" aria-label={t('sys.env')}>
            {c.env.map((e) => (
              <li key={e.name} data-set={e.set || undefined} data-optional={(!e.set && e.optional) || undefined}>
                <code>{e.name}</code>
                <span>{e.set ? t('sys.env.set') : e.optional ? t('sys.env.optional') : t('sys.env.missing')}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {c.href ? (
          <Link className="btn btn-ghost btn-sm" href={c.href}>
            {t('btn.open')}
            <IconArrow size={15} />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
