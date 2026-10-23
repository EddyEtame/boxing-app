import { API, DEMO_MEMBER_ID } from '@bc/contract';
import type { Metadata } from 'next';

import { DemoView } from './DemoView';
import { getT } from '@/i18n/server';
import { isOn } from '@/server/collections';
import { apiReads, readDemo, servedPassages } from '@/server/demo';
import { adminPort, lanAddresses } from '@/server/network';
import { requireUser } from '@/server/session';
import { listAccounts } from '@/server/accounts';

export const metadata: Metadata = { title: 'Démo des stats' };

export default async function DemoPage() {
  await requireUser('demo');
  const { t } = await getT();
  const [state, on, accounts] = await Promise.all([readDemo(), isOn('demo'), listAccounts()]);
  const now = new Date();
  const port = adminPort();
  const who = state.updatedBy === 'systeme' ? t('demo.state.system') : state.updatedBy === 'direction' ? t('top.role.direction') : (accounts.find((a) => a.id === state.updatedBy)?.name ?? state.updatedBy);

  return (
    <DemoView
      state={{ pattern: state.pattern, rolling: state.rolling, updatedAt: state.updatedAt, updatedBy: who }}
      passages={servedPassages(state, now)}
      nowIso={now.toISOString()}
      featureOn={on}
      reads={apiReads()}
      endpoints={{ local: `http://localhost:${port}`, lan: lanAddresses().map((ip) => `http://${ip}:${port}`), route: API.demoPassages(DEMO_MEMBER_ID) }}
    />
  );
}
