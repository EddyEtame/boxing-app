import { BadgeMembre } from '@/screens/badge/BadgeMembre';
import { BadgeLockedView } from '@/screens/badge/common';
import { useSession } from '@/state/session';
import { HorsLigne } from '@/ui/Offline';

export function Screen() {
  const auth = useSession((s) => s.auth);
  const me = useSession((s) => s.me);
  if (auth === 'connecte' && !me) return <HorsLigne />;
  if (!me) return <BadgeLockedView reason="invite" />;
  if (me.snapshot?.badgeEnregistre) return <BadgeMembre />;
  if (me.statut !== 'actif') return <BadgeLockedView reason="restreint" />;
  return <BadgeLockedView reason="sans-badge" />;
}
