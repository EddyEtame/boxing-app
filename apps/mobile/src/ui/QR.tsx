import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';

import { radius } from '@/ui/theme';

type QRProps = {
  value: string;
  size: number;
  /** Les lecteurs veulent des modules sombres sur fond clair : on ne joue pas avec. */
  dark?: string;
  light?: string;
  quietZone?: number;
};

export function QR({ value, size, dark = '#080808', light = '#F5F5F5', quietZone = 12 }: QRProps) {
  return (
    <View style={[styles.tile, { backgroundColor: light, padding: quietZone, borderRadius: radius.sm }]}>
      <QRCode value={value} size={size - quietZone * 2} color={dark} backgroundColor={light} ecl="M" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
