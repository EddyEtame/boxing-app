import type { Metadata } from 'next';

import { MessagesView } from './MessagesView';
import { can } from '@/lib/permissions';
import { readOutgoing } from '@/server/comms';
import { assignees, readThreads } from '@/server/comms-inbox';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Messages' };

/**
 * CDC §10. Trois adresses : `?fil=<id>` ouvre un fil, `?vue=envois` montre ce
 * que l'équipe a envoyé, `?nouveau=1` ouvre l'assistant d'envoi. Un coach n'a
 * pas la boîte de réception (droit « messagerie ») : il écrit, et voit ses envois.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('messages');
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const canInbox = can(user, 'messagerie');
  const [threads, team, sent] = await Promise.all([canInbox ? readThreads(user) : Promise.resolve([]), canInbox ? assignees() : Promise.resolve([]), readOutgoing(user)]);
  return (
    <MessagesView
      canInbox={canInbox}
      threads={threads}
      team={team.map(({ id, name, clubs }) => ({ id, name, clubs }))}
      sent={sent}
      me={{ id: user.id, name: user.name, signature: user.signature, role: user.role }}
      scope={user.clubs}
      openNew={Boolean(one(params.nouveau))}
      initialView={!canInbox || one(params.vue) === 'envois' ? 'sent' : 'inbox'}
      initialThread={one(params.fil) ?? null}
    />
  );
}
