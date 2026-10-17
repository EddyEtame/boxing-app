import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLUBS, clubById } from '@/data/clubs';
import { NEWS, OFFRES, type NewsItem } from '@/data/news';
import { dateLineFromIso, moisCourt } from '@/features/time';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, MAX_CONTENT_WIDTH, radius, space, stroke, TAB_BAR_HEIGHT, whiteAlpha } from '@/ui/theme';

import { Poster } from './parts';

/**
 * L’accueil de l’invité : la vitrine. Pas de compte, donc le programme de la
 * soirée : les offres, les salles, ce qui se passe. Tout mène à la porte.
 */
const KIND_LABEL: Record<NewsItem['kind'], string> = {
  evenement: 'ÉVÉNEMENT',
  stage: 'STAGE',
  club: 'LE CLUB',
  resultat: 'RÉSULTATS',
  promo: 'OFFRE',
};

export function HomeInvite() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const posterH = Math.round(colWidth * 1.05);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const [clubIndex, setClubIndex] = useState(0);
  const salleW = colWidth * 0.72;

  return (
    <View style={styles.root}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.column, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space[8] }]}>
        <View style={[styles.head, { paddingTop: insets.top + space[4] }]}>
          <Body size="caption" eyebrow tone="muted">
            Boxing Center · cinq clubs
          </Body>
          <Display size="display2" tight>
            Entre. Essaie. Reviens.
          </Display>
          <Body tone="muted">Boxe anglaise, pieds-poings, MMA, grappling, cross-training. Tous niveaux, dès 3 ans. Un seul abonnement pour les cinq salles.</Body>
        </View>

        {OFFRES.map((o, i) => (
          <Poster key={o.id} index={i} scrollY={scrollY} height={Math.round(posterH * (i === 0 ? 1 : 0.8))} photo={o.photo} cornerLeft={`OFFRE ${String(i + 1).padStart(2, '0')}`} cornerRight="BOUTIQUE" title={o.titre} meta={o.meta} sub={o.accroche} onPress={() => void Linking.openURL(o.lien)} />
        ))}

        <View style={styles.cta}>
          <Tap onPress={() => router.push('/connexion')} style={styles.ctaMain} accessibilityRole="button" accessibilityLabel="Créer mon compte">
            <Body weight="bold" tone="inverse">
              Créer mon compte
            </Body>
          </Tap>
          <Tap onPress={() => router.push('/connexion')} style={styles.ctaSecond} accessibilityRole="button" accessibilityLabel="Se connecter">
            <Body weight="semi">Déjà adhérent ? Se connecter</Body>
          </Tap>
          <Mono size="micro" style={styles.ctaNote}>
            TON BADGE, TON ABONNEMENT ET TES SÉANCES T’ATTENDENT DERRIÈRE
          </Mono>
        </View>

        <View style={styles.sallesHead}>
          <Body size="caption" eyebrow tone="muted">
            Les salles
          </Body>
          <View style={styles.rule}>
            <Mono size="micro" tone="text">
              {clubIndex + 1}
            </Mono>
            <View style={styles.ruleLine} />
            <Mono size="micro">{CLUBS.length}</Mono>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={salleW + space[3]}
          decelerationRate="fast"
          contentContainerStyle={styles.salles}
          onScroll={(e) => setClubIndex(Math.min(CLUBS.length - 1, Math.round(e.nativeEvent.contentOffset.x / (salleW + space[3]))))}
          scrollEventThrottle={32}>
          {CLUBS.map((c, i) => (
            <Tap key={c.id} style={{ width: salleW }} onPress={() => router.push('/planning')} accessibilityRole="button" accessibilityLabel={c.nom}>
              <Photo source={c.photo} style={styles.salle} darken={0.4} scrim={0.7}>
                <View style={styles.salleTop}>
                  <Mono size="micro" tone="text">
                    {String(i + 1).padStart(2, '0')} — {c.court.toUpperCase()}
                  </Mono>
                </View>
                <View style={styles.salleBottom}>
                  <Display size="display4" tight>
                    {c.court}
                  </Display>
                  <Body size="caption" tone="muted" numberOfLines={1}>
                    {c.rue}, {c.ville}
                  </Body>
                  <Mono size="micro">LUN–SAM 10H–21H30</Mono>
                </View>
              </Photo>
            </Tap>
          ))}
        </ScrollView>

        <View style={styles.newsHead}>
          <Body size="caption" eyebrow tone="muted">
            En ce moment
          </Body>
        </View>
        {NEWS.filter((n) => n.publique).map((n, i) => (
          <Poster
            key={n.id}
            index={i + OFFRES.length}
            scrollY={scrollY}
            height={Math.round(posterH * 0.85)}
            photo={n.photo}
            cornerLeft={`Nº ${String(NEWS.length - i).padStart(3, '0')}`}
            cornerRight={moisCourt(n.date)}
            title={n.titre}
            meta={`${KIND_LABEL[n.kind]}${n.club ? ' · ' + clubById(n.club).court.toUpperCase() : ''} · ${dateLineFromIso(n.date)}`}
            sub={n.accroche}
            onPress={n.lien ? () => void Linking.openURL(n.lien!) : undefined}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  head: { paddingHorizontal: space[4], gap: space[2], marginBottom: space[4] },
  cta: { marginHorizontal: space[4], marginTop: space[2], marginBottom: space[4], gap: space[2] },
  ctaMain: { backgroundColor: color.text, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center' },
  ctaSecond: { borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', borderWidth: stroke.thin, borderColor: whiteAlpha[12] },
  ctaNote: { textAlign: 'center', marginTop: space[1] },
  sallesHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: space[4], marginTop: space[4], marginBottom: space[3] },
  rule: { alignItems: 'center', gap: 4 },
  ruleLine: { width: stroke.hair, height: 18, backgroundColor: whiteAlpha[20] },
  salles: { paddingHorizontal: space[4], gap: space[3] },
  salle: { height: 210, borderRadius: radius.sm, justifyContent: 'space-between' },
  salleTop: { padding: space[3] },
  salleBottom: { padding: space[3], gap: 2 },
  newsHead: { paddingHorizontal: space[4], marginTop: space[6], marginBottom: space[3] },
});
