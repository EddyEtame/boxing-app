import { ageAt } from '@bc/contract';
import { router } from 'expo-router';
import { View } from 'react-native';

import { clubById } from '@/data/clubs';
import { heure, nextSession } from '@/features/planning/model';
import { duree } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { IconClock, IconGear } from '@/ui/icons';
import { Button, Card, IconTile } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body } from '@/ui/Text';
import { makeStyles, space, stroke } from '@/ui/theme';

/** Ce qui est reellement connu : la prochaine seance du club actif. */
export default function AlertesScreen() {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  const me = useSession((st) => st.me);
  const clubActif = useSession((st) => st.clubActif);
  const now = new Date();
  const age = me ? ageAt(me.dateNaissance, now) : 30;
  const next = nextSession(clubActif, now, age);
  const club = clubById(clubActif);

  return (
    <Page title={T('alerts.title')} leading="back" tabBar={false}>
      <Reveal>
        <Card padded={false} style={s.list}>
          {next ? (
            <Tap onPress={() => router.push('/planning')} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={next.activite.libelle} style={s.row}>
              <IconTile icon={IconClock} tone="neutral" size={40} />
              <View style={{ flex: 1, gap: 3 }}>
                <Body weight="semi" numberOfLines={3}>
                  {T('alerts.next', { cours: next.activite.libelle, h: heure(next.slot.debut), club: club.court })}
                </Body>
                <Body size="caption" tone="dim">
                  {T('home.inTime', { t: duree(next.dansMinutes, lang) })}
                </Body>
              </View>
            </Tap>
          ) : (
            <View style={s.row}>
              <Body tone="muted">{T('alerts.empty')}</Body>
            </View>
          )}
        </Card>
      </Reveal>
      <Reveal style={s.block}>
        <Button label={T('alerts.settings')} icon={IconGear} variant="secondary" onPress={() => router.push('/notifications')} />
      </Reveal>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 72, paddingVertical: space[4] },
  block: { marginTop: space[5] },
}));
