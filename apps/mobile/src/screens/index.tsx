import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { HomeInvite } from '@/screens/home/HomeInvite';
import { HomeMembre } from '@/screens/home/HomeMembre';
import { useProfil } from '@/state/session';

/** Qui est devant l’écran décide de l’accueil : la vitrine pour l’invité, le coin pour l’adhérent. */
export function Screen() {
  const profil = useProfil();
  const avant = useRef(profil);
  // L'abonnement vient d'être reconnu pendant la visite : le moment est rare, on le marque.
  useEffect(() => {
    if (avant.current === 'invite' && profil === 'adherent') router.push('/bienvenue');
    avant.current = profil;
  }, [profil]);
  return profil === 'invite' ? <HomeInvite /> : <HomeMembre />;
}
