import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { color, whiteAlpha } from '@/ui/theme';

type Props = {
  secondsLeft: number;
  windowSeconds: number;
  height?: number;
  track?: string;
  tint?: string;
};

/**
 * La ligne de vie du jeton : un filet qui se vide, linéaire, continu. Rouge tant
 * que le jeton vit. Pas d’anneau, pas de cadran : une ligne, comme sur un ring.
 */
export function LifeLine({ secondsLeft, windowSeconds, height = 2, track = whiteAlpha[8], tint = color.accent }: Props) {
  const progress = useSharedValue(secondsLeft / windowSeconds);
  useEffect(() => {
    progress.value = secondsLeft / windowSeconds;
    progress.value = withTiming(Math.max(0, (secondsLeft - 1) / windowSeconds), { duration: 1000, easing: Easing.linear });
  }, [secondsLeft, windowSeconds, progress]);
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View style={[styles.track, { height, backgroundColor: track }]}>
      <Animated.View style={[styles.fill, { backgroundColor: tint }, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
