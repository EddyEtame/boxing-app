'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { ShellSection } from './Shell';
import { Dialog } from '@/components/Dialog';
import { NavIcon } from '@/components/NavIcon';
import { IconArrow, IconSearch } from '@/components/icons';
import { useT } from '@/i18n/client';
import type { CreateAction } from '@/lib/actions-registry';
import type { IconName } from '@/lib/nav';

/** Ce que l'index du serveur renvoie (/api/admin/index) : de quoi retrouver un contenu, un cours, un fil. */
export type IndexEntry = { group: 'content' | 'slots' | 'threads' | 'accounts' | 'members'; id: string; title: string; meta: string; href: string; icon: IconName };

type Item = { key: string; group: 'create' | 'go' | IndexEntry['group']; title: string; meta: string; href: string; icon: IconName; haystack: string };

/** Sans accents, en minuscules : « evenement » trouve « Événement ». */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function score(item: Item, q: string): number {
  if (!q) return 1;
  const title = fold(item.title);
  if (title.startsWith(q)) return 4;
  if (title.split(/[\s'’-]+/).some((w) => w.startsWith(q))) return 3;
  if (title.includes(q)) return 2;
  return q.split(/\s+/).every((part) => item.haystack.includes(part)) ? 1 : 0;
}

export function Palette({ open, onClose, sections, actions }: { open: boolean; onClose: () => void; sections: ShellSection[]; actions: CreateAction[] }) {
  const t = useT();
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // À chaque ouverture, une recherche vierge : l'état s'ajuste pendant le rendu, sans effet en cascade.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setActive(0);
    }
  }

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch('/api/admin/index')
      .then((r) => (r.ok ? (r.json() as Promise<{ entries: IndexEntry[] }>) : { entries: [] }))
      .then((d) => alive && setIndex(d.entries))
      .catch(() => alive && setIndex([]));
    return () => {
      alive = false;
    };
  }, [open]);

  const base: Item[] = useMemo(() => {
    const create = actions.map<Item>((a) => ({ key: `c:${a.id}`, group: 'create', title: t(a.label), meta: t(a.hint), href: a.href, icon: a.icon, haystack: fold(`${t(a.label)} ${t(a.hint)} ${a.keywords}`) }));
    const go = sections.map<Item>((s) => ({ key: `g:${s.id}`, group: 'go', title: t(s.label), meta: `CDC ${s.cdc}`, href: s.href, icon: s.icon, haystack: fold(`${t(s.label)} ${s.id}`) }));
    return [...create, ...go];
  }, [actions, sections, t]);

  const results = useMemo(() => {
    const q = fold(query.trim());
    const fromIndex = (index ?? []).map<Item>((e) => ({ key: `${e.group}:${e.id}`, group: e.group, title: e.title, meta: e.meta, href: e.href, icon: e.icon, haystack: fold(`${e.title} ${e.meta}`) }));
    const pool = q ? [...base, ...fromIndex] : base;
    return pool
      .map((item) => ({ item, s: score(item, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.item);
  }, [base, index, query]);

  const groups = useMemo(() => {
    const order: Item['group'][] = ['create', 'go', 'content', 'slots', 'threads', 'accounts'];
    return order.map((g) => ({ g, items: results.filter((r) => r.group === g) })).filter((x) => x.items.length);
  }, [results]);

  const flat = groups.flatMap((g) => g.items);
  const current = flat[Math.min(active, flat.length - 1)];

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  const groupLabel: Record<Item['group'], string> = {
    create: t('pal.group.create'),
    go: t('pal.group.go'),
    content: t('pal.group.content'),
    slots: t('pal.group.slots'),
    threads: t('pal.group.threads'),
    accounts: t('pal.group.accounts'),
    members: t('pal.group.members'),
  };

  return (
    <Dialog open={open} onClose={onClose} className="palette" label={t('pal.label')}>
      <div className="palette-input">
        <IconSearch size={20} />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={current ? `${listId}-${current.key}` : undefined}
          aria-label={t('pal.placeholder')}
          placeholder={t('pal.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(flat.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(current);
            }
          }}
        />
        <span className="kbd">Esc</span>
      </div>
      <div className="palette-list" id={listId} role="listbox" ref={listRef} aria-label={t('pal.label')}>
        {flat.length === 0 ? (
          <div className="palette-empty">
            <p className="strong">{t('pal.empty', { q: query.trim() })}</p>
            <p className="small">{t('pal.emptyHint')}</p>
          </div>
        ) : (
          groups.map(({ g, items }) => (
            <div key={g} role="presentation">
              <div className="palette-group" role="presentation">
                {groupLabel[g]}
              </div>
              {items.map((item) => {
                const i = flat.indexOf(item);
                return (
                  <div
                    key={item.key}
                    id={`${listId}-${item.key}`}
                    role="option"
                    aria-selected={item === current}
                    className="palette-item"
                    onMouseMove={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      go(item);
                    }}
                  >
                    <span className="palette-ico">
                      <NavIcon name={item.icon} size={18} />
                    </span>
                    <span className="palette-text">
                      <span>{item.title}</span>
                      <span className="palette-meta">{item.meta}</span>
                    </span>
                    {item === current ? <IconArrow size={18} /> : null}
                  </div>
                );
              })}
            </div>
          ))
        )}
        {query && index === null ? <p className="palette-empty small">{t('pal.loading')}</p> : null}
      </div>
      <div className="palette-foot">
        <span>{t('pal.hint')}</span>
      </div>
    </Dialog>
  );
}
