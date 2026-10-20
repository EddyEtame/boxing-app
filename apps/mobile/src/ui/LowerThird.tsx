import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Body, Mono } from '@/ui/Text';
import { space, stroke, useTheme } from '@/ui/theme';

type Props = {
  /** Ligne principale, Montserrat 600. */
  title?: string;
  /** Ligne technique, Plex Mono. */
  meta: string;
  /** La barre est rouge par défaut ; une couleur de discipline pour un cours. */
  bar?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

/**
 * Le lower-third de la charte : une barre verticale et deux lignes.
 * C'est l'habillage de diffusion, pas une carte.
 */
export function LowerThird({ title, meta, bar, style, compact }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.bar, { backgroundColor: bar ?? t.accent }, compact && styles.barCompact]} />
      <View style={styles.text}>
        {title ? (
          <Body size={compact ? 'bodySmall' : 'body'} weight="semi" numberOfLines={1}>
            {title}
          </Body>
        ) : null}
        <Mono size="micro" numberOfLines={2}>
          {meta}
        </Mono>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: space[3] },
  bar: { width: stroke.accentBar, borderRadius: 2 },
  barCompact: { width: 3 },
  text: { flex: 1, justifyContent: 'center', gap: 2 },
});
