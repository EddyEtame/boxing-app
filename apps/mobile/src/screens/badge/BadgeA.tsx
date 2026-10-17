import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { formatClock, useBadgeClock } from '@/features/badge/clock';
import { useBadgeProtection } from '@/features/badge/useBadgeProtection';
import { useRotatingCode } from '@/features/badge/useRotatingCode';
import { dateLong } from '@/features/time';
import { useSession } from '@/state/session';
import { LifeLine } from '@/ui/LifeLine';
import { LowerThird } from '@/ui/LowerThird';
import { Page } from '@/ui/Page';
import { QR } from '@/ui/QR';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

import { badgeLocked, BadgeLockedView } from './common';

/**
 * Direction A — l’horloge du round. Le jeton vit un round (180 s) ; le chrono est
 * le même objet que sur l’accueil et dans la poignée ; le rouge est le temps qui reste.
 */
export function BadgeA() {
  const member = useSession((s) => s.member);
  const secret = useSession((s) => s.deviceSecret);
  const locked = badgeLocked(member);
  const windowSeconds = useBadgeClock((s) => s.windowSeconds);
  const secondsLeft = useBadgeClock((s) => s.secondsLeft);
  const { code } = useRotatingCode(member.deciplusId, secret, windowSeconds, locked === 'ok');
  const { hidden, captured, acknowledgeCapture } = useBadgeProtection(locked === 'ok');
  const club = clubById(member.clubPrincipal);
  const clock = useLiveClock();

  if (locked !== 'ok') return <BadgeLockedView reason={locked} member={member} />;

  return (
    <Page scroll={false} contentStyle={styles.content}>
      <View style={styles.head}>
        <Mono size="micro">MON BADGE · ROUND EN COURS</Mono>
        <Display size="display1" tabular upper={false} tone="accent" tight style={styles.chrono}>
          {formatClock(secondsLeft)}
        </Display>
        <LifeLine secondsLeft={secondsLeft} windowSeconds={windowSeconds} height={3} />
        <Body size="caption" tone="muted">
          Nouveau code à la cloche. Présente-le au lecteur, ou donne les six chiffres au comptoir.
        </Body>
      </View>

      <Animated.View entering={FadeIn.duration(duration.jab)} style={[styles.plate, { borderColor: hidden ? whiteAlpha[8] : color.accent }]}>
        <View style={styles.qrWrap}>
          {code && !hidden ? (
            <QR value={code.payload} size={228} />
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
            <Mono size="micro">{clock}</Mono>
            <Mono size="caption" tone="text">
              {club.court.toUpperCase()}
            </Mono>
          </View>
        </View>
        <View style={styles.digitsRow}>
          <Mono size="micro">CODE COMPTOIR</Mono>
          <Display size="display5" tabular upper={false} tight>
            {code ? `${code.digits.slice(0, 3)} ${code.digits.slice(3)}` : '--- ---'}
          </Display>
        </View>
      </Animated.View>

      <View style={styles.foot}>
        <Body weight="semi">
          {member.prenom} {member.nom}
        </Body>
        <Body size="caption" tone="muted">
          {member.abonnement.libelle} · prochain prélèvement le {member.abonnement.prochainPrelevement ? dateLong(member.abonnement.prochainPrelevement) : '—'}
        </Body>
        <Mono size="micro">CODE CALCULÉ SUR CET APPAREIL · VALABLE HORS CONNEXION</Mono>
        {captured ? (
          <Pressable onPress={acknowledgeCapture} accessibilityRole="button" accessibilityLabel="Compris">
            <LowerThird title="Capture d’écran détectée" meta={`CE CODE EXPIRE DANS ${formatClock(secondsLeft)} · UN NOUVEAU LE REMPLACE · TOUCHE POUR FERMER`} style={styles.capture} />
          </Pressable>
        ) : null}
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
  content: { justifyContent: 'flex-start', gap: space[6] },
  head: { gap: space[2] },
  chrono: { marginTop: space[1] },
  plate: { backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: 2, padding: space[4], gap: space[4], alignSelf: 'center', width: '100%', maxWidth: 360 },
  qrWrap: { alignItems: 'center' },
  qrHidden: { width: 228, height: 228, borderRadius: radius.sm, backgroundColor: ink[0], alignItems: 'center', justifyContent: 'center' },
  plateMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { gap: 2 },
  metaColRight: { gap: 2, alignItems: 'flex-end' },
  digitsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: stroke.hair, borderTopColor: whiteAlpha[8], paddingTop: space[3] },
  foot: { gap: space[1] },
  capture: { marginTop: space[3] },
});
