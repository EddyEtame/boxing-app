import { HomeInvite } from '@/screens/home/HomeInvite';
import { HomeMembre } from '@/screens/home/HomeMembre';
import { useProfil } from '@/state/session';

/** Qui est devant l’écran décide de l’accueil : la vitrine pour l’invité, le coin pour l’adhérent. */
export function Screen() {
  const profil = useProfil();
  return profil === 'invite' ? <HomeInvite /> : <HomeMembre />;
}
