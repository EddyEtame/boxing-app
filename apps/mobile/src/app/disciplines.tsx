import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { clubById } from '@/data/clubs';
import { DISCIPLINES } from '@/data/disciplines';
import { clubsProposant, familleColor } from '@/features/planning/model';
import { IconClose } from '@/ui/icons';
import { LowerThird } from '@/ui/LowerThird';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, radius, space, whiteAlpha } from '@/ui/theme';

/**
 * Les disciplines (CDC §3A). Les clubs qui proposent chacune se lisent dans le
 * planning réel : jamais une liste écrite à la main.
 */
export default function DisciplinesScreen() {
  return (
    <Page padded={false}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body size="caption" eyebrow tone="muted">
            Les disciplines
          </Body>
          <Display size="display3" tight>
            Il y a une place pour toi
          </Display>
        </View>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer">
          <IconClose size={20} color={color.text} />
        </Pressable>
      </View>
      {DISCIPLINES.map((d, i) => {
        const clubs = clubsProposant(d.famille);
        const tint = familleColor(d.famille);
        return (
          <Tap key={d.famille} onPress={() => router.push('/planning')} style={styles.card} accessibilityRole="button" accessibilityLabel={d.nom}>
            <Photo source={d.photo} style={styles.photo} darken={0.38} scrim={0.7} scrimTop={0.2}>
              <View style={styles.corners}>
                <Mono size="micro" tone="text">
                  {String(i + 1).padStart(2, '0')} — {d.pourQui.toUpperCase()}
                </Mono>
              </View>
              <View style={styles.bottom}>
                <Display size="display3" tight numberOfLines={2}>
                  {d.nom}
                </Display>
                <Body size="bodySmall" tone="muted" numberOfLines={3}>
                  {d.accroche}
                </Body>
                <LowerThird meta={clubs.length ? clubs.map((c) => clubById(c).court.toUpperCase()).join(' · ') : 'SUR DEMANDE'} bar={tint} compact style={styles.lower} />
              </View>
            </Photo>
          </Tap>
        );
      })}
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingHorizontal: space[4], marginBottom: space[3] },
  close: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: whiteAlpha[8], alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: space[4], marginBottom: space[3] },
  photo: { height: 300, borderRadius: radius.sm, justifyContent: 'space-between' },
  corners: { padding: space[4] },
  bottom: { padding: space[4], gap: space[1] },
  lower: { marginTop: space[2] },
});
