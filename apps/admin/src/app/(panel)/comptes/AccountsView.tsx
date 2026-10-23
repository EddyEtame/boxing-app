'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { deleteMember, renewMemberLink, setMemberStatus } from './actions';
import { AccountWizard, type WizardTarget } from './AccountWizard';
import { CopyButton } from '@/components/CopyButton';
import { Dialog } from '@/components/Dialog';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { RightsMatrix } from '@/components/team/RightsMatrix';
import { Avatar, RoleIcon, RoleTag, SignatureBubble } from '@/components/team/TeamBits';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { IconAlert, IconBan, IconClose, IconEdit, IconInfo, IconLink, IconLock, IconPhone, IconPlus, IconRefresh, IconSearch, IconTrash, IconUndo } from '@/components/icons';
import { Field, Select, TextInput } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { fmtDate, fmtDateTime, relative } from '@/lib/format';
import { capLabel, rightsOf, roleLabel, scopeLabel } from '@/lib/team/labels';
import { ROLES, type Role } from '@/lib/types';
import type { AccountRow, AccountStatus } from '@/server/team';

type LinkResult = { name: string; url: string; expiresAt: string; kind: 'create' | 'renew' | 'reset' };
type Confirm = { kind: 'suspend' | 'delete'; row: AccountRow } | null;

const STATUS_TAG: Record<AccountStatus, string> = { actif: 'tag-pos', invite: 'tag-warn', expire: 'tag-neg', suspendu: 'tag-neg' };

export function AccountsView({ rows, meId, openNew }: { rows: AccountRow[]; meId: string; openNew: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const now = useNow(30_000);
  const [pending, startTransition] = useTransition();
  // « Créer → Compte » depuis la palette ou le rail (`?nouveau=1`) : l'assistant s'ouvre d'emblée, y compris
  // quand l'adresse change alors qu'on est déjà sur la page. Sans remonter la vue : le lien d'activation,
  // montré une seule fois, ne doit jamais disparaître parce que l'adresse a perdu son paramètre.
  const [wizard, setWizard] = useState<WizardTarget | null>(() => (openNew ? { mode: 'create' } : null));
  const [seenOpenNew, setSeenOpenNew] = useState(openNew);
  if (openNew !== seenOpenNew) {
    setSeenOpenNew(openNew);
    if (openNew) setWizard({ mode: 'create' });
  }
  const [openId, setOpenId] = useState<string | null>(null);
  const [link, setLink] = useState<LinkResult | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [typed, setTyped] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');
  // Un compte supprimé quitte la liste tout de suite, sans attendre le rafraîchissement de la page.
  const [gone, setGone] = useState<Set<string>>(() => new Set());

  const live = useMemo(() => rows.filter((r) => !gone.has(r.id)), [rows, gone]);
  const team = live.filter((r) => !r.isShop);
  const open = live.find((r) => r.id === openId) ?? null;
  const counts = useMemo(() => ({ actif: team.filter((r) => r.status === 'actif').length, attente: team.filter((r) => r.status === 'invite' || r.status === 'expire').length, suspendu: team.filter((r) => r.status === 'suspendu').length }), [team]);

  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('fr');
    return live.filter((r) => (role === 'all' || r.role === role) && (!needle || [r.name, r.email ?? '', r.signature, roleLabel(t, r.role), scopeLabel(t, r.clubs)].join(' ').toLocaleLowerCase('fr').includes(needle)));
  }, [live, q, role, t]);

  const when = (iso?: string) => (iso ? relative(t, locale, iso, now) : t('team.never'));
  const statusText = (r: AccountRow) => {
    if (r.status === 'invite') return r.activationExpiresAt ? t('team.status.invite', { when: relative(t, locale, r.activationExpiresAt, now) }) : t('team.status.expire');
    return t(`team.status.${r.status}` as MessageKey);
  };
  const errText = (code: string, fields?: Record<string, string>) => (fields && Object.values(fields)[0] ? t(Object.values(fields)[0] as MessageKey) : t(`err.${code}` as MessageKey));
  const urlOf = (token: string) => `${window.location.origin}/activation/${encodeURIComponent(token)}`;

  const columns: Column<AccountRow>[] = [
    {
      id: 'name',
      header: t('team.col.person'),
      label: '',
      sortValue: (r) => (r.isShop ? '' : r.name),
      cell: (r) => (
        <span className="team-person">
          <Avatar name={r.name} shop={r.isShop} />
          <span style={{ minWidth: 0 }}>
            <span className="row-title truncate" style={{ display: 'block' }}>
              {r.name}
              {r.id === meId ? <span className="tag team-you">{t('team.you')}</span> : null}
            </span>
            <span className="row-sub truncate" style={{ display: 'block' }}>
              {r.isShop ? t('top.shopAccount') : r.email}
            </span>
          </span>
        </span>
      ),
    },
    { id: 'role', header: t('team.col.role'), sortValue: (r) => ROLES.indexOf(r.role), cell: (r) => <RoleTag role={r.role} /> },
    { id: 'scope', header: t('team.col.scope'), sortValue: (r) => (r.clubs === 'all' ? '' : r.clubs.join()), cell: (r) => <span className="small">{scopeLabel(t, r.clubs)}</span> },
    { id: 'status', header: t('team.col.status'), sortValue: (r) => ['actif', 'invite', 'expire', 'suspendu'].indexOf(r.status), cell: (r) => <span className={`tag ${STATUS_TAG[r.status]}`}>{statusText(r)}</span> },
    { id: 'login', header: t('team.col.login'), sortValue: (r) => r.lastLoginAt ?? '', cell: (r) => <span className="small muted">{when(r.lastLoginAt)}</span> },
    {
      id: 'created',
      header: t('team.col.created'),
      sortValue: (r) => r.createdAt ?? '',
      cell: (r) => <span className="small muted">{r.isShop ? t('team.shop.origin') : t('team.createdBy', { who: r.createdBy ?? '—', date: r.createdAt ? fmtDate(locale, r.createdAt) : '—' })}</span>,
    },
  ];

  const renew = (r: AccountRow) =>
    startTransition(async () => {
      const res = await renewMemberLink(r.id);
      if (!res.ok) {
        toast({ text: errText(res.error, res.fieldErrors), kind: 'err' });
        return;
      }
      setLink({ name: r.name, url: urlOf(res.data.token), expiresAt: res.data.expiresAt, kind: r.hasPassword ? 'reset' : 'renew' });
      router.refresh();
    });

  const reactivate = (r: AccountRow) =>
    startTransition(async () => {
      const res = await setMemberStatus(r.id, 'actif');
      if (!res.ok) {
        toast({ text: errText(res.error, res.fieldErrors), kind: 'err' });
        return;
      }
      toast({ text: t('team.reactivated', { name: r.name }) });
      router.refresh();
    });

  const doSuspend = (r: AccountRow) =>
    startTransition(async () => {
      const res = await setMemberStatus(r.id, 'suspendu');
      setConfirm(null);
      if (!res.ok) {
        toast({ text: errText(res.error, res.fieldErrors), kind: 'err' });
        return;
      }
      const wasActive = res.data.previous === 'actif';
      toast({
        text: t('team.suspended', { name: r.name }),
        undo: wasActive
          ? async () => {
              const back = await setMemberStatus(r.id, 'actif');
              if (!back.ok) toast({ text: errText(back.error, back.fieldErrors), kind: 'err' });
              router.refresh();
            }
          : undefined,
      });
      router.refresh();
    });

  const doDelete = (r: AccountRow) =>
    startTransition(async () => {
      setConfirmError(null);
      const res = await deleteMember(r.id, typed);
      if (!res.ok) {
        setConfirmError(errText(res.error, res.fieldErrors));
        return;
      }
      setConfirm(null);
      setOpenId(null);
      setGone((g) => new Set(g).add(r.id));
      toast({ text: t('team.deleted', { name: r.name }) });
      router.refresh();
    });

  const editTarget = (r: AccountRow): WizardTarget => ({
    mode: 'edit',
    id: r.id,
    self: r.id === meId,
    draft: { name: r.name, email: r.email ?? '', role: r.role, scope: r.clubs === 'all' ? 'all' : 'clubs', clubs: r.clubs === 'all' ? [] : r.clubs, signature: r.signature },
  });

  return (
    <>
      <PageHeader
        kicker={t('team.accounts.kicker')}
        title={t('nav.comptes')}
        lead={t('team.accounts.lead')}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setWizard({ mode: 'create' })}>
            <IconPlus size={17} />
            {t('team.add')}
          </button>
        }
        meta={
          <div className="row team-counts" style={{ '--gap': '8px' } as React.CSSProperties}>
            <span className="tag tag-pos">{t('team.count.actif', { n: counts.actif + (live.some((r) => r.isShop) ? 1 : 0) })}</span>
            {counts.attente ? <span className="tag tag-warn">{t('team.count.attente', { n: counts.attente })}</span> : null}
            {counts.suspendu ? <span className="tag tag-neg">{t('team.count.suspendu', { n: counts.suspendu })}</span> : null}
          </div>
        }
      />

      <div className="stack" style={{ '--gap': '18px', opacity: pending ? 0.7 : 1, transition: 'opacity 160ms' } as React.CSSProperties}>
        {team.length === 0 ? (
          <section className="panel empty reveal" aria-labelledby="team-first">
            <p className="empty-def">{t('team.empty.def')}</p>
            <h2 id="team-first" className="empty-title">
              {t('team.empty.title')}
            </h2>
            <p className="empty-text">{t('team.empty.text')}</p>
            <div className="templates">
              {(['coach', 'administratif', 'communication'] as Role[]).map((r) => (
                <button key={r} type="button" className="template" onClick={() => setWizard({ mode: 'create', preset: { role: r } })}>
                  <span className="team-tpl-head">
                    <RoleIcon role={r} />
                    <span className="template-title">{t(`team.empty.tpl.${r}` as MessageKey)}</span>
                  </span>
                  <span className="template-sub">{t(`team.role.${r}.sub` as MessageKey)}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel" aria-labelledby="team-list">
          <div className="panel-head">
            <div>
              <h2 id="team-list" className="panel-title">
                {t('team.list.title')}
              </h2>
              <p className="panel-sub">{t('team.list.sub')}</p>
            </div>
          </div>
          <div className="panel-body">
            {live.length > 3 ? (
              <div className="filters">
                <div className="input-group">
                  <IconSearch size={18} />
                  <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('team.search')} aria-label={t('team.search')} />
                </div>
                <div className="team-select">
                  <label className="sr-only" htmlFor="f-team-role">
                    {t('team.col.role')}
                  </label>
                  <Select<Role | 'all'> id="team-role" value={role} onChange={setRole} options={[{ value: 'all', label: t('team.filter.all') }, ...ROLES.map((r) => ({ value: r, label: roleLabel(t, r) }))]} />
                </div>
              </div>
            ) : null}
            <DataTable<AccountRow>
              rows={shown}
              columns={columns}
              rowKey={(r) => r.id}
              rowName={(r) => r.name}
              caption={t('team.list.title')}
              onOpen={(r) => setOpenId(r.id)}
              activeKey={openId}
              empty={
                <p className="small muted" style={{ padding: '18px 4px' }}>
                  {t('table.none')}{' '}
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setQ('');
                      setRole('all');
                    }}
                  >
                    {t('table.resetFilters')}
                  </button>
                </p>
              }
            />
          </div>
        </section>

        <div className="grid grid-main">
          <section className="panel" aria-labelledby="team-matrix">
            <div className="panel-head">
              <div>
                <h2 id="team-matrix" className="panel-title">
                  {t('team.matrix.title')}
                </h2>
                <p className="panel-sub">{t('team.matrix.sub')}</p>
              </div>
            </div>
            <div className="panel-body">
              <RightsMatrix highlight={open && !open.isShop ? open.role : null} />
            </div>
          </section>
          <section className="panel team-members-card" aria-labelledby="team-members">
            <div className="panel-head">
              <div>
                <h2 id="team-members" className="panel-title">
                  <IconPhone size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 8 }} />
                  {t('team.members.title')}
                </h2>
                <p className="panel-sub">{t('team.members.sub')}</p>
              </div>
            </div>
            <div className="panel-body stack" style={{ '--gap': '12px' } as React.CSSProperties}>
              <p>{t('team.members.body')}</p>
              <ul className="team-list">
                <li>
                  <b>{t('statut.invite')}</b> — {t('team.members.invite')}
                </li>
                <li>
                  <b>{t('statut.restreint')}</b> — {t('team.members.restreint')}
                </li>
                <li>
                  <b>{t('statut.actif')}</b> — {t('team.members.actif')}
                </li>
              </ul>
              <p className="small dim">{t('team.members.cdc')}</p>
            </div>
          </section>
        </div>
      </div>

      {/* La fiche d'une personne : ses faits, ses droits, et ce qu'on peut faire de son compte. */}
      <Dialog open={open !== null} onClose={() => setOpenId(null)} className="sheet" labelledBy="team-sheet-title">
        {open ? (
          <>
            <div className="sheet-head">
              <div className="row" style={{ '--gap': '12px', minWidth: 0 } as React.CSSProperties}>
                <Avatar name={open.name} shop={open.isShop} size={42} />
                <div style={{ minWidth: 0 }}>
                  <h2 id="team-sheet-title" className="modal-title truncate">
                    {open.name}
                  </h2>
                  <RoleTag role={open.role} />
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpenId(null)} aria-label={t('btn.close')}>
                <IconClose />
              </button>
            </div>
            <div className="sheet-body stack" style={{ '--gap': '20px' } as React.CSSProperties}>
              {open.isShop ? (
                <div className="callout" role="note">
                  <IconLock />
                  <span>
                    <span className="callout-title">{t('team.shop.title')}. </span>
                    {t('team.shop.body')}
                  </span>
                </div>
              ) : null}
              {open.id === meId && !open.isShop ? (
                <div className="callout" role="note">
                  <IconInfo />
                  <span>{t('team.self.note')}</span>
                </div>
              ) : null}

              <dl className="team-facts">
                {!open.isShop ? (
                  <div>
                    <dt>{t('team.field.email')}</dt>
                    <dd>{open.email}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t('team.field.scope')}</dt>
                  <dd>{scopeLabel(t, open.clubs)}</dd>
                </div>
                <div>
                  <dt>{t('team.col.status')}</dt>
                  <dd>
                    <span className={`tag ${STATUS_TAG[open.status]}`}>{statusText(open)}</span>
                  </dd>
                </div>
                <div>
                  <dt>{t('team.col.login')}</dt>
                  <dd>{open.lastLoginAt ? fmtDateTime(locale, open.lastLoginAt) : t('team.never')}</dd>
                </div>
                {!open.isShop ? (
                  <>
                    <div>
                      <dt>{t('team.col.created')}</dt>
                      <dd>{t('team.createdBy', { who: open.createdBy ?? '—', date: open.createdAt ? fmtDate(locale, open.createdAt) : '—' })}</dd>
                    </div>
                    {open.updatedAt && open.updatedAt !== open.createdAt ? (
                      <div>
                        <dt>{t('team.updated')}</dt>
                        <dd>{fmtDateTime(locale, open.updatedAt)}</dd>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </dl>

              <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <p className="eyebrow">{t('team.field.signature')}</p>
                <SignatureBubble signature={open.signature} />
              </div>

              <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <p className="eyebrow">{t('team.rights.can')}</p>
                <p className="small">{rightsOf(open.role).can.map((c) => capLabel(t, c)).join(' · ')}</p>
              </div>

              {!open.isShop ? (
                <div className="stack team-actions" style={{ '--gap': '10px' } as React.CSSProperties}>
                  <p className="eyebrow">{t('team.actions')}</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setOpenId(null);
                      setWizard(editTarget(open));
                    }}
                    disabled={pending}
                  >
                    <IconEdit size={17} />
                    {t('team.action.edit')}
                  </button>
                  {open.status !== 'suspendu' ? (
                    <button type="button" className="btn btn-secondary" onClick={() => renew(open)} disabled={pending}>
                      {open.hasPassword ? <IconRefresh size={17} /> : <IconLink size={17} />}
                      {open.hasPassword ? t('team.action.reset') : t('team.action.renew')}
                    </button>
                  ) : null}
                  {open.status === 'suspendu' ? (
                    <button type="button" className="btn btn-secondary" onClick={() => reactivate(open)} disabled={pending || !open.hasPassword} title={!open.hasPassword ? t('team.err.noPassword') : undefined}>
                      <IconUndo size={17} />
                      {t('team.action.reactivate')}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={() => setConfirm({ kind: 'suspend', row: open })} disabled={pending || open.id === meId}>
                      <IconBan size={17} />
                      {t('team.action.suspend')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setTyped('');
                      setConfirmError(null);
                      setConfirm({ kind: 'delete', row: open });
                    }}
                    disabled={pending || open.id === meId}
                  >
                    <IconTrash size={17} />
                    {t('team.action.delete')}
                  </button>
                  {open.status === 'suspendu' && !open.hasPassword ? <p className="small dim">{t('team.err.noPassword')}</p> : null}
                </div>
              ) : (
                <p className="small dim">{t('team.shop.howto')}</p>
              )}
            </div>
          </>
        ) : null}
      </Dialog>

      {/* Le lien d'activation : montré une seule fois, le serveur n'en garde que l'empreinte. */}
      <Dialog open={link !== null} onClose={() => setLink(null)} className="modal" labelledBy="team-link-title">
        {link ? (
          <>
            <div className="modal-head">
              <h2 id="team-link-title" className="modal-title">
                {t(`team.link.title.${link.kind}` as MessageKey, { name: link.name })}
              </h2>
            </div>
            <div className="modal-body stack" style={{ '--gap': '14px' } as React.CSSProperties}>
              <p>{t('team.link.body', { name: link.name })}</p>
              <div className="codebox team-link">
                <code>{link.url}</code>
                <CopyButton value={link.url} />
              </div>
              <div className="callout" data-kind="warn" role="note">
                <IconAlert />
                <span>{t('team.link.once', { date: fmtDateTime(locale, link.expiresAt) })}</span>
              </div>
              <p className="small dim">{t('team.link.mail')}</p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-primary" onClick={() => setLink(null)}>
                {t('team.link.done')}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} className="modal" labelledBy="team-confirm-title">
        {confirm ? (
          <>
            <div className="modal-head">
              <h2 id="team-confirm-title" className="modal-title">
                {confirm.kind === 'suspend' ? t('team.confirm.suspend', { name: confirm.row.name }) : t('team.confirm.delete', { name: confirm.row.name })}
              </h2>
            </div>
            <div className="modal-body stack" style={{ '--gap': '14px' } as React.CSSProperties}>
              <p>{confirm.kind === 'suspend' ? t('team.confirm.suspend.body') : t('team.confirm.delete.body')}</p>
              {confirm.kind === 'delete' ? (
                <Field id="confirm" label={t('team.confirm.type', { name: confirm.row.name })} error={confirmError ?? undefined}>
                  <TextInput id="confirm" error={confirmError ?? undefined} value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
                </Field>
              ) : null}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm(null)}>
                {t('btn.cancel')}
              </button>
              {confirm.kind === 'suspend' ? (
                <button type="button" className="btn btn-danger" onClick={() => doSuspend(confirm.row)} disabled={pending}>
                  <IconBan size={16} />
                  {t('team.action.suspend')}
                </button>
              ) : (
                <button type="button" className="btn btn-danger" onClick={() => doDelete(confirm.row)} disabled={pending || typed.trim().toLocaleLowerCase('fr') !== confirm.row.name.trim().toLocaleLowerCase('fr')}>
                  <IconTrash size={16} />
                  {t('team.action.delete')}
                </button>
              )}
            </div>
          </>
        ) : null}
      </Dialog>

      <AccountWizard
        target={wizard}
        onClose={() => {
          setWizard(null);
          // L'adresse perd son « ?nouveau=1 » : recharger la page ne rouvre pas l'assistant.
          if (openNew) router.replace('/comptes', { scroll: false });
        }}
        onCreated={(r) => setLink({ name: r.name, url: urlOf(r.token), expiresAt: r.expiresAt, kind: 'create' })} />

      <p className="sr-only" aria-live="polite">
        {pending ? t('state.saving') : ''}
      </p>
    </>
  );
}
