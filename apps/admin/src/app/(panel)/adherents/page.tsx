import type { Metadata } from 'next';

import { MembersView } from './MembersView';
import { can } from '@/lib/permissions';
import { readMembers } from '@/server/members';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Adhérents' };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** CDC §2, §15 — les comptes de l'app, leur fiche Deciplus, et la file de rapprochement que l'accueil tranche. */
export default async function MembersPage({ searchParams }: { searchParams: Params }) {
  const user = await requireUser('adherents');
  const params = await searchParams;
  let overview = null;
  let error: string | null = null;
  try {
    overview = await readMembers();
  } catch (err) {
    // La base de l'app injoignable : la page le dit, sans pile ni adresse.
    error = (err instanceof Error ? err.message : 'erreur inconnue').replace(/https?:\/\/\S+/g, '…').slice(0, 160);
  }
  return <MembersView overview={overview} error={error} canDecide={can(user, 'adherents')} canDemo={can(user, 'fonctions')} initial={{ q: one(params.q)?.slice(0, 80) ?? '', member: one(params.adherent)?.slice(0, 80) ?? null }} />;
}
