'use server';

import type { LinkStatus } from '@bc/contract';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { decideLink } from '@/server/members';
import { purgeMembersDemo, seedMembersDemo } from '@/server/members-demo';
import { actionUser, errorCode } from '@/server/session';
import { supabaseConfigured } from '@/server/supabase-admin';

/**
 * Les gestes de la rubrique Adhérents : trancher un rapprochement (par le
 * serveur applicatif quand la base est branchée, sur les exemples sinon), et
 * charger ou retirer les exemples. Chaque geste relit la session et les droits.
 */
async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (err) {
    return fail(errorCode(err));
  }
}

const MAX_ID = 80;

export async function decideMatch(requestId: string, resolution: string, memberId: string | null): Promise<ActionResult<{ status: LinkStatus; warning?: 'robot_indisponible' }>> {
  return guarded(async () => {
    const user = await actionUser('adherents');
    if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > MAX_ID) return fail('invalide');
    if (resolution !== 'lie' && resolution !== 'refuse') return fail('invalide');
    const out = await decideLink(user, requestId.trim(), resolution, typeof memberId === 'string' && memberId.trim() ? memberId.trim().slice(0, 64) : null);
    if (!out.ok) return fail(out.code === 'introuvable' ? 'introuvable' : out.code === 'config' || out.code === 'pont' ? 'interne' : 'conflit', { code: `adh.err.${out.code}` });
    return ok({ status: out.status, ...(out.warning ? { warning: out.warning } : {}) });
  });
}

export async function loadMembersDemo(): Promise<ActionResult<{ n: number }>> {
  return guarded(async () => {
    const user = await actionUser('fonctions');
    if (supabaseConfigured()) return fail('conflit');
    return ok({ n: await seedMembersDemo(user) });
  });
}

export async function removeMembersDemo(): Promise<ActionResult<undefined>> {
  return guarded(async () => {
    const user = await actionUser('fonctions');
    await purgeMembersDemo(user);
    return ok(undefined);
  });
}
