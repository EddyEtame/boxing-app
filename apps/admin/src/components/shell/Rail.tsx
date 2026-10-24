'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { UserMenu } from './UserMenu';
import type { ShellSection, ShellUser } from './Shell';
import { Logo } from '@/components/Logo';
import { NavIcon } from '@/components/NavIcon';
import { useBrowserValue } from '@/components/useNow';
import { IconBack, IconChevron, IconPlus } from '@/components/icons';
import { useT } from '@/i18n/client';
import { GROUPS, type SectionId } from '@/lib/nav';

/**
 * Le rail navy : l'encre des affiches. Une seule plaque claire glisse sous la
 * rubrique ouverte (comme la pastille de la barre de l'app), les pastilles
 * rouges comptent ce qui attend, et le bouton « Créer » ouvre la palette.
 */
export function Rail({
  sections,
  current,
  collapsed,
  onToggle,
  user,
  onCreate,
  onTour,
  onLogout,
}: {
  sections: ShellSection[];
  current: SectionId;
  collapsed: boolean;
  onToggle: () => void;
  user: ShellUser;
  onCreate: () => void;
  onTour: () => void;
  onLogout: () => void;
}) {
  const t = useT();
  const navRef = useRef<HTMLDivElement>(null);
  const [plate, setPlate] = useState<{ y: number; h: number } | null>(null);
  const [animate, setAnimate] = useState(false);
  const mac = useBrowserValue(() => /Mac|iPhone|iPad/.test(navigator.platform), false);

  // La plaque suit la rubrique active ; on remesure quand la mise en page bouge (polices, fenêtre, rail replié).
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const el = nav.querySelector<HTMLElement>('[aria-current="page"]');
      setPlate(el && el.offsetHeight ? { y: el.offsetTop, h: el.offsetHeight } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [current, collapsed, sections.length]);

  useEffect(() => {
    // Pas d'animation au premier affichage : la plaque est déjà en place.
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const top = sections.filter((s) => !s.group);
  const label = (s: ShellSection) => t(s.label);

  const item = (s: ShellSection) => (
    <Link key={s.id} href={s.href} className="nav-item" aria-current={s.id === current ? 'page' : undefined} title={collapsed ? label(s) : undefined} aria-label={collapsed ? `${label(s)}${s.count ? `, ${t('nav.count', { n: s.count })}` : ''}` : undefined}>
      <NavIcon name={s.icon} size={20} />
      <span className="nav-label">{label(s)}</span>
      {s.count > 0 ? (
        <span className="nav-count" aria-label={t('nav.count', { n: s.count })}>
          {s.count}
        </span>
      ) : null}
    </Link>
  );

  return (
    <nav className="rail" aria-label={t('nav.label')} data-tour="rail">
      <div className="rail-brand">
        <Link href="/" className="rail-logo" aria-label={`Boxing Center — ${t('nav.aujourdhui')}`}>
          <Logo variant="sticker" width={120} />
        </Link>
        <button type="button" className="rail-toggle" onClick={onToggle} aria-label={collapsed ? t('nav.expand') : t('nav.collapse')} title={collapsed ? t('nav.expand') : t('nav.collapse')} aria-expanded={!collapsed}>
          {collapsed ? <IconChevron size={16} /> : <IconBack size={16} />}
        </button>
      </div>

      <div className="rail-scroll">
        <div className="rail-nav" ref={navRef} data-plate={plate ? 'ready' : undefined}>
          {plate ? <span className="rail-plate" aria-hidden="true" style={{ transform: `translateY(${plate.y}px)`, height: plate.h, transition: animate ? undefined : 'none' }} /> : null}
          {top.map(item)}
          {GROUPS.map((g) => {
            const list = sections.filter((s) => s.group === g);
            if (!list.length) return null;
            return (
              <div key={g} role="group" aria-label={t(`nav.group.${g}`)} style={{ display: 'contents' }}>
                <div className="rail-group" aria-hidden="true">
                  {t(`nav.group.${g}`)}
                </div>
                {list.map(item)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rail-foot">
        <button type="button" className="rail-create" onClick={onCreate} data-tour="create" title={collapsed ? t('btn.create') : undefined} aria-label={t('btn.create')}>
          <IconPlus size={18} />
          <span>{t('btn.create')}</span>
          <span className="kbd">{mac ? '⌘ K' : 'Ctrl K'}</span>
        </button>
        <UserMenu user={user} onTour={onTour} onLogout={onLogout} compact={collapsed} />
      </div>
    </nav>
  );
}
