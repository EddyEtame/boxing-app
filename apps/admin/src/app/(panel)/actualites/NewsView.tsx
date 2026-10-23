'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { deleteNewsAction, duplicateNewsAction, importNewsAction, setNewsStatusAction, undoNewsAction, type SavedNews } from './actions';
import { NewsWizard } from './NewsWizard';
import { ImportDialog } from '@/components/content/ImportDialog';
import { ConfirmDelete, HandoffBanner, SearchBox, StatusTag } from '@/components/content/parts';
import { RowMenu, type RowMenuItem } from '@/components/content/RowMenu';
import { useRunner } from '@/components/content/useRunner';
import { Empty } from '@/components/Empty';
import { IconArchive, IconBell, IconCopy, IconDownload, IconEdit, IconPlus, IconSend, IconTrash, IconUndo } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { useToast } from '@/components/Toast';
import { Segmented, Select } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL } from '@/lib/clubs';
import { thumbUrl } from '@/lib/content/media';
import { newsToDraft, todayParis } from '@/lib/content/rules';
import type { ImportPreview, Library, NewsDraft, NewsRow, Upload } from '@/lib/content/types';
import { fmtDate } from '@/lib/format';
import { NEWS_KINDS, type ClubId, type NewsItem, type NewsKind, type PublishStatus } from '@/lib/types';

const STATUS_ORDER: Record<PublishStatus, number> = { programme: 0, brouillon: 1, publie: 2, archive: 3 };
type StatusFilter = 'all' | PublishStatus;

function blankDraft(kind: NewsKind | null, scope: ClubId[] | 'all'): NewsDraft {
  const today = todayParis();
  return {
    kind,
    title: '',
    body: '',
    date: today,
    club: scope === 'all' ? 'reseau' : (scope[0] ?? 'reseau'),
    audience: 'tous',
    important: false,
    photo: null,
    video: '',
    linkUrl: '',
    linkLabel: '',
    mode: 'publie',
    publishDate: today,
    publishTime: '18:00',
  };
}

export function NewsView({
  rows,
  library: initialLibrary,
  importPreview,
  scope,
  canNotify,
  openNew,
  openId,
}: {
  rows: NewsRow[];
  library: Library;
  importPreview: ImportPreview;
  scope: ClubId[] | 'all';
  canNotify: boolean;
  openNew: NewsKind | boolean;
  openId: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { run, undo, pending } = useRunner(undoNewsAction);
  const [library, setLibrary] = useState(initialLibrary);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kind, setKind] = useState<'all' | NewsKind>('all');
  const [club, setClub] = useState<'all' | 'reseau' | ClubId>('all');
  const [q, setQ] = useState('');
  // `?nouveau=1` (bouton « Créer », palette), `?nouveau=resultat` (un type), `?ouvrir=<id>` (recherche) : l'assistant s'ouvre au chargement.
  const [wizard, setWizard] = useState<{ draft: NewsDraft; wasPublished: boolean } | null>(() => {
    if (openId) {
      const found = rows.find((r) => r.item.id === openId && r.editable)?.item;
      return found ? { draft: newsToDraft(found, todayParis()), wasPublished: found.status === 'publie' } : null;
    }
    return openNew ? { draft: blankDraft(typeof openNew === 'string' ? openNew : null, scope), wasPublished: false } : null;
  });
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [handoff, setHandoff] = useState<{ id: string; title: string } | null>(null);

  const items = rows.map((r) => r.item);
  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: rows.length, publie: 0, programme: 0, brouillon: 0, archive: 0 };
    for (const r of rows) c[r.item.status]++;
    return c;
  }, [rows]);
  const fresh = importPreview.candidates.filter((c) => !c.already).length;

  const open = (draft: NewsDraft, wasPublished = false) => setWizard({ draft, wasPublished });
  const openItem = (n: NewsItem) => open(newsToDraft(n, todayParis()), n.status === 'publie');

  // L'adresse redevient propre : recharger la page ne rouvre pas l'assistant.
  useEffect(() => {
    if (openNew || openId) router.replace(pathname, { scroll: false });
  }, [openNew, openId, router, pathname]);

  const filtered = useMemo(() => {
    const needle = q
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    return rows.filter(({ item }) => {
      if (status !== 'all' && item.status !== status) return false;
      if (kind !== 'all' && item.kind !== kind) return false;
      if (club === 'reseau' && item.club !== null) return false;
      if (club !== 'all' && club !== 'reseau' && item.club !== club) return false;
      if (!needle) return true;
      return `${item.title} ${item.body}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .includes(needle);
    });
  }, [rows, status, kind, club, q]);

  const changeStatus = (ids: string[], to: 'publie' | 'archive' | 'brouillon') =>
    run(setNewsStatusAction(ids, to), (d) => ({ text: d.changed ? `${t(`contenu.done.${to}`, { n: d.changed })}${d.skipped ? ` ${t('contenu.done.skipped', { n: d.skipped })}` : ''}` : t('contenu.done.nothing'), undo: d.changed ? d.undo : null }));

  const remove = async (ids: string[]) => {
    setConfirm(null);
    await run(deleteNewsAction(ids), (d) => ({ text: t('contenu.done.removed', { n: d.removed }), undo: d.removed ? d.undo : null }));
  };

  const notifyHref = (id: string) => `/notifications?nouveau=1&from=news:${encodeURIComponent(id)}`;

  const menu = (n: NewsItem): RowMenuItem[] => [
    { id: 'edit', label: t('btn.edit'), icon: <IconEdit size={17} />, onSelect: () => openItem(n) },
    { id: 'dup', label: t('btn.duplicate'), icon: <IconCopy size={17} />, onSelect: () => void run(duplicateNewsAction(n.id), (d) => ({ text: t('contenu.done.duplicated'), undo: d.undo })) },
    n.status === 'archive'
      ? { id: 'unarchive', label: t('contenu.act.unarchive'), icon: <IconUndo size={17} />, onSelect: () => void changeStatus([n.id], 'brouillon') }
      : n.status === 'publie'
        ? { id: 'archive', label: t('btn.archive'), icon: <IconArchive size={17} />, onSelect: () => void changeStatus([n.id], 'archive') }
        : { id: 'publish', label: t('btn.publish'), icon: <IconSend size={17} />, onSelect: () => void changeStatus([n.id], 'publie') },
    ...(canNotify && n.status === 'publie' ? [{ id: 'notify', label: t('contenu.act.notify'), icon: <IconBell size={17} />, onSelect: () => router.push(notifyHref(n.id)) }] : []),
    'sep',
    { id: 'delete', label: t('btn.delete'), icon: <IconTrash size={17} />, danger: true, onSelect: () => setConfirm([n.id]) },
  ];

  const columns: Column<NewsRow>[] = [
    {
      id: 'item',
      header: t('actu.col.item'),
      label: '',
      sortValue: (r) => r.item.title,
      cell: ({ item }) => (
        <div className="ct-cell-item">
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- photothèque locale
            <img src={thumbUrl(item.photo, 128)} alt="" className="ct-cell-thumb" loading="lazy" />
          ) : (
            <span className="ct-cell-thumb" />
          )}
          <div className="ct-cell-text">
            <p className="row-title ct-clamp">{item.title}</p>
            <p className="row-sub ct-cell-meta">
              <span>{t(`actu.kind.${item.kind}` as MessageKey)}</span>
              {item.important ? (
                <span className="ct-flag" title={t('contenu.tag.important.short')}>
                  <IconBell size={13} />
                  {t('contenu.tag.important')}
                </span>
              ) : null}
              {item.demo ? <span className="tag tag-demo">{t('state.demo')}</span> : null}
              {item.origin === 'app' ? <span className="ct-origin">{t('contenu.tag.app')}</span> : null}
            </p>
          </div>
        </div>
      ),
    },
    { id: 'club', header: t('actu.col.club'), sortValue: (r) => (r.item.club ? CLUB_LABEL[r.item.club] : ''), cell: ({ item }) => (item.club ? CLUB_LABEL[item.club] : <span className="dim">{t('club.allShort')}</span>) },
    { id: 'audience', header: t('actu.col.audience'), sortValue: (r) => r.item.audience, cell: ({ item }) => t(`audienceShort.${item.audience}`) },
    { id: 'status', header: t('actu.col.status'), sortValue: (r) => STATUS_ORDER[r.item.status], cell: ({ item }) => <StatusTag status={item.status} publishAt={item.publishAt} /> },
    { id: 'date', header: t('actu.col.date'), sortValue: (r) => r.item.date, cell: ({ item }) => <span className="nowrap">{fmtDate(locale, item.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
    {
      id: 'actions',
      header: '',
      label: '',
      width: '52px',
      cell: (r) => (r.editable ? <RowMenu label={t('contenu.act.menu', { name: r.item.title })} items={menu(r.item)} /> : null),
    },
  ];

  const hasFilters = status !== 'all' || kind !== 'all' || club !== 'all' || q.trim() !== '';

  return (
    <>
      <PageHeader
        kicker={t('actu.kicker')}
        title={t('actu.title')}
        lead={t('actu.lead')}
        actions={
          <>
            {scope === 'all' ? (
              <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
                <IconDownload size={17} />
                {t('contenu.import.menu')}
                {fresh ? <span className="chip-count">{fresh}</span> : null}
              </button>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={() => open(blankDraft(null, scope))}>
              <IconPlus size={17} />
              {t('actu.new')}
            </button>
          </>
        }
      />

      {handoff ? <HandoffBanner title={handoff.title} href={notifyHref(handoff.id)} onClose={() => setHandoff(null)} /> : null}

      {rows.length === 0 ? (
        <Empty def={t('actu.empty.def')} title={t('actu.empty.title')} text={t('actu.empty.text', { n: importPreview.candidates.length })}>
          <div className="templates">
            {scope === 'all' && fresh ? (
              <button type="button" className="template ct-template-main" onClick={() => setImportOpen(true)}>
                <span className="template-title">
                  <IconDownload size={17} className="ct-inline-icon" />
                  {t('actu.tpl.import')}
                </span>
                <span className="template-sub">{t('actu.tpl.import.sub', { n: fresh })}</span>
              </button>
            ) : null}
            {(['resultat', 'portrait', 'activite', 'annonce'] as const).map((k) => (
              <button key={k} type="button" className="template" onClick={() => open(blankDraft(k, scope))}>
                <span className="template-title">{t(`actu.tpl.${k}`)}</span>
                <span className="template-sub">{t(`actu.tpl.${k}.sub`)}</span>
              </button>
            ))}
          </div>
        </Empty>
      ) : (
        <section className="panel ct-list-panel" aria-busy={pending} style={{ opacity: pending ? 0.6 : 1, transition: 'opacity var(--d-cross) var(--e-standard)' }}>
          <div className="panel-body ct-panel-body">
            <div className="filters ct-filters">
              <div className="ct-filters-lead">
                <Segmented<StatusFilter>
                  label={t('contenu.status.filter')}
                  value={status}
                  onChange={setStatus}
                  options={(['all', 'publie', 'programme', 'brouillon', 'archive'] as const).map((s) => ({
                    value: s,
                    label: (
                      <>
                        {s === 'all' ? t('contenu.status.all') : t(`state.${s}`)}
                        <span className="seg-count">{counts[s]}</span>
                      </>
                    ),
                  }))}
                />
              </div>
              <SearchBox value={q} onChange={setQ} label={t('actu.search')} />
              <div className="ct-select">
                <Select<'all' | NewsKind> id="filtre-type" value={kind} onChange={setKind} options={[{ value: 'all', label: t('actu.filter.kind.all') }, ...NEWS_KINDS.map((k) => ({ value: k, label: t(`actu.kind.${k}` as MessageKey) }))]} />
              </div>
              <div className="ct-select">
                <Select<'all' | 'reseau' | ClubId> id="filtre-club" value={club} onChange={setClub} options={[{ value: 'all', label: t('contenu.club.filter.all') }, { value: 'reseau', label: t('club.all') }, ...CLUB_IDS.map((c) => ({ value: c, label: CLUB_LABEL[c] }))]} />
              </div>
            </div>
            <DataTable<NewsRow>
              rows={filtered}
              columns={columns}
              rowKey={(r) => r.item.id}
              rowName={(r) => r.item.title}
              caption={t('actu.title')}
              onOpen={(r) => (r.editable ? openItem(r.item) : toast({ text: t('contenu.act.readonly') }))}
              initialSort={{ id: 'date', dir: 'desc' }}
              bulk={[
                { id: 'publish', label: t('btn.publish'), icon: <IconSend size={16} />, run: (sel) => void changeStatus(sel.map((r) => r.item.id), 'publie') },
                { id: 'archive', label: t('btn.archive'), icon: <IconArchive size={16} />, run: (sel) => void changeStatus(sel.map((r) => r.item.id), 'archive') },
                { id: 'delete', label: t('btn.delete'), icon: <IconTrash size={16} />, danger: true, run: (sel) => setConfirm(sel.map((r) => r.item.id)) },
              ]}
              empty={
                <div className="ct-nomatch">
                  <p className="small muted">{t('contenu.noMatch')}</p>
                  {hasFilters ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setStatus('all');
                        setKind('all');
                        setClub('all');
                        setQ('');
                      }}
                    >
                      {t('table.resetFilters')}
                    </button>
                  ) : null}
                </div>
              }
            />
          </div>
        </section>
      )}

      {wizard ? (
        <NewsWizard
          open
          onClose={() => setWizard(null)}
          initial={wizard.draft}
          wasPublished={wizard.wasPublished}
          library={library}
          onUploaded={(u: Upload) => setLibrary((l) => ({ ...l, uploads: [u, ...l.uploads.filter((x) => x.file !== u.file)] }))}
          scope={scope}
          others={items
            .filter((n) => n.id !== wizard.draft.id && n.status === 'publie')
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3)
            .map((n) => ({ kind: n.kind, title: n.title, body: n.body, date: n.date, club: n.club, photo: n.photo ?? null }))}
          onSaved={(s: SavedNews) => {
            if (canNotify && s.important && s.status === 'publie') setHandoff({ id: s.id, title: s.title });
          }}
          onUndo={undo}
        />
      ) : null}

      {importOpen ? (
        <ImportDialog
          open
          onClose={() => setImportOpen(false)}
          preview={importPreview}
          onImport={async (ids) => {
            const done = await run(importNewsAction(ids), (d) => ({ text: t('contenu.done.imported', { n: d.added }), undo: d.added ? d.undo : null }));
            if (done) setImportOpen(false);
          }}
        />
      ) : null}

      <ConfirmDelete count={confirm?.length ?? 0} open={confirm !== null} onClose={() => setConfirm(null)} onConfirm={() => confirm && void remove(confirm)} />
    </>
  );
}
