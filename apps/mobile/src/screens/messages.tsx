import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { BOUTIQUE_URL } from '@/features/sections';
import { track } from '@/features/analytics';
import { useT } from '@/i18n';
import { selectStatut, useSession } from '@/state/session';
import { IconChat, IconCheck, IconInfo, IconLock, IconUsers } from '@/ui/icons';
import { Button, Card, IconTile } from '@/ui/kit';
import { HorsLigne } from '@/ui/Offline';
import { Page, Reveal } from '@/ui/Page';
import { Bientot } from '@/ui/Soon';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, radius, space, useTheme } from '@/ui/theme';

/** Messages : la rubrique reste. Aucun fil n'est invente. */
export function Screen() {
  const statut = useSession(selectStatut);
  const auth = useSession((s) => s.auth);
  const me = useSession((s) => s.me);
  if (auth === 'connecte' && !me) return <HorsLigne />;
  if (statut !== 'actif') return <Locked statut={statut === 'restreint' ? 'restreint' : 'invite'} />;
  return <Boite />;
}

function Boite() {
  const T = useT();
  return (
    <Page title={T('messages.title')} subtitle={T('messages.sub')}>
      <Reveal>
        <Bientot />
      </Reveal>
    </Page>
  );
}

function Locked({ statut }: { statut: 'invite' | 'restreint' }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const perks = [
    { icon: IconChat, title: T('messages.perk1'), sub: T('messages.perk1Sub') },
    { icon: IconUsers, title: T('messages.perk2'), sub: T('messages.perk2Sub') },
    { icon: IconInfo, title: T('messages.perk3'), sub: T('messages.perk3Sub') },
  ];
  return (
    <Page title={T('messages.title')} subtitle={T('messages.lockedSub')}>
      <Reveal>
        <Card style={s.lockedCard}>
          <View style={[s.lockIcon, { backgroundColor: t.tint }]}>
            <IconLock size={26} />
          </View>
          <Heading level="section">{T('messages.lockedTitle')}</Heading>
          <Body tone="muted">{statut === 'restreint' ? T('messages.lockedRestricted') : T('messages.lockedGuest')}</Body>
          <View style={s.perks}>
            {perks.map((p) => (
              <View key={p.title} style={s.perk}>
                <IconTile icon={p.icon} size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="bold">{p.title}</Body>
                  <Body size="caption" tone="muted">
                    {p.sub}
                  </Body>
                </View>
                <IconCheck size={18} color={t.positive} />
              </View>
            ))}
          </View>
          {statut === 'restreint' ? (
            <Button label={T('messages.renew')} onPress={() => void Linking.openURL(BOUTIQUE_URL)} />
          ) : (
            <>
              <Button
                label={T('guest.create')}
                onPress={() => {
                  track('cta_create_account', { from: 'messages' });
                  router.push('/connexion');
                }}
              />
              <Button label={T('messages.seeOffers')} variant="secondary" onPress={() => void Linking.openURL(BOUTIQUE_URL)} style={s.second} />
            </>
          )}
        </Card>
      </Reveal>
    </Page>
  );
}

const useStyles = makeStyles(() => ({
  lockedCard: { gap: space[3] },
  lockIcon: { width: 56, height: 56, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center', marginBottom: space[1] },
  perks: { gap: space[3], marginVertical: space[3] },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  second: { marginTop: space[1] },
}));
