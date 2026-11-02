import { router } from 'expo-router';

import { Ceremonie } from '@/screens/compte/Ceremonie';
import { useSession } from '@/state/session';

/**
 * L'abonnement vient d'être reconnu alors qu'on visitait l'app (« J'ai déjà un
 * abonnement », achat sur la boutique) : le même coup de tampon qu'à la création du compte.
 */
export default function BienvenueScreen() {
  const me = useSession((st) => st.me);
  const entrer = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return <Ceremonie phase="resultat" fiche={me} erreur={null} decouverte={false} declareAbonne={false} onEnter={entrer} onRetry={entrer} busy={false} />;
}
