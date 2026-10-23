'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { HelpSheet } from './HelpSheet';
import { MobileBar } from './MobileBar';
import { Palette } from './Palette';
import { Rail } from './Rail';
import { Topbar } from './Topbar';
import { Tour } from './Tour';
import { markTourDone, setRailCompact } from '@/app/(panel)/shell-actions';
import { useT } from '@/i18n/client';
import type { CreateAction } from '@/lib/actions-registry';
import { sectionFor, type Section, type SectionId } from '@/lib/nav';
import type { Role } from '@/lib/types';

export type ShellSection = Section & { count: number };
export type ShellUser = { id: string; name: string; email: string; role: Role; signature: string; source: 'env' | 'store' };

/** « g » puis une lettre : aller à une rubrique sans la souris (comme dans Linear ou GitHub). */
export const GO_KEYS: Record<string, SectionId> = {
  t: 'aujourdhui',
  a: 'actualites',
  e: 'evenements',
  v: 'videos',
  p: 'plannings',
  m: 'messages',
  n: 'notifications',
  o: 'moderation',
  s: 'statistiques',
  f: 'fonctions',
  b: 'branchements',
  d: 'deciplus',
  c: 'comptes',
  j: 'journal',
};

export function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable || Boolean(el.closest('dialog'));
}

export function Shell({
  user,
  sections,
  actions,
  collapsed: initialCollapsed,
  tourDone,
  children,
}: {
  user: ShellUser;
  sections: ShellSection[];
  actions: CreateAction[];
  collapsed: boolean;
  tourDone: boolean;
  children: ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const current = useMemo(() => sectionFor(pathname), [pathname]);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [tour, setTour] = useState(!tourDone);

  const allowed = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  useEffect(() => {
    let gAt = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((open) => !open);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
      if (e.key === '?') {
        e.preventDefault();
        setHelp(true);
        return;
      }
      if (e.key === 'g') {
        gAt = Date.now();
        return;
      }
      if (gAt && Date.now() - gAt < 1200) {
        const target = GO_KEYS[e.key.toLowerCase()];
        const section = target ? allowed.get(target) : undefined;
        if (section) {
          e.preventDefault();
          router.push(section.href);
        }
        gAt = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allowed, router]);

  const toggleRail = useCallback(() => {
    setCollapsed((c) => {
      void setRailCompact(!c);
      return !c;
    });
  }, []);

  const endTour = useCallback(() => {
    setTour(false);
    void markTourDone();
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/connexion');
    router.refresh();
  }, [router]);

  return (
    <div className="shell" data-collapsed={collapsed}>
      <a className="skip-link" href="#contenu">
        {t('a11y.skip')}
      </a>
      <Rail sections={sections} current={current.id} collapsed={collapsed} onToggle={toggleRail} user={user} onCreate={() => setPalette(true)} onTour={() => setTour(true)} onLogout={logout} />
      <div className="main">
        <Topbar section={current} onSearch={() => setPalette(true)} onHelp={() => setHelp(true)} />
        <main id="contenu" className="content" data-tour="today" tabIndex={-1}>
          {children}
        </main>
      </div>
      <MobileBar sections={sections} current={current.id} user={user} onLogout={logout} onTour={() => setTour(true)} />
      <Palette open={palette} onClose={() => setPalette(false)} sections={sections} actions={actions} />
      <HelpSheet open={help} onClose={() => setHelp(false)} section={current} onTour={() => setTour(true)} />
      {tour ? <Tour onEnd={endTour} /> : null}
    </div>
  );
}
