import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { clubById } from '@/data/clubs';
import { urlBoutique } from '@/features/sections';
import { track } from '@/features/analytics';
import { useT, type MessageKey } from '@/i18n';
import { DEFAULT_OFFER_SLUG } from '@/lib/checkout-flow';
import { useSession } from '@/state/session';
import { IconCheck } from '@/ui/icons';
import { Button, Card } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Body, Display } from '@/ui/Text';
import { GUTTER, makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

/**
 * Pas de badge virtuel sans badge physique enregistre, et pas de badge sans
 * abonnement actif. L'invite voit comment ouvrir un compte.
 */
export type BadgeReason = 'sans-badge' | 'restreint' | 'invite';

const STEPS: Record<BadgeReason, { key: MessageKey; done: boolean }[]> = {
  invite: [
    { key: 'badge.stepSubscribe', done: false },
    { key: 'badge.stepBuy', done: false },
    { key: 'badge.stepCode', done: false },
  ],
  'sans-badge': [
    { key: 'badge.stepActive', done: true },
    { key: 'badge.stepBuy', done: false },
    { key: 'badge.stepRobot', done: false },
  ],
  restreint: [
    { key: 'badge.stepEnded', done: true },
    { key: 'badge.stepRenew', done: false },
    { key: 'badge.stepKept', done: false },
  ],
};

export function BadgeLockedView({ reason }: { reason: BadgeReason }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const clubActif = useSession((st) => st.clubActif);
  const club = clubById(clubActif);
  const shop = urlBoutique({ club: clubActif, offer: DEFAULT_OFFER_SLUG });
  const title = reason === 'sans-badge' ? T('badge.lockedNoBadge') : reason === 'restreint' ? T('badge.lockedEnded') : T('badge.lockedGuest');
  const lead = reason === 'sans-badge' ? T('badge.lockedNoBadgeLead') : reason === 'restreint' ? T('badge.lockedEndedLead') : T('badge.lockedGuestLead');
  return (
    <Page padded={false} bleedTop>
      <Photo source={club.photo} style={s.hero} darken={0.5} scrim={0.82} scrimTop={0.35}>
        <View style={s.heroBottom}>
          <Body size="bodySmall" weight="bold" tone="muted">
            {T('badge.title')} · {club.court}
          </Body>
          <Display size="display2" tight>
            {title}
          </Display>
          <Body tone="muted">{lead}</Body>
        </View>
      </Photo>

      <View style={s.body}>
        <Reveal>
          <Card padded={false} style={s.steps}>
            {STEPS[reason].map((st, i) => (
              <View key={st.key} style={[s.step, i < 2 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
                <View style={[s.stepNo, { backgroundColor: st.done ? t.positiveSoft : t.chip }]}>
                  {st.done ? (
                    <IconCheck size={16} color={t.positive} />
                  ) : (
                    <Body size="bodySmall" weight="black">
                      {i + 1}
                    </Body>
                  )}
                </View>
                <Body weight={st.done ? 'medium' : 'semi'} tone={st.done ? 'muted' : 'text'} style={{ flex: 1 }}>
                  {T(st.key)}
                </Body>
              </View>
            ))}
          </Card>
        </Reveal>

        <Reveal style={s.actions}>
          {reason === 'invite' ? (
            <>
              <Button label={T('guest.create')} onPress={() => {
              track('cta_create_account', { from: 'badge' });
              router.push('/connexion');
            }} />
              <Button label={T('messages.seeOffers')} variant="secondary" onPress={() => void Linking.openURL(shop)} />
            </>
          ) : reason === 'restreint' ? (
            <Button label={T('messages.renew')} onPress={() => void Linking.openURL(shop)} />
          ) : (
            <Button label={T('badge.hours')} variant="secondary" onPress={() => router.navigate('/planning')} />
          )}
          <Body size="caption" tone="dim" style={s.rule}>
            {T('badge.rule')}
          </Body>
        </Reveal>
      </View>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { height: 400, justifyContent: 'flex-end', borderBottomLeftRadius: radius.card + 6, borderBottomRightRadius: radius.card + 6 },
  heroBottom: { padding: GUTTER, paddingBottom: space[6], gap: space[2] },
  body: { paddingHorizontal: GUTTER, marginTop: space[5] },
  steps: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 68, paddingVertical: space[3] },
  stepNo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: space[5], gap: space[3] },
  rule: { textAlign: 'center', marginTop: space[2] },
}));
