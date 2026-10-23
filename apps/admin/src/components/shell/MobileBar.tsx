'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { ShellSection, ShellUser } from './Shell';
import { Dialog } from '@/components/Dialog';
import { NavIcon } from '@/components/NavIcon';
import { LangToggle, ThemeToggle } from '@/components/Toggles';
import { IconClose, IconGrid, IconLogout, IconSparkle } from '@/components/icons';
import { useT } from '@/i18n/client';
import type { SectionId } from '@/lib/nav';

/**
 * Au comptoir, sur un téléphone : la même capsule de verre que la barre de
 * l'app, quatre rubriques du quotidien et « Plus » pour le reste.
 */
export function MobileBar({ sections, current, user, onLogout, onTour }: { sections: ShellSection[]; current: SectionId; user: ShellUser; onLogout: () => void; onTour: () => void }) {
  const t = useT();
  const [more, setMore] = useState(false);
  const pinned = sections.filter((s) => s.mobile).slice(0, 4);
  const inMore = !pinned.some((s) => s.id === current);

  return (
    <>
      <nav className="mobilebar" aria-label={t('nav.label')}>
        {pinned.map((s) => (
          <Link key={s.id} href={s.href} aria-current={s.id === current ? 'page' : undefined}>
            <NavIcon name={s.icon} size={22} />
            <span>{t(s.label)}</span>
            {s.count > 0 ? <span className="nav-count">{s.count}</span> : null}
          </Link>
        ))}
        <button type="button" onClick={() => setMore(true)} aria-current={inMore ? 'page' : undefined} aria-haspopup="dialog">
          <IconGrid size={22} />
          <span>{t('nav.more')}</span>
        </button>
      </nav>
      <Dialog open={more} onClose={() => setMore(false)} className="sheet" labelledBy="more-title">
        <div className="sheet-head">
          <h2 id="more-title" className="panel-title">
            {t('nav.more')}
          </h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setMore(false)} aria-label={t('btn.close')}>
            <IconClose />
          </button>
        </div>
        <div className="sheet-body stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <div className="more-grid">
            {sections.map((s) => (
              <Link key={s.id} href={s.href} onClick={() => setMore(false)} aria-current={s.id === current ? 'page' : undefined}>
                <NavIcon name={s.icon} size={20} />
                <span>{t(s.label)}</span>
                {s.count > 0 ? <span className="nav-count" style={{ marginLeft: 'auto' }}>{s.count}</span> : null}
              </Link>
            ))}
          </div>
          <div className="row-between">
            <ThemeToggle />
            <LangToggle />
          </div>
          <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
            <p className="small dim">
              {t('top.signedAs')} <strong className="strong">{user.name}</strong> · {user.source === 'env' ? t('top.shopAccountLong') : user.email}
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => {
                setMore(false);
                onTour();
              }}
            >
              <IconSparkle size={18} />
              {t('top.replayTour')}
            </button>
            <button type="button" className="btn btn-danger btn-block" onClick={onLogout}>
              <IconLogout size={18} />
              {t('top.logout')}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
