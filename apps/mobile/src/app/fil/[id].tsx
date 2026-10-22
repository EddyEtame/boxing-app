import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubById } from '@/data/clubs';
import { PERSONNES } from '@/data/coachs';
import { SUJETS, type Message, type Sujet, type Thread } from '@/data/messages';
import { clock, dayLabel, shortDay } from '@/features/time';
import { track } from '@/features/analytics';
import { useLocale, useT } from '@/i18n';
import { useMessages } from '@/state/messages';
import { useSession } from '@/state/session';
import { GlassSurface } from '@/ui/Glass';
import { IconBack, IconInfo, IconSend } from '@/ui/icons';
import { Button, Chip } from '@/ui/kit';
import { Logo } from '@/ui/Logo';
import { useTopInset } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body } from '@/ui/Text';
import { easing, fontFamily, fontSize, GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stroke, useTheme } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/**
 * Une conversation. Seul le fil Direction a une barre de saisie (CDC §10) ;
 * elle flotte en verre au-dessus du fil, comme sur WhatsApp iOS 26. Un message
 * de coach se lit, et se « répond via la direction » avec son contexte joint.
 */
export default function ThreadScreen() {
  const { id, ctx } = useLocalSearchParams<{ id: string; ctx?: string }>();
  const T = useT();
  const s = useStyles();
  const top = useTopInset();
  const insets = useSafeAreaInsets();
  const thread = useMessages((st) => st.threads.find((th) => th.id === id));
  const markRead = useMessages((st) => st.markRead);
  const statut = useSession((st) => st.member.statut);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (thread?.unread) markRead(thread.id);
  }, [thread?.id, thread?.unread, markRead]);

  if (!thread || statut !== 'actif') {
    return (
      <View style={[s.root, s.center]}>
        <Body tone="muted">{T('messages.notFound')}</Body>
        <Button label={T('common.back')} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} style={{ marginTop: space[4] }} />
      </View>
    );
  }

  const canWrite = thread.kind === 'direction';
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scroller}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={[s.scroll, { paddingTop: top + 72, paddingBottom: canWrite ? 180 : Math.max(insets.bottom, 16) + 170 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <ThreadIntro thread={thread} />
        {thread.messages.map((m, i) => (
          <Bubble key={m.id} message={m} prev={thread.messages[i - 1]} index={i} />
        ))}
        <Typing messages={thread.messages} />
      </ScrollView>

      <Header thread={thread} top={top} />

      {canWrite ? <Composer initialLabel={ctx} bottom={insets.bottom} /> : <ReadOnlyFooter thread={thread} bottom={insets.bottom} />}
    </KeyboardAvoidingView>
  );
}

function Header({ thread, top }: { thread: Thread; top: number }) {
  const s = useStyles();
  const T = useT();
  return (
    <View style={[s.header, { paddingTop: top }]}>
      <GlassSurface radius={0} style={StyleSheet.absoluteFill} />
      <View style={s.headerRow}>
        <Tap onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={T('common.back')} hitSlop={8}>
          <View style={s.back}>
            <IconBack size={24} />
          </View>
        </Tap>
        <ThreadAvatar thread={thread} />
        <View style={{ flex: 1 }}>
          <Body weight="bold" numberOfLines={1}>
            {thread.title}
          </Body>
          <Body size="caption" tone="muted" numberOfLines={1}>
            {thread.subtitle}
          </Body>
        </View>
      </View>
    </View>
  );
}

function ThreadAvatar({ thread }: { thread: Thread }) {
  const s = useStyles();
  const t = useTheme();
  const p = thread.kind === 'coach' ? PERSONNES.find((x) => x.id === thread.coachId) : undefined;
  if (p?.photo) return <Image source={p.photo} style={s.avatar} contentFit="cover" contentPosition="top" />;
  if (thread.kind === 'club' && thread.club) return <Image source={clubById(thread.club).photo} style={s.avatar} contentFit="cover" />;
  return (
    <View style={[s.avatar, s.avatarLogo, { backgroundColor: t.scheme === 'light' ? t.bg : '#FFFFFF' }]}>
      <Logo width={34} />
    </View>
  );
}

function ThreadIntro({ thread }: { thread: Thread }) {
  const s = useStyles();
  const T = useT();
  const text = thread.kind === 'direction' ? T('messages.introDirection') : thread.kind === 'coach' ? T('messages.introCoach') : T('messages.introClub');
  return (
    <View style={s.intro}>
      <IconInfo size={18} />
      <Body size="caption" tone="muted" style={{ flex: 1 }}>
        {text}
      </Body>
    </View>
  );
}

function Bubble({ message, prev, index }: { message: Message; prev?: Message; index: number }) {
  const s = useStyles();
  const lang = useLocale();
  const now = new Date();
  const newDay = !prev || new Date(prev.at).toDateString() !== new Date(message.at).toDateString();
  const day = newDay ? (
    <Body size="caption" weight="bold" tone="dim" style={s.day}>
      {dayLabel(message.at, now, lang)}
    </Body>
  ) : null;
  const enter = FadeInDown.delay(Math.min(index, 6) * 50)
    .duration(320)
    .easing(ARRIVE);
  if (message.from === 'auto') {
    return (
      <>
        {day}
        <Animated.View entering={enter} style={s.auto}>
          <Body size="caption" tone="muted" style={s.autoText}>
            {message.text}
          </Body>
        </Animated.View>
      </>
    );
  }
  const mine = message.from === 'member';
  return (
    <>
      {day}
      <Animated.View entering={enter} style={[s.bubbleWrap, mine ? s.mineWrap : s.theirsWrap]}>
        {!mine && message.signature ? (
          <Body size="caption" weight="bold" tone="muted" style={s.signature}>
            {message.signature}
          </Body>
        ) : null}
        {mine && message.context ? (
          <Body size="caption" weight="bold" tone="muted" style={s.context}>
            {message.context}
          </Body>
        ) : null}
        <View style={[s.bubble, mine ? s.mine : s.theirs]}>
          <Body tone={mine ? 'onPrimary' : 'text'}>{message.text}</Body>
          <Body size="caption" tone={mine ? 'onPrimary' : 'dim'} style={[s.time, mine && { opacity: 0.75 }]}>
            {clock(message.at)}
          </Body>
        </View>
      </Animated.View>
    </>
  );
}

/** Trois points qui respirent tant que la réponse automatique n'est pas arrivée. */
function Typing({ messages }: { messages: Message[] }) {
  const s = useStyles();
  const last = messages[messages.length - 1];
  // La réponse automatique suit toujours un message de l'adhérent : tant qu'elle n'est pas là, on écrit.
  const waiting = last?.from === 'member';
  if (!waiting) return null;
  return (
    <Animated.View entering={FadeInDown.duration(220)} style={[s.bubbleWrap, s.theirsWrap]}>
      <View style={[s.bubble, s.theirs, s.typing]}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 160} />
        ))}
      </View>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const t = useTheme();
  const v = useSharedValue(0.3);
  useEffect(() => {
    const id = setTimeout(() => {
      v.value = withRepeat(withSequence(withTiming(1, { duration: 360 }), withTiming(0.3, { duration: 360 })), -1);
    }, delay);
    return () => clearTimeout(id);
  }, [delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 2 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.textMuted }, style]} />;
}

function Composer({ initialLabel, bottom }: { initialLabel?: string; bottom: number }) {
  const s = useStyles();
  const t = useTheme();
  const T = useT();
  const send = useMessages((st) => st.send);
  const [sujet, setSujet] = useState<Sujet>('general');
  const [text, setText] = useState('');
  const ok = text.trim().length >= 2;
  const label = initialLabel ?? T(`messages.subject.${sujet}`);
  return (
    <View style={[s.composerWrap, { paddingBottom: Math.max(bottom, 12) }]}>
      {initialLabel ? (
        <View style={s.ctxRow}>
          <Body size="caption" weight="bold" tone="muted" numberOfLines={1}>
            {initialLabel}
          </Body>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subjects} keyboardShouldPersistTaps="handled">
          {SUJETS.map((k) => (
            <Chip key={k} label={T(`messages.subject.${k}`)} selected={k === sujet} onPress={() => setSujet(k)} />
          ))}
        </ScrollView>
      )}
      <View style={s.composerRow}>
        <GlassSurface radius={24} style={s.inputGlass}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={T('messages.placeholder')}
            placeholderTextColor={t.textDim}
            multiline
            style={[s.input, { color: t.text }]}
            accessibilityLabel={T('messages.placeholder')}
          />
        </GlassSurface>
        <Tap
          disabled={!ok}
          onPress={() => {
            send({ text: text.trim(), label, ack: T('messages.ack') });
            track('message_send', { channel: 'direction', value: sujet });
            setText('');
          }}
          scaleTo={0.88}
          haptic="medium"
          accessibilityRole="button"
          accessibilityLabel={T('messages.send')}
          style={[s.send, { backgroundColor: ok ? t.accent : t.lineStrong }]}>
          <IconSend size={22} color="#FFFFFF" />
        </Tap>
      </View>
    </View>
  );
}

function ReadOnlyFooter({ thread, bottom }: { thread: Thread; bottom: number }) {
  const s = useStyles();
  const T = useT();
  const lang = useLocale();
  const last = thread.messages[thread.messages.length - 1];
  const ctx = T('messages.aboutMessage', { from: thread.title, date: shortDay(last.at, lang) });
  return (
    <View style={[s.composerWrap, { paddingBottom: Math.max(bottom, 12) }]}>
      <GlassSurface radius={radius.card} style={s.readOnly}>
        <Body size="bodySmall" tone="muted">
          {thread.kind === 'coach' ? T('messages.readOnlyCoach') : T('messages.readOnlyClub')}
        </Body>
        <Button label={T('messages.replyViaDirection')} small onPress={() => router.replace({ pathname: '/fil/[id]', params: { id: 'direction', ctx } })} />
      </GlassSurface>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: GUTTER },
  scroll: { paddingHorizontal: GUTTER, gap: space[2], width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, borderBottomWidth: stroke.hair, borderBottomColor: t.line },
  headerRow: { height: 64, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[3], width: '100%', maxWidth: MAX_CONTENT_WIDTH + 2 * space[3], alignSelf: 'center' },
  back: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.cardAlt },
  avatarLogo: { alignItems: 'center', justifyContent: 'center', borderWidth: stroke.hair, borderColor: t.line, overflow: 'hidden' },
  intro: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start', padding: space[4], borderRadius: radius.tile, backgroundColor: t.tint, marginBottom: space[3] },
  day: { textAlign: 'center', marginVertical: space[3] },
  auto: { alignSelf: 'center', maxWidth: '86%', paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.tile, backgroundColor: t.tint },
  autoText: { textAlign: 'center' },
  bubbleWrap: { maxWidth: '82%', gap: 4 },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start' },
  signature: { marginLeft: space[3] },
  context: { marginRight: space[3] },
  bubble: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[2], borderRadius: 22 },
  mine: { backgroundColor: t.primary, borderBottomRightRadius: 6 },
  theirs: {
    backgroundColor: t.card,
    borderBottomLeftRadius: 6,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : { borderWidth: stroke.hair, borderColor: t.line }),
  },
  time: { alignSelf: 'flex-end', marginTop: 2 },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: space[4] },
  composerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space[3], paddingTop: space[2], gap: space[2], width: '100%', maxWidth: MAX_CONTENT_WIDTH + 2 * space[3], alignSelf: 'center' },
  ctxRow: { paddingHorizontal: space[3] },
  subjects: { gap: space[2], paddingHorizontal: space[1] },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  inputGlass: { flex: 1, minHeight: 48, justifyContent: 'center' },
  input: { minHeight: 48, maxHeight: 132, paddingHorizontal: space[4], paddingTop: 13, paddingBottom: 13, fontFamily: fontFamily.textMedium, fontSize: fontSize.body },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  readOnly: { padding: space[4], gap: space[3] },
}));
