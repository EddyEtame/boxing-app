'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { IconDots } from '@/components/icons';

/**
 * Le menu « ⋯ » d'une ligne : ce qu'on fait à UN élément sans ouvrir son
 * assistant (dupliquer, archiver, notifier, supprimer). Rendu dans <body>
 * (le tableau, qui défile, le couperait), fermé par Échap, un clic dehors ou
 * le défilement ; ↑ ↓ parcourent les entrées.
 */
export type RowMenuItem = { id: string; label: string; icon?: ReactNode; danger?: boolean; onSelect: () => void } | 'sep';

export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const r = button.current.getBoundingClientRect();
    const width = 248;
    const height = Math.min(360, items.length * 42 + 16);
    // Trop près du bas de l'écran : le menu s'ouvre vers le haut, ancré par son bas.
    const up = r.bottom + height + 12 > window.innerHeight && r.top > height;
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, r.right - width));
    setPos(up ? { bottom: window.innerHeight - r.top + 6, left } : { top: r.bottom + 6, left });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const first = menu.current?.querySelector<HTMLButtonElement>('.menu-item');
    first?.focus();
    const close = (e: Event) => {
      if (e.type === 'mousedown' && (menu.current?.contains(e.target as Node) || button.current?.contains(e.target as Node))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const entries = [...(menu.current?.querySelectorAll<HTMLButtonElement>('.menu-item') ?? [])];
    const at = entries.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      entries[(at + 1) % entries.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      entries[(at - 1 + entries.length) % entries.length]?.focus();
    } else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <>
      <button ref={button} type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconDots size={18} />
      </button>
      {open && pos
        ? createPortal(
        <div
          ref={menu}
          className="menu ct-menu"
          role="menu"
          aria-label={label}
          onKeyDown={onKey}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: 248, transformOrigin: pos.bottom !== undefined ? 'bottom right' : 'top right' }}
        >
          {items.map((item, i) =>
            item === 'sep' ? (
              <div key={`sep-${i}`} className="menu-sep" role="separator" />
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="menu-item"
                data-danger={item.danger || undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
