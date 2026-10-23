'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { addNote, assignTo, changeStatus, changeUnread, replyToThread, undoStatus } from './actions';
import { ThreadStatusTag } from '@/components/comms/parts';
import { IconAlert, IconBack, IconCheck, IconClose, IconEyeOff, IconInfo, IconLock, IconSearch, IconUndo } from '@/components/icons';
import { isTyping } from '@/components/shell/Shell';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { Segmented, Select, Switch } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL } from '@/lib/clubs';
import { LIMITS, type ThreadView } from '@/lib/comms/types';
import { fmtDateTime, relative } from '@/lib/format';
import { SUJETS, type ClubId, type InboxThread, type Sujet } from '@/lib/types';

type StatusFilter = 'all' | InboxThread['status'];
export type TeamMember = { id: string; name: string; clubs: ClubId[] | 'all' };

const fold = (s: string) => s.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{M}/gu, '');

function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s-]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * LA BOÎTE DE RÉCEPTION, en vue partagée : la liste à gauche, le fil à droite
 * (sur téléphone, l'un puis l'autre). Tout se fait au clavier : j/k pour passer
 * d'un fil à l'autre, r pour répondre, n pour une note, e pour marquer traité,
 * u pour remettre non lu. Cocher plusieurs fils ouvre les actions groupées.
 */
export function Inbox({ threads, team, me, initialThread }: { threads: ThreadView[]; team: TeamMember[]; me: { id: string; name: string; signature: string }; initialThread: string | null }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const now = useNow();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(initialThread && threads.some((x) => x.id === initialThread) ? initialThread : null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [club, setClub] = useState<'all' | ClubId>('all');
  const [sujet, setSujet] = useState<'all' | Sujet>('all');
  const [mine, setMine] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const paneRef = useRef<HTMLElement>(null);

  const clubsSeen = useMemo(() => CLUB_IDS.filter((c) => threads.some((x) => x.member.club === c)), [threads]);

  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    return threads.filter((th) => {
      if (status !== 'all' && th.status !== status) return false;
      if (club !== 'all' && th.member.club !== club) return false;
      if (sujet !== 'all' && th.sujet !== sujet) return false;
      if (mine && th.assignee !== me.id) return false;
      if (!needle) return true;
      return fold(`${th.member.name} ${th.member.id} ${th.messages.map((m) => m.text).join(' ')}`).includes(needle);
    });
  }, [threads, q, status, club, sujet, mine, me.id]);

  const selected = threads.find((x) => x.id === selectedId) ?? null;
  const unread = threads.filter((x) => x.unread).length;

  const open = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setMode('reply');
      router.replace(id ? `${pathname}?fil=${encodeURIComponent(id)}` : pathname, { scroll: false });
      // Sur téléphone, la liste laisse la place au fil : on remonte à son en-tête.
      if (window.matchMedia('(max-width: 1000px)').matches) requestAnimationFrame(() => (id ? paneRef : listRef).current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
      const th = threads.find((x) => x.id === id);
      if (th?.unread) {
        void changeUnread([th.id], false).then((r) => {
          if (r.ok) startTransition(() => router.refresh());
        });
      }
    },
    [pathname, router, threads],
  );

  const move = useCallback(
    (delta: 1 | -1) => {
      if (!filtered.length) return;
      const i = filtered.findIndex((x) => x.id === selectedId);
      const next = filtered[Math.min(filtered.length - 1, Math.max(0, i < 0 ? 0 : i + delta))];
      if (next) {
        open(next.id);
        listRef.current?.querySelector<HTMLElement>(`[data-thread="${CSS.escape(next.id)}"]`)?.scrollIntoView({ block: 'nearest' });
      }
    },
    [filtered, selectedId, open],
  );

  const setStatusOf = useCallback(
    async (list: string[], next: InboxThread['status']) => {
      const res = await changeStatus(list, next);
      if (!res.ok) {
        toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
        return;
      }
      if (res.data.ids.length) {
        const before = res.data.before;
        toast({
          text: t('comms.m.statusDone', { n: res.data.ids.length, status: t(`comms.thread.${next}` as MessageKey) }),
          undo: async () => {
            await undoStatus(before);
            router.refresh();
          },
        });
      }
      router.refresh();
    },
    [router, t, toast],
  );

  const markUnread = useCallback(
    async (id: string) => {
      const res = await changeUnread([id], true);
      if (res.ok) {
        toast({ text: t('comms.m.unreadDone') });
        setSelectedId(null);
        router.replace(pathname, { scroll: false });
        router.refresh();
      }
    },
    [pathname, router, t, toast],
  );

  // Les raccourcis de la boîte : jamais pendant une saisie, jamais dans une fenêtre ouverte.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault();
        move(e.key === 'j' ? 1 : -1);
      } else if (selected && (e.key === 'r' || e.key === 'n')) {
        e.preventDefault();
        setMode(e.key === 'r' ? 'reply' : 'note');
        requestAnimationFrame(() => composerRef.current?.focus());
      } else if (selected && e.key === 'e') {
        e.preventDefault();
        void setStatusOf([selected.id], 'traite');
      } else if (selected && e.key === 'u') {
        e.preventDefault();
        void markUnread(selected.id);
      } else if (e.key === 'Escape' && checked.size) {
        setChecked(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, selected, setStatusOf, markUnread, checked.size]);

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const nameOf = (th: ThreadView) => th.member.name || t('comms.m.anonymous');
  // « maintenant » avance par paliers de 30 s : une action qui vient d'avoir lieu ne doit pas se lire « dans 1 min ».
  const since = (iso: string) => relative(t, locale, iso, now === null ? null : Math.max(now, Math.min(Date.parse(iso), now + 5 * 60_000)));
  const teamName = (id?: string) => team.find((m) => m.id === id)?.name;

  return (
    <div className="inbox" data-view={selected ? 'thread' : 'list'}>
      <section className="panel inbox-list" aria-label={t('comms.m.list')}>
        <div className="inbox-filters">
          <label className="input-group">
            <IconSearch size={18} />
            <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('comms.m.search')} aria-label={t('comms.m.search')} />
          </label>
          <Segmented<StatusFilter>
            label={t('comms.m.filter.status')}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: t('comms.m.filter.all') },
              { value: 'nouveau', label: t('comms.thread.nouveau') },
              { value: 'en-cours', label: t('comms.thread.en-cours') },
              { value: 'traite', label: t('comms.thread.traite') },
            ]}
          />
          <div className="inbox-filters-row">
            <Select<'all' | ClubId> id="inbox-club" value={club} onChange={setClub} options={[{ value: 'all', label: t('comms.m.filter.allClubs') }, ...clubsSeen.map((c) => ({ value: c, label: CLUB_LABEL[c] }))]} />
            <Select<'all' | Sujet> id="inbox-sujet" value={sujet} onChange={setSujet} options={[{ value: 'all', label: t('comms.m.filter.allSujets') }, ...SUJETS.map((s) => ({ value: s, label: t(`comms.sujet.${s}` as MessageKey) }))]} />
          </div>
          <label className="row small strong" style={{ '--gap': '10px', cursor: 'pointer' } as React.CSSProperties}>
            <Switch checked={mine} onChange={setMine} label={t('comms.m.filter.mine')} />
            {t('comms.m.filter.mine')}
          </label>
        </div>
        <p className="inbox-count small dim" aria-live="polite">
          {t('comms.m.count', { n: filtered.length })}
          {unread ? ` · ${t('comms.m.unreadN', { n: unread })}` : ''}
        </p>
        {filtered.length === 0 ? (
          <p className="inbox-none small muted">{t('comms.m.noMatch')}</p>
        ) : (
          <ul className="inbox-items" ref={listRef}>
            {filtered.map((th) => {
              const last = th.messages.filter((m) => m.from !== 'note').at(-1) ?? th.messages.at(-1);
              const assignee = teamName(th.assignee);
              return (
                <li key={th.id} className="inbox-item" data-thread={th.id} data-current={th.id === selectedId || undefined} data-unread={th.unread || undefined} data-checked={checked.has(th.id) || undefined}>
                  <input type="checkbox" className="tbl-check inbox-check" checked={checked.has(th.id)} onChange={() => toggleCheck(th.id)} aria-label={t('table.selectRow', { name: nameOf(th) })} />
                  <button type="button" className="inbox-open" onClick={() => open(th.id)} aria-current={th.id === selectedId ? 'true' : undefined}>
                    <span className="avatar" style={{ '--size': '38px' } as React.CSSProperties} aria-hidden="true">
                      {initials(nameOf(th))}
                    </span>
                    <span className="inbox-item-main">
                      <span className="inbox-item-top">
                        <span className="inbox-name truncate">{nameOf(th)}</span>
                        <span className="inbox-time small dim nowrap">{since(th.updatedAt)}</span>
                      </span>
                      <span className="inbox-item-meta small">
                        {CLUB_LABEL[th.member.club]} · {t(`comms.sujet.${th.sujet}` as MessageKey)}
                        {th.demo ? <span className="tag tag-demo">{t('state.demo')}</span> : null}
                      </span>
                      <span className="inbox-excerpt small muted">{last?.from === 'staff' ? `↩ ${last.text}` : last?.text}</span>
                      <span className="inbox-item-foot">
                        <ThreadStatusTag status={th.status} />
                        {assignee ? <span className="small dim truncate">→ {assignee}</span> : null}
                        {th.unread ? (
                          <span className="inbox-dot" aria-label={t('comms.m.unread')}>
                            <span className="dot" />
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {checked.size ? (
          <div className="bulkbar inbox-bulk" role="region" aria-label={t('table.selected', { n: checked.size })}>
            <span className="bulkbar-count">{t('table.selected', { n: checked.size })}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                await setStatusOf([...checked], 'traite');
                setChecked(new Set());
              }}
            >
              <IconCheck size={16} />
              {t('comms.m.bulk.done')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                await setStatusOf([...checked], 'en-cours');
                setChecked(new Set());
              }}
            >
              <IconUndo size={16} />
              {t('comms.m.bulk.open')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setChecked(new Set())} aria-label={t('table.clear')} title={t('table.clear')}>
              <IconClose size={16} />
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel inbox-pane" ref={paneRef} aria-live="polite">
        {selected ? (
          <ThreadPane
            key={selected.id}
            thread={selected}
            team={team}
            me={me}
            mode={mode}
            setMode={setMode}
            composerRef={composerRef}
            onBack={() => open(null)}
            onStatus={(s) => void setStatusOf([selected.id], s)}
            onUnread={() => void markUnread(selected.id)}
            onAssign={async (id) => {
              const res = await assignTo(selected.id, id);
              if (!res.ok) toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
              else {
                toast({ text: t('comms.m.assigned', { name: id ? (teamName(id) ?? id) : t('comms.m.nobody') }) });
                router.refresh();
              }
            }}
            fmt={(iso) => fmtDateTime(locale, iso)}
          />
        ) : (
          <div className="inbox-pick">
            <span className="inbox-pick-icon" aria-hidden="true">
              <IconInfo size={22} />
            </span>
            <p className="strong">{t('comms.m.pick')}</p>
            <p className="small muted">{t('comms.m.pick.sub')}</p>
            <p className="small dim">{t('comms.m.keys')}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ThreadPane({
  thread,
  team,
  me,
  mode,
  setMode,
  composerRef,
  onBack,
  onStatus,
  onUnread,
  onAssign,
  fmt,
}: {
  thread: ThreadView;
  team: TeamMember[];
  me: { id: string; name: string; signature: string };
  mode: 'reply' | 'note';
  setMode: (m: 'reply' | 'note') => void;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  onBack: () => void;
  onStatus: (s: InboxThread['status']) => void;
  onUnread: () => void;
  onAssign: (id: string | null) => void;
  fmt: (iso: string) => string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const eligible = team.filter((m) => m.clubs === 'all' || m.clubs.includes(thread.member.club));
  const name = thread.member.name || t('comms.m.anonymous');

  // Le dernier message en vue, dans la colonne du fil seulement : la page, elle, ne saute pas.
  useEffect(() => {
    const el = msgsRef.current;
    if (el && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
  }, [thread.messages.length]);

  const submit = async () => {
    if (busy) return;
    if (!text.trim()) {
      setError(t('comms.err.reply'));
      composerRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const sent = text;
    const asReply = mode === 'reply';
    const res = asReply ? await replyToThread(thread.id, sent) : await addNote(thread.id, sent);
    setBusy(false);
    if (!res.ok) {
      setError(res.fieldErrors?.text ? t(res.fieldErrors.text as MessageKey) : t(`err.${res.error}` as MessageKey));
      composerRef.current?.focus();
      return;
    }
    // Ce qui a été tapé pendant l'envoi reste là : on ne vide que le texte parti.
    setText((cur) => (cur === sent ? '' : cur));
    toast({ text: asReply ? t('comms.m.sent') : t('comms.m.noted') });
    router.refresh();
  };

  return (
    <div className="thread">
      <header className="thread-head">
        <button type="button" className="btn btn-ghost btn-sm thread-back" onClick={onBack}>
          <IconBack size={16} />
          {t('comms.m.back')}
        </button>
        <div className="thread-who">
          <span className="avatar" style={{ '--size': '44px' } as React.CSSProperties} aria-hidden="true">
            {initials(name)}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 className="thread-name truncate">{name}</h2>
            <p className="small muted">
              {thread.member.id.startsWith('app-') ? t('comms.m.noNumber') : t('comms.m.memberNo', { id: thread.member.id })} · {CLUB_LABEL[thread.member.club]} · {t(`statut.${thread.member.statut}` as MessageKey)}
            </p>
          </div>
          <span className="tag">{t(`comms.sujet.${thread.sujet}` as MessageKey)}</span>
          {thread.demo ? <span className="tag tag-demo">{t('state.demo')}</span> : null}
        </div>
        {thread.declared ? (
          <p className="thread-declared small">
            <IconAlert size={15} />
            {t('comms.m.declared')}
          </p>
        ) : null}
        <div className="thread-tools">
          <Segmented<InboxThread['status']>
            label={t('comms.m.filter.status')}
            value={thread.status}
            onChange={onStatus}
            options={[
              { value: 'nouveau', label: t('comms.thread.nouveau') },
              { value: 'en-cours', label: t('comms.thread.en-cours') },
              { value: 'traite', label: t('comms.thread.traite') },
            ]}
          />
          <label className="thread-assign small">
            <span className="dim">{t('comms.m.assign')}</span>
            <Select<string> id={`assign-${thread.id}`} value={thread.assignee ?? ''} onChange={(v) => onAssign(v || null)} options={[{ value: '', label: t('comms.m.nobody') }, ...eligible.map((m) => ({ value: m.id, label: m.name }))]} />
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onUnread}>
            <IconEyeOff size={16} />
            {t('comms.m.markUnread')}
          </button>
        </div>
      </header>

      <div className="thread-msgs" ref={msgsRef}>
        {thread.messages.map((m) =>
          m.from === 'note' ? (
            <div key={m.id} className="msg msg-note">
              <p className="msg-meta">
                <IconLock size={13} />
                {t('comms.m.noteBy', { name: m.signature ?? '—' })} · {fmt(m.at)}
              </p>
              <p className="comms-pre">{m.text}</p>
            </div>
          ) : m.from === 'auto' ? (
            <div key={m.id} className="msg msg-auto">
              <p className="msg-meta">
                {t('comms.m.auto')} · {fmt(m.at)}
              </p>
              <p className="comms-pre">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className={m.from === 'staff' ? 'msg msg-staff' : 'msg msg-member'}>
              <p className="msg-meta">
                {m.from === 'staff' ? (m.signature ?? '—') : name} · {fmt(m.at)}
              </p>
              <p className="comms-pre">{m.text}</p>
            </div>
          ),
        )}
      </div>

      <form
        className="composer"
        data-mode={mode}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="composer-head">
          <Segmented<'reply' | 'note'>
            label={t('comms.m.composer')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'reply', label: t('comms.m.composer.reply') },
              { value: 'note', label: t('comms.m.composer.note') },
            ]}
          />
          <span className="small dim">{mode === 'reply' ? t('comms.m.signature', { sig: me.signature }) : t('comms.m.noteHint')}</span>
        </div>
        <textarea
          ref={composerRef}
          id="composer"
          className="textarea"
          rows={3}
          value={text}
          maxLength={LIMITS.reply + 200}
          placeholder={mode === 'reply' ? t('comms.m.composer.replyPh') : t('comms.m.composer.notePh')}
          aria-label={mode === 'reply' ? t('comms.m.composer.reply') : t('comms.m.composer.note')}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
        />
        {error ? (
          <p className="field-error">
            <IconAlert size={15} />
            <span>{error}</span>
          </p>
        ) : null}
        <div className="composer-foot">
          <span className="small dim">{mode === 'reply' ? t('comms.m.delivery') : ''}</span>
          <button type="submit" className={mode === 'reply' ? 'btn btn-primary' : 'btn btn-secondary'} disabled={busy} aria-keyshortcuts="Control+Enter">
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {mode === 'reply' ? t('comms.m.send') : t('comms.m.addNote')}
          </button>
        </div>
      </form>
    </div>
  );
}
