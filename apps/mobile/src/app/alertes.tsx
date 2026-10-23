import { router } from 'expo-router';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { clubById } from '@/data/clubs';
import { ageOf } from '@/data/member';
import { NEWS } from '@/data/news';
import { heure, nextSession } from '@/features/planning/model';
import { duree, shortDay } from '@/features/time';
import { inLocale, useLocale, useT } from '@/i18n';
import { useMessages } from '@/state/messages';
import { useSession } from '@/state/session';
import { IconCard, IconChat, IconClock, IconGear, IconNews, type IconProps } from '@/ui/icons';
import { Button, Card, IconTile } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body } from '@/ui/Text';
import { makeStyles, space, stroke, useTheme } from '@/ui/theme';

type Alert = { id: string; icon: ComponentType<IconProps>; tone: 'neutral' | 'accent' | 'positive'; title: string; when: string; unread: boolean; href: string };

/**
 * Le centre des notifications (CDC §14) : ce qui t'a prévenu, dans l'ordre.
 * Chaque ligne mène là où ça se passe. Les réglages sont à un geste.
 */
export default function AlertesScreen() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const member = useSession((st) => st.member);
  const threads = useMessages((st) => st.threads);
  const now = new Date();
  const next = nextSession(member.clubPrincipal, now, ageOf(member, now));
  const club = clubById(member.clubPrincipal);
  const alerts: Alert[] = [];
  for (const th of threads.filter((x) => x.unread > 0)) {
    const last = th.messages[th.messages.length - 1];
    alerts.push({ id: th.id, icon: IconChat, tone: 'accent', title: T('alerts.message', { from: th.title }), when: shortDay(last.at, lang), unread: true, href: `/fil/${th.id}` });
  }
  if (next) alerts.push({ id: 'next', icon: IconClock, tone: 'neutral', title: T('alerts.next', { cours: next.activite.libelle, h: heure(next.slot.debut), club: club.court }), when: T('home.inTime', { t: duree(next.dansMinutes, lang) }), unread: false, href: '/planning' });
  if (member.abonnement.prochainPrelevement) alerts.push({ id: 'debit', icon: IconCard, tone: 'positive', title: T('alerts.debit', { date: shortDay(member.abonnement.prochainPrelevement, lang) }), when: T('alerts.billing'), unread: false, href: '/abonnement' });
  for (const n of NEWS.slice(0, 2)) alerts.push({ id: n.id, icon: IconNews, tone: 'neutral', title: inLocale(n, lang).titre, when: shortDay(n.date, lang), unread: false, href: '/actualites' });

  return (
    <Page title={T('alerts.title')} leading="back" tabBar={false}>
      <Reveal>
        <Card padded={false} style={s.list}>
          {alerts.map((a, i) => (
            <Tap key={a.id} onPress={() => router.push(a.href as never)} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={a.title} style={[s.row, i < alerts.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
              <IconTile icon={a.icon} tone={a.tone} size={40} />
              <View style={{ flex: 1, gap: 3 }}>
                <Body weight={a.unread ? 'bold' : 'semi'} numberOfLines={3}>
                  {a.title}
                </Body>
                <Body size="caption" tone="dim">
                  {a.when}
                </Body>
              </View>
              {a.unread ? <View style={[s.dot, { backgroundColor: t.accent }]} /> : null}
            </Tap>
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
  dot: { width: 10, height: 10, borderRadius: 5 },
  block: { marginTop: space[5] },
}));
