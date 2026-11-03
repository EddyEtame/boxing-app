import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import type { PublicNotification, ReceivedMessage, Sujet, ThreadResponse } from '@bc/contract';

import { longDate } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { AdminApiError, envoyerMessage, lireFil, lireFils, lireMessagesRecus, lireNotifications } from '@/lib/admin-api';
import { useLiveTick } from '@/lib/app-realtime';
import { configReady } from '@/lib/config';
import { onLiveSignal } from '@/lib/live-bus';
import { useFeature } from '@/state/features';
import { selectStatut, useSession } from '@/state/session';
import { useMessageThread } from '@/state/message-thread';
import { useUsage } from '@/state/usage';
import { IconChat, IconSend } from '@/ui/icons';
import { Button, Card, IconTile } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

import { Locked } from './messages-locked';
import { HorsLigne } from '@/ui/Offline';

/** Messages : fil direction (admin) + diffusion club (notifications admin). */
export function Screen() {
  const statut = useSession(selectStatut);
  const auth = useSession((s) => s.auth);
  const me = useSession((s) => s.me);
  const messagerie = useFeature('messagerie');
  const T = useT();
  if (!messagerie) {
    return (
      <Page title={T('sections.messages')}>
        <Reveal>
          <Card>
            <Body tone="muted">{T('train.off')}</Body>
          </Card>
        </Reveal>
      </Page>
    );
  }
  if (auth === 'connecte' && !me) return <HorsLigne />;
  if (statut !== 'actif') return <Locked statut={statut === 'restreint' ? 'restreint' : 'invite'} />;
  return <Boite me={me!} />;
}

function Boite({ me }: { me: NonNullable<ReturnType<typeof useSession.getState>['me']> }) {
  const T = useT();
  const lang = useLocale();
  const t = useTheme();
  const s = useStyles();
  const liveTick = useLiveTick();
  const clubActif = useSession((st) => st.clubActif);
  const anonId = useUsage((u) => u.anonId);
  const threadId = useMessageThread((st) => st.threadId);
  const token = useMessageThread((st) => st.token);
  const setSession = useMessageThread((st) => st.setSession);
  const setPreview = useMessageThread((st) => st.setPreview);

  const [notifs, setNotifs] = useState<PublicNotification[]>([]);
  const [recus, setRecus] = useState<ReceivedMessage[]>([]);
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [draft, setDraft] = useState('');
  const [sujet] = useState<Sujet>('general');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reloadNotifs = useCallback(() => {
    if (!configReady) return Promise.resolve();
    return lireNotifications(clubActif, 'actif').then(
      (res) => setNotifs(res.items),
      () => setNotifs([]),
    );
  }, [clubActif]);

  const reloadThread = useCallback(() => {
    const lecture = threadId ? lireFil(threadId, token) : Promise.resolve(null);
    return lecture.then(
      (res) => {
        setThread(res);
        if (res) setPreview({ status: res.status, updatedAt: res.updatedAt, sujet: res.sujet });
      },
      () => setThread(null),
    );
  }, [threadId, token, setPreview]);

  useEffect(() => {
    void reloadNotifs();
  }, [reloadNotifs, liveTick]);

  useEffect(() => {
    void reloadThread();
  }, [reloadThread, liveTick]);

  // Sur un autre téléphone ou après une reconnexion, le fil se retrouve avec le compte.
  useEffect(() => {
    if (threadId || !configReady) return;
    void lireFils()
      .then((res) => {
        if (res.items[0]) setSession(res.items[0].id, null);
      })
      .catch(() => undefined);
  }, [threadId, setSession]);

  // Ce que les coachs et l'équipe ont écrit (CDC §10) : l'admin déjà en ligne ne le sert pas encore, la section reste alors absente.
  useEffect(() => {
    if (!configReady) return;
    void lireMessagesRecus()
      .then((res) => setRecus(res.items))
      .catch(() => undefined);
  }, [liveTick]);

  useEffect(() => {
    return onLiveSignal((signal) => {
      if (signal.domain.startsWith('comms.notifications')) void reloadNotifs();
      if (signal.domain.startsWith('comms.messages')) void reloadThread();
    });
  }, [reloadNotifs, reloadThread]);

  const envoyer = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await envoyerMessage({
        anonId,
        club: clubActif,
        statut: 'actif',
        sujet,
        text,
        name: `${me.prenom} ${me.nom}`.trim(),
        threadId: threadId ?? undefined,
      }, threadId ? token : null);
      if (res.token) setSession(res.threadId, res.token);
      setDraft('');
      router.push(`/fil/${res.threadId}`);
    } catch (e) {
      setErr(e instanceof AdminApiError && e.code === 'off' ? T('messages.off') : T('messages.sendFail'));
    } finally {
      setBusy(false);
    }
  };

  const lastMsg = thread?.messages[thread.messages.length - 1];

  return (
    <Page title={T('messages.title')} subtitle={T('messages.sub')}>
      <FlatList
        data={notifs}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={s.header}>
            <Reveal>
              <Card style={s.direction}>
                <View style={s.directionHead}>
                  <IconTile icon={IconChat} size={44} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Heading level="section">{T('messages.directionTitle')}</Heading>
                    <Body tone="muted" size="caption">
                      {T('messages.introDirection')}
                    </Body>
                  </View>
                </View>
                {lastMsg ? (
                  <Body numberOfLines={3} style={s.preview}>
                    {lastMsg.from === 'staff' && lastMsg.signature ? `${lastMsg.signature}: ` : ''}
                    {lastMsg.text}
                  </Body>
                ) : null}
                {threadId ? (
                  <Button label={T('messages.openThread')} variant="secondary" onPress={() => router.push(`/fil/${threadId}`)} />
                ) : null}
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={T('messages.placeholder')}
                  placeholderTextColor={t.textDim}
                  multiline
                  style={[s.input, { color: t.text, borderColor: t.line }]}
                />
                {err ? (
                  <Body tone="negative" size="caption">
                    {err}
                  </Body>
                ) : null}
                <Button label={T('messages.send')} icon={IconSend} disabled={!draft.trim() || busy} onPress={() => void envoyer()} />
              </Card>
            </Reveal>
            {recus.length ? (
              <Reveal>
                <Heading level="section" style={s.sectionTitle}>
                  {T('messages.receivedTitle')}
                </Heading>
                <Body tone="muted" size="caption" style={s.sectionSub}>
                  {T('messages.coachesNote')}
                </Body>
                <View style={s.recus}>
                  {recus.map((m) => (
                    <Card key={m.id} style={s.notif} padded={false}>
                      <View style={s.notifInner}>
                        <Body weight="semi">{m.signature}</Body>
                        <Body tone="muted" size="caption">
                          {longDate(m.at, lang)}
                        </Body>
                        <Body>{m.text}</Body>
                        <Button small variant="ghost" label={T('messages.replyViaDirection')} onPress={() => setDraft(`${T('messages.aboutMessage', { from: m.signature, date: longDate(m.at, lang) })}\n`)} style={s.repondre} />
                      </View>
                    </Card>
                  ))}
                </View>
              </Reveal>
            ) : null}
            <Reveal>
              <Heading level="section" style={s.sectionTitle}>
                {T('messages.broadcastTitle')}
              </Heading>
              <Body tone="muted" size="caption" style={s.sectionSub}>
                {T('messages.broadcastSub')}
              </Body>
            </Reveal>
          </View>
        }
        ListEmptyComponent={
          <Body tone="muted" style={s.empty}>
            {T('messages.broadcastEmpty')}
          </Body>
        }
        renderItem={({ item }) => (
          <Card style={s.notif} padded={false}>
            <View style={s.notifInner}>
              <Body weight="semi">{item.title}</Body>
              <Body tone="muted" size="caption">
                {longDate(item.at, lang)}
              </Body>
              <Body>{item.body}</Body>
            </View>
          </Card>
        )}
        contentContainerStyle={s.list}
      />
    </Page>
  );
}

const useStyles = makeStyles((theme) => ({
  header: { gap: space[3], paddingBottom: space[2] },
  direction: { gap: space[3] },
  directionHead: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  preview: { marginTop: space[1] },
  input: {
    minHeight: 88,
    borderWidth: stroke.hair,
    borderRadius: radius.card,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    textAlignVertical: 'top',
    fontSize: 16,
  },
  sectionTitle: { marginTop: space[2] },
  sectionSub: { marginBottom: space[2] },
  recus: { gap: space[3] },
  repondre: { alignSelf: 'flex-start' },
  list: { gap: space[3], paddingBottom: space[6] },
  notif: { borderWidth: theme.scheme === 'dark' ? stroke.hair : 0 },
  notifInner: { padding: space[4], gap: space[2] },
  empty: { paddingVertical: space[4] },
}));
