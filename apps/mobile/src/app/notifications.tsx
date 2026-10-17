import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { IconClose } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Body, Display, Mono } from '@/ui/Text';
import { color, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

/**
 * Préférences de notifications (CDC §14). Les messages de la direction sont
 * essentiels et ne se coupent pas ; tout le reste se règle.
 */
type Pref = { id: string; label: string; sub: string; essential?: boolean };

const PREFS: Pref[] = [
  { id: 'direction', label: 'Messages de la direction', sub: 'Réponses à tes demandes, informations importantes', essential: true },
  { id: 'coach', label: 'Messages des coachs', sub: 'Un coach ou un membre du staff t’écrit' },
  { id: 'events', label: 'Événements et galas', sub: 'Annonces, résultats, billetterie' },
  { id: 'promos', label: 'Offres', sub: 'Promotions ponctuelles du club' },
  { id: 'videos', label: 'Nouvelles vidéos', sub: 'Tutoriels et séances des coachs' },
  { id: 'trainings', label: 'Entraînements entre membres', sub: 'Rappels, modifications, annulations' },
  { id: 'billing', label: 'Échéances', sub: 'Prélèvement à venir, impayé à régulariser' },
  { id: 'clubs', label: 'Mon club', sub: 'Fermeture exceptionnelle, planning modifié' },
];

export default function NotificationsScreen() {
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(PREFS.map((p) => [p.id, true])));
  return (
    <Page contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body size="caption" eyebrow tone="muted">
            Notifications
          </Body>
          <Display size="display3" tight>
            Ce qui te prévient
          </Display>
        </View>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer">
          <IconClose size={20} color={color.text} />
        </Pressable>
      </View>
      {PREFS.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semi">{p.label}</Body>
            <Body size="caption" tone="muted">
              {p.sub}
            </Body>
            {p.essential ? <Mono size="micro">ESSENTIEL · TOUJOURS ACTIF</Mono> : null}
          </View>
          <Switch
            value={p.essential ? true : on[p.id]}
            disabled={p.essential}
            onValueChange={(v) => setOn((s) => ({ ...s, [p.id]: v }))}
            trackColor={{ false: ink[300], true: color.text }}
            thumbColor={p.essential || on[p.id] ? ink[0] : ink[700]}
            {...(Platform.OS === 'web' ? ({ activeTrackColor: color.text, activeThumbColor: ink[0] } as object) : null)}
            accessibilityLabel={p.label}
          />
        </View>
      ))}
      <Body size="caption" tone="dim" style={styles.note}>
        Android demande l’autorisation à la première notification ; iOS avant. Tu peux tout changer ici, à tout moment.
      </Body>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 0 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], marginBottom: space[4] },
  close: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: whiteAlpha[8], alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  note: { marginTop: space[4] },
});
