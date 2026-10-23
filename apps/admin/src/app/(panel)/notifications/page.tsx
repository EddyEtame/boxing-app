import type { Metadata } from 'next';

import { NotificationsView } from './NotificationsView';
import type { NotifPrefill } from '@/lib/comms/types';
import { deliveryStatus, prefillFrom, readNotifications, visibleNotifications } from '@/server/comms';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Notifications' };

/**
 * CDC §14. `?nouveau=1` ouvre l'assistant ; `&from=news:<id>`, `event:<id>`,
 * `video:<id>` ou `planning:<créneau>[:<AAAA-MM-JJ>]` le pré-remplit depuis
 * l'élément d'origine (lu ici, côté serveur, dans le périmètre du compte).
 */
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('notifications');
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const openNew = Boolean(one(params.nouveau));
  const from = one(params.from);
  const prefill: NotifPrefill | null = openNew && from ? await prefillFrom(user, from) : null;
  const rows = visibleNotifications(user, await readNotifications());
  return (
    <NotificationsView
      rows={rows}
      scope={user.clubs}
      openNew={openNew}
      prefill={prefill}
      nowIso={new Date().toISOString()}
      delivery={deliveryStatus()}
    />
  );
}

