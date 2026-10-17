import * as Haptics from 'expo-haptics';
import type { PropsWithChildren } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { spring } from '@/ui/theme';

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
 * Le geste de base de l’app : tout ce qui se presse recule sous le doigt et
 * revient avec un ressort. Jamais d’opacité qui clignote.
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
        pressed.value = withSpring(1, spring.snappy);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, spring.settle);
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
