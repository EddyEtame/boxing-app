import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

/** Le rouge de la charte, le blanc des projecteurs, l'or des feux froids de gala. */
const TEINTES = ['#E8001C', '#FFFFFF', '#FFC46B', '#FF5A6B'];

/** Une gerbe sans hasard : l'angle d'or répartit les éclats, la vitesse et la taille varient par cycle. */
const ECLATS = Array.from({ length: 44 }, (_, i) => ({
  angle: (i * 137.508 * Math.PI) / 180,
  vitesse: 110 + ((i * 53) % 210),
  long: 10 + ((i * 7) % 12),
  large: 2.5 + (i % 3) * 0.75,
  teinte: TEINTES[i % TEINTES.length],
  vie: 0.62 + ((i * 11) % 38) / 100,
}));

const BRAISES = Array.from({ length: 14 }, (_, i) => ({
  gauche: 4 + ((i * 37) % 92),
  duree: 3400 + ((i * 433) % 2600),
  retard: (i * 271) % 2400,
  taille: 2 + (i % 3),
  derive: i % 2 ? 14 : -14,
  teinte: i % 3 === 0 ? '#FFFFFF' : '#FFC46B',
}));

function Eclat({ p, e }: { p: SharedValue<number>; e: (typeof ECLATS)[number] }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, p.value / e.vie);
    const x = Math.cos(e.angle) * e.vitesse * t;
    const y = Math.sin(e.angle) * e.vitesse * t + 110 * t * t;
    return {
      opacity: p.value === 0 || t >= 1 ? 0 : 1 - t * t,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${e.angle}rad` }, { scaleX: 1 - t * 0.7 }],
    };
  });
  return <Animated.View style={[styles.eclat, { width: e.long, height: e.large, borderRadius: e.large, backgroundColor: e.teinte }, style]} />;
}

/**
 * La gerbe qui part du point d'impact, une fois. Le spectacle se réserve à ce qui
 * est rare (Whoop, registre des apps) : l'arrivée d'un compte, la révélation d'un
 * abonnement. À poser dans une boîte : les éclats partent de son coin haut gauche.
 */
export function Gerbe({ active }: { active: boolean }) {
  const reduit = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (active && !reduit) p.set(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }));
  }, [active, reduit, p]);
  if (reduit) return null;
  return (
    <View pointerEvents="none" style={styles.point}>
      {ECLATS.map((e) => (
        <Eclat key={e.angle} p={p} e={e} />
      ))}
    </View>
  );
}

/** L'onde de la cloche : deux anneaux qui s'ouvrent depuis le point d'impact. */
export function Onde({ active, couleur = '#E8001C', retard = 0 }: { active: boolean; couleur?: string; retard?: number }) {
  const reduit = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (active && !reduit) p.set(withDelay(retard, withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) })));
  }, [active, reduit, retard, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 0.95 * (1 - p.value),
    transform: [{ scale: 0.3 + p.value * 4.4 }],
  }));
  if (reduit) return null;
  return <Animated.View pointerEvents="none" style={[styles.onde, { borderColor: couleur }, style]} />;
}

/** L'attente qui vit : un anneau qui tourne, sa couleur sur un cercle discret. */
export function Anneau({ couleur, fond, taille = 22 }: { couleur: string; fond: string; taille?: number }) {
  const reduit = useReducedMotion();
  const tour = useSharedValue(0);
  useEffect(() => {
    if (!reduit) tour.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false));
  }, [reduit, tour]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${tour.value * 360}deg` }] }));
  return <Animated.View style={[{ width: taille, height: taille, borderRadius: taille / 2, borderWidth: 2.5, borderColor: fond, borderTopColor: couleur }, style]} />;
}

function Braise({ b, hauteur }: { b: (typeof BRAISES)[number]; hauteur: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(b.retard, withRepeat(withTiming(1, { duration: b.duree, easing: Easing.linear }), -1, false)));
  }, [b, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.1 ? p.value * 9 : (1 - p.value) * 0.9,
    transform: [{ translateY: -p.value * hauteur }, { translateX: Math.sin(p.value * 6.28) * b.derive }],
  }));
  return <Animated.View style={[styles.braise, { left: `${b.gauche}%`, width: b.taille, height: b.taille, borderRadius: b.taille, backgroundColor: b.teinte }, style]} />;
}

/** Les braises qui montent lentement tant que la salle est allumée, comme après les feux froids. */
export function Braises({ actives, hauteur }: { actives: boolean; hauteur: number }) {
  const reduit = useReducedMotion();
  if (!actives || reduit) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {BRAISES.map((b) => (
        <Braise key={b.gauche} b={b} hauteur={hauteur} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  point: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  eclat: { position: 'absolute' },
  onde: { position: 'absolute', left: -48, top: -48, width: 96, height: 96, borderRadius: 48, borderWidth: 4 },
  braise: { position: 'absolute', bottom: 0 },
});
