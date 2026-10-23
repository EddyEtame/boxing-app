'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';

import { cancelNotifs, restoreNotifs } from './actions';
import { NotifWizard } from './NotifWizard';
import { Kpi } from '@/components/charts/Charts';
import { LockPreview } from '@/components/comms/NotifPreview';
import { linkLabel, NotifStatusTag, targetLabel, TypeIcon, TypeTag } from '@/components/comms/parts';
import { Dialog } from '@/components/Dialog';
import { Empty } from '@/components/Empty';
import { IconAlert, IconBell, IconClose, IconCopy, IconExternal, IconPlug, IconSearch, IconTrash } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { Segmented, Select } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { NOTIF_AUTO, NOTIF_META, isAppLink, type NotifDraft, type NotifPrefill } from '@/lib/comms/types';
import { fmtDateTime, relative } from '@/lib/format';
import { NOTIF_MANUAL, NOTIF_TYPES, type ClubId, type NotifType, type PushNotification, type Statut } from '@/lib/types';

const ALL: Statut[] = ['invite', 'restreint', 'actif'];

export function blankDraft(scope: ClubId[] | 'all'): NotifDraft {
  return { type: null, title: '', body: '', link: '', clubs: scope, statuts: ALL, when: 'now', at: '', origin: null };
}

type StatusFilter = 'all' | PushNotification['status'];

const SOURCE_HREF: Record<NonNullable<PushNotification['origin']>['kind'], string> = { news: '/actualites', event: '/evenements', video: '/videos', planning: '/plannings', moderation: '/moderation' };

export function NotificationsView({ rows, scope, openNew, prefill, nowIso, delivery }: { rows: PushNotification[]; scope: ClubId[] | 'all'; openNew: boolean; prefill: NotifPrefill | null; nowIso: string; delivery: { pushKey: boolean; deciplusBridge: boolean } }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const now = useNow();
  // « maintenant » avance par paliers de 30 s : ce qui vient d'être validé se lit « à l'instant », jamais « dans 1 min ».
  const since = (iso: string) => relative(t, locale, iso, now === null ? null : Math.max(now, Math.min(Date.parse(iso), now + 5 * 60_000)));
  const [wizard, setWizard] = useState<{ open: boolean; initial: NotifDraft; key: string; note: ReactNode }>(() => ({
    open: openNew,
    initial: prefill?.draft ?? blankDraft(scope),
    key: prefill?.draft?.origin ? `notification:${prefill.draft.origin.kind}:${prefill.draft.origin.id}` : 'notification',
    note: prefill ? <PrefillNote prefill={prefill} /> : null,
  }));
  const [detail, setDetail] = useState<PushNotification | null>(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | NotifType>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const start = (initial: NotifDraft, key = 'notification', note: ReactNode = null) => setWizard({ open: true, initial, key, note });
  const close = () => {
    setWizard((w) => ({ ...w, open: false }));
    // L'adresse ne doit pas rouvrir l'assistant au prochain rafraîchissement.
    if (openNew) router.replace(pathname, { scroll: false });
  };

  /* --- Chiffres du haut : fenêtre de 30 jours fixée par le serveur (même rendu des deux côtés) --- */
  const ref = Date.parse(nowIso);
  const month = rows.filter((n) => ref - Date.parse(n.createdAt) <= 30 * 86_400_000);
  const queued = rows.filter((n) => n.status === 'en-file').length;
  const scheduled = rows.filter((n) => n.status === 'programmee' && n.when.kind === 'scheduled').sort((a, b) => (a.when.kind === 'scheduled' && b.when.kind === 'scheduled' ? a.when.at.localeCompare(b.when.at) : 0));
  const next = scheduled[0];
  const monthLive = month.filter((n) => n.status !== 'annulee');
  const monthCancelled = month.length - monthLive.length;
  const reach = monthLive.reduce((s, n) => s + (n.reach ?? 0), 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/\p{M}/gu, '');
    return rows.filter((n) => {
      if (type !== 'all' && n.type !== type) return false;
      if (status !== 'all' && n.status !== status) return false;
      if (!needle) return true;
      return `${n.title} ${n.body} ${n.createdBy}`.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{M}/gu, '').includes(needle);
    });
  }, [rows, q, type, status]);

  const when = (n: PushNotification) => (n.when.kind === 'scheduled' ? n.when.at : n.createdAt);

  const columns: Column<PushNotification>[] = [
    { id: 'type', header: t('comms.col.type'), cell: (n) => <TypeTag type={n.type} />, sortValue: (n) => t(`comms.type.${n.type}` as MessageKey), width: '190px' },
    {
      id: 'message',
      header: t('comms.col.message'),
      label: '',
      cell: (n) => (
        <span className="comms-cell-msg">
          <span className="row-title">{n.title}</span>
          <span className="row-sub comms-clamp">{n.body}</span>
        </span>
      ),
      sortValue: (n) => n.title,
    },
    { id: 'target', header: t('comms.col.target'), cell: (n) => <span className="small">{targetLabel(t, n.target.clubs, n.target.statuts)}</span> },
    { id: 'reach', header: t('comms.col.reach'), num: true, cell: (n) => (typeof n.reach === 'number' ? n.reach.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB') : '—'), sortValue: (n) => n.reach ?? -1 },
    {
      id: 'when',
      header: t('comms.col.when'),
      cell: (n) => (
        <span className="nowrap small" title={fmtDateTime(locale, when(n))}>
          {n.when.kind === 'scheduled' ? fmtDateTime(locale, n.when.at) : since(n.createdAt)}
        </span>
      ),
      sortValue: (n) => when(n),
    },
    { id: 'status', header: t('comms.col.status'), cell: (n) => <NotifStatusTag status={n.status} />, sortValue: (n) => n.status },
  ];

  const cancel = async (ids: string[]) => {
    const res = await cancelNotifs(ids);
    if (!res.ok) {
      toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
      return;
    }
    const done = res.data.cancelled;
    if (done.length)
      toast({
        text: t('comms.n.cancelled', { n: done.length }),
        undo: async () => {
          const back = await restoreNotifs(done);
          if (back.ok) toast({ text: t('comms.n.restored', { n: back.data.restored }) });
          router.refresh();
        },
      });
    if (res.data.skipped) toast({ text: t('comms.n.cancelSkipped', { n: res.data.skipped }), kind: done.length ? 'ok' : 'err' });
    setDetail(null);
    router.refresh();
  };

  const templates: { id: string; type: NotifType; title: MessageKey; sub: MessageKey; tTitle: MessageKey; tBody: MessageKey }[] = [
    { id: 'fermeture', type: 'club', title: 'comms.tpl.fermeture', sub: 'comms.tpl.fermeture.sub', tTitle: 'comms.tpl.fermeture.title', tBody: 'comms.tpl.fermeture.body' },
    { id: 'evenement', type: 'evenement', title: 'comms.tpl.evenement', sub: 'comms.tpl.evenement.sub', tTitle: 'comms.tpl.evenement.title', tBody: 'comms.tpl.evenement.body' },
    { id: 'promo', type: 'promo', title: 'comms.tpl.promo', sub: 'comms.tpl.promo.sub', tTitle: 'comms.tpl.promo.title', tBody: 'comms.tpl.promo.body' },
    { id: 'video', type: 'video', title: 'comms.tpl.video', sub: 'comms.tpl.video.sub', tTitle: 'comms.tpl.video.title', tBody: 'comms.tpl.video.body' },
  ];

  const fromTemplate = (tpl: (typeof templates)[number]) => start({ ...blankDraft(scope), type: tpl.type, title: t(tpl.tTitle), body: t(tpl.tBody), link: NOTIF_META[tpl.type].link }, `notification:modele:${tpl.id}`);

  const duplicate = (n: PushNotification) => {
    setDetail(null);
    start({ ...blankDraft(scope), type: NOTIF_MANUAL.includes(n.type) ? n.type : null, title: n.title, body: n.body, link: isAppLink(n.link) ? n.link : '', clubs: n.target.clubs, statuts: n.target.statuts }, `notification:copie:${n.id}`);
  };

  const autoState = (k: NotifType) => (NOTIF_META[k].source === 'deciplus' && !delivery.deciplusBridge ? t('comms.n.auto.deciplus') : t('comms.n.auto.push'));

  return (
    <>
      <PageHeader
        kicker={t('comms.n.kicker')}
        title={t('comms.n.title')}
        lead={t('comms.n.lead')}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => start(blankDraft(scope))}>
            <IconBell size={17} />
            {t('comms.n.new')}
          </button>
        }
      />

      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        <div className="callout" data-kind="warn" role="note">
          <IconPlug />
          <span>
            <span className="callout-title">{t('comms.n.queue.title')}. </span>
            {t('comms.n.queue.body')}{' '}
            <Link className="link" href="/branchements">
              {t('comms.n.queue.link')}
            </Link>
          </span>
        </div>

        <div className="grid grid-4">
          <Kpi label={t('comms.n.kpi.queue')} value={queued} sub={t('comms.n.kpi.queue.sub')} hero={queued > 0} />
          <Kpi label={t('comms.n.kpi.scheduled')} value={scheduled.length} sub={next && next.when.kind === 'scheduled' ? t('comms.n.kpi.scheduled.next', { when: fmtDateTime(locale, next.when.at) }) : t('comms.n.kpi.scheduled.none')} />
          <Kpi label={t('comms.n.kpi.month')} value={monthLive.length} sub={t('comms.n.kpi.month.sub', { n: monthCancelled })} />
          <Kpi label={t('comms.n.kpi.reach')} value={reach} sub={t('comms.n.kpi.reach.sub')} />
        </div>

        {rows.length === 0 ? (
          <Empty def={t('comms.n.empty.def')} title={t('comms.n.empty.title')} text={t('comms.n.empty.text')}>
            <div className="templates">
              {templates.map((tpl) => (
                <button key={tpl.id} type="button" className="template" onClick={() => fromTemplate(tpl)}>
                  <span className="comms-tpl-head">
                    <TypeIcon type={tpl.type} size={18} />
                    <span className="template-title">{t(tpl.title)}</span>
                  </span>
                  <span className="template-sub">{t(tpl.sub)}</span>
                </button>
              ))}
            </div>
          </Empty>
        ) : (
          <section className="panel" aria-labelledby="history-title">
            <div className="panel-head">
              <div>
                <h2 id="history-title" className="panel-title">
                  {t('comms.n.history')}
                </h2>
                <p className="panel-sub">{t('comms.n.history.sub')}</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="filters comms-filters" role="search">
                <label className="input-group">
                  <IconSearch size={18} />
                  <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('comms.n.search')} aria-label={t('comms.n.search')} />
                </label>
                <div style={{ minWidth: 200 }}>
                  <Select<'all' | NotifType> id="ntype" value={type} onChange={setType} options={[{ value: 'all', label: t('comms.n.filter.allTypes') }, ...NOTIF_TYPES.map((v) => ({ value: v, label: t(`comms.type.${v}` as MessageKey) }))]} />
                </div>
                <Segmented<StatusFilter>
                  label={t('comms.n.filter.status')}
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'all', label: t('comms.n.filter.all') },
                    { value: 'en-file', label: t('comms.status.en-file') },
                    { value: 'programmee', label: t('comms.status.programmee') },
                    { value: 'annulee', label: t('comms.status.annulee') },
                  ]}
                />
              </div>
              <DataTable<PushNotification>
                rows={filtered}
                columns={columns}
                rowKey={(n) => n.id}
                rowName={(n) => n.title}
                caption={t('comms.n.history')}
                onOpen={setDetail}
                activeKey={detail?.id ?? null}
                initialSort={{ id: 'when', dir: 'desc' }}
                bulk={[{ id: 'cancel', label: t('comms.n.bulk.cancel'), icon: <IconTrash size={16} />, danger: true, run: (list) => cancel(list.map((n) => n.id)) }]}
                empty={
                  <p className="muted small" style={{ padding: '18px 4px' }}>
                    {t('table.none')}
                  </p>
                }
              />
            </div>
          </section>
        )}

        <section className="panel" aria-labelledby="auto-title">
          <div className="panel-head">
            <div>
              <h2 id="auto-title" className="panel-title">
                {t('comms.n.auto.title')}
              </h2>
              <p className="panel-sub">{t('comms.n.auto.sub')}</p>
            </div>
          </div>
          <ul className="panel-body comms-auto">
            {NOTIF_AUTO.map((k) => (
              <li key={k}>
                <span className="comms-auto-icon" aria-hidden="true">
                  <TypeIcon type={k} size={18} />
                </span>
                <span className="comms-auto-text">
                  <span className="strong">{t(`comms.type.${k}` as MessageKey)}</span>
                  <span className="small muted">{t(`comms.n.auto.${k}` as MessageKey)}</span>
                </span>
                {k === 'coach' ? (
                  <Link className="btn btn-secondary btn-sm" href="/messages?nouveau=1">
                    {t('comms.n.auto.write')}
                  </Link>
                ) : (
                  <span className="tag">
                    <span className="dot" aria-hidden="true" />
                    {autoState(k)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <NotifWizard open={wizard.open} onClose={close} initial={wizard.initial} scope={scope} note={wizard.note} draftKey={wizard.key} />

      <Dialog open={detail !== null} onClose={() => setDetail(null)} className="sheet" labelledBy="notif-detail-title">
        {detail ? (
          <>
            <div className="sheet-head">
              <div className="stack" style={{ '--gap': '6px', minWidth: 0 } as React.CSSProperties}>
                <TypeTag type={detail.type} />
                <h2 id="notif-detail-title" className="modal-title truncate">
                  {detail.title}
                </h2>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setDetail(null)} aria-label={t('btn.close')}>
                <IconClose />
              </button>
            </div>
            <div className="sheet-body stack" style={{ '--gap': '20px' } as React.CSSProperties}>
              <div className="phones">
                <LockPreview title={detail.title} body={detail.body} scheme="light" caption={t('comms.preview.lock')} />
              </div>
              <dl className="comms-facts">
                <div>
                  <dt>{t('comms.col.status')}</dt>
                  <dd>
                    <NotifStatusTag status={detail.status} />
                  </dd>
                </div>
                <div>
                  <dt>{t('comms.r.target')}</dt>
                  <dd>{targetLabel(t, detail.target.clubs, detail.target.statuts)}</dd>
                </div>
                <div>
                  <dt>{t('comms.r.reach')}</dt>
                  <dd>{typeof detail.reach === 'number' ? t('comms.n.detail.reach', { n: detail.reach }) : '—'}</dd>
                </div>
                <div>
                  <dt>{t('comms.r.link')}</dt>
                  <dd>{linkLabel(t, isAppLink(detail.link) ? detail.link : '')}</dd>
                </div>
                <div>
                  <dt>{t('comms.col.when')}</dt>
                  <dd>
                    {t('comms.n.detail.created', { when: fmtDateTime(locale, detail.createdAt), who: detail.createdBy })}
                    {detail.when.kind === 'scheduled' ? (
                      <>
                        <br />
                        {t('comms.n.detail.scheduled', { when: fmtDateTime(locale, detail.when.at) })}
                      </>
                    ) : null}
                    {detail.cancelledAt ? (
                      <>
                        <br />
                        {t('comms.n.detail.cancelled', { when: fmtDateTime(locale, detail.cancelledAt) })}
                      </>
                    ) : null}
                  </dd>
                </div>
                {detail.origin ? (
                  <div>
                    <dt>{t('comms.n.detail.origin')}</dt>
                    <dd>
                      <Link className="link" href={SOURCE_HREF[detail.origin.kind]}>
                        {t(`comms.from.${detail.origin.kind}` as MessageKey)}
                        <IconExternal size={14} style={{ display: 'inline', verticalAlign: '-2px', marginLeft: 4 }} />
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
              {detail.status === 'en-file' ? (
                <div className="callout" data-kind="warn" role="note">
                  <IconAlert />
                  <span>{t('comms.n.queue.body')}</span>
                </div>
              ) : null}
              <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
                <button type="button" className="btn btn-secondary" onClick={() => duplicate(detail)}>
                  <IconCopy size={16} />
                  {t('comms.n.detail.duplicate')}
                </button>
                {detail.status === 'en-file' || detail.status === 'programmee' ? (
                  <button type="button" className="btn btn-danger" onClick={() => void cancel([detail.id])}>
                    <IconTrash size={16} />
                    {t('comms.n.bulk.cancel')}
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

function PrefillNote({ prefill }: { prefill: NotifPrefill }) {
  const { t } = useI18n();
  if (!prefill.draft) {
    return (
      <div className="callout" data-kind="warn" role="note">
        <IconAlert />
        <span>{t('comms.nw.fromMissing')}</span>
      </div>
    );
  }
  return (
    <div className="callout" data-kind="pos" role="note">
      <IconBell />
      <span>{t('comms.nw.from', { kind: t(`comms.from.${prefill.source.kind}` as MessageKey), label: prefill.source.label })}</span>
    </div>
  );
}
