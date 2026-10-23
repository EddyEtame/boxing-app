import type { Metadata } from 'next';

import { ConnectionsView } from './ConnectionsView';
import { checkConnections } from '@/server/branchements';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Branchements' };

export default async function BranchementsPage() {
  await requireUser('branchements');
  const report = await checkConnections();
  return <ConnectionsView report={report} />;
}
