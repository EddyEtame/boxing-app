import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** Intensité au centre (0 à 1). */
  intensity?: number;
  color?: string;
};

/**
 * Le projecteur de la charte : une lumière qui tombe d’en haut, ronde, qui
 * s’éteint sur les bords. Un dégradé radial SVG, identique sur iOS, Android et web.
 */
export function Spotlight({ style, intensity = 0.22, color = '#F5F5F5' }: Props) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="spot" cx="50%" cy="22%" rx="60%" ry="62%" fx="50%" fy="12%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={color} stopOpacity={intensity} />
            <Stop offset="0.45" stopColor={color} stopOpacity={intensity * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50" cy="22" rx="60" ry="62" fill="url(#spot)" />
      </Svg>
    </View>
  );
}
