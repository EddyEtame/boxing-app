import type { Metadata } from 'next';

import { ModerationView } from './ModerationView';
import { CLUB_IDS } from '@/lib/clubs';
import { can } from '@/lib/permissions';
import { readQueue } from '@/server/moderation';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Modération' };

export default async function ModerationPage() {
  const user = await requireUser('moderation');
  const { items, rules, features, freeClubs } = await readQueue(user);
  const scope = user.clubs === 'all' ? CLUB_IDS : user.clubs;
  return <ModerationView items={items} rules={rules} categoriesOn={features.entrainements.on} freeClubs={freeClubs} scope={scope} canRules={can(user, 'fonctions')} />;
}
