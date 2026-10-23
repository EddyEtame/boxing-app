import type { Metadata } from 'next';

import { FeaturesView } from './FeaturesView';
import { readFeatures } from '@/server/collections';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Fonctions' };

export default async function FeaturesPage() {
  await requireUser('fonctions');
  const state = await readFeatures();
  return <FeaturesView state={state} />;
}
