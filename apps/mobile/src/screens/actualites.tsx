import type { PublicEvent, PublicNews, Statut } from '@bc/contract';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { clubById } from '@/data/clubs';
import { lireActualites, lireEvenements } from '@/lib/admin-api';
import { useT } from '@/i18n';
import { selectStatut, useSession } from '@/state/session';
import { IconBelt } from '@/ui/icons';
import { Card, Row, Section } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Body } from '@/ui/Text';
import { makeStyles, space, stroke } from '@/ui/theme';

function audienceOk(audience: PublicNews['audience'], statut: Statut): boolean {
  return audience !== 'actifs' || statut === 'actif';
}

/** Actualites et agenda : GET admin, rien d'invente localement. */
export function Screen() {
  const T = useT();
  const s = useStyles();
  const statut = useSession(selectStatut);
  const [news, setNews] = useState<PublicNews[]>([]);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, e] = await Promise.all([lireActualites(), lireEvenements()]);
      setNews(a.enabled ? a.items.filter((n) => audienceOk(n.audience, statut)) : []);
      setEvents(e.enabled ? e.items.filter((n) => audienceOk(n.audience, statut)) : []);
    } catch {
      setNews([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [statut]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Page title={T('news.title')} subtitle={T('news.sub')}>
      <Reveal>
        <Section title={T('news.title')}>
          <Card padded={false} style={s.list}>
            {loading ? (
              <View style={s.pad}>
                <Body tone="muted">{T('common.loading')}</Body>
              </View>
            ) : news.length ? (
              news.map((item, i) => (
                <NewsRow key={item.id} item={item} last={i === news.length - 1 && !events.length} />
              ))
            ) : (
              <View style={s.pad}>
                <Body tone="muted">{T('news.empty')}</Body>
              </View>
            )}
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('news.events')}>
          <Card padded={false} style={s.list}>
            {loading ? (
              <View style={s.pad}>
                <Body tone="muted">{T('common.loading')}</Body>
              </View>
            ) : events.length ? (
              events.map((item, i) => <EventRow key={item.id} item={item} last={i === events.length - 1} />)
            ) : (
              <View style={s.pad}>
                <Body tone="muted">{T('news.eventsEmpty')}</Body>
              </View>
            )}
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('news.fights')}>
          <Card padded={false} style={s.list}>
            <View>
              <Row icon={IconBelt} iconTone="accent" title={T('sections.fights')} subtitle={T('sections.fightsSub')} onPress={() => router.push('/combats')} last />
            </View>
          </Card>
        </Section>
      </Reveal>
    </Page>
  );
}

function NewsRow({ item, last }: { item: PublicNews; last: boolean }) {
  const club = item.club ? clubById(item.club).court : null;
  const sub = [item.date, club].filter(Boolean).join(' · ');
  const open = () => {
    if (item.link?.url) void Linking.openURL(item.link.url);
  };
  return <Row title={item.title} subtitle={sub || item.body.slice(0, 80)} onPress={item.link?.url ? open : undefined} last={last} />;
}

function EventRow({ item, last }: { item: PublicEvent; last: boolean }) {
  const club = item.club ? clubById(item.club).court : item.venue;
  const when = item.startsAt.replace('T', ' · ');
  const sub = [when, club].filter(Boolean).join(' · ');
  const open = () => {
    if (item.ticketUrl) void Linking.openURL(item.ticketUrl);
  };
  return <Row title={item.title} subtitle={sub || item.body.slice(0, 80)} onPress={item.ticketUrl ? open : undefined} last={last} />;
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: space[5], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  pad: { paddingVertical: space[4] },
}));
