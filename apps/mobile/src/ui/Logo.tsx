import { Image } from 'expo-image';
import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/ui/theme';

const TRANSPARENT = require('@/assets/brand/logo-transparent-600.png');
const RATIO = 280 / 600;
/** Le même fichier, détouré façon autocollant (fond blanc qui épouse la silhouette) : pour les fonds sombres. */
const STICKER = require('@/assets/brand/logo-sticker-1200.png');
const STICKER_RATIO = 585 / 1200;

type Props = {
  width: number;
  style?: StyleProp<ViewStyle>;
  /**
   * `auto` : le logo nu sur la toile claire, en autocollant sur les fonds sombres.
   * `plain` : toujours nu, pour une pastille déjà claire (avatar de fil).
   * `spot` : sous un projecteur (l'entrée, sur la photo de gala).
   */
  variant?: 'auto' | 'plain' | 'spot';
};

/**
 * Le logo officiel, toujours le fichier (charte) : jamais redessiné, jamais
 * recoloré. Le liseré « blanc » du fichier transparent est en réalité vide :
 * sur un fond sombre, les lettres navy disparaissaient, et la plaque blanche
 * qui les portait faisait « boîte » (Eddy, 23/10/2026). En sombre, le logo est
 * désormais un autocollant : un fond blanc qui suit sa silhouette, comme le
 * logo imprimé sur le tablier des rings. Sur la photo de l'entrée, il s'allume
 * sous un projecteur.
 */
export function Logo({ width, style, variant = 'auto' }: Props) {
  const t = useTheme();
  const spot = variant === 'spot';
  const sticker = variant === 'auto' && t.scheme === 'dark';
  const height = Math.round(width * (sticker ? STICKER_RATIO : RATIO));
  return (
    <View style={[{ width, height }, style]} accessibilityRole="image" accessibilityLabel="Boxing Center">
      {spot ? <Spotlight width={width} height={height} /> : null}
      <Image source={sticker ? STICKER : TRANSPARENT} style={{ width, height }} contentFit="contain" />
    </View>
  );
}

/** Une flaque de lumière elliptique, deux fois la largeur du logo, qui s'éteint sans bord. */
function Spotlight({ width, height }: { width: number; height: number }) {
  const id = useId().replace(/:/g, '');
  const w = width * 2.1;
  const h = height * 3.1;
  return (
    <View pointerEvents="none" style={[styles.spot, { width: w, height: h, left: (width - w) / 2, top: (height - h) / 2 }]}>
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id={`spot-${id}`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#FFF8EE" stopOpacity={0.97} />
            <Stop offset="0.42" stopColor="#F7F1E8" stopOpacity={0.9} />
            <Stop offset="0.66" stopColor="#EDE6DB" stopOpacity={0.55} />
            <Stop offset="0.84" stopColor="#E3DCD0" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#E3DCD0" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#spot-${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  spot: { position: 'absolute' },
});
