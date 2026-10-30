import { DEMO_MEMBER_ID } from '@bc/contract';
import type { Metadata } from 'next';

import { DeciplusView } from './DeciplusView';
import { checkDeciplus } from '@/server/branchements';
import { readDemo } from '@/server/demo';
import { fetchShopHealth } from '@/server/member-bridge';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Deciplus' };

export default async function DeciplusPage() {
  await requireUser('deciplus');
  const [bridge, demo, shop] = await Promise.all([checkDeciplus(), readDemo(), fetchShopHealth()]);
  return (
    <DeciplusView
      bridge={bridge}
      checkedAt={new Date().toISOString()}
      demo={{ memberId: DEMO_MEMBER_ID, passages: demo.passages.length, updatedAt: demo.updatedAt }}
      shop={shop}
    />
  );
}
