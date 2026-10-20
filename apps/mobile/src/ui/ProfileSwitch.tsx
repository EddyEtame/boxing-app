import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/state/session';
import { Mono } from '@/ui/Text';
import { radius, space, TAB_BAR_HEIGHT, useTheme } from '@/ui/theme';

/**
 * Interrupteur de démonstration : voir l'app comme un invité (sans compte) ou
 * comme un adhérent. Visible en développement seulement ; en production, c'est
 * la session qui décide.
 */
export function ProfileSwitch() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const statut = useSession((s) => s.member.statut);
  const setStatut = useSession((s) => s.setStatut);
  if (!__DEV__) return null;
  const options = [
    { id: 'invite', label: 'INVITÉ' },
    { id: 'actif', label: 'ADHÉRENT' },
  ] as const;
  const bottom = (insets.bottom > 0 ? Math.max(insets.bottom - 6, 10) : 14) + TAB_BAR_HEIGHT + space[3];
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={[styles.pill, { backgroundColor: t.bgElevated, borderColor: t.lineStrong, boxShadow: t.shadowFloat }]}>
        {options.map((o) => {
          const on = o.id === 'invite' ? statut === 'invite' : statut !== 'invite';
          return (
            <Pressable key={o.id} onPress={() => setStatut(o.id)} style={[styles.btn, on && { backgroundColor: t.primary }]} accessibilityRole="button" accessibilityLabel={`Voir comme ${o.label.toLowerCase()}`}>
              <Mono size="micro" tone={on ? 'onPrimary' : 'muted'}>
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
  wrap: { position: 'absolute', right: space[4], zIndex: 50 },
  pill: { flexDirection: 'row', borderRadius: radius.pill, borderWidth: 1, padding: 3, gap: 2, opacity: 0.92 },
  btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
});
