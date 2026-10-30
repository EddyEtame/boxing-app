import { read } from './collections';
import { queueCount } from './members';
import { can, inScope } from '@/lib/permissions';
import type { SectionId } from '@/lib/nav';
import type { SessionUser } from '@/lib/types';

/**
 * Les pastilles rouges du rail : seulement ce qui demande une action, et
 * seulement dans le périmètre de la personne. Une pastille « 0 » est du bruit.
 */
export async function navCounts(user: SessionUser): Promise<Partial<Record<SectionId, number>>> {
  const out: Partial<Record<SectionId, number>> = {};
  if (can(user, 'messagerie')) {
    const threads = await read('messagerie');
    // Même règle que l'onglet « Non lus » de la boîte : un seul chiffre partout.
    out.messages = threads.filter((t) => t.unread && inScope(user, t.member.club)).length;
  }
  if (can(user, 'moderation')) {
    const proposals = await read('propositions');
    out.moderation = proposals.filter((p) => p.status === 'a-verifier' && inScope(user, p.club)).length;
  }
  if (can(user, 'adherents')) {
    // Les rapprochements à trancher : la même file que la rubrique, comptée au plus toutes les 30 secondes.
    out.adherents = await queueCount();
  }
  return out;
}
