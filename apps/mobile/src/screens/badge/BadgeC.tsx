import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubById } from '@/data/clubs';
import { formatClock, useBadgeClock } from '@/features/badge/clock';
import { useBadgeProtection } from '@/features/badge/useBadgeProtection';
import { useRotatingCode } from '@/features/badge/useRotatingCode';
import { useSession } from '@/state/session';
import { LowerThird } from '@/ui/LowerThird';
import { Photo } from '@/ui/Photo';
import { QR } from '@/ui/QR';
import { Spotlight } from '@/ui/Spotlight';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, easing, ink, radius, skew, space, TAB_BAR_HEIGHT, whiteAlpha } from '@/ui/theme';

import { badgeLocked, BadgeLockedView } from './common';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/**
 * Direction C — la montée sur le ring. Ouvrir le badge est une entrée d’arène :
 * la salle s’éteint, le projecteur monte sur le code, la cloche (une impulsion).
 */
export function BadgeC() {
  const member = useSession((s) => s.member);
  const secret = useSession((s) => s.deviceSecret);
  const locked = badgeLocked(member);
  const windowSeconds = useBadgeClock((s) => s.windowSeconds);
  const secondsLeft = useBadgeClock((s) => s.secondsLeft);
  const { code } = useRotatingCode(member.deciplusId, secret, windowSeconds, locked === 'ok');
  const { hidden, captured } = useBadgeProtection(locked === 'ok');
  const club = clubById(member.clubPrincipal);
  const insets = useSafeAreaInsets();

  const lights = useSharedValue(1);
  const rise = useSharedValue(0);
  const spot = useSharedValue(0);

  useEffect(() => {
    if (locked !== 'ok') return;
    lights.value = 1;
    rise.value = 0;
    spot.value = 0;
    lights.value = withTiming(0.32, { duration: duration.bell, easing: ARRIVE });
    rise.value = withDelay(120, withTiming(1, { duration: duration.bell, easing: ARRIVE }));
    spot.value = withDelay(240, withTiming(1, { duration: duration.bell, easing: ARRIVE }));
    const bell = setTimeout(() => {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, duration.bell + 120);
    return () => clearTimeout(bell);
  }, [locked, lights, rise, spot]);

  const darkStyle = useAnimatedStyle(() => ({ opacity: lights.value }));
  const plateStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 28 }, { scale: 0.96 + rise.value * 0.04 }],
  }));
  const spotStyle = useAnimatedStyle(() => ({ opacity: spot.value }));

  if (locked !== 'ok') return <BadgeLockedView reason={locked} member={member} />;

  return (
    <View style={styles.root}>
      <Photo source={require('@/assets/photos/ring-drapeaux-vide.jpg')} style={StyleSheet.absoluteFill} darken={0.5} scrim={0.5} scrimTop={0.3} contentPosition="center" />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: ink[0] }, darkStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, spotStyle]}>
        <Spotlight intensity={0.2} />
      </Animated.View>

      <View style={[styles.corners, { paddingTop: insets.top + space[4] }]}>
        <Mono size="micro" tone="text">
          ENTRÉE
        </Mono>
        <Mono size="micro" tone="text">
          {club.court.toUpperCase()}
        </Mono>
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.plate, plateStyle]}>
          {code && !hidden ? (
            <QR value={code.payload} size={236} />
          ) : (
            <View style={styles.qrHidden}>
              <Mono size="caption">{hidden ? 'BADGE MASQUÉ' : 'CALCUL DU CODE'}</Mono>
            </View>
          )}
          <View style={styles.plateFoot}>
            <Mono size="micro" tone="inverse">
              Nº {member.badge.numero}
            </Mono>
            <Mono size="micro" tone="inverse">
              {code ? `${code.digits.slice(0, 3)} ${code.digits.slice(3)}` : '--- ---'}
            </Mono>
          </View>
        </Animated.View>
      </View>

      <View style={[styles.bottom, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space[6] }]}>
        <View style={{ transform: [{ skewX: `${skew.momentum}deg` }] }}>
          <Display size="display3" tight>
            {member.prenom} {member.nom}
          </Display>
        </View>
        <LowerThird title={captured ? "Capture d’écran détectée" : undefined} meta={`JETON ${formatClock(secondsLeft)} · NOUVEAU CODE À LA CLOCHE · ${club.court.toUpperCase()}`} />
        <Body size="caption" tone="muted">
          Présente le code au lecteur. Il change tout seul ; une capture ne sert à rien après la cloche.
        </Body>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  corners: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space[4] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plate: { backgroundColor: color.text, borderRadius: radius.sm, padding: space[3], gap: space[2], shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } },
  plateFoot: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  qrHidden: { width: 236, height: 236, borderRadius: radius.sm, backgroundColor: ink[100], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: whiteAlpha[12] },
  bottom: { paddingHorizontal: space[4], gap: space[3] },
});
