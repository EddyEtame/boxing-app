import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import * as Haptics from 'expo-haptics';
import { useEffect, type ComponentProps, type ComponentType } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBadgeClock } from '@/features/badge/clock';
import { type IconProps } from '@/ui/icons';
import { LifeLine } from '@/ui/LifeLine';
import { Body } from '@/ui/Text';
import { color, duration, ink, MAX_CONTENT_WIDTH, radius, space, spring, stroke, TAB_BAR_HEIGHT, whiteAlpha } from '@/ui/theme';

/**
 * La barre d’onglets. Une seule pour toute l’app ; ce qui change entre les
 * onglets, le badge est une poignée au centre, avec la ligne de vie du jeton.
 */
export function TabBarFrame({ children, style, ...rest }: TabListProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 0);
  return (
    <View {...rest} style={[styles.frame, { paddingBottom: bottom }, style]}>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

type TabItemProps = TabTriggerSlotProps & {
  id: 'home' | 'planning' | 'badge' | 'entrainer' | 'moi';
  icon: ComponentType<IconProps>;
  label: string;
  ref?: ComponentProps<typeof Pressable>['ref'];
};

export function TabItem({ id, icon: Icon, label, isFocused, onPress, style: _style, ref, ...rest }: TabItemProps) {
  const pressed = useSharedValue(0);
  const focus = useSharedValue(isFocused ? 1 : 0);
  useEffect(() => {
    focus.value = withTiming(isFocused ? 1 : 0, { duration: duration.cross });
  }, [isFocused, focus]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.08 }, { translateY: -focus.value * 1.5 }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: focus.value,
    transform: [{ scaleX: 0.3 + focus.value * 0.7 }],
  }));

  const handle = id === 'badge';
  const tint = isFocused ? color.text : color.textDim;
  const { width } = useWindowDimensions();
  const itemWidth = Math.floor((Math.min(width, MAX_CONTENT_WIDTH) - space[2] * 2) / 5);

  return (
    <Pressable
      ref={ref}
      {...rest}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: duration.pressIn });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, spring.settle);
      }}
      onPress={(e) => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={[styles.item, { width: itemWidth }]}>
      {handle ? (
        <HandleA focused={!!isFocused} pressed={pressed} icon={Icon} />
      ) : (
        <>
          <Animated.View style={[styles.accent, barStyle]} />
          <Animated.View style={iconStyle}>
            <Icon size={22} color={tint} strokeWidth={isFocused ? 2 : 1.6} />
          </Animated.View>
          <Body size="micro" weight={isFocused ? 'bold' : 'medium'} caps numberOfLines={1} style={[styles.label, { color: tint }]}>
            {label}
          </Body>
        </>
      )}
    </Pressable>
  );
}

/** La poignée du coin — le badge, et la vie du jeton sous lui. */
function HandleA({ focused, pressed, icon: Icon }: { focused: boolean; pressed: SharedValue<number>; icon: ComponentType<IconProps> }) {
  const secondsLeft = useBadgeClock((s) => s.secondsLeft);
  const windowSeconds = useBadgeClock((s) => s.windowSeconds);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.06 }, { translateY: -6 }] }));
  return (
    <Animated.View style={[styles.handle, focused && styles.handleOn, style]}>
      <Icon size={24} color={focused ? color.textInverse : color.text} strokeWidth={2} />
      <View style={styles.handleLine}>
        <LifeLine secondsLeft={secondsLeft} windowSeconds={windowSeconds} height={2} track={focused ? 'rgba(8,8,8,0.18)' : whiteAlpha[12]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ink[50],
    borderTopWidth: stroke.hair,
    borderTopColor: ink[300],
  },
  row: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: space[2],
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  item: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    marginTop: 4,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  accent: {
    position: 'absolute',
    top: 0,
    height: 2,
    width: 28,
    backgroundColor: color.accent,
  },
  handle: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: ink[0],
    borderWidth: stroke.thin,
    borderColor: whiteAlpha[12],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  handleOn: {
    backgroundColor: color.text,
    borderColor: color.text,
  },
  handleLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 6,
  },
});
