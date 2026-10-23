import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { stroke, useTheme } from '@/ui/theme';

/** Vrai Liquid Glass d'iOS 26 quand il existe ; sinon un verre dépoli maison. */
function detectLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

export const LIQUID_GLASS = detectLiquidGlass();

type GlassProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  radius: number;
  /** Verre plus présent (barre, feuilles) ou plus léger (boutons posés sur une photo). */
  strength?: 'bar' | 'light';
  interactive?: boolean;
}>;

/**
 * La matière des éléments flottants (barre d'onglets, boutons ronds, barre de
 * titre) : iOS 26 → GlassView natif ; iOS plus ancien et web → flou + voile ;
 * Android → voile presque opaque (le flou temps réel y coûte trop cher).
 */
export function GlassSurface({ style, radius, strength = 'bar', interactive, children }: GlassProps) {
  const t = useTheme();
  if (LIQUID_GLASS) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme={t.scheme} isInteractive={interactive} style={[style, { borderRadius: radius }]}>
        {children}
      </GlassView>
    );
  }
  // Android n'a pas de flou temps réel : un voile translucide laissait lire le texte
  // dessous en fantôme (captures du 23/10/2026). Là, la matière est pleine.
  const veil = Platform.OS === 'android' ? t.card : strength === 'bar' ? t.glass : t.scheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(23,28,48,0.55)';
  // Web : un calque en position absolue se peint au-dessus d'une icône SVG
  // restée dans le flux. Le flou et le voile passent donc sous le contenu
  // (zIndex -1), dans un contexte d'empilement propre au verre (20/10/2026 :
  // la cloche de l'accueil disparaissait sous le voile).
  return (
    <View style={[style, styles.clip, WEB && styles.stack, { borderRadius: radius, borderColor: t.glassBorder }]}>
      {Platform.OS !== 'android' ? <BlurView intensity={strength === 'bar' ? 50 : 30} tint={t.scheme === 'light' ? 'light' : 'dark'} style={[StyleSheet.absoluteFill, WEB && styles.under]} /> : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, WEB && styles.under, { backgroundColor: veil }]} />
      {children}
    </View>
  );
}

const WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', borderWidth: stroke.hair },
  stack: { zIndex: 0 },
  under: { zIndex: -1 },
});
