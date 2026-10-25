import { useNetworkState } from 'expo-network';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { Button, Card } from '@/ui/kit';
import { Page } from '@/ui/Page';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, space } from '@/ui/theme';

/** Carte ou ecran : le reseau manque, on peut reessayer la fiche. */
export function HorsLigne({ page = true }: { page?: boolean }) {
  const T = useT();
  const s = useStyles();
  const [busy, setBusy] = useState(false);
  const carte = (
    <Card>
      <Heading level="section">{T('net.offline')}</Heading>
      <Body tone="muted" style={s.body}>
        {T('net.offlineBody')}
      </Body>
      <Button
        label={T('net.retry')}
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void useSession
            .getState()
            .recharger()
            .finally(() => setBusy(false));
        }}
        style={s.cta}
      />
    </Card>
  );
  if (!page) return carte;
  return <Page title={T('net.offline')}>{carte}</Page>;
}

/** Bandeau global. Les pages publiques restent utilisables dessous. */
export function BandeauHorsLigne() {
  const T = useT();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const net = useNetworkState();
  const [busy, setBusy] = useState(false);
  if (net.isConnected !== false && net.isInternetReachable !== false) return null;
  return (
    <View style={[s.bandeau, { top: Math.max(insets.top, 8) }]}>
      <Body size="bodySmall" weight="bold" tone="onPrimary" style={s.bandeauTexte}>
        {T('net.offline')}
      </Body>
      <Pressable
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void useSession
            .getState()
            .recharger()
            .finally(() => setBusy(false));
        }}
        accessibilityRole="button"
        accessibilityLabel={T('net.retry')}
        style={s.bandeauBtn}>
        <Body size="bodySmall" weight="bold" tone="onPrimary">
          {T('net.retry')}
        </Body>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  body: { marginTop: space[2], marginBottom: space[4] },
  cta: { marginTop: space[2] },
  bandeau: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 60,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: t.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingLeft: space[4],
    paddingRight: space[2],
    paddingVertical: space[2],
  },
  bandeauTexte: { flex: 1 },
  bandeauBtn: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[3] },
}));
