import type { Metadata } from 'next';

import { JournalView } from './JournalView';
import { readAudit } from '@/server/audit';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Journal' };

export default async function JournalPage() {
  await requireUser('journal');
  const entries = await readAudit();
  return <JournalView entries={entries} />;
}
