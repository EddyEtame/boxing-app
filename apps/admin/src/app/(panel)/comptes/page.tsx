import type { Metadata } from 'next';

import { AccountsView } from './AccountsView';
import { requireUser } from '@/server/session';
import { accountRows } from '@/server/team';

export const metadata: Metadata = { title: 'Comptes et droits' };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('comptes');
  const params = await searchParams;
  const rows = await accountRows();
  return <AccountsView rows={rows} meId={user.id} openNew={params.nouveau === '1'} />;
}
