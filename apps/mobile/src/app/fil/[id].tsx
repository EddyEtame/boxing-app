import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import type { Sujet, ThreadMessage } from '@bc/contract';

import { clock, longDate } from '@/features/time';
import { useLocale, useT, type MessageKey } from '@/i18n';
import { AdminApiError, envoyerMessage, lireFil } from '@/lib/admin-api';
import { useLiveTick } from '@/lib/app-realtime';
import { onLiveSignal } from '@/lib/live-bus';
import { selectStatut, useSession } from '@/state/session';
import { useMessageThread } from '@/state/message-thread';
import { useUsage } from '@/state/usage';
import { IconSend } from '@/ui/icons';
import { Button } from '@/ui/kit';
import { Page } from '@/ui/Page';
import { Body } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

function bulle(msg: ThreadMessage, T: (key: MessageKey) => string, lang: ReturnType<typeof useLocale>) {
  const who =
    msg.from === 'member'
      ? T('messages.you')
      : msg.from === 'staff'
        ? msg.signature ?? T('messages.team')
        : T('messages.auto');
  return { who, when: `${longDate(msg.at, lang)} · ${clock(msg.at)}`, text: msg.text };
}

export default function ThreadScreen() {
  const T = useT();
  const lang = useLocale();
  const t = useTheme();
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const liveTick = useLiveTick();
  const me = useSession((st) => st.me);
  const statut = useSession(selectStatut);
  const clubActif = useSession((st) => st.clubActif);
  const anonId = useUsage((u) => u.anonId);
  const threadId = useMessageThread((st) => st.threadId);
  const token = useMessageThread((st) => st.token);
  const markSeen = useMessageThread((st) => st.markSeen);
  const setPreview = useMessageThread((st) => st.setPreview);

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [sujet, setSujet] = useState<Sujet>('general');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filId = typeof id === 'string' ? id : '';
  const ok = filId && threadId === filId && token;

  const reload = useCallback(async () => {
    if (!ok || !token) return;
    try {
      const res = await lireFil(filId, token);
      setMessages(res.messages);
      setSujet(res.sujet);
      setPreview({ status: res.status, updatedAt: res.updatedAt, sujet: res.sujet });
      markSeen(res.updatedAt);
    } catch {
      setMessages([]);
    }
  }, [ok, token, filId, setPreview, markSeen]);

  useEffect(() => {
    void reload();
  }, [reload, liveTick]);

  useEffect(() => {
    return onLiveSignal((signal) => {
      if (signal.domain.startsWith('comms.messages')) void reload();
    });
  }, [reload]);

  const envoyer = async () => {
    const text = draft.trim();
    if (!text || busy || !me || statut !== 'actif' || !ok) return;
    setBusy(true);
    setErr(null);
    try {
      await envoyerMessage({
        anonId,
        club: clubActif,
        statut: 'actif',
        sujet,
        text,
        name: `${me.prenom} ${me.nom}`.trim(),
        threadId: filId,
      });
      setDraft('');
      await reload();
    } catch (e) {
      setErr(e instanceof AdminApiError && e.code === 'off' ? T('messages.off') : T('messages.sendFail'));
    } finally {
      setBusy(false);
    }
  };

  if (!ok) {
    return (
      <Page title={T('messages.title')} leading="back">
        <Body tone="muted">{T('messages.notFound')}</Body>
        <Button label={T('common.back')} variant="secondary" onPress={() => router.replace('/messages')} style={{ marginTop: space[4] }} />
      </Page>
    );
  }

  return (
    <Page title={T(`messages.subject.${sujet}` as 'messages.subject.general')} leading="back" tabBar={false}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const b = bulle(item, T, lang);
          const staff = item.from === 'staff';
          return (
            <View style={[s.row, staff ? s.rowStaff : s.rowMember]}>
              <Body size="caption" tone="dim">
                {b.who} · {b.when}
              </Body>
              <Body>{b.text}</Body>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={s.compose}>
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
          </View>
        }
      />
    </Page>
  );
}

const useStyles = makeStyles((theme) => ({
  list: { gap: space[3], paddingBottom: space[4] },
  row: { gap: space[1], padding: space[3], borderRadius: radius.card, maxWidth: '92%' },
  rowMember: { alignSelf: 'flex-end', backgroundColor: theme.card },
  rowStaff: { alignSelf: 'flex-start', backgroundColor: theme.cardAlt, borderWidth: stroke.hair, borderColor: theme.line },
  compose: { gap: space[3], marginTop: space[4] },
  input: {
    minHeight: 72,
    borderWidth: stroke.hair,
    borderRadius: radius.card,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    textAlignVertical: 'top',
    fontSize: 16,
  },
}));
