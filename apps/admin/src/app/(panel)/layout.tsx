import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { Shell, type ShellSection } from '@/components/shell/Shell';
import { ToastProvider } from '@/components/Toast';
import { CREATE_ACTIONS } from '@/lib/actions-registry';
import { SECTIONS } from '@/lib/nav';
import { can } from '@/lib/permissions';
import { read } from '@/server/collections';
import { navCounts } from '@/server/counts';
import { requireUser } from '@/server/session';

/**
 * Toutes les pages de l'admin passent par ici : la session est relue, le rail
 * ne garde que les rubriques du profil, les pastilles comptent ce qui attend.
 */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const jar = await cookies();
  const [counts, prefs] = await Promise.all([navCounts(user), read('preferences')]);
  const sections: ShellSection[] = SECTIONS.filter((s) => can(user, s.capability)).map((s) => ({ ...s, count: counts[s.id] ?? 0 }));
  const actions = CREATE_ACTIONS.filter((a) => can(user, a.capability));
  const tourDone = Boolean(prefs[user.id]?.tourDoneAt) || jar.get('bca_tour')?.value === 'vu';

  return (
    <ToastProvider>
      <Shell
        user={{ id: user.id, name: user.name, email: user.email, role: user.role, signature: user.signature, source: user.source }}
        sections={sections}
        actions={actions}
        collapsed={jar.get('bca_rail')?.value === 'compact'}
        tourDone={tourDone}
      >
        {children}
      </Shell>
    </ToastProvider>
  );
}
