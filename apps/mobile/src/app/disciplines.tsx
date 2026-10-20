import { router } from 'expo-router';
import { View } from 'react-native';

import { clubById } from '@/data/clubs';
import { DISCIPLINES } from '@/data/disciplines';
import { clubsProposant, familleColor } from '@/features/planning/model';
import { useT } from '@/i18n';
import { LowerThird } from '@/ui/LowerThird';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display } from '@/ui/Text';
import { makeStyles, radius, space } from '@/ui/theme';

/**
 * Les disciplines (CDC §3A). Les clubs qui proposent chacune se lisent dans le
 * planning réel : jamais une liste écrite à la main.
 */
export default function DisciplinesScreen() {
  const T = useT();
  const s = useStyles();
  return (
    <Page title={T('disc.title')} subtitle={T('disc.sub')} leading="back" tabBar={false}>
      {DISCIPLINES.map((d, i) => {
        const clubs = clubsProposant(d.famille);
        return (
          <Reveal key={d.famille} delay={i < 2 ? i * 80 : 0} style={s.cardWrap}>
            <Tap onPress={() => router.navigate('/planning')} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={d.nom}>
              <Photo source={d.photo} style={s.photo} darken={0.36} scrim={0.78} scrimTop={0.2}>
                <View style={s.top}>
                  <View style={s.pill}>
                    <Body size="caption" weight="bold">
                      {d.pourQui}
                    </Body>
                  </View>
                </View>
                <View style={s.bottom}>
                  <Display size="display3" tight numberOfLines={2}>
                    {d.nom}
                  </Display>
                  <Body size="bodySmall" tone="muted" numberOfLines={3}>
                    {d.accroche}
                  </Body>
                  <LowerThird meta={clubs.length ? clubs.map((c) => clubById(c).court.toUpperCase()).join(' · ') : T('guest.onRequest').toUpperCase()} bar={familleColor(d.famille)} compact style={s.lower} />
                </View>
              </Photo>
            </Tap>
          </Reveal>
        );
      })}
    </Page>
  );
}

const useStyles = makeStyles(() => ({
  cardWrap: { marginBottom: space[4] },
  photo: { height: 320, borderRadius: radius.card, justifyContent: 'space-between' },
  top: { padding: space[4], alignItems: 'flex-start' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(8,8,8,0.5)' },
  bottom: { padding: space[5], gap: space[2] },
  lower: { marginTop: space[2] },
}));
