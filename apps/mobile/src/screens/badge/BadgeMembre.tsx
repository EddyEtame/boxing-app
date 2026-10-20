import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { ageOf } from '@/data/member';
import { formatClock, useBadgeClock } from '@/features/badge/clock';
import { useBadgeProtection } from '@/features/badge/useBadgeProtection';
import { useRotatingCode } from '@/features/badge/useRotatingCode';
import { heure, nextSession } from '@/features/planning/model';
import { relativeDay, shortDay } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { IconShield } from '@/ui/icons';
import { Card, LiveDot } from '@/ui/kit';
import { LifeLine } from '@/ui/LifeLine';
import { LowerThird } from '@/ui/LowerThird';
import { Page } from '@/ui/Page';
import { QR } from '@/ui/QR';
import { Body, Display, Heading, Mono } from '@/ui/Text';
import { duration, easing, makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

import { Stamp } from '../home/parts';
import { badgeLocked, BadgeLockedView } from './common';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/**
 * Le badge de l'adhérent : l'horloge du round, la montée sur le ring à
 * l'ouverture (la plaque monte, la cloche), le code tournant toujours noir sur
 * blanc pour les lecteurs, et le carnet qu'il écrit.
 */
export function BadgeMembre() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const member = useSession((st) => st.member);
  const secret = useSession((st) => st.deviceSecret);
  const clubActif = useSession((st) => st.clubActif);
  const locked = badgeLocked(member);
  const windowSeconds = useBadgeClock((st) => st.windowSeconds);
  const secondsLeft = useBadgeClock((st) => st.secondsLeft);
  const { code } = useRotatingCode(member.deciplusId, secret, windowSeconds, locked === 'ok');
  const { hidden, captured, acknowledgeCapture } = useBadgeProtection(locked === 'ok');
  const club = clubById(clubActif);
  const clockNow = useLiveClock();
  const now = new Date();
  const last = member.passages[0];
  const next = nextSession(clubActif, now, ageOf(member, now));

  const reduced = useReducedMotion();
  const rise = useSharedValue(0);
  useEffect(() => {
    if (locked !== 'ok') return;
    // Mouvement réduit : la montée sur le ring devient une coupe de 120 ms, la cloche reste.
    rise.value = reduced ? 1 : 0;
    rise.value = reduced ? withTiming(1, { duration: duration.jab }) : withDelay(80, withTiming(1, { duration: duration.bell, easing: ARRIVE }));
    const bell = setTimeout(() => {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, duration.bell + 80);
    return () => clearTimeout(bell);
  }, [locked, rise, reduced]);
  const plateStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 28 }, { scale: 0.95 + rise.value * 0.05 }],
  }));

  if (locked !== 'ok') return <BadgeLockedView reason={locked} member={member} />;

  return (
    <Page>
      <View style={s.head}>
        <View style={s.headRow}>
          <Body size="bodySmall" weight="bold" tone="muted">
            {T('badge.title')} · {club.court}
          </Body>
          <Mono size="caption" tone="muted">
            {clockNow}
          </Mono>
        </View>
        <Display size="display1" tabular upper={false} tight>
          {formatClock(secondsLeft)}
        </Display>
        <LifeLine secondsLeft={secondsLeft} windowSeconds={windowSeconds} height={4} />
        <Body size="bodySmall" tone="muted">
          {T('badge.help')}
        </Body>
      </View>

      <Animated.View style={[s.plate, { borderColor: hidden ? t.line : t.accent }, plateStyle]}>
        <View style={s.who}>
          <View style={[s.initials, { backgroundColor: t.primary }]}>
            <Body weight="black" tone="onPrimary">
              {member.prenom[0]}
              {member.nom[0]}
            </Body>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Heading level="card" numberOfLines={1}>
              {member.prenom} {member.nom}
            </Heading>
            <Body size="caption" tone="muted">
              Nº {member.deciplusId} · {club.court}
            </Body>
          </View>
          <View style={s.valid}>
            {hidden ? null : <LiveDot size={7} />}
            <Body size="caption" weight="bold" tone={hidden ? 'muted' : 'accent'}>
              {hidden ? T('badge.masked') : T('badge.valid')}
            </Body>
          </View>
        </View>
        <View style={s.qrWrap}>
          {code && !hidden ? (
            <QR value={code.payload} size={240} />
          ) : (
            <View style={[s.qrHidden, { backgroundColor: t.cardAlt }]}>
              <Body size="bodySmall" weight="bold" tone="muted">
                {hidden ? T('badge.masked') : T('badge.computing')}
              </Body>
            </View>
          )}
        </View>
        <View style={[s.meta, { borderTopColor: t.line }]}>
          <View style={{ gap: 2 }}>
            <Body size="caption" weight="semi" tone="muted">
              {T('badge.number')}
            </Body>
            <Mono size="bodySmall" tone="text">
              {member.badge.numero}
            </Mono>
          </View>
          <View style={{ gap: 2, alignItems: 'flex-end' }}>
            <Body size="caption" weight="semi" tone="muted">
              {T('badge.counter')}
            </Body>
            <Display size="display4" tabular upper={false} tight>
              {code ? `${code.digits.slice(0, 3)} ${code.digits.slice(3)}` : '--- ---'}
            </Display>
          </View>
        </View>
      </Animated.View>

      {captured ? (
        <Pressable onPress={acknowledgeCapture} accessibilityRole="button" accessibilityLabel={T('common.close')} style={s.block}>
          <Card>
            <LowerThird title={T('badge.captured')} meta={T('badge.capturedMeta', { t: formatClock(secondsLeft) })} />
          </Card>
        </Pressable>
      ) : null}

      <Card style={s.block}>
        <View style={s.secure}>
          <IconShield size={22} color={t.positive} />
          <Body size="bodySmall" tone="muted" style={{ flex: 1 }}>
            {T('badge.secure')}
          </Body>
        </View>
      </Card>

      <Card style={s.block}>
        <Body size="caption" weight="bold" eyebrow tone="muted">
          {T('badge.lastStamp')}
        </Body>
        {last ? (
          <View style={s.entry}>
            <View style={{ flex: 1, gap: 2 }}>
              <Heading level="card">
                {clubById(last.club).court} · {last.heure}
              </Heading>
              <Body size="caption" tone="muted">
                {shortDay(last.date, lang)} · {T('badge.readByReader')}
              </Body>
            </View>
            <Stamp label={T('stats.present')} ink />
          </View>
        ) : null}
        <View style={[s.sep, { backgroundColor: t.line }]} />
        <Body size="caption" weight="bold" eyebrow tone="muted">
          {T('badge.nextStamp')}
        </Body>
        <Body tone="muted" style={s.nextText}>
          {next ? T('badge.nextStampText', { day: relativeDay(next.offset, next.jour, lang, true), h: heure(next.slot.debut), cours: lang === 'fr' ? next.activite.libelle.toLowerCase() : next.activite.libelle }) : T('badge.nextStampNone')}
        </Body>
      </Card>
    </Page>
  );
}

function useLiveClock(): string {
  const [t, setT] = useState(() => hhmmss(new Date()));
  useEffect(() => {
    const id = setInterval(() => setT(hhmmss(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function hhmmss(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const useStyles = makeStyles((t) => ({
  head: { gap: space[2] },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plate: {
    marginTop: space[5],
    backgroundColor: t.card,
    borderRadius: radius.card + 4,
    borderWidth: 2,
    padding: space[5],
    gap: space[4],
    width: '100%',
    alignSelf: 'center',
    ...(t.scheme === 'light' ? { boxShadow: t.shadowFloat } : null),
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  initials: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  valid: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qrWrap: { alignItems: 'center' },
  qrHidden: { width: 240, height: 240, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: stroke.hair, paddingTop: space[4] },
  block: { marginTop: space[4] },
  secure: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  sep: { height: stroke.hair, marginVertical: space[3] },
  nextText: { marginTop: space[2] },
}));
