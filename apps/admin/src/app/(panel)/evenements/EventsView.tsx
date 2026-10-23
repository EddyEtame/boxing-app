'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { deleteEventsAction, duplicateEventAction, loadDemoEventsAction, purgeDemoEventsAction, setEventStatusAction, undoEventAction, type SavedEvent } from './actions';
import { EventCalendar } from './EventCalendar';
import { EventWizard, whenLabel } from './EventWizard';
import { ImportDialog } from '@/components/content/ImportDialog';
import { ConfirmDelete, HandoffBanner, SearchBox, StatusTag } from '@/components/content/parts';
import { RowMenu, type RowMenuItem } from '@/components/content/RowMenu';
import { useRunner } from '@/components/content/useRunner';
import { Empty } from '@/components/Empty';
import { IconArchive, IconBell, IconClose, IconCopy, IconDownload, IconEdit, IconPlus, IconSend, IconSparkle, IconTicket, IconTrash, IconUndo } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { useToast } from '@/components/Toast';
import { Segmented, Select } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL } from '@/lib/clubs';
import { thumbUrl } from '@/lib/content/media';
import { eventToDraft, fmtWall } from '@/lib/content/rules';
import type { EventDraft, EventRow, ImportPreview, Library, Upload } from '@/lib/content/types';
import { EVENT_KINDS, type ClubEvent, type ClubId, type EventKind, type PublishStatus } from '@/lib/types';

type Period = 'upcoming' | 'past' | 'all';
type StatusFilter = 'all' | PublishStatus;
const STATUS_ORDER: Record<PublishStatus, number> = { programme: 0, brouillon: 1, publie: 2, archive: 3 };

function blankDraft(kind: EventKind | null, scope: ClubId[] | 'all', today: string, date?: string): EventDraft {
  const day = date ?? today;
  return {
    kind,
    title: '',
    body: '',
    startDate: day,
    startTime: kind === 'stage' || kind === 'portes-ouvertes' ? '10:00' : '19:00',
    hasEnd: kind === 'stage' || kind === 'gala' || kind === 'portes-ouvertes',
    endDate: day,
    endTime: kind === 'stage' ? '12:00' : kind === 'portes-ouvertes' ? '17:00' : '23:00',
    club: scope === 'all' ? 'aucun' : (scope[0] ?? 'aucun'),
    venue: '',
    withFight: kind === 'gala',
    fight: { fighter: '', opponent: '', weightClass: '', title: '', broadcaster: '' },
    ticketUrl: '',
    photo: null,
    audience: 'tous',
    important: kind === 'gala',
    mode: 'publie',
    publishDate: today,
    publishTime: '18:00',
  };
}

const ends = (e: ClubEvent) => e.endsAt ?? e.startsAt;

export function EventsView({
  rows,
  library: initialLibrary,
  importPreview,
  scope,
  canNotify,
  today,
  nowWall,
  openNew,
  openId,
}: {
  rows: EventRow[];
  library: Library;
  importPreview: ImportPreview;
  scope: ClubId[] | 'all';
  canNotify: boolean;
  /** AAAA-MM-JJ et AAAA-MM-JJTHH:MM, à Toulouse, calculés par le serveur : le rendu ne dépend pas de l'horloge du navigateur. */
  today: string;
  nowWall: string;
  openNew: EventKind | boolean;
  openId: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { run, undo, pending } = useRunner(undoEventAction);
  const [library, setLibrary] = useState(initialLibrary);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [period, setPeriod] = useState<Period>('upcoming');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kind, setKind] = useState<'all' | EventKind>('all');
  const [club, setClub] = useState<'all' | 'ailleurs' | ClubId>('all');
  const [q, setQ] = useState('');
  const [day, setDay] = useState<string | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [wizard, setWizard] = useState<{ draft: EventDraft; wasPublished: boolean } | null>(() => {
    if (openId) {
      const found = rows.find((r) => r.item.id === openId && r.editable)?.item;
      return found ? { draft: eventToDraft(found, today), wasPublished: found.status === 'publie' } : null;
    }
    return openNew ? { draft: blankDraft(typeof openNew === 'string' ? openNew : null, scope, today), wasPublished: false } : null;
  });
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [handoff, setHandoff] = useState<{ id: string; title: string } | null>(null);

  const items = rows.map((r) => r.item);
  const demoCount = items.filter((e) => e.demo).length;
  const open = (draft: EventDraft, wasPublished = false) => setWizard({ draft, wasPublished });
  const openItem = (e: ClubEvent) => open(eventToDraft(e, today), e.status === 'publie');

  useEffect(() => {
    if (openNew || openId) router.replace(pathname, { scroll: false });
  }, [openNew, openId, router, pathname]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: rows.length, publie: 0, programme: 0, brouillon: 0, archive: 0 };
    for (const r of rows) c[r.item.status]++;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const fold = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
    const needle = fold(q.trim());
    return rows.filter(({ item: e }) => {
      if (day) return e.startsAt.slice(0, 10) <= day && ends(e).slice(0, 10) >= day;
      if (period === 'upcoming' && ends(e) < nowWall) return false;
      if (period === 'past' && ends(e) >= nowWall) return false;
      if (status !== 'all' && e.status !== status) return false;
      if (kind !== 'all' && e.kind !== kind) return false;
      if (club === 'ailleurs' && e.club !== null) return false;
      if (club !== 'all' && club !== 'ailleurs' && e.club !== club) return false;
      if (!needle) return true;
      return fold(`${e.title} ${e.body} ${e.venue ?? ''} ${e.fight?.fighter ?? ''} ${e.fight?.opponent ?? ''}`).includes(needle);
    });
  }, [rows, day, period, status, kind, club, q, nowWall]);

  const changeStatus = (ids: string[], to: 'publie' | 'archive' | 'brouillon') =>
    run(setEventStatusAction(ids, to), (d) => ({ text: d.changed ? `${t(`contenu.done.${to}`, { n: d.changed })}${d.skipped ? ` ${t('contenu.done.skipped', { n: d.skipped })}` : ''}` : t('contenu.done.nothing'), undo: d.changed ? d.undo : null }));
  const remove = async (ids: string[]) => {
    setConfirm(null);
    await run(deleteEventsAction(ids), (d) => ({ text: t('contenu.done.removed', { n: d.removed }), undo: d.removed ? d.undo : null }));
  };
  const notifyHref = (id: string) => `/notifications?nouveau=1&from=event:${encodeURIComponent(id)}`;

  const menu = (e: ClubEvent): RowMenuItem[] => [
    { id: 'edit', label: t('btn.edit'), icon: <IconEdit size={17} />, onSelect: () => openItem(e) },
    { id: 'dup', label: t('btn.duplicate'), icon: <IconCopy size={17} />, onSelect: () => void run(duplicateEventAction(e.id), (d) => ({ text: t('contenu.done.duplicated'), undo: d.undo })) },
    e.status === 'archive'
      ? { id: 'unarchive', label: t('contenu.act.unarchive'), icon: <IconUndo size={17} />, onSelect: () => void changeStatus([e.id], 'brouillon') }
      : e.status === 'publie'
        ? { id: 'archive', label: t('btn.archive'), icon: <IconArchive size={17} />, onSelect: () => void changeStatus([e.id], 'archive') }
        : { id: 'publish', label: t('btn.publish'), icon: <IconSend size={17} />, onSelect: () => void changeStatus([e.id], 'publie') },
    ...(canNotify && e.status === 'publie' ? [{ id: 'notify', label: t('contenu.act.notify'), icon: <IconBell size={17} />, onSelect: () => router.push(notifyHref(e.id)) }] : []),
    'sep',
    { id: 'delete', label: t('btn.delete'), icon: <IconTrash size={17} />, danger: true, onSelect: () => setConfirm([e.id]) },
  ];

  const columns: Column<EventRow>[] = [
    {
      id: 'item',
      header: t('evt.col.item'),
      label: '',
      sortValue: (r) => r.item.title,
      cell: ({ item: e }) => (
        <div className="ct-cell-item">
          {e.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- photothèque locale
            <img src={thumbUrl(e.photo, 128)} alt="" className="ct-cell-thumb" loading="lazy" />
          ) : (
            <span className="ct-cell-thumb" />
          )}
          <div className="ct-cell-text">
            <p className="row-title ct-clamp">{e.title}</p>
            <p className="row-sub ct-cell-meta">
              <span>{t(`evt.kind.${e.kind}` as MessageKey)}</span>
              {e.fight ? <span>{t('evt.vs', { a: e.fight.fighter, b: e.fight.opponent })}</span> : null}
              {e.ticketUrl ? (
                <a className="ct-flag ct-ticket" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
                  <IconTicket size={13} />
                  {t('evt.col.ticket')}
                </a>
              ) : null}
              {e.important ? (
                <span className="ct-flag" title={t('contenu.tag.important.short')}>
                  <IconBell size={13} />
                  {t('contenu.tag.important')}
                </span>
              ) : null}
              {e.demo ? <span className="tag tag-demo">{t('state.demo')}</span> : null}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'when',
      header: t('evt.col.when'),
      sortValue: (r) => r.item.startsAt,
      cell: ({ item: e }) => {
        const state = ends(e) < nowWall ? t('evt.past') : e.startsAt <= nowWall ? t('evt.inProgress') : null;
        return (
          <div className="ct-cell-text">
            {whenLabel(locale, e.startsAt, e.endsAt, 'short')
              .split(' → ')
              .map((part, i) => (
                <span key={i} className="nowrap">
                  {i ? `→ ${part}` : part}
                </span>
              ))}
            {state ? <span className="row-sub">{state}</span> : null}
          </div>
        );
      },
    },
    { id: 'where', header: t('evt.col.where'), sortValue: (r) => (r.item.club ? CLUB_LABEL[r.item.club] : (r.item.venue ?? '')), cell: ({ item: e }) => <span className="ct-clamp">{e.club ? CLUB_LABEL[e.club] : (e.venue ?? '—')}</span> },
    { id: 'status', header: t('evt.col.status'), sortValue: (r) => STATUS_ORDER[r.item.status], cell: ({ item: e }) => <StatusTag status={e.status} publishAt={e.publishAt} /> },
    { id: 'actions', header: '', label: '', width: '52px', cell: (r) => (r.editable ? <RowMenu label={t('contenu.act.menu', { name: r.item.title })} items={menu(r.item)} /> : null) },
  ];

  const hasFilters = period !== 'upcoming' || status !== 'all' || kind !== 'all' || club !== 'all' || q.trim() !== '' || day !== null;
  const reset = () => {
    setPeriod('upcoming');
    setStatus('all');
    setKind('all');
    setClub('all');
    setQ('');
    setDay(null);
  };

  return (
    <>
      <PageHeader
        kicker={t('evt.kicker')}
        title={t('evt.title')}
        lead={t('evt.lead')}
        actions={
          <>
            {scope === 'all' ? (
              <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
                <IconDownload size={17} />
                {t('contenu.import.menu')}
              </button>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={() => open(blankDraft(null, scope, today))}>
              <IconPlus size={17} />
              {t('evt.new')}
            </button>
          </>
        }
      />

      {handoff ? <HandoffBanner title={handoff.title} href={notifyHref(handoff.id)} onClose={() => setHandoff(null)} /> : null}

      {demoCount > 0 && scope === 'all' ? (
        <div className="ct-demo-band" role="note">
          <span className="tag tag-demo">{t('state.demo')}</span>
          <span className="ct-demo-text">{t('contenu.demo.banner', { n: demoCount })}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void run(purgeDemoEventsAction(), (d) => ({ text: t('contenu.done.demoRemoved', { n: d.removed }), undo: d.removed ? d.undo : null }))}>
            <IconTrash size={15} />
            {t('contenu.demo.remove')}
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Empty def={t('evt.empty.def')} title={t('evt.empty.title')} text={t('evt.empty.text')}>
          <div className="templates">
            {(['gala', 'combat', 'stage', 'portes'] as const).map((k) => (
              <button key={k} type="button" className="template" onClick={() => open(blankDraft(k === 'portes' ? 'portes-ouvertes' : k, scope, today))}>
                <span className="template-title">{t(`evt.tpl.${k}`)}</span>
                <span className="template-sub">{t(`evt.tpl.${k}.sub`)}</span>
              </button>
            ))}
            {scope === 'all' ? (
              <button type="button" className="template" onClick={() => void run(loadDemoEventsAction(), (d) => ({ text: t('contenu.done.demo', { n: d.added }), undo: d.added ? d.undo : null }))}>
                <span className="template-title">
                  <IconSparkle size={16} className="ct-inline-icon" />
                  {t('contenu.demo.load')}
                </span>
                <span className="template-sub">{t('evt.tpl.demo.sub')}</span>
              </button>
            ) : null}
          </div>
        </Empty>
      ) : (
        <section className="panel ct-list-panel" aria-busy={pending} style={{ opacity: pending ? 0.6 : 1, transition: 'opacity var(--d-cross) var(--e-standard)' }}>
          <div className="panel-body ct-panel-body">
            <div className="filters ct-filters">
              <div className="ct-filters-lead">
                <Segmented<'list' | 'calendar'>
                  label={t('evt.view')}
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'list', label: t('evt.view.list') },
                    { value: 'calendar', label: t('evt.view.calendar') },
                  ]}
                />
                {view === 'list' ? (
                  <>
                    {day ? (
                      <button type="button" className="chip" aria-pressed="true" onClick={() => setDay(null)}>
                        {fmtWall(locale, day, { weekday: 'long', day: 'numeric', month: 'long' })}
                        <IconClose size={15} />
                      </button>
                    ) : (
                      <Segmented<Period>
                        label={t('evt.when')}
                        value={period}
                        onChange={setPeriod}
                        options={[
                          { value: 'upcoming', label: t('evt.when.upcoming') },
                          { value: 'past', label: t('evt.when.past') },
                          { value: 'all', label: t('evt.when.all') },
                        ]}
                      />
                    )}
                  </>
                ) : null}
              </div>
              {view === 'list' ? (
                <>
                  <SearchBox value={q} onChange={setQ} label={t('evt.search')} />
                  <div className="ct-select">
                    <Select<'all' | EventKind> id="filtre-type" value={kind} onChange={setKind} options={[{ value: 'all', label: t('actu.filter.kind.all') }, ...EVENT_KINDS.map((k) => ({ value: k, label: t(`evt.kind.${k}` as MessageKey) }))]} />
                  </div>
                  <div className="ct-select">
                    <Select<StatusFilter>
                      id="filtre-statut"
                      value={status}
                      onChange={setStatus}
                      options={(['all', 'publie', 'programme', 'brouillon', 'archive'] as const).map((s) => ({ value: s, label: `${s === 'all' ? t('contenu.status.all') : t(`state.${s}`)} · ${counts[s]}` }))}
                    />
                  </div>
                  <div className="ct-select">
                    <Select<'all' | 'ailleurs' | ClubId> id="filtre-club" value={club} onChange={setClub} options={[{ value: 'all', label: t('contenu.club.filter.all') }, ...CLUB_IDS.map((c) => ({ value: c, label: CLUB_LABEL[c] })), { value: 'ailleurs', label: t('evt.f.club.none') }]} />
                  </div>
                </>
              ) : null}
            </div>
            {view === 'calendar' ? (
              <EventCalendar
                events={items}
                month={month}
                onMonth={setMonth}
                onOpen={(e) => (rows.find((r) => r.item.id === e.id)?.editable ? openItem(e) : toast({ text: t('contenu.act.readonly') }))}
                onCreate={(d) => open(blankDraft(null, scope, today, d))}
                canCreate
                onDay={(d) => {
                  setDay(d);
                  setView('list');
                }}
              />
            ) : (
              <DataTable<EventRow>
                rows={filtered}
                columns={columns}
                rowKey={(r) => r.item.id}
                rowName={(r) => r.item.title}
                caption={t('evt.title')}
                onOpen={(r) => (r.editable ? openItem(r.item) : toast({ text: t('contenu.act.readonly') }))}
                initialSort={{ id: 'when', dir: 'asc' }}
                bulk={[
                  { id: 'publish', label: t('btn.publish'), icon: <IconSend size={16} />, run: (sel) => void changeStatus(sel.map((r) => r.item.id), 'publie') },
                  { id: 'archive', label: t('btn.archive'), icon: <IconArchive size={16} />, run: (sel) => void changeStatus(sel.map((r) => r.item.id), 'archive') },
                  { id: 'delete', label: t('btn.delete'), icon: <IconTrash size={16} />, danger: true, run: (sel) => setConfirm(sel.map((r) => r.item.id)) },
                ]}
                empty={
                  <div className="ct-nomatch">
                    <p className="small muted">{period === 'upcoming' && !day && !q && kind === 'all' && club === 'all' && status === 'all' ? t('evt.empty.upcoming') : t('contenu.noMatch')}</p>
                    {hasFilters ? (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
                        {t('table.resetFilters')}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => open(blankDraft(null, scope, today))}>
                        <IconPlus size={15} />
                        {t('evt.new')}
                      </button>
                    )}
                  </div>
                }
              />
            )}
          </div>
        </section>
      )}

      {wizard ? (
        <EventWizard
          open
          onClose={() => setWizard(null)}
          initial={wizard.draft}
          wasPublished={wizard.wasPublished}
          library={library}
          onUploaded={(u: Upload) => setLibrary((l) => ({ ...l, uploads: [u, ...l.uploads.filter((x) => x.file !== u.file)] }))}
          scope={scope}
          onSaved={(s: SavedEvent) => {
            if (canNotify && s.important && s.status === 'publie') setHandoff({ id: s.id, title: s.title });
          }}
          onUndo={undo}
        />
      ) : null}

      {importOpen ? <ImportDialog open onClose={() => setImportOpen(false)} preview={importPreview} onImport={async () => undefined} /> : null}

      <ConfirmDelete count={confirm?.length ?? 0} open={confirm !== null} onClose={() => setConfirm(null)} onConfirm={() => confirm && void remove(confirm)} />
    </>
  );
}
