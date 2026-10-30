'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { decideMatch, loadMembersDemo, removeMembersDemo } from './actions';
import { Kpi } from '@/components/charts/Charts';
import { Dialog } from '@/components/Dialog';
import { Empty } from '@/components/Empty';
import { IconAlert, IconCheck, IconClose, IconSearch, IconShield, IconSparkle, IconTrash } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { Segmented } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtDate, relative } from '@/lib/format';
import { memberHaystack, memberName } from '@/lib/members/build';
import { LINK_REASONS, LINK_STATUSES, MISMATCH_FIELDS, type LinkDecision, type LinkQueueItem, type LinkStatus, type Member, type MembersOverview } from '@/lib/members/types';

/**
 * LES ADHÉRENTS (CDC §2, §15) — ce que l'app ne montre à personne : tous les
 * comptes d'un coup, leur fiche Deciplus, et la file des rapprochements que
 * l'accueil tranche. La règle du CDC tient en une phrase, répétée au moment de
 * décider : jamais sur le nom seul. Tant que la base de l'app n'est pas
 * branchée, des exemples jouent le parcours entier.
 */
type Filter = 'all' | LinkStatus | 'actifs';
type Confirm = { item: LinkQueueItem; resolution: 'lie' | 'refuse' };

export type MembersProps = {
  overview: MembersOverview | null;
  error: string | null;
  canDecide: boolean;
  canDemo: boolean;
  initial: { q: string; member: string | null };
};

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr');

export function MembersView({ overview, error, canDecide, canDemo, initial }: MembersProps) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const now = useNow(30_000);
  const [pending, start] = useTransition();
  const [q, setQ] = useState(initial.q);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(initial.member);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const o = overview;
  const linkLabel = (s: LinkStatus) => t(`adh.link.${s}` as MessageKey);
  const linkTag = (s: LinkStatus) => (s === 'lie' ? 'tag tag-pos' : s === 'a_revoir' ? 'tag tag-warn' : 'tag');
  const fieldLabel = (f: string) => ((MISMATCH_FIELDS as readonly string[]).includes(f) ? t(`adh.field.${f}` as MessageKey) : f);
  const reasonLabel = (r: string) => ((LINK_REASONS as readonly string[]).includes(r) ? t(`adh.reason.${r}` as MessageKey) : r);
  const nameOf = (m: Member) => memberName(m) || t('adh.noName');
  const birth = (m: Member) => (m.dateNaissance ? fmtDate(locale, m.dateNaissance, { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
  const errText = (res: { error: string; fieldErrors?: Record<string, string> }) => t((res.fieldErrors?.code ?? `err.${res.error}`) as MessageKey);

  const rows = useMemo(() => {
    if (!o) return [];
    const needle = fold(q.trim());
    return o.members.filter((m) => (filter === 'all' || (filter === 'actifs' ? m.statut === 'actif' : m.linkStatus === filter)) && (!needle || fold(memberHaystack(m)).includes(needle)));
  }, [o, q, filter]);

  const member = o && openId ? (o.members.find((m) => m.id === openId) ?? null) : null;
  const history = useMemo<(LinkQueueItem | LinkDecision)[]>(() => {
    if (!o || !member) return [];
    return [...o.queue, ...o.decisions].filter((x) => x.member.id === member.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [o, member]);

  const decide = (item: LinkQueueItem, resolution: 'lie' | 'refuse') =>
    start(async () => {
      const res = await decideMatch(item.id, resolution, item.deciplusMemberId);
      setConfirm(null);
      if (!res.ok) {
        toast({ text: errText(res), kind: 'err' });
        router.refresh();
        return;
      }
      const id = item.deciplusMemberId ?? '';
      toast({ text: resolution === 'lie' ? t(res.data.warning ? 'adh.done.link.warn' : 'adh.done.link', { id }) : t('adh.done.refuse'), kind: 'ok' });
      router.refresh();
    });

  const seed = () =>
    start(async () => {
      const res = await loadMembersDemo();
      if (!res.ok) {
        toast({ text: errText(res), kind: 'err' });
        return;
      }
      toast({ text: t('adh.demo.loaded', { n: res.data.n }), kind: 'ok' });
      router.refresh();
    });

  const purge = () =>
    start(async () => {
      const res = await removeMembersDemo();
      if (!res.ok) {
        toast({ text: errText(res), kind: 'err' });
        return;
      }
      setOpenId(null);
      toast({ text: t('adh.demo.removed'), kind: 'ok' });
      router.refresh();
    });

  const columns: Column<Member>[] = [
    {
      id: 'member',
      header: t('adh.c.member'),
      cell: (m) => (
        <span className="adh-cell">
          <span className="row-title">{nameOf(m)}</span>
          <span className="row-sub">{m.email || '—'}</span>
        </span>
      ),
      sortValue: (m) => fold(`${m.nom} ${m.prenom}`),
    },
    { id: 'club', header: t('adh.c.club'), cell: (m) => (m.clubPrincipal ? CLUB_LABEL[m.clubPrincipal] : <span className="muted">{t('adh.noClub')}</span>), sortValue: (m) => m.clubPrincipal ?? '' },
    {
      id: 'link',
      header: t('adh.c.link'),
      cell: (m) => (
        <span className={linkTag(m.linkStatus)}>
          {linkLabel(m.linkStatus)}
          {m.deciplusMemberId ? ` · n° ${m.deciplusMemberId}` : ''}
        </span>
      ),
      sortValue: (m) => LINK_STATUSES.indexOf(m.linkStatus),
    },
    { id: 'statut', header: t('adh.c.statut'), cell: (m) => <span className={m.statut === 'actif' ? 'tag tag-pos' : 'tag'}>{t(`adh.statut.${m.statut}` as MessageKey)}</span>, sortValue: (m) => m.statut },
    {
      id: 'sub',
      header: t('adh.c.sub'),
      cell: (m) =>
        m.subscription ? (
          <span className="adh-cell">
            <span className={m.subscription.status === 'past_due' || m.subscription.status === 'manual_review' ? 'row-title adh-neg' : 'row-title'}>{t(`adh.sub.${m.subscription.status}` as MessageKey)}</span>
            {m.subscription.planLabel ? <span className="row-sub">{m.subscription.planLabel}</span> : null}
          </span>
        ) : m.snapshot?.contrats[0] ? (
          <span className="adh-cell">
            <span className="row-title">{m.snapshot.contrats[0]}</span>
            <span className="row-sub">Deciplus</span>
          </span>
        ) : (
          <span className="muted">—</span>
        ),
      sortValue: (m) => m.subscription?.status ?? (m.snapshot?.abonnementActif ? 'deciplus' : ''),
    },
    { id: 'created', header: t('adh.c.created'), cell: (m) => relative(t, locale, m.createdAt, now), sortValue: (m) => m.createdAt },
  ];

  const filters: { value: Filter; label: string }[] = o
    ? [
        { value: 'all', label: `${t('adh.filter.all')} · ${o.total}` },
        { value: 'a_revoir', label: `${linkLabel('a_revoir')} · ${o.byLink.a_revoir}` },
        { value: 'lie', label: `${linkLabel('lie')} · ${o.byLink.lie}` },
        { value: 'en_attente', label: `${linkLabel('en_attente')} · ${o.byLink.en_attente}` },
        { value: 'prospect', label: `${linkLabel('prospect')} · ${o.byLink.prospect}` },
        { value: 'actifs', label: `${t('adh.filter.actifs')} · ${o.actifs}` },
      ]
    : [];

  const mismatch = (item: LinkQueueItem, field: string) => item.mismatchFields.includes(field) || undefined;

  /** Les deux colonnes de la décision : ce que l'adhérent a déclaré, ce que le robot a trouvé — les désaccords soulignés. */
  const compare = (item: LinkQueueItem) => (
    <div className="adh-compare">
      <div>
        <p className="eyebrow">{t('adh.queue.declared')}</p>
        <dl className="adh-facts">
          <div data-off={mismatch(item, 'nom') || mismatch(item, 'prenom')}>
            <dt>{t('adh.c.member')}</dt>
            <dd>{nameOf(item.member)}</dd>
          </div>
          <div data-off={mismatch(item, 'email')}>
            <dt>{t('adh.sheet.email')}</dt>
            <dd>{item.member.email || '—'}</dd>
          </div>
          <div data-off={mismatch(item, 'telephone')}>
            <dt>{t('adh.sheet.phone')}</dt>
            <dd>{item.member.telephone || '—'}</dd>
          </div>
          <div data-off={mismatch(item, 'date_naissance')}>
            <dt>{t('adh.sheet.birth')}</dt>
            <dd>{birth(item.member)}</dd>
          </div>
        </dl>
      </div>
      <div>
        <p className="eyebrow">{t('adh.queue.robot')}</p>
        <p className={item.deciplusMemberId ? 'adh-robot' : 'adh-robot muted'}>{item.deciplusMemberId ? t('adh.queue.found', { id: item.deciplusMemberId }) : t('adh.queue.notFound')}</p>
        <p className="row-sub">{item.mismatchFields.length ? t('adh.queue.mismatch', { fields: item.mismatchFields.map(fieldLabel).join(', ') }) : item.deciplusMemberId ? t('adh.queue.allMatch') : ''}</p>
        {item.reason ? <p className="row-sub">{t('adh.queue.reason', { reason: reasonLabel(item.reason) })}</p> : null}
        {!item.deciplusMemberId ? <p className="row-sub adh-hint">{t('adh.queue.linkNone')}</p> : null}
      </div>
    </div>
  );

  const decideButtons = (item: LinkQueueItem, size: 'sm' | '') =>
    canDecide ? (
      <div className="row adh-actions" style={{ '--gap': '8px' } as React.CSSProperties}>
        <button type="button" className={`btn btn-primary ${size === 'sm' ? 'btn-sm' : ''}`} disabled={pending || !item.deciplusMemberId} onClick={() => setConfirm({ item, resolution: 'lie' })}>
          <IconCheck size={16} />
          {item.deciplusMemberId ? t('adh.queue.link', { id: item.deciplusMemberId }) : t('adh.confirm.go.link')}
        </button>
        <button type="button" className={`btn btn-secondary ${size === 'sm' ? 'btn-sm' : ''}`} disabled={pending} onClick={() => setConfirm({ item, resolution: 'refuse' })}>
          {t('adh.queue.refuse')}
        </button>
      </div>
    ) : null;

  const demoEmpty = !o || (o.source === 'demo' && !o.seeded);

  return (
    <>
      <PageHeader
        kicker={t('adh.kicker')}
        title={t('adh.title')}
        lead={t('adh.lead')}
        actions={
          o && o.source === 'demo' && o.seeded && canDemo ? (
            <button type="button" className="btn btn-ghost" disabled={pending} onClick={purge}>
              <IconTrash size={17} />
              {t('adh.demo.remove')}
            </button>
          ) : null
        }
      />

      <div className="stack adh-page" style={{ '--gap': '18px' } as React.CSSProperties}>
        {error ? (
          <div className="callout" data-kind="neg">
            <IconAlert />
            <div>
              <span className="callout-title">{t('adh.off.title')} </span>
              <span className="mono">{error}</span>
            </div>
          </div>
        ) : null}

        {demoEmpty ? (
          <Empty def={t('adh.empty.def')} title={t('adh.off.title')} text={t('adh.off.text')}>
            {canDemo ? (
              <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
                <button type="button" className="btn btn-primary" onClick={seed} disabled={pending}>
                  <IconSparkle size={17} />
                  {t('adh.demo.load')}
                </button>
                <span className="small dim">{t('adh.demo.note')}</span>
              </div>
            ) : (
              <p className="small dim">{t('adh.demo.askDirection')}</p>
            )}
          </Empty>
        ) : o.total === 0 ? (
          <Empty def={t('adh.empty.def')} title={t('adh.empty.title')} text={t('adh.empty.text')} />
        ) : (
          <>
            {o.source === 'demo' ? (
              <div className="callout" data-kind="warn">
                <IconSparkle />
                <div>
                  <span className="callout-title">{t('adh.source.demo.title')} </span>
                  {t('adh.source.demo.body')}
                </div>
              </div>
            ) : null}

            <div className="grid grid-4">
              <Kpi label={t('adh.k.total')} value={o.total} sub={t('adh.k.total.sub', { n: o.recent })} />
              <Kpi label={t('adh.k.lies')} value={o.byLink.lie} sub={t('adh.k.lies.sub', { n: o.actifs })} />
              <Kpi label={t('adh.k.queue')} value={o.byLink.a_revoir} sub={o.byLink.a_revoir ? t('adh.k.queue.sub') : t('adh.k.queue.none')} />
              <Kpi label={t('adh.k.prospects')} value={o.byLink.prospect} sub={t('adh.k.prospects.sub', { n: o.byLink.en_attente })} />
            </div>

            {o.queue.length ? (
              <section className="panel" aria-labelledby="adh-queue-title">
                <div className="panel-head">
                  <div>
                    <h2 id="adh-queue-title" className="panel-title">
                      {t('adh.queue.title')} · {o.queue.length}
                    </h2>
                    <p className="panel-sub">{t('adh.queue.sub')}</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="adh-queue">
                    {o.queue.map((item) => (
                      <article key={item.id} className="adh-card" data-found={Boolean(item.deciplusMemberId) || undefined}>
                        <header className="adh-card-head">
                          <div>
                            <button type="button" className="linkish adh-name" onClick={() => setOpenId(item.member.id)}>
                              {nameOf(item.member)}
                            </button>
                            <p className="row-sub">
                              {t('adh.queue.since', { when: relative(t, locale, item.createdAt, now) })}
                              {item.member.clubPrincipal ? ` · ${CLUB_LABEL[item.member.clubPrincipal]}` : ''}
                            </p>
                          </div>
                          <span className={item.deciplusMemberId ? 'tag tag-warn' : 'tag'}>{item.mismatchFields.length ? `${item.mismatchFields.length} ${item.mismatchFields.length > 1 ? 'écarts' : 'écart'}` : item.deciplusMemberId ? t('adh.queue.allMatch') : t('adh.queue.notFound')}</span>
                        </header>
                        {compare(item)}
                        {decideButtons(item, 'sm')}
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="panel" aria-labelledby="adh-list-title">
              <div className="panel-head">
                <div>
                  <h2 id="adh-list-title" className="panel-title">
                    {t('adh.tbl.caption')}
                  </h2>
                </div>
              </div>
              <div className="panel-body stack" style={{ '--gap': '12px' } as React.CSSProperties}>
                <div className="adh-toolbar">
                  <label className="input-group adh-search">
                    <IconSearch size={18} />
                    <input className="input" type="search" value={q} placeholder={t('adh.search')} aria-label={t('adh.search.label')} onChange={(e) => setQ(e.target.value)} />
                  </label>
                  <Segmented<Filter> value={filter} onChange={setFilter} label={t('adh.filter')} options={filters} />
                </div>
                <DataTable<Member> rows={rows} columns={columns} rowKey={(m) => m.id} rowName={(m) => nameOf(m)} caption={t('adh.tbl.caption')} initialSort={{ id: 'created', dir: 'desc' }} onOpen={(m) => setOpenId(m.id)} activeKey={openId} empty={t('adh.tbl.empty')} />
              </div>
            </section>

            {o.decisions.length ? (
              <section className="panel" aria-labelledby="adh-dec-title">
                <div className="panel-head">
                  <div>
                    <h3 id="adh-dec-title" className="panel-title">
                      {t('adh.decisions.title')}
                    </h3>
                    <p className="panel-sub">{t('adh.decisions.sub')}</p>
                  </div>
                </div>
                <div className="panel-body">
                  <ol className="adh-decisions">
                    {o.decisions.map((d) => (
                      <li key={d.id}>
                        <span className={d.resolution === 'lie' ? 'tag tag-pos' : 'tag'}>{t(`adh.decision.${d.resolution}` as MessageKey)}</span>
                        <button type="button" className="linkish" onClick={() => setOpenId(d.member.id)}>
                          {nameOf(d.member)}
                        </button>
                        <span className="row-sub">
                          {d.deciplusMemberId ? `n° ${d.deciplusMemberId} · ` : ''}
                          {d.resolvedBy ? `${t('adh.decision.by', { who: d.resolvedBy })} · ` : ''}
                          {d.resolvedAt ? relative(t, locale, d.resolvedAt, now) : ''}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            ) : null}

            <p className="field-help">{t('adh.readAt', { when: relative(t, locale, o.readAt, now) })}</p>
          </>
        )}
      </div>

      {/* La fiche d'un adhérent : ce qu'il a déclaré, ce que le robot a lu, l'abonnement pris dans l'app, ses rapprochements. */}
      <Dialog open={Boolean(member)} onClose={() => setOpenId(null)} className="sheet" labelledBy="adh-sheet-title">
        {member ? (
          <>
            <div className="sheet-head">
              <div>
                <p className="eyebrow">{member.clubPrincipal ? CLUB_LABEL[member.clubPrincipal] : t('adh.noClub')}</p>
                <h2 id="adh-sheet-title" className="panel-title">
                  {nameOf(member)}
                </h2>
                <p className="row adh-tags" style={{ '--gap': '6px' } as React.CSSProperties}>
                  <span className={linkTag(member.linkStatus)}>{linkLabel(member.linkStatus)}</span>
                  <span className={member.statut === 'actif' ? 'tag tag-pos' : 'tag'}>{t(`adh.statut.${member.statut}` as MessageKey)}</span>
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpenId(null)} aria-label={t('btn.close')}>
                <IconClose />
              </button>
            </div>
            <div className="sheet-body stack" style={{ '--gap': '22px' } as React.CSSProperties}>
              <section>
                <h3 className="drawer-h">{t('adh.sheet.declared')}</h3>
                <dl className="facts">
                  <div>
                    <dt>{t('adh.sheet.email')}</dt>
                    <dd>{member.email || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('adh.sheet.phone')}</dt>
                    <dd>{member.telephone || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('adh.sheet.birth')}</dt>
                    <dd>{birth(member)}</dd>
                  </div>
                  <div>
                    <dt>{t('adh.sheet.created')}</dt>
                    <dd>{fmtDate(locale, member.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                  </div>
                </dl>
                {member.parental ? (
                  <div className="callout" data-kind="warn" style={{ marginTop: 10 }}>
                    <IconShield />
                    <span>{t('adh.sheet.parental')}</span>
                  </div>
                ) : null}
              </section>

              <section>
                <h3 className="drawer-h">{t('adh.sheet.fiche')}</h3>
                {member.deciplusMemberId || member.snapshot ? (
                  <dl className="facts">
                    <div>
                      <dt>{t('adh.sheet.memberId')}</dt>
                      <dd>{member.deciplusMemberId ? <code>{member.deciplusMemberId}</code> : '—'}</dd>
                    </div>
                    {member.snapshot ? (
                      <>
                        <div>
                          <dt>{t('adh.sheet.abo')}</dt>
                          <dd>{member.snapshot.abonnementActif ? t('adh.yes') : member.snapshot.abonnementEnAttente ? t('adh.sheet.aboWait') : t('adh.no')}</dd>
                        </div>
                        <div>
                          <dt>{t('adh.sheet.badge')}</dt>
                          <dd>{member.snapshot.badgeEnregistre ? t('adh.yes') : t('adh.no')}</dd>
                        </div>
                        <div>
                          <dt>{t('adh.sheet.contrats')}</dt>
                          <dd>{member.snapshot.contrats.length ? member.snapshot.contrats.join(' · ') : '—'}</dd>
                        </div>
                      </>
                    ) : null}
                  </dl>
                ) : (
                  <p className="muted">{t('adh.sheet.noFiche')}</p>
                )}
                {member.snapshot ? <p className="field-help">{t('adh.sheet.readAt', { when: relative(t, locale, member.snapshot.readAt, now) })}</p> : null}
              </section>

              {member.subscription ? (
                <section>
                  <h3 className="drawer-h">{t('adh.sheet.sub')}</h3>
                  <dl className="facts">
                    <div>
                      <dt>{t('adh.c.sub')}</dt>
                      <dd>
                        {t(`adh.sub.${member.subscription.status}` as MessageKey)}
                        {member.subscription.planLabel ? ` · ${member.subscription.planLabel}` : ''}
                      </dd>
                    </div>
                    {member.subscription.nextChargeDate ? (
                      <div>
                        <dt>{t('adh.sheet.next', { date: '' }).replace(/\s+$/, '')}</dt>
                        <dd>{fmtDate(locale, member.subscription.nextChargeDate, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                      </div>
                    ) : null}
                    {member.subscription.currentPeriodEnd ? (
                      <div>
                        <dt>{t('adh.sheet.until', { date: '' }).replace(/\s+$/, '')}</dt>
                        <dd>{fmtDate(locale, member.subscription.currentPeriodEnd, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>
              ) : null}

              <section>
                <h3 className="drawer-h">{t('adh.sheet.history')}</h3>
                {history.length === 0 ? <p className="muted">{t('adh.sheet.history.none')}</p> : null}
                <ol className="adh-history">
                  {history.map((h) => (
                    <li key={h.id}>
                      <span className={'resolution' in h ? (h.resolution === 'lie' ? 'tag tag-pos' : 'tag') : 'tag tag-warn'}>{'resolution' in h ? t(`adh.decision.${h.resolution}` as MessageKey) : t('adh.sheet.pending')}</span>
                      <span className="row-sub">
                        {relative(t, locale, h.createdAt, now)}
                        {h.deciplusMemberId ? ` · n° ${h.deciplusMemberId}` : ''}
                        {h.mismatchFields.length ? ` · ${t('adh.queue.mismatch', { fields: h.mismatchFields.map(fieldLabel).join(', ') })}` : ''}
                        {h.reason ? ` · ${reasonLabel(h.reason)}` : ''}
                      </span>
                      {!('resolution' in h) ? decideButtons(h, 'sm') : null}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        ) : null}
      </Dialog>

      {/* La décision, relue avant d'être prise : les deux identités côte à côte, et la règle du CDC. */}
      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} className="modal" labelledBy="adh-confirm-title">
        {confirm ? (
          <>
            <div className="modal-head">
              <div>
                <h2 id="adh-confirm-title" className="modal-title">
                  {confirm.resolution === 'lie' ? t('adh.confirm.link.title', { id: confirm.item.deciplusMemberId ?? '' }) : t('adh.confirm.refuse.title')}
                </h2>
                <p className="modal-sub">{confirm.resolution === 'lie' ? t('adh.confirm.link.body') : t('adh.confirm.refuse.body')}</p>
              </div>
            </div>
            <div className="modal-body">{compare(confirm.item)}</div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={pending}>
                {t('btn.cancel')}
              </button>
              <button type="button" className={confirm.resolution === 'lie' ? 'btn btn-primary' : 'btn btn-secondary'} disabled={pending} onClick={() => decide(confirm.item, confirm.resolution)}>
                {pending ? <span className="spinner" aria-hidden="true" /> : null}
                {confirm.resolution === 'lie' ? t('adh.confirm.go.link') : t('adh.confirm.go.refuse')}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
