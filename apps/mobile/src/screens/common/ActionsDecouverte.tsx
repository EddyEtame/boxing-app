import { useState } from 'react';
import { View } from 'react-native';

import { ouvrirOffres } from '@/features/offres';
import { useT, type MessageKey } from '@/i18n';
import { ApiError, cleErreurApi, lancerLien, lireMe } from '@/lib/api';
import { useSession } from '@/state/session';
import { Button } from '@/ui/kit';
import { Body } from '@/ui/Text';
import { makeStyles, space } from '@/ui/theme';

/**
 * Les deux gestes d'un compte sans abonnement : choisir son offre, ou signaler
 * qu'on en a déjà un (inscrit au comptoir depuis, mauvaise porte à la création).
 * Le second relance le rapprochement avec Deciplus : c'est lui qui ouvre l'accès.
 */
export function ActionsDecouverte({ from }: { from: string }) {
  const T = useT();
  const s = useStyles();
  const applyMe = useSession((st) => st.applyMe);
  const clubActif = useSession((st) => st.clubActif);
  const setAbonnementDeclare = useSession((st) => st.setAbonnementDeclare);
  const [busy, setBusy] = useState(false);
  const [retour, setRetour] = useState<MessageKey | null>(null);

  const verifier = async () => {
    setBusy(true);
    setRetour(null);
    setAbonnementDeclare(true);
    try {
      await lancerLien();
      applyMe(await lireMe());
      setRetour('auth.verifyingBody');
    } catch (e) {
      setRetour(e instanceof ApiError ? cleErreurApi(e.code) : 'auth.generic');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.actions}>
      <Button label={T('messages.seeOffers')} onPress={() => ouvrirOffres(clubActif, from)} />
      <Button label={T('guest.haveSub')} variant="secondary" disabled={busy} onPress={() => void verifier()} />
      {retour ? (
        <Body size="caption" tone="muted">
          {T(retour)}
        </Body>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  actions: { gap: space[3] },
}));
