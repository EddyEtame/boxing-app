'use client';

import { discipline } from '@bc/brand';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { deleteVideosAction, duplicateVideoAction, importVideosAction, setVideoAccessAction, setVideoStatusAction, undoVideoAction } from './actions';
import { VideoWizard } from './VideoWizard';
import { ImportDialog } from '@/components/content/ImportDialog';
import { ConfirmDelete, HandoffBanner, SearchBox, StatusTag, Summary } from '@/components/content/parts';
import { niveauKey, objectifKey } from '@/components/content/Previews';
import { RowMenu, type RowMenuItem } from '@/components/content/RowMenu';
import { useRunner } from '@/components/content/useRunner';
import { Empty } from '@/components/Empty';
import { IconArchive, IconBell, IconCopy, IconDownload, IconEdit, IconLock, IconPlay, IconPlus, IconSend, IconTrash, IconUndo } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { Segmented, Select } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { VIDEO_FAMILLES } from '@/lib/content/enums';
import { thumbUrl } from '@/lib/content/media';
import { videoToDraft } from '@/lib/content/rules';
import type { ImportPreview, Library, Upload, VideoDraft, VideoRow } from '@/lib/content/types';
import { NIVEAUX, type Famille, type Niveau, type Objectif, type PublishStatus, type VideoItem } from '@/lib/types';

type StatusFilter = 'all' | PublishStatus;
const STATUS_ORDER: Record<PublishStatus, number> = { programme: 0, brouillon: 1, publie: 2, archive: 3 };
type Template = { famille: Exclude<Famille, 'accesLibre'>; objectif: Objectif } | null;

function blankDraft(numero: number, tpl: Template): VideoDraft {
  return {
    famille: tpl?.famille ?? null,
    title: '',
    coach: '',
    numero,
    niveau: 'Débutant',
    dureeMin: 6,
    objectif: tpl?.objectif ?? null,
    securite: null,
    sourceKind: 'stream',
    sourceRef: '',
    poster: null,
    gratuite: false,
    mode: 'brouillon',
  };
}

export function VideosView({
  rows,
  library: initialLibrary,
  importPreview,
  streamConfigured,
  canNotify,
  openNew,
  openId,
}: {
  rows: VideoRow[];
  library: Library;
  importPreview: ImportPreview;
  streamConfigured: boolean;
  /** CDC §14 « Nouvelle vidéo » : le relais vers la notification, pour qui peut en envoyer. */
  canNotify: boolean;
  openNew: boolean;
  openId: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { run, undo, pending } = useRunner(undoVideoAction);
  const [library, setLibrary] = useState(initialLibrary);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [famille, setFamille] = useState<'all' | Exclude<Famille, 'accesLibre'>>('all');
  const [niveau, setNiveau] = useState<'all' | Niveau>('all');
  const [q, setQ] = useState('');
  const [wizard, setWizard] = useState<{ draft: VideoDraft; wasPublished: boolean } | null>(() => {
    if (openId) {
      const found = rows.find((r) => r.item.id === openId)?.item;
      return found ? { draft: videoToDraft(found), wasPublished: found.status === 'publie' } : null;
    }
    return openNew ? { draft: blankDraft(Math.min(999, rows.reduce((n, r) => Math.max(n, r.item.numero), 0) + 1), null), wasPublished: false } : null;
  });
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [handoff, setHandoff] = useState<{ id: string; title: string } | null>(null);
  const notifyHref = (id: string) => `/notifications?nouveau=1&from=video:${encodeURIComponent(id)}`;

  const items = rows.map((r) => r.item);
  const nextNumero = Math.min(999, items.reduce((n, v) => Math.max(n, v.numero), 0) + 1);
  const freeCount = items.filter((v) => v.gratuite && v.status !== 'archive').length;
  const noSource = items.filter((v) => !v.source.ref).length;
  const coaches = useMemo(() => [...new Set(rows.map((r) => r.item.coach).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, 'fr')), [rows]);
  const fresh = importPreview.candidates.filter((c) => !c.already).length;

  const open = (draft: VideoDraft, wasPublished = false) => setWizard({ draft, wasPublished });
  const openItem = (v: VideoItem) => open(videoToDraft(v), v.status === 'publie');

  useEffect(() => {
    if (openNew || openId) router.replace(pathname, { scroll: false });
  }, [openNew, openId, router, pathname]);

  const filtered = useMemo(() => {
    const fold = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
    const needle = fold(q.trim());
    return rows.filter(({ item: v }) => {
      if (status !== 'all' && v.status !== status) return false;
      if (famille !== 'all' && v.famille !== famille) return false;
      if (niveau !== 'all' && v.niveau !== niveau) return false;
      return !needle || fold(`${v.numero} ${v.title} ${v.coach ?? ''}`).includes(needle);
    });
  }, [rows, status, famille, niveau, q]);

  const changeStatus = (ids: string[], to: 'publie' | 'archive' | 'brouillon') =>
    run(setVideoStatusAction(ids, to), (d) => {
      const parts = [d.changed ? t(`contenu.done.${to}`, { n: d.changed }) : t('contenu.done.nothing')];
      if (d.noSource) parts.push(t('vid.done.noSource', { n: d.noSource }));
      if (d.skipped) parts.push(t('contenu.done.skipped', { n: d.skipped }));
      return { text: parts.join(' '), undo: d.changed ? d.undo : null };
    });
  const access = (ids: string[], gratuite: boolean) => run(setVideoAccessAction(ids, gratuite), (d) => ({ text: d.changed ? t(gratuite ? 'vid.done.free' : 'vid.done.reserve', { n: d.changed }) : t('contenu.done.nothing'), undo: d.changed ? d.undo : null }));
  const remove = async (ids: string[]) => {
    setConfirm(null);
    await run(deleteVideosAction(ids), (d) => ({ text: t('contenu.done.removed', { n: d.removed }), undo: d.removed ? d.undo : null }));
  };

  const menu = (v: VideoItem): RowMenuItem[] => [
    { id: 'edit', label: t('btn.edit'), icon: <IconEdit size={17} />, onSelect: () => openItem(v) },
    { id: 'dup', label: t('btn.duplicate'), icon: <IconCopy size={17} />, onSelect: () => void run(duplicateVideoAction(v.id), (d) => ({ text: t('contenu.done.duplicated'), undo: d.undo })) },
    v.gratuite ? { id: 'reserve', label: t('vid.act.reserve'), icon: <IconLock size={17} />, onSelect: () => void access([v.id], false) } : { id: 'free', label: t('vid.act.free'), icon: <IconPlay size={17} />, onSelect: () => void access([v.id], true) },
    v.status === 'archive'
      ? { id: 'unarchive', label: t('contenu.act.unarchive'), icon: <IconUndo size={17} />, onSelect: () => void changeStatus([v.id], 'brouillon') }
      : v.status === 'publie'
        ? { id: 'archive', label: t('btn.archive'), icon: <IconArchive size={17} />, onSelect: () => void changeStatus([v.id], 'archive') }
        : { id: 'publish', label: t('btn.publish'), icon: <IconSend size={17} />, onSelect: () => void changeStatus([v.id], 'publie') },
    ...(canNotify && v.status === 'publie' ? [{ id: 'notify', label: t('contenu.act.notify'), icon: <IconBell size={17} />, onSelect: () => router.push(notifyHref(v.id)) }] : []),
    'sep',
    { id: 'delete', label: t('btn.delete'), icon: <IconTrash size={17} />, danger: true, onSelect: () => setConfirm([v.id]) },
  ];

  const columns: Column<VideoRow>[] = [
    {
      id: 'item',
      header: t('vid.col.item'),
      label: '',
      // L'ordre de la vidéothèque : le numéro (il s'écrit sous le titre).
      sortValue: (r) => r.item.numero,
      cell: ({ item: v }) => (
        <div className="ct-cell-item">
          {v.poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- photothèque locale
            <img src={thumbUrl(v.poster, 128)} alt="" className="ct-cell-thumb" loading="lazy" />
          ) : (
            <span className="ct-cell-thumb" />
          )}
          <div className="ct-cell-text">
            <p className="row-title ct-clamp">{v.title}</p>
            <p className="row-sub ct-cell-meta">
              <span className="mono">n° {v.numero}</span>
              {v.coach ? <span>{v.coach}</span> : null}
              {v.demo ? <span className="tag tag-demo">{t('state.demo')}</span> : null}
              {v.origin === 'app' ? <span className="ct-origin">{t('contenu.tag.app')}</span> : null}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'famille',
      header: t('vid.col.famille'),
      sortValue: (r) => t(`vid.famille.${r.item.famille}` as MessageKey),
      cell: ({ item: v }) => (
        <span className="ct-famille">
          <span className="ct-swatch" style={{ background: discipline[v.famille] }} aria-hidden="true" />
          {t(`vid.famille.${v.famille}` as MessageKey).split(' · ')[0]}
        </span>
      ),
    },
    {
      id: 'reglages',
      header: t('vid.col.reglages'),
      // Le niveau d'abord, puis la durée : « Débutant, 4 min » avant « Débutant, 14 min ».
      sortValue: (r) => NIVEAUX.indexOf(r.item.niveau) * 1000 + r.item.dureeMin,
      cell: ({ item: v }) => (
        <div className="ct-cell-text">
          <span className="nowrap">
            {t(niveauKey(v.niveau))} · {t('vid.minutes', { n: v.dureeMin })}
          </span>
          <span className="row-sub">
            {t(objectifKey(v.objectif))} · <span className={v.securite === 'encadrement' ? 'ct-sec-warn' : undefined}>{t(`vid.sec.${v.securite}` as MessageKey)}</span>
          </span>
        </div>
      ),
    },
    {
      id: 'acces',
      header: t('vid.col.acces'),
      sortValue: (r) => (r.item.gratuite ? 0 : 1),
      cell: ({ item: v }) =>
        v.gratuite ? (
          <span className="tag tag-pos">{t('vid.acces.free')}</span>
        ) : (
          <span className="tag">
            <IconLock size={12} />
            {t('vid.acces.members')}
          </span>
        ),
    },
    {
      id: 'status',
      header: t('vid.col.status'),
      sortValue: (r) => STATUS_ORDER[r.item.status] * 10 + (r.item.source.ref ? 0 : 1),
      cell: ({ item: v }) => (
        <div className="ct-cell-text">
          <StatusTag status={v.status} />
          <span className="row-sub">
            {v.source.ref ? (v.source.kind === 'stream' ? t('vid.source.stream') : t('vid.source.url')) : <span className="ct-src-none">{t('vid.source.none')}</span>}
          </span>
        </div>
      ),
    },
    { id: 'actions', header: '', label: '', width: '52px', cell: (r) => <RowMenu label={t('contenu.act.menu', { name: r.item.title })} items={menu(r.item)} /> },
  ];

  const hasFilters = status !== 'all' || famille !== 'all' || niveau !== 'all' || q.trim() !== '';

  return (
    <>
      <PageHeader
        kicker={t('vid.kicker')}
        title={t('vid.title')}
        lead={t('vid.lead')}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
              <IconDownload size={17} />
              {t('contenu.import.menu')}
              {fresh ? <span className="chip-count">{fresh}</span> : null}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => open(blankDraft(nextNumero, null))}>
              <IconPlus size={17} />
              {t('vid.new')}
            </button>
          </>
        }
      />

      {handoff ? <HandoffBanner title={handoff.title} headline={t('vid.handoff.title', { title: handoff.title })} href={notifyHref(handoff.id)} onClose={() => setHandoff(null)} /> : null}

      {rows.length === 0 ? (
        <Empty def={t('vid.empty.def')} title={t('vid.empty.title')} text={t('vid.empty.text', { n: importPreview.candidates.length })}>
          <div className="templates">
            {fresh ? (
              <button type="button" className="template ct-template-main" onClick={() => setImportOpen(true)}>
                <span className="template-title">
                  <IconDownload size={17} className="ct-inline-icon" />
                  {t('vid.tpl.import')}
                </span>
                <span className="template-sub">{t('vid.tpl.import.sub', { n: fresh })}</span>
              </button>
            ) : null}
            {(
              [
                ['technique', { famille: 'anglaise', objectif: 'Technique' }],
                ['physique', { famille: 'crossTraining', objectif: 'Condition' }],
                ['mobilite', { famille: 'crossTraining', objectif: 'Mobilité' }],
              ] as const
            ).map(([k, tpl]) => (
              <button key={k} type="button" className="template" onClick={() => open(blankDraft(nextNumero, tpl))}>
                <span className="template-title">{t(`vid.tpl.${k}`)}</span>
                <span className="template-sub">{t(`vid.tpl.${k}.sub`)}</span>
              </button>
            ))}
          </div>
        </Empty>
      ) : (
        <section className="panel ct-list-panel" aria-busy={pending} style={{ opacity: pending ? 0.6 : 1, transition: 'opacity var(--d-cross) var(--e-standard)' }}>
          <div className="panel-body ct-panel-body">
            <Summary
              items={[
                { key: 'total', node: <b>{t('vid.sum.total', { n: items.length })}</b> },
                { key: 'free', node: t('vid.sum.free', { n: freeCount }) },
                ...(noSource ? [{ key: 'src', node: <span className="ct-src-none">{t('vid.sum.noSource', { n: noSource })}</span> }] : []),
              ]}
            />
            <div className="filters ct-filters">
              <div className="ct-filters-lead">
                <Segmented<'all' | Niveau> label={t('vid.filter.niveau')} value={niveau} onChange={setNiveau} options={[{ value: 'all', label: t('vid.filter.niveau.all') }, ...NIVEAUX.map((n) => ({ value: n, label: t(niveauKey(n)) }))]} />
              </div>
              <SearchBox value={q} onChange={setQ} label={t('vid.search')} />
              <div className="ct-select">
                <Select<'all' | Exclude<Famille, 'accesLibre'>> id="filtre-famille" value={famille} onChange={setFamille} options={[{ value: 'all', label: t('vid.filter.famille.all') }, ...VIDEO_FAMILLES.map((f) => ({ value: f, label: t(`vid.famille.${f}` as MessageKey) }))]} />
              </div>
              <div className="ct-select">
                <Select<StatusFilter> id="filtre-statut" value={status} onChange={setStatus} options={(['all', 'publie', 'brouillon', 'archive'] as const).map((s) => ({ value: s, label: s === 'all' ? t('contenu.status.all') : t(`state.${s}`) }))} />
              </div>
            </div>
            <DataTable<VideoRow>
              rows={filtered}
              columns={columns}
              rowKey={(r) => r.item.id}
              rowName={(r) => r.item.title}
              caption={t('vid.title')}
              onOpen={(r) => openItem(r.item)}
              initialSort={{ id: 'item', dir: 'desc' }}
              bulk={[
                { id: 'publish', label: t('btn.publish'), icon: <IconSend size={16} />, run: (sel) => void changeStatus(sel.map((r) => r.item.id), 'publie') },
                { id: 'free', label: t('vid.act.free'), icon: <IconPlay size={16} />, run: (sel) => void access(sel.map((r) => r.item.id), true) },
                { id: 'reserve', label: t('vid.act.reserve'), icon: <IconLock size={16} />, run: (sel) => void access(sel.map((r) => r.item.id), false) },
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
                        setFamille('all');
                        setNiveau('all');
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
        <VideoWizard
          open
          onClose={() => setWizard(null)}
          initial={wizard.draft}
          wasPublished={wizard.wasPublished}
          library={library}
          onUploaded={(u: Upload) => setLibrary((l) => ({ ...l, uploads: [u, ...l.uploads.filter((x) => x.file !== u.file)] }))}
          takenNumbers={items.filter((v) => v.id !== wizard.draft.id).map((v) => v.numero)}
          coaches={coaches}
          freeCount={freeCount}
          total={items.length}
          streamConfigured={streamConfigured}
          onSaved={(s) => {
            // Une nouvelle vidéo en ligne : le relais vers la notification « Nouvelle vidéo » (CDC §14).
            if (canNotify && s.created && s.status === 'publie') setHandoff({ id: s.id, title: s.title });
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
            const done = await run(importVideosAction(ids), (d) => ({ text: t('contenu.done.imported', { n: d.added }), undo: d.added ? d.undo : null }));
            if (done) setImportOpen(false);
          }}
        />
      ) : null}

      <ConfirmDelete count={confirm?.length ?? 0} open={confirm !== null} onClose={() => setConfirm(null)} onConfirm={() => confirm && void remove(confirm)} />
    </>
  );
}
