import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDirection, type Direction } from '@/state/direction';
import { Mono } from '@/ui/Text';
import { color, ink, radius, space, TAB_BAR_HEIGHT } from '@/ui/theme';

const DIRECTIONS: Direction[] = ['A', 'B', 'C'];

/**
 * Interrupteur de direction artistique. Visible tant que les trois directions
 * sont en évaluation ; disparaît dans les builds de production.
 */
export function DirectionSwitch() {
  const insets = useSafeAreaInsets();
  const direction = useDirection((s) => s.direction);
  const setDirection = useDirection((s) => s.setDirection);
  if (!__DEV__) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + space[3] }]}>
      <View style={styles.pill}>
        {DIRECTIONS.map((d) => {
          const on = d === direction;
          return (
            <Pressable key={d} onPress={() => setDirection(d)} style={[styles.btn, on && styles.btnOn]} accessibilityRole="button" accessibilityLabel={`Direction ${d}`}>
              <Mono size="micro" tone={on ? 'inverse' : 'muted'} style={on ? styles.txtOn : undefined}>
                {d}
              </Mono>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: space[3],
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(8,8,8,0.72)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: ink[400],
    padding: 3,
    gap: 2,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  btnOn: {
    backgroundColor: color.text,
  },
  txtOn: {
    color: color.textInverse,
  },
});
