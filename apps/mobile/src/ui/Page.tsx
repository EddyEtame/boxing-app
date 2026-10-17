import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, MAX_CONTENT_WIDTH, space, TAB_BAR_HEIGHT } from '@/ui/theme';

type PageProps = PropsWithChildren<{
  /** Défilement vertical (par défaut). `false` pour un écran fixe comme le badge. */
  scroll?: boolean;
  /** Marges latérales standard. `false` quand l’écran gère ses propres bords (photos pleine largeur). */
  padded?: boolean;
  /** Pas de marge haute : l’écran commence sous la barre d’état (héros photo). */
  bleedTop?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Page({ children, scroll = true, padded = true, bleedTop = false, style, contentStyle }: PageProps) {
  const insets = useSafeAreaInsets();
  const inner: ViewStyle = {
    paddingTop: bleedTop ? 0 : insets.top + space[4],
    paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space[8],
    paddingHorizontal: padded ? space[4] : 0,
  };
  if (!scroll) {
    return (
      <View style={[styles.root, style]}>
        <View style={[styles.column, inner, contentStyle]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[styles.root, style]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.column, inner, contentStyle]}>
        {children}
      </ScrollView>
    </View>
  );
}

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  return { top: insets.top, bottom: TAB_BAR_HEIGHT + insets.bottom };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', flexGrow: 1 },
});
