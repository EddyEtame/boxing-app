import { Image } from 'expo-image';
import { type StyleProp, type ImageStyle } from 'react-native';

import { useTheme } from '@/ui/theme';

const TRANSPARENT = require('@/assets/brand/logo-transparent-600.png');
const PLAQUE = require('@/assets/brand/logo-plaque-750.png');

/**
 * Le logo officiel, toujours un fichier (charte) : le transparent sur la toile
 * claire ; en sombre, le fichier « fond blanc » posé sur une plaque arrondie,
 * parce que les lettres navy disparaissent sur un fond navy-nuit.
 */
export function Logo({ width, style }: { width: number; style?: StyleProp<ImageStyle> }) {
  const t = useTheme();
  const light = t.scheme === 'light';
  const ratio = light ? 280 / 600 : 400 / 750;
  return <Image source={light ? TRANSPARENT : PLAQUE} style={[{ width, height: Math.round(width * ratio) }, style]} contentFit="contain" accessibilityLabel="Boxing Center" />;
}
