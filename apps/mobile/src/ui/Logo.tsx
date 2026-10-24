import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/ui/theme';

const TRANSPARENT = require('@/assets/brand/logo-transparent-600.png');
const RATIO = 280 / 600;
/**
 * Le même fichier, détouré façon autocollant : les jours du logo remplis de blanc et un liseré
 * de 0,9 % autour, pour les fonds sombres. Le liseré était de 1,6 % ; Eddy y voyait un
 * « double padding » (24/10/2026) : à 0,9 %, c'est presque le logo sur fond clair, et
 * « CENTER » reste lisible sur le navy.
 */
const STICKER = require('@/assets/brand/logo-sticker-1200.png');
const STICKER_RATIO = 573 / 1200;
/** Une lueur blanche qui suit la silhouette du logo (dilatée puis floutée) ; le logo en occupe 80 % de la largeur. */
const AURA = require('@/assets/brand/logo-aura-1200.png');
const AURA_RATIO = 861 / 1500;
const AURA_SCALE = 1500 / 1200;

type Props = {
  width: number;
  style?: StyleProp<ViewStyle>;
  /**
   * `auto` : le logo nu sur la toile claire, en autocollant sur les fonds sombres.
   * `plain` : toujours nu, pour une pastille déjà claire (avatar de fil).
   * `spot` : sur une photo sombre (l'entrée) : le logo nu, allumé par l'aura de ses lettres.
   */
  variant?: 'auto' | 'plain' | 'spot';
};

/**
 * Le logo officiel, toujours le fichier (charte) : jamais redessiné, jamais
 * recoloré. Le liseré « blanc » du fichier transparent est en réalité vide :
 * sur un fond sombre, les lettres navy disparaissaient, et la plaque blanche
 * qui les portait faisait « boîte » (Eddy, 23/10/2026). En sombre, le logo est
 * un autocollant : un fond blanc qui suit sa silhouette, comme le logo imprimé
 * sur le tablier des rings. Sur la photo de l'entrée, ni plaque ni projecteur
 * (le halo faisait brouillard sur le plafond de la salle, 24/10/2026) : une
 * lueur qui épouse les lettres, comme une enseigne allumée dans la salle.
 */
export function Logo({ width, style, variant = 'auto' }: Props) {
  const t = useTheme();
  const spot = variant === 'spot';
  const sticker = variant === 'auto' && t.scheme === 'dark';
  const height = Math.round(width * (sticker ? STICKER_RATIO : RATIO));
  return (
    <View style={[{ width, height }, style]} accessibilityRole="image" accessibilityLabel="Boxing Center">
      {spot ? <Aura width={width} height={height} /> : null}
      <Image source={sticker ? STICKER : TRANSPARENT} style={{ width, height }} contentFit="contain" />
    </View>
  );
}

function Aura({ width, height }: { width: number; height: number }) {
  const w = width * AURA_SCALE;
  const h = w * AURA_RATIO;
  return <Image source={AURA} pointerEvents="none" style={[styles.aura, { width: w, height: h, left: (width - w) / 2, top: (height - h) / 2 }]} contentFit="contain" />;
}

const styles = StyleSheet.create({
  aura: { position: 'absolute' },
});
