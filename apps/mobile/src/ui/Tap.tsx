import * as Haptics from 'expo-haptics';
import type { PropsWithChildren } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { duration, easing } from '@/ui/theme';

const STANDARD = Easing.bezier(easing.standard[0], easing.standard[1], easing.standard[2], easing.standard[3]);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TapProps = PropsWithChildren<
  Omit<PressableProps, 'style'> & {
    style?: StyleProp<ViewStyle>;
    /** Amplitude du recul à la pression (0.96 = léger, 0.9 = franc). */
    scaleTo?: number;
    haptic?: 'light' | 'medium' | 'selection' | 'none';
  }
>;

/**
 * Le geste de base de l’app : tout ce qui se presse recule sous le doigt
 * **à l’instant** (0 ms) et revient en 120 ms : l’asymétrie de Linear, la
 * main sent la réponse avant de la voir. Jamais d’opacité qui clignote.
 */
export function Tap({ children, style, scaleTo = 0.97, haptic = 'light', onPressIn, onPressOut, onPress, ...rest }: TapProps) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
  }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, animated]}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: duration.pressIn });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: duration.pressOut, easing: STANDARD });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (Platform.OS !== 'web' && haptic !== 'none') {
          if (haptic === 'selection') void Haptics.selectionAsync();
          else void Haptics.impactAsync(haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(e);
      }}>
      {children}
    </AnimatedPressable>
  );
}
