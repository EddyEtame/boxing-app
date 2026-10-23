import type { Metadata } from 'next';

import { EventsView } from './EventsView';
import { isEventKind } from '@/lib/content/enums';
import { todayParis, wallNowParis } from '@/lib/content/rules';
import { can } from '@/lib/permissions';
import { rowsFor } from '@/server/content';
import { previewImport } from '@/server/content-import';
import { readLibrary } from '@/server/content-media';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Événements' };

/** CDC §8 (et §13 pour la forme d'un combat) — galas, combats, stages, compétitions, portes ouvertes. */
export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('evenements');
  const params = await searchParams;
  const [rows, library, importPreview] = await Promise.all([rowsFor(user, 'event'), readLibrary(), previewImport('event')]);
  const nouveau = typeof params.nouveau === 'string' ? params.nouveau : null;
  const ouvrir = typeof params.ouvrir === 'string' ? params.ouvrir : null;
  const now = new Date();
  return (
    <EventsView
      rows={rows}
      library={library}
      importPreview={importPreview}
      scope={user.clubs}
      canNotify={can(user, 'notifications')}
      today={todayParis(now)}
      nowWall={wallNowParis(now)}
      openNew={nouveau ? (isEventKind(nouveau) ? nouveau : true) : false}
      openId={ouvrir}
    />
  );
}
