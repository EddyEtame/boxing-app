import { BadgeMembre } from '@/screens/badge/BadgeMembre';
import { useSession } from '@/state/session';

export function Screen() {
  const statut = useSession((s) => s.member.statut);
  return <BadgeMembre key={statut} />;
}
