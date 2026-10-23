'use server';

import { cookies } from 'next/headers';

import { update } from '@/server/collections';
import { getSession } from '@/server/session';

/** La visite guidée est vue : on ne la remontre plus à cette personne (sauf si elle la redemande). */
export async function markTourDone(): Promise<void> {
  const user = await getSession();
  if (!user) return;
  await update('preferences', (prefs) => ({ next: { ...prefs, [user.id]: { ...prefs[user.id], tourDoneAt: new Date().toISOString() } }, result: undefined }));
  (await cookies()).set('bca_tour', 'vu', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

/** Rail replié ou déplié : une préférence d'affichage, lue par le serveur pour éviter un saut à l'ouverture. */
export async function setRailCompact(compact: boolean): Promise<void> {
  (await cookies()).set('bca_rail', compact ? 'compact' : 'large', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}
