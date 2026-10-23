import type { Metadata } from 'next';

import { TodayView } from './TodayView';
import { CREATE_ACTIONS } from '@/lib/actions-registry';
import { can } from '@/lib/permissions';
import { requireUser } from '@/server/session';
import { todayFor } from '@/server/today';

export const metadata: Metadata = { title: 'Aujourd’hui' };

export default async function TodayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('aujourdhui');
  const params = await searchParams;
  const data = await todayFor(user);
  const actions = CREATE_ACTIONS.filter((a) => can(user, a.capability)).map((a) => a.id);
  const refused = typeof params.refus === 'string' ? params.refus : null;
  return <TodayView data={data} name={user.source === 'env' ? null : user.name.split(' ')[0]} actions={actions} refused={refused} />;
}
