'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { IconAlert, IconArrow, IconCheck, IconRefresh, IconShield } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { useNow } from '@/components/useNow';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { relative } from '@/lib/format';
import type { Connection } from '@/server/branchements';
import type { LinkRequestReview, ShopHealthReport } from '@/server/member-bridge';

/** CDC §18A, ligne par ligne : où vit la donnée, comment la lire, ce que l'app fait sans elle. */
const DATA = ['comptes', 'statuts', 'echeances', 'impayes', 'factures', 'badges', 'passages'] as const;
const ROUTES = ['xplor', 'valideur', 'comptoir'] as const;

/**
 * DECIPLUS (CDC §2, §15, §18A) — « consultation du statut de connexion à
 * Deciplus ». L'état du pont, mesuré ; ce que l'app doit lire de Deciplus et par
 * où ; la règle de rapprochement d'un compte ; les trois voies pour le badge à
 * la porte. Deciplus n'a pas d'API publique (vérifié le 17/10/2026) : la lecture
 * passe par le robot existant de la boutique, qui parle à son API interne.
 */
export function DeciplusView({
  bridge,
  checkedAt,
  demo,
  shop,
  review,
}: {
  bridge: Connection;
  checkedAt: string;
  demo: { memberId: string; passages: number; updatedAt: string };
  shop: ShopHealthReport | null;
  review: LinkRequestReview[] | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const now = useNow(15_000);
  const [pending, start] = useTransition();
  const latency = bridge.facts.find((f) => f.k === 'sys.fact.latency')?.v;

  return (
    <>
      <PageHeader
        kicker={t('deci.kicker')}
        title={t('deci.title')}
        lead={t('deci.lead')}
        actions={
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => start(() => router.refresh())}>
            {pending ? <span className="spinner" aria-hidden="true" /> : <IconRefresh size={18} />}
            {t('btn.check')}
          </button>
        }
      />

      <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
        <section className="panel deci-status" data-state={bridge.state} aria-labelledby="deci-status">
          <div className="deci-status-main">
            <span className="conn-badge" data-state={bridge.state}>
              {bridge.state === 'ok' ? <IconCheck size={14} /> : bridge.state === 'erreur' ? <IconAlert size={14} /> : <span className="conn-dot" aria-hidden="true" />}
              {t(`sys.state.${bridge.state}` as MessageKey)}
            </span>
            <h2 id="deci-status" className="deci-status-title">
              {t(`deci.status.${bridge.state}` as MessageKey)}
            </h2>
            <p className="deci-status-text">{t(`deci.status.${bridge.state}.sub` as MessageKey)}</p>
            {bridge.error ? (
              <p className="conn-error">
                <IconAlert size={14} />
                {bridge.error}
              </p>
            ) : null}
            <p className="conn-checked">
              {t('sys.conn.checked', { when: relative(t, locale, checkedAt, now) })}
              {latency !== undefined ? ` · ${latency} ms` : ''}
            </p>
          </div>
          <div className="deci-status-side">
            <p className="drawer-h">{t('deci.env')}</p>
            <ul className="conn-env">
              {(bridge.env ?? []).map((e) => (
                <li key={e.name} data-set={e.set || undefined}>
                  <code>{e.name}</code>
                  <span>{e.set ? t('sys.env.set') : t('sys.env.missing')}</span>
                </li>
              ))}
            </ul>
            <p className="field-help">{t('deci.env.help')}</p>
          </div>
        </section>

        <section aria-labelledby="deci-shop" className="panel">
          <div className="panel-head">
            <div>
              <h2 id="deci-shop" className="panel-title">
                {t('deci.shop')}
              </h2>
              <p className="panel-sub">{t('deci.shop.sub')}</p>
            </div>
          </div>
          <div className="panel-body stack" style={{ '--gap': '16px' } as React.CSSProperties}>
            {!shop ? (
              <p className="field-help">{t('deci.shop.off')}</p>
            ) : (
              <>
                <div>
                  <h3 className="drawer-h">{t('deci.shop.alerts')}</h3>
                  {shop.checkoutAlerts.length === 0 ? (
                    <p className="empty-mini">{t('deci.shop.alerts.empty')}</p>
                  ) : (
                    <div className="tbl-wrap">
                      <table className="tbl tbl-cards deci-table">
                        <thead>
                          <tr>
                            <th>{t('deci.shop.col.status')}</th>
                            <th>{t('deci.shop.col.offer')}</th>
                            <th>{t('deci.shop.col.club')}</th>
                            <th>{t('deci.shop.col.order')}</th>
                            <th>{t('deci.shop.col.error')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shop.checkoutAlerts.map((row) => (
                            <tr key={row.id}>
                              <td data-l={t('deci.shop.col.status')}>
                                <span className="row-title">{row.status}</span>
                                <span className="row-sub">{relative(t, locale, row.updatedAt, now)}</span>
                              </td>
                              <td data-l={t('deci.shop.col.offer')}>{row.offerSlug}</td>
                              <td data-l={t('deci.shop.col.club')}>{row.club}</td>
                              <td data-l={t('deci.shop.col.order')}>{row.boxplusOrderId ?? '—'}</td>
                              <td data-l={t('deci.shop.col.error')}>{row.errorCode ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="drawer-h">{t('deci.shop.events')}</h3>
                  {shop.events.length === 0 ? (
                    <p className="empty-mini">{t('deci.shop.events.empty')}</p>
                  ) : (
                    <div className="tbl-wrap">
                      <table className="tbl tbl-cards deci-table">
                        <thead>
                          <tr>
                            <th>{t('deci.shop.col.when')}</th>
                            <th>{t('deci.shop.col.type')}</th>
                            <th>{t('deci.shop.col.order')}</th>
                            <th>{t('deci.shop.col.status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shop.events.map((row) => (
                            <tr key={row.eventId}>
                              <td data-l={t('deci.shop.col.when')}>{relative(t, locale, row.receivedAt, now)}</td>
                              <td data-l={t('deci.shop.col.type')}>{row.type}</td>
                              <td data-l={t('deci.shop.col.order')}>{row.orderId ?? '—'}</td>
                              <td data-l={t('deci.shop.col.status')}>{row.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="deci-data" className="panel">
          <div className="panel-head">
            <div>
              <h2 id="deci-data" className="panel-title">
                {t('deci.data')}
              </h2>
              <p className="panel-sub">{t('deci.data.sub')}</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="tbl-wrap">
              <table className="tbl tbl-cards deci-table">
                <caption className="sr-only">{t('deci.data')}</caption>
                <thead>
                  <tr>
                    <th>{t('deci.col.data')}</th>
                    <th>{t('deci.col.where')}</th>
                    <th>{t('deci.col.how')}</th>
                    <th>{t('deci.col.app')}</th>
                    <th>{t('deci.col.down')}</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA.map((d) => (
                    <tr key={d}>
                      <td data-l="">
                        <span className="row-title">{t(`deci.d.${d}` as MessageKey)}</span>
                        <span className="row-sub">{t(`deci.d.${d}.cdc` as MessageKey)}</span>
                      </td>
                      <td data-l={t('deci.col.where')}>{t(`deci.d.${d}.where` as MessageKey)}</td>
                      <td data-l={t('deci.col.how')}>{t(`deci.d.${d}.how` as MessageKey)}</td>
                      <td data-l={t('deci.col.app')}>{t(`deci.d.${d}.app` as MessageKey)}</td>
                      <td data-l={t('deci.col.down')}>{t(`deci.d.${d}.down` as MessageKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="field-help">{t('deci.data.source')}</p>
          </div>
        </section>

        <div className="grid grid-2" style={{ '--gap': '16px' } as React.CSSProperties}>
          <section aria-labelledby="deci-match" className="panel">
            <div className="panel-head">
              <div>
                <h2 id="deci-match" className="panel-title">
                  {t('deci.match')}
                </h2>
                <p className="panel-sub">{t('deci.match.sub')}</p>
              </div>
            </div>
            <div className="panel-body stack" style={{ '--gap': '12px' } as React.CSSProperties}>
              <ol className="deci-rule">
                <li>{t('deci.match.r1')}</li>
                <li>{t('deci.match.r2')}</li>
                <li>{t('deci.match.r3')}</li>
                <li>{t('deci.match.r4')}</li>
              </ol>
              <div className="callout">
                <IconShield />
                <span>{t('deci.match.never')}</span>
              </div>
              {!review || review.length === 0 ? (
                <div className="empty-mini">
                  <b>{t('deci.queue')}</b>
                  <span>{t('deci.queue.empty')}</span>
                </div>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl tbl-cards deci-table">
                    <caption className="sr-only">{t('deci.queue')}</caption>
                    <thead>
                      <tr>
                        <th>{t('deci.queue.col.id')}</th>
                        <th>{t('deci.queue.col.who')}</th>
                        <th>{t('deci.queue.col.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.map((row) => (
                        <tr key={row.id}>
                          <td data-l={t('deci.queue.col.id')}>
                            <code>{row.id}</code>
                          </td>
                          <td data-l={t('deci.queue.col.who')}>{row.email || row.profileId}</td>
                          <td data-l={t('deci.queue.col.status')}>{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="deci-demo" className="panel">
            <div className="panel-head">
              <div>
                <h2 id="deci-demo" className="panel-title">
                  {t('deci.demo')}
                </h2>
                <p className="panel-sub">{t('deci.demo.sub')}</p>
              </div>
            </div>
            <div className="panel-body stack" style={{ '--gap': '12px' } as React.CSSProperties}>
              <dl className="facts">
                <div>
                  <dt>{t('deci.demo.id')}</dt>
                  <dd>
                    <code>{demo.memberId}</code>
                  </dd>
                </div>
                <div>
                  <dt>{t('deci.demo.passages')}</dt>
                  <dd>{demo.passages}</dd>
                </div>
                <div>
                  <dt>{t('deci.demo.updated')}</dt>
                  <dd>{relative(t, locale, demo.updatedAt, now)}</dd>
                </div>
              </dl>
              <Link className="btn btn-secondary btn-sm" href="/statistiques/demo" style={{ justifySelf: 'start' }}>
                {t('deci.demo.open')}
                <IconArrow size={15} />
              </Link>
            </div>
          </section>
        </div>

        <section aria-labelledby="deci-badge" className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="section-title">
            <div>
              <h2 id="deci-badge">{t('deci.badge')}</h2>
              <p>{t('deci.badge.sub')}</p>
            </div>
          </div>
          <div className="grid grid-3" style={{ '--gap': '12px' } as React.CSSProperties}>
            {ROUTES.map((r, i) => (
              <article key={r} className="panel deci-route">
                <p className="eyebrow">{t('deci.route.n', { n: i + 1 })}</p>
                <h3 className="deci-route-title">{t(`deci.route.${r}` as MessageKey)}</h3>
                <p>{t(`deci.route.${r}.how` as MessageKey)}</p>
                <dl className="deci-pro">
                  <dt>{t('deci.route.plus')}</dt>
                  <dd>{t(`deci.route.${r}.plus` as MessageKey)}</dd>
                  <dt>{t('deci.route.minus')}</dt>
                  <dd>{t(`deci.route.${r}.minus` as MessageKey)}</dd>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
