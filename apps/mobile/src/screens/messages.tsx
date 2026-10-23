import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { clubById } from '@/data/clubs';
import { PERSONNES } from '@/data/coachs';
import type { Thread } from '@/data/messages';
import { BOUTIQUE_URL } from '@/features/sections';
import { clock, dayLabel } from '@/features/time';
import { useInLocale, useLocale, useT } from '@/i18n';
import { useMessages, useMessageText } from '@/state/messages';
import { useSession } from '@/state/session';
import { IconChat, IconCheck, IconInfo, IconLock, IconUsers } from '@/ui/icons';
import { Button, Card, CountBadge, IconTile, Section } from '@/ui/kit';
import { Logo } from '@/ui/Logo';
import { Page, Reveal } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

/**
 * Messages (CDC §10, réservé aux abonnés). Le fil Direction en tête : c'est le
 * seul où l'on écrit. Les coachs et les clubs écrivent ; on lit, et on répond
 * via la direction. La règle est dite à l'écran, pas cachée.
 */
export function Screen() {
  const statut = useSession((s) => s.member.statut);
  return statut === 'actif' ? <Inbox /> : <Locked statut={statut} />;
}

function Inbox() {
  const T = useT();
  const s = useStyles();
  const threads = useMessages((st) => st.threads);
  const direction = threads.find((th) => th.kind === 'direction')!;
  const coachs = threads.filter((th) => th.kind === 'coach');
  const clubs = threads.filter((th) => th.kind === 'club');
  return (
    <Page title={T('messages.title')} subtitle={T('messages.sub')}>
      <Reveal>
        <ThreadCard thread={direction} featured />
        <Button label={T('messages.write')} icon={IconChat} onPress={() => router.push('/fil/direction')} style={s.write} />
      </Reveal>
      {coachs.length ? (
        <Reveal>
          <Section title={T('messages.coaches')} note={T('messages.coachesNote')}>
            <Card padded={false} style={s.list}>
              {coachs.map((th, i) => (
                <ThreadRow key={th.id} thread={th} last={i === coachs.length - 1} />
              ))}
            </Card>
          </Section>
        </Reveal>
      ) : null}
      {clubs.length ? (
        <Reveal>
          <Section title={T('messages.clubs')}>
            <Card padded={false} style={s.list}>
              {clubs.map((th, i) => (
                <ThreadRow key={th.id} thread={th} last={i === clubs.length - 1} />
              ))}
            </Card>
          </Section>
        </Reveal>
      ) : null}
    </Page>
  );
}

function Avatar({ thread, size = 48 }: { thread: Thread; size?: number }) {
  const t = useTheme();
  const s = useStyles();
  if (thread.kind === 'coach') {
    const p = PERSONNES.find((x) => x.id === thread.coachId);
    if (p?.photo) return <Image source={p.photo} style={[s.avatarImg, { width: size, height: size, borderRadius: size / 2 }]} contentFit="cover" contentPosition="top" />;
  }
  if (thread.kind === 'club' && thread.club) {
    return <Image source={clubById(thread.club).photo} style={[s.avatarImg, { width: size, height: size, borderRadius: size / 2 }]} contentFit="cover" />;
  }
  return (
    <View style={[s.avatarLogo, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.scheme === 'light' ? t.bg : '#FFFFFF' }]}>
      <Logo width={size * 0.84} variant="plain" />
    </View>
  );
}

function ThreadCard({ thread, featured }: { thread: Thread; featured?: boolean }) {
  const s = useStyles();
  const lang = useLocale();
  const loc = useInLocale();
  const text = useMessageText();
  const last = thread.messages[thread.messages.length - 1];
  return (
    <Card padded={false} onPress={() => router.push(`/fil/${thread.id}`)} accessibilityLabel={thread.title}>
      <View style={[s.row, featured && s.rowFeatured]}>
        <Avatar thread={thread} size={featured ? 56 : 48} />
        <View style={s.rowBody}>
          <View style={s.rowHead}>
            <Heading level="card" numberOfLines={1} style={{ flex: 1 }}>
              {thread.title}
            </Heading>
            <Body size="caption" tone="dim">
              {dayLabel(last.at, new Date(), lang)}
            </Body>
          </View>
          <Body size="caption" weight="semi" tone="muted" numberOfLines={1}>
            {loc(thread).subtitle}
          </Body>
          <View style={s.rowHead}>
            <Body size="bodySmall" tone="muted" numberOfLines={2} style={{ flex: 1 }}>
              {text(last)}
            </Body>
            <CountBadge count={thread.unread} />
          </View>
        </View>
      </View>
    </Card>
  );
}

function ThreadRow({ thread, last: isLast }: { thread: Thread; last?: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const loc = useInLocale();
  const text = useMessageText();
  const last = thread.messages[thread.messages.length - 1];
  return (
    <Tap onPress={() => router.push(`/fil/${thread.id}`)} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={thread.title} style={[s.row, !isLast && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
      <Avatar thread={thread} />
      <View style={s.rowBody}>
        <View style={s.rowHead}>
          <Body weight="bold" numberOfLines={1} style={{ flex: 1 }}>
            {thread.title}
          </Body>
          <Body size="caption" tone="dim">
            {dayLabel(last.at, new Date(), lang)} · {clock(last.at)}
          </Body>
        </View>
        <Body size="caption" weight="semi" tone="muted" numberOfLines={1}>
          {loc(thread).subtitle}
        </Body>
        <View style={s.rowHead}>
          <Body size="bodySmall" tone="muted" numberOfLines={2} style={{ flex: 1 }}>
            {text(last)}
          </Body>
          <CountBadge count={thread.unread} />
        </View>
      </View>
    </Tap>
  );
}

/** Pour l'invité et l'ancien adhérent : ce que la messagerie donne, et comment l'ouvrir (CDC §16). */
function Locked({ statut }: { statut: 'invite' | 'restreint' | 'actif' }) {
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
              <Button label={T('guest.create')} onPress={() => router.push('/connexion')} />
              <Button label={T('messages.seeOffers')} variant="secondary" onPress={() => void Linking.openURL(BOUTIQUE_URL)} style={s.second} />
            </>
          )}
        </Card>
      </Reveal>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  write: { marginTop: space[4] },
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4], paddingHorizontal: space[1] },
  rowFeatured: { padding: space[5] },
  rowBody: { flex: 1, gap: 2 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  avatarImg: { backgroundColor: t.cardAlt },
  avatarLogo: { alignItems: 'center', justifyContent: 'center', borderWidth: stroke.hair, borderColor: t.line, overflow: 'hidden' },
  lockedCard: { gap: space[3] },
  lockIcon: { width: 56, height: 56, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center', marginBottom: space[1] },
  perks: { gap: space[3], marginVertical: space[3] },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  second: { marginTop: space[1] },
}));
