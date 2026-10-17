import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { color, ink } from '@/ui/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  stroke?: number;
  /** Secondes restantes et longueur de la fenêtre : l’anneau se vide linéairement. */
  secondsLeft: number;
  windowSeconds: number;
  track?: string;
  tint?: string;
  children?: React.ReactNode;
};

/**
 * L’anneau qui se vide à chaque seconde autour du code tournant. Le mouvement
 * est linéaire et continu : il dit « ce code a une durée », rien d’autre.
 */
export function CountdownRing({ size, stroke = 3, secondsLeft, windowSeconds, track = ink[300], tint = color.accent, children }: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(secondsLeft / windowSeconds);

  useEffect(() => {
    // Saute à la valeur courante, puis glisse d’une seconde en une seconde.
    const target = Math.max(0, (secondsLeft - 1) / windowSeconds);
    progress.value = secondsLeft / windowSeconds;
    progress.value = withTiming(target, { duration: 1000, easing: Easing.linear });
  }, [secondsLeft, windowSeconds, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tint}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
