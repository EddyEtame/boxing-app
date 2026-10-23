'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';

import { IconClose } from '@/components/icons';
import { useT } from '@/i18n/client';

/**
 * LE TABLEAU DE L'ADMIN — ce que la version web fait mieux qu'un téléphone :
 * trier d'un clic, cocher vingt lignes et agir une fois, parcourir au clavier.
 *
 * - Tri : un clic sur l'en-tête, un second inverse (aria-sort tenu à jour).
 * - Sélection : case par ligne, case « tout » (état intermédiaire), Maj+clic
 *   coche une plage ; la barre d'actions groupées monte du bas.
 * - Clavier : ↑ ↓ Début Fin parcourent, Entrée ouvre, Espace coche, Échap décoche tout.
 * - Téléphone : chaque ligne devient une carte, chaque cellule garde son libellé.
 */
export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Présent : la colonne se trie. */
  sortValue?: (row: T) => string | number;
  num?: boolean;
  /** Libellé de la cellule en mode carte ; '' le masque. Par défaut : l'en-tête. */
  label?: string;
  width?: string;
};

export type BulkAction<T> = {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  run: (rows: T[]) => void | Promise<void>;
};

type Sort = { id: string; dir: 'asc' | 'desc' };

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowName,
  caption,
  onOpen,
  activeKey,
  bulk,
  initialSort,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Le nom lu par le lecteur d'écran sur la case à cocher de la ligne. */
  rowName: (row: T) => string;
  caption: string;
  onOpen?: (row: T) => void;
  /** La ligne ouverte à côté (vue partagée). */
  activeKey?: string | null;
  bulk?: BulkAction<T>[];
  initialSort?: Sort;
  empty?: ReactNode;
}) {
  const t = useT();
  const [sort, setSort] = useState<Sort | null>(initialSort ?? null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const anchor = useRef<string | null>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const out = [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base', numeric: true });
    });
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, columns, sort]);

  const keys = useMemo(() => sorted.map(rowKey), [sorted, rowKey]);

  // Une ligne qui disparaît (filtre, suppression) ne compte plus dans la sélection.
  const live = useMemo(() => {
    const present = new Set(keys);
    const kept = new Set([...selected].filter((k) => present.has(k)));
    return kept.size === selected.size ? selected : kept;
  }, [selected, keys]);

  const selectable = Boolean(bulk?.length);
  const allOn = selectable && keys.length > 0 && keys.every((k) => live.has(k));
  const someOn = live.size > 0 && !allOn;
  const headBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headBox.current) headBox.current.indeterminate = someOn;
  }, [someOn]);

  const toggle = (key: string, range: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (range && anchor.current && keys.includes(anchor.current)) {
        const a = keys.indexOf(anchor.current);
        const b = keys.indexOf(key);
        const [from, to] = a < b ? [a, b] : [b, a];
        const on = !prev.has(key);
        for (let i = from; i <= to; i++) {
          if (on) next.add(keys[i]);
          else next.delete(keys[i]);
        }
      } else if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    anchor.current = key;
  };

  const focusRow = (key: string) => {
    setFocusKey(key);
    const el = bodyRef.current?.querySelector<HTMLTableRowElement>(`tr[data-key="${CSS.escape(key)}"]`);
    el?.focus();
  };

  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, row: T, key: string) => {
    if (e.target !== e.currentTarget) return;
    const i = keys.indexOf(key);
    if (e.key === 'ArrowDown' && i < keys.length - 1) {
      e.preventDefault();
      focusRow(keys[i + 1]);
    } else if (e.key === 'ArrowUp' && i > 0) {
      e.preventDefault();
      focusRow(keys[i - 1]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusRow(keys[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusRow(keys[keys.length - 1]);
    } else if (e.key === 'Enter' && onOpen) {
      e.preventDefault();
      onOpen(row);
    } else if (e.key === ' ' && selectable) {
      e.preventDefault();
      toggle(key, e.shiftKey);
    } else if (e.key === 'Escape' && live.size) {
      e.preventDefault();
      setSelected(new Set());
    }
  };

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>, row: T, key: string) => {
    // Un clic sur un bouton, un lien ou une case de la ligne fait sa propre action.
    if ((e.target as HTMLElement).closest('button, a, input, label, select, textarea')) return;
    setFocusKey(key);
    if (selectable && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      toggle(key, e.shiftKey);
      return;
    }
    onOpen?.(row);
  };

  const runBulk = async (action: BulkAction<T>) => {
    const chosen = sorted.filter((r) => live.has(rowKey(r)));
    setBusy(true);
    try {
      await action.run(chosen);
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  };

  if (rows.length === 0 && empty) return <>{empty}</>;

  const tabbable = focusKey && keys.includes(focusKey) ? focusKey : keys[0];

  return (
    <>
      <div className="tbl-wrap">
        <table className="tbl tbl-cards" aria-rowcount={sorted.length}>
          <caption className="sr-only">
            {caption}. {t('table.keys')}
          </caption>
          <thead>
            <tr>
              {selectable ? (
                <th style={{ width: 44 }}>
                  <input
                    ref={headBox}
                    type="checkbox"
                    className="tbl-check"
                    checked={allOn}
                    onChange={() => setSelected(allOn ? new Set() : new Set(keys))}
                    aria-label={t('table.selectAll')}
                  />
                </th>
              ) : null}
              {columns.map((c) => {
                const active = sort?.id === c.id;
                return (
                  <th key={c.id} data-num={c.num || undefined} style={c.width ? { width: c.width } : undefined} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : c.sortValue ? 'none' : undefined}>
                    {c.sortValue ? (
                      <button
                        type="button"
                        className="th-sort"
                        onClick={() => setSort((s) => (s?.id === c.id ? { id: c.id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id: c.id, dir: c.num ? 'desc' : 'asc' }))}
                        aria-label={t('table.sortBy', { col: c.header })}
                      >
                        {c.header}
                        <span className="th-arrow" data-dir={active ? sort!.dir : undefined} aria-hidden="true">
                          {active ? (sort!.dir === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {sorted.map((row, i) => {
              const key = keys[i];
              const isSel = live.has(key);
              return (
                <tr
                  key={key}
                  data-key={key}
                  tabIndex={key === tabbable ? 0 : -1}
                  aria-selected={selectable ? isSel : undefined}
                  data-active={activeKey === key || undefined}
                  data-open={onOpen ? true : undefined}
                  onKeyDown={(e) => onRowKey(e, row, key)}
                  onClick={(e) => onRowClick(e, row, key)}
                  onFocus={(e) => {
                    if (e.target === e.currentTarget) setFocusKey(key);
                  }}
                >
                  {selectable ? (
                    <td data-l="" className="tbl-check-cell">
                      <input
                        type="checkbox"
                        className="tbl-check"
                        checked={isSel}
                        onChange={(e) => toggle(key, (e.nativeEvent as globalThis.MouseEvent).shiftKey)}
                        aria-label={t('table.selectRow', { name: rowName(row) })}
                        tabIndex={-1}
                      />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td key={c.id} data-num={c.num || undefined} data-l={c.label ?? c.header}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectable && live.size > 0 ? (
        <div className="bulkbar" role="region" aria-label={t('table.selected', { n: live.size })}>
          <span className="bulkbar-count" aria-live="polite">
            {t('table.selected', { n: live.size })}
          </span>
          {bulk!.map((a) => (
            <button key={a.id} type="button" className="btn btn-ghost btn-sm" data-danger={a.danger || undefined} disabled={busy} onClick={() => void runBulk(a)}>
              {a.icon}
              {a.label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(new Set())} aria-label={t('table.clear')} title={t('table.clear')}>
            <IconClose size={16} />
          </button>
        </div>
      ) : null}
    </>
  );
}
