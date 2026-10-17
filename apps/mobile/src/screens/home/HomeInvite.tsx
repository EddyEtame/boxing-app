import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLUBS, clubById } from '@/data/clubs';
import { PERSONNES } from '@/data/coachs';
import { DISCIPLINES } from '@/data/disciplines';
import { NEWS, OFFRES, type NewsItem } from '@/data/news';
import { useCombats } from '@/features/combats/useCombats';
import { clubsProposant } from '@/features/planning/model';
import { dateLineFromIso, moisCourt } from '@/features/time';
import { IconArrow } from '@/ui/icons';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, ink, MAX_CONTENT_WIDTH, radius, space, stroke, TAB_BAR_HEIGHT, whiteAlpha } from '@/ui/theme';

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
  const discW = Math.round(colWidth * 0.46);
  const portraitW = Math.round(colWidth * 0.42);
  const combats = useCombats();
  const portraits = PERSONNES.filter((p) => p.photo).slice(0, 8);

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

        <StripHead label="Les disciplines" action="Les huit" onPress={() => router.push('/disciplines')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={discW + space[3]} decelerationRate="fast" contentContainerStyle={styles.strip}>
          {DISCIPLINES.map((d, i) => {
            const n = clubsProposant(d.famille).length;
            return (
              <Tap key={d.famille} style={{ width: discW }} onPress={() => router.push('/disciplines')} accessibilityRole="button" accessibilityLabel={d.nom}>
                <Photo source={d.photo} style={styles.disc} darken={0.42} scrim={0.78}>
                  <View style={styles.cardTop}>
                    <Mono size="micro" tone="text">
                      {String(i + 1).padStart(2, '0')}
                    </Mono>
                  </View>
                  <View style={styles.cardBottom}>
                    <Display size="display5" tight numberOfLines={2}>
                      {d.nom}
                    </Display>
                    <Mono size="micro">{n ? `${n} ${n > 1 ? 'CLUBS' : 'CLUB'}` : 'SUR DEMANDE'}</Mono>
                  </View>
                </Photo>
              </Tap>
            );
          })}
        </ScrollView>

        <StripHead label="Coachs et boxeurs" action={`${PERSONNES.length} portraits`} onPress={() => router.push('/equipe')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={portraitW + space[3]} decelerationRate="fast" contentContainerStyle={styles.strip}>
          {portraits.map((p) => (
            <Tap key={p.id} style={{ width: portraitW }} onPress={() => router.push('/equipe')} accessibilityRole="button" accessibilityLabel={p.nom}>
              <Photo source={p.photo!} style={styles.portrait} darken={0.18} scrim={0.62} vignette={false} contentPosition="top">
                <View style={styles.cardBottom}>
                  {p.tag ? (
                    <Mono size="micro" tone="text">
                      {p.tag.toUpperCase()}
                    </Mono>
                  ) : null}
                  <Display size="display5" tight numberOfLines={1}>
                    {p.nom}
                  </Display>
                  <Body size="caption" tone="muted" numberOfLines={2}>
                    {p.role}
                  </Body>
                  <Mono size="micro">{p.clubs.map((c) => clubById(c).court.toUpperCase()).join(' · ')}</Mono>
                </View>
              </Photo>
            </Tap>
          ))}
        </ScrollView>

        <StripHead label="Actualité des combats" action={combats.origine === 'direct' ? 'En direct' : 'Dernier relevé'} onPress={() => router.push('/combats')} />
        <View style={styles.combats}>
          {combats.items.slice(0, 3).map((c) => (
            <Tap key={c.lien} onPress={() => router.push('/combats')} style={styles.combatRow} accessibilityRole="button" accessibilityLabel={c.titre}>
              <Mono size="micro" tone="dim" style={styles.combatDate}>
                {c.date ? dateLineFromIso(c.date) : ''}
              </Mono>
              <Body size="bodySmall" weight="semi" style={{ flex: 1 }} numberOfLines={2}>
                {c.titre}
              </Body>
              <IconArrow size={16} color={color.textDim} />
            </Tap>
          ))}
          <Mono size="micro" tone="dim" style={styles.combatSource}>
            BOXE · MMA · SOURCE ACTU-MMA.COM
          </Mono>
        </View>

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

function StripHead({ label, action, onPress }: { label: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.stripHead}>
      <Body size="caption" eyebrow tone="muted" style={{ flex: 1 }}>
        {label}
      </Body>
      <Tap onPress={onPress} haptic="selection" style={styles.stripAction} accessibilityRole="button" accessibilityLabel={`${label} : tout voir`}>
        <Mono size="micro" tone="text">
          {action.toUpperCase()}
        </Mono>
        <IconArrow size={14} color={color.text} />
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  stripHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], marginTop: space[6], marginBottom: space[3] },
  stripAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strip: { paddingHorizontal: space[4], gap: space[3] },
  disc: { height: 200, borderRadius: radius.sm, justifyContent: 'space-between' },
  portrait: { height: 236, borderRadius: radius.sm, justifyContent: 'flex-end' },
  cardTop: { padding: space[3] },
  cardBottom: { padding: space[3], gap: 2 },
  combats: { paddingHorizontal: space[4] },
  combatRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  combatDate: { width: 84 },
  combatSource: { marginTop: space[2] },
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
