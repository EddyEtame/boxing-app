import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { COMBATS_PHOTO } from '@/data/combats';
import { useCombats } from '@/features/combats/useCombats';
import { dateLineFromIso } from '@/features/time';
import { IconArrow, IconClose } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, ink, radius, space, stroke } from '@/ui/theme';

/**
 * Actualité des combats, boxe et MMA (CDC §13). Rubrique distincte, accessible à
 * tous. Chaque entrée dit sa source et sa date ; rien n’est réécrit par l’app.
 */
export default function CombatsScreen() {
  const { items, origine, luA } = useCombats();
  return (
    <Page padded={false} bleedTop>
      <Photo source={COMBATS_PHOTO} style={styles.hero} darken={0.5} scrim={0.75} scrimTop={0.3}>
        <View style={styles.heroTop}>
          <Mono size="micro" tone="text">
            BOXE · MMA
          </Mono>
          <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer">
            <IconClose size={20} color={color.text} />
          </Pressable>
        </View>
        <View style={styles.heroBottom}>
          <Body size="caption" eyebrow tone="muted">
            Actualité des combats
          </Body>
          <Display size="display2" tight>
            Ce qui se passe sur les rings
          </Display>
          <Mono size="micro">
            {origine === 'direct' ? `FLUX EN DIRECT · ACTU-MMA.COM · LU À ${luA ? luA.toTimeString().slice(0, 5) : ''}` : 'DERNIER RELEVÉ EMBARQUÉ · ACTU-MMA.COM'}
          </Mono>
        </View>
      </Photo>

      <View style={styles.list}>
        {items.map((c, i) => (
          <Tap key={c.lien} onPress={() => void Linking.openURL(c.lien)} style={styles.row} accessibilityRole="link" accessibilityLabel={c.titre}>
            <View style={styles.rowIndex}>
              <Mono size="micro">Nº {String(items.length - i).padStart(3, '0')}</Mono>
              <Mono size="micro" tone="dim">
                {c.date ? dateLineFromIso(c.date) : ''}
              </Mono>
            </View>
            <View style={styles.rowBody}>
              <Body weight="semi">{c.titre}</Body>
              {c.resume ? (
                <Body size="caption" tone="muted" numberOfLines={3}>
                  {c.resume}
                </Body>
              ) : null}
              <Mono size="micro" tone="dim">
                {c.source.toUpperCase()}
              </Mono>
            </View>
            <IconArrow size={18} color={color.textDim} />
          </Tap>
        ))}
        <Body size="caption" tone="dim" style={styles.note}>
          La boxe anglaise rejoint ce flux avec l’extension de la rédaction automatique. Les dates, résultats et diffuseurs sont vérifiés sur source avant publication.
        </Body>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { height: 340, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4], paddingTop: space[7] },
  heroBottom: { padding: space[4], gap: space[1] },
  close: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: 'rgba(8,8,8,0.6)', alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  rowIndex: { width: 84, gap: 2 },
  rowBody: { flex: 1, gap: 3 },
  note: { marginTop: space[4] },
});
