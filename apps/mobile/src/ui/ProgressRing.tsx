import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/ui/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  stroke?: number;
  /** Valeur de 0 à 1 que l'anneau atteint (avec une montée animée au premier affichage). */
  progress: number;
  track?: string;
  tint?: string;
  /** Durée de la montée (ms). */
  duration?: number;
  children?: React.ReactNode;
};

/**
 * Un anneau qui se remplit jusqu'à sa valeur : la part du mois déjà boxée.
 * Une seule montée, nette, à l'ouverture de l'écran (1,2 s, décélération ferme).
 */
export function ProgressRing({ size, stroke = 10, progress, track, tint, duration = 1200, children }: Props) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = 0;
    value.value = withTiming(Math.max(0, Math.min(1, progress)), { duration, easing: Easing.bezier(0.32, 0.72, 0, 1) });
  }, [progress, duration, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? t.line} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tint ?? t.accent}
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
