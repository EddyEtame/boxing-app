import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { ageOf } from '@/data/member';
import { formatClock, useBadgeClock } from '@/features/badge/clock';
import { useBadgeProtection } from '@/features/badge/useBadgeProtection';
import { useRotatingCode } from '@/features/badge/useRotatingCode';
import { heure, nextSession } from '@/features/planning/model';
import { dateLineFromIso, dateLong } from '@/features/time';
import { useSession } from '@/state/session';
import { LifeLine } from '@/ui/LifeLine';
import { LowerThird } from '@/ui/LowerThird';
import { Page } from '@/ui/Page';
import { QR } from '@/ui/QR';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, easing, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

import { Stamp } from '../home/parts';
import { badgeLocked, BadgeLockedView } from './common';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/**
 * Le badge de l’adhérent : l’horloge du round (le rouge est le temps qui reste),
 * la montée sur le ring à l’ouverture (la plaque monte, la cloche), et le carnet
 * qu’il écrit (dernier tampon, prochain tampon).
 */
export function BadgeMembre() {
  const member = useSession((s) => s.member);
  const secret = useSession((s) => s.deviceSecret);
  const clubActif = useSession((s) => s.clubActif);
  const locked = badgeLocked(member);
  const windowSeconds = useBadgeClock((s) => s.windowSeconds);
  const secondsLeft = useBadgeClock((s) => s.secondsLeft);
  const { code } = useRotatingCode(member.deciplusId, secret, windowSeconds, locked === 'ok');
  const { hidden, captured, acknowledgeCapture } = useBadgeProtection(locked === 'ok');
  const club = clubById(clubActif);
  const clock = useLiveClock();
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
    transform: [{ translateY: (1 - rise.value) * 24 }, { scale: 0.96 + rise.value * 0.04 }],
  }));

  if (locked !== 'ok') return <BadgeLockedView reason={locked} member={member} />;

  return (
    <Page contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={styles.headRow}>
          <Mono size="micro">MON BADGE · {club.court.toUpperCase()}</Mono>
          <Mono size="micro">{clock}</Mono>
        </View>
        <Display size="display1" tabular upper={false} tight>
          {formatClock(secondsLeft)}
        </Display>
        <LifeLine secondsLeft={secondsLeft} windowSeconds={windowSeconds} height={3} />
        <Body size="caption" tone="muted">
          Au lecteur, ou les six chiffres au comptoir. Le code change à la cloche.
        </Body>
      </View>

      <Animated.View style={[styles.plate, { borderColor: hidden ? whiteAlpha[8] : color.accent }, plateStyle]}>
        <View style={styles.who}>
          <View style={styles.initials}>
            <Display size="display5" tight>
              {member.prenom[0]}
              {member.nom[0]}
            </Display>
          </View>
          <View style={styles.whoText}>
            <Body weight="bold" numberOfLines={1}>
              {member.prenom} {member.nom}
            </Body>
            <Mono size="micro">
              Nº {member.deciplusId} · {club.court.toUpperCase()}
            </Mono>
          </View>
          <Mono size="micro" tone={hidden ? 'muted' : 'accent'}>
            {hidden ? 'MASQUÉ' : 'VALIDE'}
          </Mono>
        </View>
        <View style={styles.qrWrap}>
          {code && !hidden ? (
            <QR value={code.payload} size={232} />
          ) : (
            <View style={styles.qrHidden}>
              <Mono size="caption">{hidden ? 'BADGE MASQUÉ' : 'CALCUL DU CODE'}</Mono>
            </View>
          )}
        </View>
        <View style={styles.plateMeta}>
          <View style={styles.metaCol}>
            <Mono size="micro">BADGE Nº</Mono>
            <Mono size="caption" tone="text">
              {member.badge.numero}
            </Mono>
          </View>
          <View style={styles.metaColRight}>
            <Mono size="micro">CODE COMPTOIR</Mono>
            <Display size="display5" tabular upper={false} tight>
              {code ? `${code.digits.slice(0, 3)} ${code.digits.slice(3)}` : '--- ---'}
            </Display>
          </View>
        </View>
      </Animated.View>

      <View style={styles.identity}>
        <Body size="caption" tone="muted">
          {member.abonnement.libelle} · prochain prélèvement le {member.abonnement.prochainPrelevement ? dateLong(member.abonnement.prochainPrelevement) : '—'}
        </Body>
        <Mono size="micro">CODE CALCULÉ SUR CET APPAREIL · VALABLE HORS CONNEXION · UNE CAPTURE NE SERT À RIEN APRÈS LA CLOCHE</Mono>
      </View>

      {captured ? (
        <Pressable onPress={acknowledgeCapture} accessibilityRole="button" accessibilityLabel="Compris">
          <LowerThird title="Capture d’écran détectée" meta={`CE CODE EXPIRE DANS ${formatClock(secondsLeft)} · TOUCHE POUR FERMER`} />
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Mono size="micro">DERNIER TAMPON</Mono>
          <Mono size="micro">Nº {String(member.passages.length).padStart(3, '0')}</Mono>
        </View>
        {last ? (
          <View style={styles.entry}>
            <View style={styles.entryText}>
              <Body weight="semi">
                {clubById(last.club).court} · {last.heure}
              </Body>
              <Mono size="micro">{dateLineFromIso(last.date)} · PASSAGE LU PAR LE LECTEUR</Mono>
            </View>
            <Stamp label="PRÉSENT" ink />
          </View>
        ) : null}
        <View style={[styles.sectionHead, { marginTop: space[3] }]}>
          <Mono size="micro">PROCHAIN TAMPON</Mono>
          <Mono size="micro">Nº {String(member.passages.length + 1).padStart(3, '0')}</Mono>
        </View>
        <View style={styles.entry}>
          <View style={styles.entryText}>
            <Body tone="muted">
              S’écrira ici quand le lecteur te verra
              {next ? ` · ${next.jourLabel.toLowerCase()} ${heure(next.slot.debut)}, ${next.activite.libelle.toLowerCase()}` : ''}.
            </Body>
          </View>
          <View style={styles.stampEmpty}>
            <Display size="display5" tight style={{ color: whiteAlpha[20], fontSize: 15, lineHeight: 15 }}>
              Présent
            </Display>
          </View>
        </View>
      </View>
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

const styles = StyleSheet.create({
  content: { gap: space[5] },
  head: { gap: space[2] },
  headRow: { flexDirection: 'row', justifyContent: 'space-between' },
  plate: { backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: 2, padding: space[4], gap: space[4], alignSelf: 'center', width: '100%', maxWidth: 360 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingBottom: space[3], borderBottomWidth: stroke.hair, borderBottomColor: whiteAlpha[8] },
  initials: { width: 40, height: 40, borderRadius: 20, backgroundColor: ink[300], alignItems: 'center', justifyContent: 'center' },
  whoText: { flex: 1, gap: 1 },
  qrWrap: { alignItems: 'center' },
  qrHidden: { width: 232, height: 232, borderRadius: radius.sm, backgroundColor: ink[0], alignItems: 'center', justifyContent: 'center' },
  plateMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: stroke.hair, borderTopColor: whiteAlpha[8], paddingTop: space[3] },
  metaCol: { gap: 2 },
  metaColRight: { gap: 2, alignItems: 'flex-end' },
  identity: { gap: space[1] },
  section: { gap: space[1] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  entryText: { flex: 1, gap: 2 },
  stampEmpty: { borderWidth: 1.5, borderRadius: radius.xs, borderColor: whiteAlpha[12], borderStyle: 'dashed', paddingHorizontal: 6, paddingVertical: 3, transform: [{ rotate: '-5deg' }] },
});
