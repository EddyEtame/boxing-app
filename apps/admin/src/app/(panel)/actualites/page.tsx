import type { Metadata } from 'next';

import { NewsView } from './NewsView';
import { isNewsKind } from '@/lib/content/enums';
import { can } from '@/lib/permissions';
import { rowsFor } from '@/server/content';
import { previewImport } from '@/server/content-import';
import { readLibrary } from '@/server/content-media';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Actualités' };

/** CDC §8 — les actualités de l'app : liste, assistant, photothèque, reprise de l'app. */
export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('actualites');
  const params = await searchParams;
  const [rows, library, importPreview] = await Promise.all([rowsFor(user, 'news'), readLibrary(), previewImport('news')]);
  const nouveau = typeof params.nouveau === 'string' ? params.nouveau : null;
  const ouvrir = typeof params.ouvrir === 'string' ? params.ouvrir : null;
  return (
    <NewsView
      rows={rows}
      library={library}
      importPreview={importPreview}
      scope={user.clubs}
      canNotify={can(user, 'notifications')}
      openNew={nouveau ? (isNewsKind(nouveau) ? nouveau : true) : false}
      openId={ouvrir}
    />
  );
}
