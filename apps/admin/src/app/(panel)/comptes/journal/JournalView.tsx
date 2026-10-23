'use client';

import { useMemo, useState } from 'react';

import { Dialog } from '@/components/Dialog';
import { Empty } from '@/components/Empty';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { Avatar } from '@/components/team/TeamBits';
import { useNow } from '@/components/useNow';
import { IconClose, IconDownload, IconFilter, IconSearch } from '@/components/icons';
import { Segmented, Select } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { fmtDate, fmtDateTime, relative } from '@/lib/format';
import { applyFilter, EMPTY_FILTER, filterQuery, PERIODS, type JournalFilter, type Period } from '@/lib/team/journal';
import { actionLabel, familyOf, FAMILIES, type Family } from '@/lib/team/labels';
import type { AuditEntry } from '@/lib/types';

const PAGE = 200;

/**
 * Le journal : qui a fait quoi, quand, sur quoi (CDC §17). Les filtres tiennent
 * en une ligne ; l'export prend exactement ce qui est filtré à l'écran.
 */
export function JournalView({ entries }: { entries: AuditEntry[] }) {
  const { t, locale } = useI18n();
  const now = useNow(60_000);
  const [filter, setFilter] = useState<JournalFilter>(EMPTY_FILTER);
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);

  const label = (action: string) => actionLabel(t, action);
  const shown = useMemo(() => applyFilter(entries, filter, now, (a) => actionLabel(t, a)), [entries, filter, now, t]);
  const people = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entries) if (!m.has(e.actor.id)) m.set(e.actor.id, e.actor.name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [entries]);
  const families = useMemo(() => FAMILIES.filter((f) => entries.some((e) => familyOf(e.action) === f)), [entries]);
  // Un compte se nomme à sa création (« Mehdi · coach ») : la cible « c_… » des actions suivantes se lit en clair,
  // même après la suppression du compte.
  const accountNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entries) if (e.action === 'compte.creation' && e.target && e.detail) m.set(e.target, e.detail.split(' · ')[0] ?? e.detail);
    return m;
  }, [entries]);
  const targetOf = (e: AuditEntry) => (e.target && accountNames.has(e.target) ? accountNames.get(e.target)! : null);
  const open = entries.find((e) => e.id === openId) ?? null;
  const filtered = filter.person !== 'all' || filter.family !== 'all' || filter.period !== 'tout' || filter.q.trim() !== '';
  const set = (patch: Partial<JournalFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  };
  const role = (r: AuditEntry['actor']['role']) => (r === 'systeme' ? t('team.journal.system') : t(`top.role.${r}` as MessageKey));
  const oldest = entries[entries.length - 1];

  const columns: Column<AuditEntry>[] = [
    {
      id: 'at',
      header: t('team.journal.col.when'),
      sortValue: (e) => e.at,
      width: '170px',
      // Avant que l'heure du navigateur soit connue, une seule ligne : la date absolue (pas de doublon, pas d'écart d'hydratation).
      cell: (e) => (
        <span title={fmtDateTime(locale, e.at)} className="team-when">
          {now !== null ? <span className="row-title">{relative(t, locale, e.at, now)}</span> : null}
          <span className="row-sub mono">{fmtDateTime(locale, e.at)}</span>
        </span>
      ),
    },
    {
      id: 'who',
      header: t('team.journal.col.who'),
      sortValue: (e) => e.actor.name,
      cell: (e) => (
        <span className="team-person">
          <Avatar name={e.actor.name} shop={e.actor.id === 'direction'} size={30} />
          <span style={{ minWidth: 0 }}>
            <span className="row-title truncate" style={{ display: 'block' }}>
              {e.actor.name}
            </span>
            <span className="row-sub truncate" style={{ display: 'block' }}>
              {e.actor.id === 'direction' ? t('top.shopAccount') : role(e.actor.role)}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'action',
      header: t('team.journal.col.action'),
      sortValue: (e) => label(e.action),
      cell: (e) => (
        <span className="team-action" data-family={familyOf(e.action)}>
          {label(e.action)}
        </span>
      ),
    },
    {
      id: 'target',
      header: t('team.journal.col.target'),
      cell: (e) =>
        targetOf(e) ? (
          <span className="team-cell-clip">
            <span className="small strong">{targetOf(e)}</span>
            <span className="row-sub mono" style={{ display: 'block' }}>
              {e.target}
            </span>
          </span>
        ) : (
          <span className="small mono truncate team-cell-clip">{e.target ?? '—'}</span>
        ),
    },
    { id: 'detail', header: t('team.journal.col.detail'), cell: (e) => <span className="small muted team-cell-clip">{e.detail ?? ''}</span> },
  ];

  return (
    <>
      <PageHeader
        kicker={t('team.journal.kicker')}
        title={t('nav.journal')}
        lead={t('team.journal.lead')}
        actions={
          entries.length ? (
            <a className="btn btn-secondary" href={`/api/admin/journal-csv${filterQuery(filter)}`} download>
              <IconDownload size={17} />
              {t('btn.export')}
            </a>
          ) : null
        }
        meta={
          entries.length ? (
            <p className="small dim">
              {t('team.journal.meta', { n: entries.length })}
              {oldest ? ` · ${t('team.journal.since', { date: fmtDate(locale, oldest.at) })}` : ''}
            </p>
          ) : null
        }
      />

      {entries.length === 0 ? (
        <Empty def={t('team.journal.empty.def')} title={t('team.journal.empty.title')} text={t('team.journal.empty.text')} />
      ) : (
        <section className="panel" aria-labelledby="journal-list">
          <div className="panel-head">
            <div>
              <h2 id="journal-list" className="panel-title">
                {filtered ? t('team.journal.shown', { n: shown.length, total: entries.length }) : t('team.journal.all', { n: entries.length })}
              </h2>
              <p className="panel-sub">{t('team.journal.sub')}</p>
            </div>
            {filtered ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set(EMPTY_FILTER)}>
                <IconClose size={15} />
                {t('table.resetFilters')}
              </button>
            ) : null}
          </div>
          <div className="panel-body">
            <div className="filters team-journal-filters">
              <div className="input-group">
                <IconSearch size={18} />
                <input className="input" type="search" value={filter.q} onChange={(e) => set({ q: e.target.value })} placeholder={t('team.journal.search')} aria-label={t('team.journal.search')} />
              </div>
              <div className="team-select">
                <label className="sr-only" htmlFor="f-journal-person">
                  {t('team.journal.col.who')}
                </label>
                <Select<string> id="journal-person" value={filter.person} onChange={(person) => set({ person })} options={[{ value: 'all', label: t('team.journal.everyone') }, ...people.map(([id, name]) => ({ value: id, label: name }))]} />
              </div>
              <div className="team-select">
                <label className="sr-only" htmlFor="f-journal-family">
                  {t('team.journal.family')}
                </label>
                <Select<Family | 'all'> id="journal-family" value={filter.family} onChange={(family) => set({ family })} options={[{ value: 'all', label: t('team.journal.allFamilies') }, ...families.map((f) => ({ value: f, label: t(`team.fam.${f}` as MessageKey) }))]} />
              </div>
              <Segmented<Period> label={t('team.journal.period')} value={filter.period} onChange={(period) => set({ period })} options={PERIODS.map((p) => ({ value: p, label: t(`team.journal.period.${p}` as MessageKey) }))} />
            </div>
            <DataTable<AuditEntry>
              rows={shown.slice(0, limit)}
              columns={columns}
              rowKey={(e) => e.id}
              rowName={(e) => `${e.actor.name} · ${label(e.action)}`}
              caption={t('nav.journal')}
              onOpen={(e) => setOpenId(e.id)}
              activeKey={openId}
              empty={
                <div className="team-none">
                  <IconFilter size={18} />
                  <span>{t('table.none')}</span>
                  <button type="button" className="link" onClick={() => set(EMPTY_FILTER)}>
                    {t('table.resetFilters')}
                  </button>
                </div>
              }
            />
            {shown.length > limit ? (
              <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setLimit((l) => l + PAGE)}>
                  {t('team.journal.more', { n: Math.min(PAGE, shown.length - limit), left: shown.length - limit })}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      )}

      <Dialog open={open !== null} onClose={() => setOpenId(null)} className="sheet" labelledBy="journal-sheet-title">
        {open ? (
          <>
            <div className="sheet-head">
              <h2 id="journal-sheet-title" className="modal-title">
                {label(open.action)}
              </h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpenId(null)} aria-label={t('btn.close')}>
                <IconClose />
              </button>
            </div>
            <div className="sheet-body stack" style={{ '--gap': '18px' } as React.CSSProperties}>
              <dl className="team-facts">
                <div>
                  <dt>{t('team.journal.col.when')}</dt>
                  <dd>{fmtDateTime(locale, open.at)}</dd>
                </div>
                <div>
                  <dt>{t('team.journal.col.who')}</dt>
                  <dd>
                    {open.actor.name} · {role(open.actor.role)}
                  </dd>
                </div>
                <div>
                  <dt>{t('team.journal.code')}</dt>
                  <dd className="mono">{open.action}</dd>
                </div>
                <div>
                  <dt>{t('team.journal.col.target')}</dt>
                  <dd className="mono" style={{ overflowWrap: 'anywhere' }}>
                    {targetOf(open) ? `${targetOf(open)} · ` : ''}
                    {open.target ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt>{t('team.journal.col.detail')}</dt>
                  <dd style={{ overflowWrap: 'anywhere' }}>{open.detail ?? '—'}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  set({ person: open.actor.id });
                  setOpenId(null);
                }}
              >
                <IconFilter size={16} />
                {t('team.journal.byPerson', { name: open.actor.name })}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
