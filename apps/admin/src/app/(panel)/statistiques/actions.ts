'use server';

import type { ActionResult } from '@/lib/action-result';
import { audit } from '@/server/audit';
import { actionUser, ActionError } from '@/server/session';
import { purgeDemoEvents } from '@/server/usage';

export type { ActionResult };

/** Retire les graines de démonstration ; ce que l'app a envoyé reste. */
export async function purgeDemo(): Promise<ActionResult<{ removed: number }>> {
  try {
    const user = await actionUser('statistiques');
    const removed = await purgeDemoEvents();
    await audit(user, 'usage.demo.retrait', 'evenements', `${removed} événements`);
    return { ok: true, data: { removed } };
  } catch (err) {
    return { ok: false, error: err instanceof ActionError ? err.code : 'interne' };
  }
}
