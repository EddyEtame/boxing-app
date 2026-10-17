import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, skew, space } from '@/ui/theme';

type PlateProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tone?: 'accent' | 'ink' | 'white';
  /** Inclinaison en degrés (négatif = penche vers l’avant). */
  angle?: number;
}>;

const tones = {
  accent: color.accentDeep,
  ink: '#141724',
  white: color.text,
} as const;

/**
 * La plaque inclinée de la charte (parallélogramme à 8°) : fond penché, contenu
 * droit. Pour un prix, un statut, une étiquette qui doit « exister dans l’espace ».
 */
export function Plate({ children, style, tone = 'accent', angle = skew.plate }: PlateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tones[tone], transform: [{ skewX: `${angle}deg` }] }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', paddingHorizontal: space[3], paddingVertical: space[1] },
  content: { alignItems: 'center', justifyContent: 'center' },
});
