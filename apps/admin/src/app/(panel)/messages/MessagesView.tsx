'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { loadDemo, purgeDemo } from './actions';
import { Inbox, type TeamMember } from './Inbox';
import { SendWizard } from './SendWizard';
import { targetLabel } from '@/components/comms/parts';
import { Dialog } from '@/components/Dialog';
import { Empty } from '@/components/Empty';
import { IconAlert, IconChat, IconInbox, IconSend, IconTrash } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { Segmented } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import type { OutgoingRow, ThreadView } from '@/lib/comms/types';
import { fmtDateTime, relative } from '@/lib/format';
import type { ClubId, Role } from '@/lib/types';

type View = 'inbox' | 'sent';

export function MessagesView({
  canInbox,
  threads,
  team,
  sent,
  me,
  scope,
  openNew,
  initialView,
  initialThread,
}: {
  canInbox: boolean;
  threads: ThreadView[];
  team: TeamMember[];
  sent: OutgoingRow[];
  me: { id: string; name: string; signature: string; role: Role };
  scope: ClubId[] | 'all';
  openNew: boolean;
  initialView: View;
  initialThread: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const now = useNow();
  // « maintenant » avance par paliers de 30 s : ce qui vient d'être validé se lit « à l'instant », jamais « dans 1 min ».
  const since = (iso: string) => relative(t, locale, iso, now === null ? null : Math.max(now, Math.min(Date.parse(iso), now + 5 * 60_000)));
  const [view, setView] = useState<View>(initialView);
  const [wizard, setWizard] = useState(openNew);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [busy, setBusy] = useState(false);
  const demoCount = threads.filter((x) => x.demo).length;
  const unread = threads.filter((x) => x.unread).length;

  // La vue la plus récente, lue à la fermeture de l'assistant (un envoi vient peut-être de basculer sur « Envoyés »).
  const viewRef = useRef<View>(initialView);
  const switchView = (v: View) => {
    viewRef.current = v;
    setView(v);
    router.replace(v === 'sent' ? `${pathname}?vue=envois` : pathname, { scroll: false });
  };

  const closeWizard = () => {
    setWizard(false);
    if (openNew) router.replace(viewRef.current === 'sent' ? `${pathname}?vue=envois` : pathname, { scroll: false });
  };

  const doLoad = async () => {
    setBusy(true);
    const res = await loadDemo();
    setBusy(false);
    if (res.ok) {
      toast({ text: t('comms.m.demo.loaded', { n: res.data.added }) });
      router.refresh();
    } else toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
  };

  const doPurge = async () => {
    setConfirmPurge(false);
    const res = await purgeDemo();
    if (res.ok) {
      toast({ text: t('comms.m.demo.purged', { n: res.data.removed }) });
      router.replace(pathname, { scroll: false });
      router.refresh();
    } else toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
  };

  const toLabel = (o: OutgoingRow) => {
    if (o.to.kind === 'membre') return o.to.memberName ? t('comms.s.memberNamed', { name: o.to.memberName, id: o.to.memberId }) : t('comms.s.member', { id: o.to.memberId });
    const fam = o.to.familles.length ? ` · ${o.to.familles.map((f) => t(`comms.famille.${f}` as MessageKey)).join(', ')}` : '';
    return `${targetLabel(t, o.to.clubs, o.to.statuts)}${fam}`;
  };

  const columns: Column<OutgoingRow>[] = [
    { id: 'to', header: t('comms.s.col.to'), cell: (o) => <span className="small strong">{toLabel(o)}</span>, sortValue: (o) => toLabel(o) },
    {
      id: 'text',
      header: t('comms.s.col.text'),
      label: '',
      cell: (o) => <span className="comms-clamp small comms-sent-text">{o.text}</span>,
    },
    { id: 'signature', header: t('comms.s.col.signature'), cell: (o) => <span className="small">{o.signature}</span>, sortValue: (o) => o.signature },
    { id: 'reach', header: t('comms.col.reach'), num: true, cell: (o) => (o.to.kind === 'membre' ? t('comms.s.reachMember') : typeof o.reach === 'number' ? o.reach.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB') : '—'), sortValue: (o) => (o.to.kind === 'membre' ? 1 : (o.reach ?? 0)) },
    {
      id: 'when',
      header: t('comms.col.when'),
      cell: (o) => (
        <span className="small nowrap" title={fmtDateTime(locale, o.createdAt)}>
          {since(o.createdAt)}
        </span>
      ),
      sortValue: (o) => o.createdAt,
    },
    {
      id: 'status',
      header: t('comms.col.status'),
      cell: () => (
        <span className="tag tag-warn">
          <span className="dot" aria-hidden="true" />
          {t('comms.status.en-file')}
        </span>
      ),
    },
  ];
  if (canInbox) columns.splice(3, 0, { id: 'by', header: t('comms.col.by'), cell: (o) => <span className="small">{o.author.name}</span>, sortValue: (o) => o.author.name });

  return (
    <>
      <PageHeader
        kicker={t('comms.m.kicker')}
        title={t('comms.m.title')}
        lead={canInbox ? t('comms.m.lead') : t('comms.m.leadCoach')}
        actions={
          <>
            {canInbox && demoCount > 0 ? (
              <button type="button" className="btn btn-danger" onClick={() => setConfirmPurge(true)}>
                <IconTrash size={17} />
                {t('comms.m.demo.purge')}
              </button>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={() => setWizard(true)}>
              <IconSend size={17} />
              {t('comms.m.new')}
            </button>
          </>
        }
      />

      {canInbox ? (
        <div className="filters" role="group" aria-label={t('comms.m.tabs')}>
          <Segmented<View>
            label={t('comms.m.tabs')}
            value={view}
            onChange={switchView}
            options={[
              { value: 'inbox', label: unread ? `${t('comms.m.tab.inbox')} · ${t('comms.m.unreadN', { n: unread })}` : t('comms.m.tab.inbox') },
              { value: 'sent', label: sent.length ? `${t('comms.m.tab.sent')} · ${sent.length}` : t('comms.m.tab.sent') },
            ]}
          />
          {view === 'inbox' && demoCount > 0 ? (
            <span className="small dim">
              <IconAlert size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              {t('comms.m.demo.banner')}
            </span>
          ) : null}
        </div>
      ) : null}

      {view === 'inbox' && canInbox ? (
        threads.length === 0 ? (
          <Empty def={t('comms.m.empty.def')} title={t('comms.m.empty.title')} text={t('comms.m.empty.text')}>
            <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
              <button type="button" className="btn btn-primary" onClick={() => void doLoad()} disabled={busy}>
                {busy ? <span className="spinner" aria-hidden="true" /> : <IconInbox size={17} />}
                {t('comms.m.demo.load')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setWizard(true)}>
                <IconSend size={17} />
                {t('comms.m.new')}
              </button>
            </div>
            <p className="small dim">{t('comms.m.from')}</p>
          </Empty>
        ) : (
          <Inbox threads={threads} team={team} me={me} initialThread={initialThread} />
        )
      ) : (
        <section className="panel" aria-labelledby="sent-title">
          <div className="panel-head">
            <div>
              <h2 id="sent-title" className="panel-title">
                {t('comms.s.title')}
              </h2>
              <p className="panel-sub">{t('comms.s.sub')}</p>
            </div>
          </div>
          <div className="panel-body">
            <DataTable<OutgoingRow>
              rows={sent}
              columns={columns}
              rowKey={(o) => o.id}
              rowName={(o) => toLabel(o)}
              caption={t('comms.s.title')}
              initialSort={{ id: 'when', dir: 'desc' }}
              empty={
                <div className="empty" style={{ padding: '12px 0 8px' }}>
                  <p className="empty-def">{t('comms.s.empty.def')}</p>
                  <p className="empty-title">{t('comms.s.empty.title')}</p>
                  <p className="empty-text">{t('comms.s.empty.text')}</p>
                  <button type="button" className="btn btn-primary" onClick={() => setWizard(true)}>
                    <IconChat size={17} />
                    {t('comms.m.new')}
                  </button>
                </div>
              }
            />
          </div>
        </section>
      )}

      <SendWizard
        open={wizard}
        onClose={closeWizard}
        scope={scope}
        signature={me.signature}
        onSent={() => {
          if (canInbox && view !== 'sent') switchView('sent');
        }}
      />

      <Dialog open={confirmPurge} onClose={() => setConfirmPurge(false)} className="modal" labelledBy="purge-msg-title">
        <div className="modal-head">
          <h2 id="purge-msg-title" className="modal-title">
            {t('comms.m.demo.purge')}
          </h2>
        </div>
        <p className="modal-body">{t('comms.m.demo.confirm', { n: demoCount })}</p>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmPurge(false)}>
            {t('btn.cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={() => void doPurge()}>
            <IconTrash size={16} />
            {t('comms.m.demo.purge')}
          </button>
        </div>
      </Dialog>
    </>
  );
}
