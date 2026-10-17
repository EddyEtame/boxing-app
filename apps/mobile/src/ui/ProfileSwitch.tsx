import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/state/session';
import { Mono } from '@/ui/Text';
import { color, ink, radius, space, TAB_BAR_HEIGHT } from '@/ui/theme';

/**
 * Interrupteur de démonstration : voir l’app comme un invité (sans compte) ou
 * comme un adhérent. Visible en développement seulement ; en production, c’est
 * la session qui décide.
 */
export function ProfileSwitch() {
  const insets = useSafeAreaInsets();
  const statut = useSession((s) => s.member.statut);
  const setStatut = useSession((s) => s.setStatut);
  if (!__DEV__) return null;
  const options = [
    { id: 'invite', label: 'INVITÉ' },
    { id: 'actif', label: 'ADHÉRENT' },
  ] as const;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + space[3] }]}>
      <View style={styles.pill}>
        {options.map((o) => {
          const on = o.id === 'invite' ? statut === 'invite' : statut !== 'invite';
          return (
            <Pressable key={o.id} onPress={() => setStatut(o.id)} style={[styles.btn, on && styles.btnOn]} accessibilityRole="button" accessibilityLabel={`Voir comme ${o.label.toLowerCase()}`}>
              <Mono size="micro" tone={on ? 'inverse' : 'muted'} style={on ? styles.txtOn : undefined}>
                {o.label}
              </Mono>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: space[3], zIndex: 50 },
  pill: { flexDirection: 'row', backgroundColor: 'rgba(8,8,8,0.78)', borderRadius: radius.pill, borderWidth: 1, borderColor: ink[400], padding: 3, gap: 2 },
  btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  btnOn: { backgroundColor: color.text },
  txtOn: { color: color.textInverse },
});
