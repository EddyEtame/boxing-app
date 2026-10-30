import { ageAt } from '@bc/contract';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { clubById } from '@/data/clubs';
import { heure, nextSession, usePlanningSlots } from '@/features/planning/model';
import { duree } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { lireAvis } from '@/lib/api';
import { lireNotifications } from '@/lib/admin-api';
import { selectStatut, useSession } from '@/state/session';
import { IconClock, IconGear } from '@/ui/icons';
import { Button, Card, IconTile, Row } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body } from '@/ui/Text';
import { makeStyles, space, stroke } from '@/ui/theme';

/** Prochain cours (planning) et notifications club (GET admin). */
export default function AlertesScreen() {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  usePlanningSlots();
  const me = useSession((st) => st.me);
  const clubActif = useSession((st) => st.clubActif);
  const statut = useSession(selectStatut);
  const now = new Date();
  const age = me ? ageAt(me.dateNaissance, now) : 30;
  const next = nextSession(clubActif, now, age);
  const club = clubById(clubActif);
  const [notifs, setNotifs] = useState<{ id: string; title: string; body: string; link?: string }[]>([]);
  const [avis, setAvis] = useState<{ id: string; title: string; body: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await lireNotifications(clubActif, statut);
      setNotifs(res.items);
    } catch {
      setNotifs([]);
    }
    if (me) {
      try {
        const perso = await lireAvis();
        setAvis(perso.items);
      } catch {
        setAvis([]);
      }
    }
  }, [clubActif, statut, me]);

  useEffect(() => {
    void load();
  }, [load]);

  const openLink = (url?: string) => {
    if (url) void Linking.openURL(url);
  };

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
          {avis.map((n) => (
            <Row key={n.id} title={n.title} subtitle={n.body} />
          ))}
          {notifs.map((n, i) => (
            <Row
              key={n.id}
              title={n.title}
              subtitle={n.body}
              onPress={n.link ? () => openLink(n.link) : undefined}
              last={i === notifs.length - 1}
            />
          ))}
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
