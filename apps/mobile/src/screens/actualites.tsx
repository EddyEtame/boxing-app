import type { PublicEvent, PublicNews, Statut } from '@bc/contract';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { clubById } from '@/data/clubs';
import { shortDay } from '@/features/time';
import { lireActualites, lireEvenements } from '@/lib/admin-api';
import { useLocale, useT } from '@/i18n';
import { selectStatut, useSession } from '@/state/session';
import { IconBelt } from '@/ui/icons';
import { Button, Card, Row, Section } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, radius, space, stroke } from '@/ui/theme';

import { Poster } from './home/parts';

/** Tout un club devant la fresque : l'affiche tant que rien n'est publié. */
const VIE_DU_CLUB = require('@/assets/photos/ramonville-equipe.jpg');

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
      {loading ? (
        <Reveal style={s.affiche}>
          <Card>
            <Body tone="muted">{T('common.loading')}</Body>
          </Card>
        </Reveal>
      ) : null}

      {!loading && !news.length && !events.length ? (
        <View style={s.affiche}>
          <Poster index={0} height={320} photo={VIE_DU_CLUB} cornerLeft={T('news.title')} cornerRight={T('news.waitClub')} title={T('news.waitTitle')} sub={T('news.waitBody')} meta={T('news.waitMeta')} />
        </View>
      ) : null}

      {news.length ? (
        <Reveal>
          <Section title={T('news.title')}>
            <View style={s.cartes}>
              {news.map((item) => (
                <NewsRow key={item.id} item={item} />
              ))}
            </View>
          </Section>
        </Reveal>
      ) : null}

      {events.length ? (
        <Reveal>
          <Section title={T('news.events')}>
            <View style={s.cartes}>
              {events.map((item) => (
                <EventRow key={item.id} item={item} />
              ))}
            </View>
          </Section>
        </Reveal>
      ) : null}

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

/** Une publication : sa photo quand elle en a une, ce qu'elle est, son texte et son lien. */
function Carte({ photo, surtitre, titre, meta, corps, detail, lien, lienLabel }: { photo: PublicNews['photo']; surtitre: string; titre: string; meta: string; corps: string; detail?: string; lien?: string | null; lienLabel?: string }) {
  const s = useStyles();
  return (
    <Card padded={false}>
      {photo ? <Photo source={{ uri: photo.url }} style={s.cartePhoto} darken={0} scrim={0} vignette={false} /> : null}
      <View style={s.carte}>
        <Body size="caption" weight="bold" eyebrow tone="muted">
          {surtitre}
        </Body>
        <Heading level="card">{titre}</Heading>
        {meta ? (
          <Body size="caption" weight="semi" tone="dim">
            {meta}
          </Body>
        ) : null}
        {corps ? (
          <Body size="bodySmall" tone="muted" numberOfLines={5}>
            {corps}
          </Body>
        ) : null}
        {detail ? (
          <Body size="bodySmall" weight="semi">
            {detail}
          </Body>
        ) : null}
        {lien && lienLabel ? <Button small label={lienLabel} variant="secondary" onPress={() => void Linking.openURL(lien)} style={s.carteLien} /> : null}
      </View>
    </Card>
  );
}

function NewsRow({ item }: { item: PublicNews }) {
  const T = useT();
  const lang = useLocale();
  const club = item.club ? clubById(item.club).court : null;
  return <Carte photo={item.photo} surtitre={T(`news.kind.${item.kind}`)} titre={item.title} meta={[shortDay(item.date, lang), club].filter(Boolean).join(' · ')} corps={item.body} lien={item.link?.url} lienLabel={item.link?.label} />;
}

function EventRow({ item }: { item: PublicEvent }) {
  const T = useT();
  const lang = useLocale();
  const lieu = item.venue ?? (item.club ? clubById(item.club).court : null);
  const [jour = '', horaire = ''] = item.startsAt.split('T');
  const combat = item.fight;
  return (
    <Carte
      photo={item.photo}
      surtitre={T(`news.eventKind.${item.kind}`)}
      titre={combat ? T('news.versus', { a: combat.fighter, b: combat.opponent }) : item.title}
      meta={[`${shortDay(jour, lang)} · ${horaire.replace(':', 'h')}`, lieu].filter(Boolean).join(' · ')}
      corps={item.body}
      detail={combat ? [combat.weightClass, combat.title, combat.broadcaster].filter(Boolean).join(' · ') : undefined}
      lien={item.ticketUrl}
      lienLabel={T('news.tickets')}
    />
  );
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: space[5], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  affiche: { marginTop: space[5] },
  cartes: { gap: space[3] },
  cartePhoto: { height: 170, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  carte: { gap: space[2], padding: space[5] },
  carteLien: { alignSelf: 'flex-start', marginTop: space[1] },
}));
