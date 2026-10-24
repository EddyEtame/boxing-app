'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';

import { approve, loadDemo, removeDemo, undoDecision, withdraw } from './actions';
import { RulesWizard } from './RulesWizard';
import { Dialog } from '@/components/Dialog';
import { Empty } from '@/components/Empty';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { IconAlert, IconArrow, IconBan, IconCheck, IconClose, IconInfo, IconRing, IconSearch, IconShieldCheck, IconSliders, IconSparkle, IconTrash, IconUndo, IconUsers } from '@/components/icons';
import { Choices, Field, Segmented, Select, TextArea } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import { motifLabel } from '@/lib/planning/motifs';
import type { MessageKey, Translate } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtDate, hhmm, relative } from '@/lib/format';
import { TYPE_ORDER, type ModerationCheck, type QueueItem } from '@/lib/team/moderation';
import { RETRAIT_MOTIFS, SPARRING, type ClubId, type ModerationRules, type RetraitMotif, type TrainingType } from '@/lib/types';

type Tab = QueueItem['status'];
type Snapshot = { id: string; status: Tab; decision?: QueueItem['decision'] };

const TYPE_ICON: Record<TrainingType, (p: { size?: number }) => ReactNode> = {
  'sparring-anglaise': IconRing,
  'sparring-pieds-poings': IconRing,
  'sparring-sol': IconRing,
  'training-collectif': IconUsers,
  footing: IconArrow,
};

/** L'observation de l'organisateur, avec les morceaux en cause surlignés. */
function Highlighted({ text, hits }: { text: string; hits: string[] }) {
  if (!hits.length) return <>{text}</>;
  const re = new RegExp(`(${hits.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'giu');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i} className="team-hit">{part}</mark> : <span key={i}>{part}</span>))}
    </>
  );
}

function checkText(t: Translate, c: ModerationCheck, type: TrainingType): string {
  const v = c.vars ?? {};
  switch (c.code) {
    case 'categorie-coupee':
      return v.what === 'entrainements' ? t('team.check.categorie-coupee.all') : t('team.check.categorie-coupee.body', { type: t(`team.type.${type}` as MessageKey) });
    case 'coordonnees':
      return t('team.check.coordonnees.body', { hits: (c.hits ?? []).join(' · ') });
    case 'mots-sensibles':
      return t('team.check.mots-sensibles.body', { hits: (c.hits ?? []).join(' · ') });
    case 'club-ferme':
      return t(type === 'footing' ? 'team.check.club-ferme.footing' : 'team.check.club-ferme.body', { motif: motifLabel(t, String(v.motif ?? '')) });
    case 'hors-acces-libre':
      if (v.none) return type === 'footing' ? t('team.check.hors-acces-libre.noneFooting') : t('team.check.hors-acces-libre.none');
      if (v.closedDay) return type === 'footing' ? t('team.check.hors-acces-libre.closedDayFooting') : t('team.check.hors-acces-libre.closedDay');
      return type === 'footing' ? t('team.check.hors-acces-libre.footing', { day: String(v.day ?? '—') }) : t('team.check.hors-acces-libre.body', { day: String(v.day ?? '—') });
    default:
      return t(`team.check.${c.code}.body` as MessageKey, v);
  }
}

export function ModerationView({ items, rules, categoriesOn, freeClubs, scope, canRules }: { items: QueueItem[]; rules: ModerationRules; categoriesOn: boolean; freeClubs: ClubId[]; scope: ClubId[]; canRules: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const now = useNow(60_000);
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>('a-verifier');
  const [club, setClub] = useState<ClubId | 'all'>('all');
  const [type, setType] = useState<TrainingType | 'all'>('all');
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [withdrawIds, setWithdrawIds] = useState<string[] | null>(null);
  const [motif, setMotif] = useState<RetraitMotif | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [force, setForce] = useState<QueueItem | null>(null);
  const [forceNote, setForceNote] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const count = (s: Tab) => items.filter((p) => p.status === s).length;
  const demoCount = items.filter((p) => p.demo).length;
  const missingFree = scope.filter((c) => !freeClubs.includes(c));

  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('fr');
    return items.filter(
      (p) =>
        p.status === tab &&
        (club === 'all' || p.club === club) &&
        (type === 'all' || p.type === type) &&
        (!needle || [p.organizer.prenom, p.observation ?? '', CLUB_LABEL[p.club], p.organizer.memberId].join(' ').toLocaleLowerCase('fr').includes(needle)),
    );
  }, [items, tab, club, type, q]);

  const active = list.find((p) => p.id === activeId) ?? list[0] ?? null;

  const dayLabel = (p: QueueItem) => `${fmtDate(locale, p.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${hhmm(p.debut, locale)}`;
  const typeLabel = (ty: TrainingType) => t(`team.type.${ty}` as MessageKey);
  const errOf = (code: string, fields?: Record<string, string>) => (fields && Object.values(fields)[0] ? t(Object.values(fields)[0] as MessageKey) : t(`err.${code}` as MessageKey));

  const undoWith = (snaps: Snapshot[]) => async () => {
    const res = await undoDecision(snaps);
    if (!res.ok) toast({ text: errOf(res.error), kind: 'err' });
    router.refresh();
  };

  const doApprove = (ids: string[]) =>
    startTransition(async () => {
      const res = await approve(ids);
      if (!res.ok) {
        toast({ text: errOf(res.error, res.fieldErrors), kind: 'err' });
        return;
      }
      const { done, skipped } = res.data;
      const text = skipped.length ? t('team.mod.approved.partial', { n: done.length, skipped: skipped.length }) : t('team.mod.approved', { n: done.length });
      toast({ text, kind: done.length ? 'ok' : 'err', undo: done.length ? undoWith(done) : undefined });
      router.refresh();
    });

  const doForce = () =>
    startTransition(async () => {
      if (!force) return;
      if (forceNote.trim().length < 5) {
        setNoteError(t('team.mod.err.forceNote'));
        return;
      }
      const res = await approve([force.id], { note: forceNote.trim() });
      if (!res.ok) {
        setNoteError(errOf(res.error, res.fieldErrors));
        return;
      }
      setForce(null);
      toast({ text: t('team.mod.approved', { n: res.data.done.length }), undo: res.data.done.length ? undoWith(res.data.done) : undefined });
      router.refresh();
    });

  const doWithdraw = () =>
    startTransition(async () => {
      if (!withdrawIds) return;
      if (!motif) {
        setNoteError(t('team.mod.err.motif'));
        return;
      }
      const res = await withdraw(withdrawIds, motif, note.trim() || undefined);
      if (!res.ok) {
        setNoteError(errOf(res.error, res.fieldErrors));
        return;
      }
      setWithdrawIds(null);
      toast({ text: t('team.mod.withdrawn', { n: res.data.done.length }), undo: undoWith(res.data.done) });
      router.refresh();
    });

  const reopen = (ids: string[]) =>
    startTransition(async () => {
      const prev: Snapshot[] = items.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, status: p.status, decision: p.decision }));
      const res = await undoDecision(ids.map((id) => ({ id, status: 'a-verifier' })));
      if (!res.ok) {
        toast({ text: errOf(res.error), kind: 'err' });
        return;
      }
      toast({ text: t('team.mod.reopened', { n: res.data.n }), undo: undoWith(prev) });
      router.refresh();
    });

  const askWithdraw = (ids: string[]) => {
    setMotif(null);
    setNote('');
    setNoteError(null);
    setWithdrawIds(ids);
  };

  const seed = () =>
    startTransition(async () => {
      const res = await loadDemo();
      if (!res.ok) toast({ text: errOf(res.error), kind: 'err' });
      else toast({ text: t('team.mod.demo.loaded', { n: res.data.n }) });
      router.refresh();
    });

  const purge = () =>
    startTransition(async () => {
      setConfirmPurge(false);
      const res = await removeDemo();
      if (!res.ok) toast({ text: errOf(res.error), kind: 'err' });
      else toast({ text: t('team.mod.demo.removed', { n: res.data.n }) });
      router.refresh();
    });

  // Le clavier de la file : J/K pour parcourir, V pour valider, R pour retirer.
  const keyState = useRef({ list, active, tab });
  useEffect(() => {
    keyState.current = { list, active, tab };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (document.querySelector('dialog[open]')) return;
      const { list: l, active: a, tab: tb } = keyState.current;
      const i = a ? l.findIndex((p) => p.id === a.id) : -1;
      const k = e.key.toLowerCase();
      if (k === 'j' && i < l.length - 1) setActiveId(l[i + 1]!.id);
      else if (k === 'k' && i > 0) setActiveId(l[i - 1]!.id);
      else if (k === 'v' && a && tb === 'a-verifier' && !a.blocking) doApprove([a.id]);
      else if (k === 'r' && a && tb !== 'retiree') askWithdraw([a.id]);
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // doApprove change d'identité à chaque rendu ; l'état est lu dans keyState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verdict = (p: QueueItem) => {
    if (p.status === 'en-ligne') return <span className="tag tag-pos">{t('team.mod.by', { who: p.decision?.by ?? '—' })}</span>;
    if (p.status === 'retiree') return <span className="tag tag-neg">{p.decision?.motif ? t(`team.motif.${p.decision.motif}` as MessageKey) : t('team.prop.status.retiree')}</span>;
    const stops = p.checks.filter((c) => c.level === 'bloquant').length;
    const warns = p.checks.length - stops;
    if (stops) return <span className="tag tag-neg">{t('team.mod.blocking', { n: stops })}</span>;
    if (warns) return <span className="tag tag-warn">{t('team.mod.toRead', { n: warns })}</span>;
    return <span className="tag tag-pos">{t('team.mod.clean')}</span>;
  };

  const columns: Column<QueueItem>[] = [
    {
      id: 'prop',
      header: t('team.mod.col.prop'),
      label: '',
      sortValue: (p) => `${p.date}${String(p.debut).padStart(4, '0')}`,
      // La catégorie, le club et l'heure, puis l'organisateur et le moment de réception : une ligne se lit d'un regard.
      cell: (p) => (
        <span style={{ display: 'block', minWidth: 0 }}>
          <span className="row-title" style={{ display: 'block' }}>
            {typeLabel(p.type)}
            {p.demo ? (
              <span className="tag tag-demo team-demo-tag" title={t('demo.hint')}>
                {t('demo.tag')}
              </span>
            ) : null}
          </span>
          <span className="row-sub" style={{ display: 'block' }}>
            {CLUB_LABEL[p.club]} · {dayLabel(p)}
          </span>
          <span className="row-sub" style={{ display: 'block' }}>
            {p.organizer.age !== undefined ? t('team.mod.orgAge', { name: p.organizer.prenom, age: p.organizer.age }) : p.organizer.prenom} · {relative(t, locale, tab === 'a-verifier' ? p.createdAt : (p.decision?.at ?? p.createdAt), now)}
          </span>
        </span>
      ),
    },
    { id: 'verdict', header: tab === 'a-verifier' ? t('team.mod.col.checks') : t('team.mod.col.decision'), sortValue: (p) => (p.blocking ? 0 : p.checks.length ? 1 : 2), cell: verdict },
  ];

  const bulk =
    tab === 'a-verifier'
      ? [
          { id: 'ok', label: t('team.mod.bulk.approve'), icon: <IconCheck size={16} />, run: (rows: QueueItem[]) => doApprove(rows.map((r) => r.id)) },
          { id: 'out', label: t('team.mod.bulk.withdraw'), icon: <IconBan size={16} />, danger: true, run: (rows: QueueItem[]) => askWithdraw(rows.map((r) => r.id)) },
        ]
      : tab === 'en-ligne'
        ? [{ id: 'out', label: t('team.mod.bulk.withdraw'), icon: <IconBan size={16} />, danger: true, run: (rows: QueueItem[]) => askWithdraw(rows.map((r) => r.id)) }]
        : [{ id: 'back', label: t('team.mod.bulk.reopen'), icon: <IconUndo size={16} />, run: (rows: QueueItem[]) => reopen(rows.map((r) => r.id)) }];

  const detail = (p: QueueItem) => {
    const Icon = TYPE_ICON[p.type];
    const hits = p.checks.flatMap((c) => c.hits ?? []);
    const stops = p.checks.filter((c) => c.level === 'bloquant');
    const forceable = stops.length > 0 && stops.every((c) => c.code === 'hors-acces-libre');
    return (
      <article className="team-prop" aria-labelledby={`prop-${p.id}`}>
        <header className="team-prop-head">
          <span className="team-type-ico team-type-ico-lg" data-sparring={SPARRING.includes(p.type) || undefined} aria-hidden="true">
            <Icon size={22} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">{CLUB_LABEL[p.club]}</p>
            <h2 id={`prop-${p.id}`} className="team-prop-title">
              {typeLabel(p.type)}
            </h2>
            <p className="small">{dayLabel(p)}</p>
          </div>
          <span className={`tag ${p.status === 'en-ligne' ? 'tag-pos' : p.status === 'retiree' ? 'tag-neg' : 'tag-warn'}`}>{t(`team.prop.status.${p.status}` as MessageKey)}</span>
        </header>

        <dl className="team-facts team-facts-inline">
          <div>
            <dt>{t('team.mod.organizer')}</dt>
            <dd>{p.organizer.age !== undefined ? t('team.mod.orgAge', { name: p.organizer.prenom, age: p.organizer.age }) : t('team.mod.orgNoAge', { name: p.organizer.prenom })}</dd>
          </div>
          <div>
            <dt>{t('team.mod.member')}</dt>
            <dd className="mono">{p.organizer.memberId}</dd>
          </div>
          <div>
            <dt>{t('team.mod.level')}</dt>
            <dd>{p.niveau}</dd>
          </div>
          <div>
            <dt>{t('team.mod.interested')}</dt>
            <dd>{p.participants ? t('team.mod.interestedN', { n: p.participants }) : t('team.mod.interested0')}</dd>
          </div>
        </dl>

        <blockquote className="team-obs">{p.observation ? <Highlighted text={p.observation} hits={hits} /> : <span className="dim">{t('team.mod.noObs')}</span>}</blockquote>

        <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <p className="eyebrow">{t('team.mod.checks')}</p>
          {p.checks.length === 0 ? (
            <p className="team-check" data-level="ok">
              <IconShieldCheck size={18} />
              <span>
                <b>{t('team.check.none.title')}</b>
                <br />
                <span className="small">{t('team.check.none.body')}</span>
              </span>
            </p>
          ) : (
            <ul className="team-checks">
              {p.checks.map((c) => (
                <li key={c.code} className="team-check" data-level={c.level}>
                  {c.level === 'bloquant' ? <IconBan size={18} /> : <IconAlert size={18} />}
                  <span>
                    <b>{t(`team.check.${c.code}.title` as MessageKey)}</b>
                    <span className="tag">{c.level === 'bloquant' ? t('team.check.level.bloquant') : t('team.check.level.attention')}</span>
                    <br />
                    <span className="small">{checkText(t, c, p.type)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {p.decision ? (
          <p className="small muted team-decision">
            {p.status === 'retiree' ? t('team.mod.decision.out', { who: p.decision.by, when: relative(t, locale, p.decision.at, now), motif: p.decision.motif ? t(`team.motif.${p.decision.motif}` as MessageKey) : '—' }) : t('team.mod.decision.in', { who: p.decision.by, when: relative(t, locale, p.decision.at, now) })}
            {p.decision.note ? ` — « ${p.decision.note} »` : ''}
          </p>
        ) : (
          <p className="small dim">{t('team.mod.received', { when: relative(t, locale, p.createdAt, now) })}</p>
        )}

        <div className="team-prop-actions">
          {p.status === 'a-verifier' ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => doApprove([p.id])} disabled={pending || p.blocking} aria-keyshortcuts="v">
                <IconCheck size={17} />
                {t('team.mod.approve')}
              </button>
              {forceable ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setForceNote('');
                    setNoteError(null);
                    setForce(p);
                  }}
                  disabled={pending}
                >
                  {t('team.mod.force')}
                </button>
              ) : null}
            </>
          ) : null}
          {p.status !== 'retiree' ? (
            <button type="button" className="btn btn-outline" onClick={() => askWithdraw([p.id])} disabled={pending} aria-keyshortcuts="r">
              <IconBan size={17} />
              {t('team.mod.withdraw')}
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => reopen([p.id])} disabled={pending}>
              <IconUndo size={17} />
              {t('team.mod.reopen')}
            </button>
          )}
        </div>
        {p.status === 'a-verifier' && p.blocking && !forceable ? <p className="small dim">{t('team.mod.cannot')}</p> : null}
      </article>
    );
  };

  return (
    <>
      <PageHeader
        kicker={t('team.mod.kicker')}
        title={t('nav.moderation')}
        lead={t('team.mod.lead')}
        actions={
          <>
            {demoCount > 0 && canRules ? (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmPurge(true)} disabled={pending}>
                <IconTrash size={17} />
                {t('team.mod.demo.remove')}
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary" onClick={() => setRulesOpen(true)} disabled={!canRules} title={canRules ? undefined : t('team.rules.directionOnly')}>
              <IconSliders size={17} />
              {t('team.rules.open')}
            </button>
          </>
        }
        meta={
          <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
            <span className="tag">{t('team.rules.tag.sparring', { n: rules.sparringMinAge })}</span>
            <span className="tag">{t('team.rules.tag.other', { n: rules.otherMinAge })}</span>
            <span className="tag">{rules.premoderation ? t('team.rules.tag.premod') : t('team.rules.tag.direct')}</span>
            {!categoriesOn ? <span className="tag tag-neg">{t('team.mod.off')}</span> : null}
          </div>
        }
      />

      <div className="stack" style={{ '--gap': '18px', opacity: pending ? 0.75 : 1, transition: 'opacity 160ms' } as React.CSSProperties}>
        {missingFree.length ? (
          <div className="callout" data-kind="warn" role="note">
            <IconAlert />
            <span>
              <span className="callout-title">{t('team.mod.free.title')}. </span>
              {t('team.mod.free.body', { clubs: missingFree.map((c) => CLUB_LABEL[c]).join(', ') })}
            </span>
          </div>
        ) : null}

        {items.length === 0 ? (
          <Empty def={t('team.mod.empty.def')} title={t('team.mod.empty.title')} text={t('team.mod.empty.text')}>
            {canRules ? (
              <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
                <button type="button" className="btn btn-primary" onClick={seed} disabled={pending}>
                  <IconSparkle size={17} />
                  {t('team.mod.demo.load')}
                </button>
                <span className="small dim">{t('team.mod.demo.note')}</span>
              </div>
            ) : (
              <p className="small dim">{t('team.mod.demo.askDirection')}</p>
            )}
          </Empty>
        ) : (
          <>
            <div className="row-between team-mod-bar">
              <Segmented<Tab>
                label={t('team.mod.tabs')}
                value={tab}
                onChange={(v) => {
                  setTab(v);
                  setActiveId(null);
                }}
                options={(['a-verifier', 'en-ligne', 'retiree'] as Tab[]).map((s) => ({
                  value: s,
                  label: (
                    <>
                      {t(`team.mod.tab.${s}` as MessageKey)} <span className="team-count">{count(s)}</span>
                    </>
                  ),
                }))}
              />
              <p className="small dim kbd-hint">
                <span className="kbd">J</span> <span className="kbd">K</span> {t('team.mod.keys.move')} · <span className="kbd">V</span> {t('team.mod.keys.approve')} · <span className="kbd">R</span> {t('team.mod.keys.withdraw')}
              </p>
            </div>

            <div className="filters">
              <div className="input-group">
                <IconSearch size={18} />
                <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('team.mod.search')} aria-label={t('team.mod.search')} />
              </div>
              {scope.length > 1 ? (
                <div className="team-select">
                  <label className="sr-only" htmlFor="f-mod-club">
                    {t('team.field.scope')}
                  </label>
                  <Select<ClubId | 'all'> id="mod-club" value={club} onChange={setClub} options={[{ value: 'all', label: t('team.mod.allClubs') }, ...scope.map((c) => ({ value: c, label: CLUB_LABEL[c] }))]} />
                </div>
              ) : null}
              <div className="team-select">
                <label className="sr-only" htmlFor="f-mod-type">
                  {t('team.mod.col.prop')}
                </label>
                <Select<TrainingType | 'all'> id="mod-type" value={type} onChange={setType} options={[{ value: 'all', label: t('team.mod.allTypes') }, ...TYPE_ORDER.map((ty) => ({ value: ty, label: typeLabel(ty) }))]} />
              </div>
            </div>

            <div className="team-split">
              <section className="panel team-split-list" aria-label={t(`team.mod.tab.${tab}` as MessageKey)}>
                <div className="panel-body" style={{ paddingTop: 12 }}>
                  <DataTable<QueueItem>
                    rows={list}
                    columns={columns}
                    rowKey={(p) => p.id}
                    rowName={(p) => `${typeLabel(p.type)} · ${p.organizer.prenom}`}
                    caption={t(`team.mod.tab.${tab}` as MessageKey)}
                    onOpen={(p) => {
                      setActiveId(p.id);
                      if (window.matchMedia('(max-width: 1100px)').matches) setSheet(true);
                    }}
                    activeKey={active?.id ?? null}
                    bulk={bulk}
                    empty={<p className="team-none">{t(`team.mod.none.${tab}` as MessageKey)}</p>}
                  />
                </div>
              </section>
              <aside className="panel team-split-detail" aria-live="polite">
                {active ? detail(active) : <p className="team-none">{t(`team.mod.none.${tab}` as MessageKey)}</p>}
              </aside>
            </div>
          </>
        )}
      </div>

      <Dialog open={sheet && active !== null} onClose={() => setSheet(false)} className="sheet" label={active ? typeLabel(active.type) : ''}>
        {active ? (
          <>
            <div className="sheet-head">
              <span className="eyebrow">{t(`team.prop.status.${active.status}` as MessageKey)}</span>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setSheet(false)} aria-label={t('btn.close')}>
                <IconClose />
              </button>
            </div>
            <div className="sheet-body">{detail(active)}</div>
          </>
        ) : null}
      </Dialog>

      <Dialog open={withdrawIds !== null} onClose={() => setWithdrawIds(null)} className="modal" labelledBy="mod-out-title">
        {withdrawIds ? (
          <>
            <div className="modal-head">
              <h2 id="mod-out-title" className="modal-title">
                {t('team.mod.out.title', { n: withdrawIds.length })}
              </h2>
            </div>
            <div className="modal-body stack" style={{ '--gap': '14px' } as React.CSSProperties}>
              <Choices<RetraitMotif> name="motif" value={motif} min={210} onChange={(m) => setMotif(m)} options={RETRAIT_MOTIFS.map((m) => ({ value: m, title: t(`team.motif.${m}` as MessageKey), sub: t(`team.motif.${m}.sub` as MessageKey) }))} />
              <Field id="mod-note" label={t('team.mod.out.note')} optional={motif !== 'autre'} hint={t('team.mod.out.noteHint')} error={noteError ?? undefined} counter={{ n: note.length, max: 280 }}>
                <TextArea id="mod-note" rows={3} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} error={noteError ?? undefined} hint />
              </Field>
              <p className="small dim">
                <IconInfo size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                {t('team.mod.out.notify')}
              </p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setWithdrawIds(null)}>
                {t('btn.cancel')}
              </button>
              <button type="button" className="btn btn-danger" onClick={doWithdraw} disabled={pending}>
                <IconBan size={16} />
                {t('team.mod.withdraw')}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>

      <Dialog open={force !== null} onClose={() => setForce(null)} className="modal" labelledBy="mod-force-title">
        {force ? (
          <>
            <div className="modal-head">
              <h2 id="mod-force-title" className="modal-title">
                {t('team.mod.force.title')}
              </h2>
            </div>
            <div className="modal-body stack" style={{ '--gap': '14px' } as React.CSSProperties}>
              <p>{t('team.mod.force.body')}</p>
              <Field id="mod-force" label={t('team.mod.force.note')} error={noteError ?? undefined} counter={{ n: forceNote.length, max: 280 }}>
                <TextArea id="mod-force" rows={3} maxLength={280} value={forceNote} onChange={(e) => setForceNote(e.target.value)} error={noteError ?? undefined} />
              </Field>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setForce(null)}>
                {t('btn.cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={doForce} disabled={pending}>
                <IconCheck size={16} />
                {t('team.mod.force.submit')}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>

      <Dialog open={confirmPurge} onClose={() => setConfirmPurge(false)} className="modal" labelledBy="mod-purge-title">
        <div className="modal-head">
          <h2 id="mod-purge-title" className="modal-title">
            {t('team.mod.demo.remove')}
          </h2>
        </div>
        <p className="modal-body">{t('team.mod.demo.confirm', { n: demoCount })}</p>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmPurge(false)}>
            {t('btn.cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={purge}>
            <IconTrash size={16} />
            {t('team.mod.demo.remove')}
          </button>
        </div>
      </Dialog>

      <RulesWizard open={rulesOpen} onClose={() => setRulesOpen(false)} rules={rules} items={items} />
    </>
  );
}
