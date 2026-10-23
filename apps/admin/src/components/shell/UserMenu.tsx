'use client';

import { useEffect, useRef, useState } from 'react';

import type { ShellUser } from './Shell';
import { IconLogout, IconSparkle } from '@/components/icons';
import { useT } from '@/i18n/client';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? ''))).toUpperCase();
}

/** Le compte connecté : qui, quel profil, revoir la visite, se déconnecter. */
export function UserMenu({ user, onTour, onLogout, compact }: { user: ShellUser; onTour: () => void; onLogout: () => void; compact: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Le compte de la boutique : ni son adresse ni ses initiales à l'écran (partage d'écran au comptoir).
  const shop = user.source === 'env';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="rail-user" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} title={compact ? user.name : undefined}>
        <span className="avatar" style={{ '--size': '36px' } as React.CSSProperties} aria-hidden="true">
          {shop ? 'BC' : initials(user.name)}
        </span>
        <span className="rail-user-text">
          <span className="rail-user-name">{user.name}</span>
          <br />
          <span className="rail-user-role">{shop ? t('top.shopAccount') : t(`top.role.${user.role}`)}</span>
        </span>
      </button>
      {open ? (
        <div className="menu" role="menu" style={{ bottom: 'calc(100% + 8px)', left: 0, transformOrigin: 'bottom left' }}>
          <div className="menu-label">
            {t('top.signedAs')}
            <br />
            <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{shop ? t('top.shopAccountLong') : user.email}</strong>
          </div>
          <div className="menu-sep" />
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              onTour();
            }}
          >
            <IconSparkle size={18} />
            {t('top.replayTour')}
          </button>
          <button type="button" role="menuitem" className="menu-item" data-danger="true" onClick={onLogout}>
            <IconLogout size={18} />
            {t('top.logout')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
