import type { Metadata } from 'next';

import { VideosView } from './VideosView';
import { can } from '@/lib/permissions';
import { rowsFor } from '@/server/content';
import { previewImport } from '@/server/content-import';
import { readLibrary } from '@/server/content-media';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Vidéos' };

/** CDC §9 — la vidéothèque des coachs : fiches, fichiers (Cloudflare Stream), accès gratuit ou réservé. */
export default async function VideosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('videos');
  const params = await searchParams;
  const [rows, library, importPreview] = await Promise.all([rowsFor(user, 'video'), readLibrary(), previewImport('video')]);
  return (
    <VideosView
      rows={rows}
      library={library}
      importPreview={importPreview}
      streamConfigured={Boolean(process.env.CLOUDFLARE_STREAM_ACCOUNT_ID?.trim())}
      canNotify={can(user, 'notifications')}
      openNew={typeof params.nouveau === 'string'}
      openId={typeof params.ouvrir === 'string' ? params.ouvrir : null}
    />
  );
}
