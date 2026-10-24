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
  /** Couleur du texte sur un fond plein (bouton), quand le ton du thème ne convient pas. */
  ink?: string;
};

/**
 * Le lower-third de la charte : une barre verticale et deux lignes.
 * C'est l'habillage de diffusion, pas une carte.
 */
export function LowerThird({ title, meta, bar, style, compact, ink }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.bar, { backgroundColor: bar ?? t.accent }, compact && styles.barCompact]} />
      <View style={styles.text}>
        {title ? (
          <Body size={compact ? 'bodySmall' : 'body'} weight="semi" numberOfLines={1} style={ink ? { color: ink } : undefined}>
            {title}
          </Body>
        ) : null}
        <Mono size="micro" numberOfLines={2} style={ink ? { color: ink, opacity: 0.8 } : undefined}>
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
