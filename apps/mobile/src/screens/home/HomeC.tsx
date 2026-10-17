import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLUBS, clubById } from '@/data/clubs';
import { ageOf } from '@/data/member';
import { NEWS, type NewsItem } from '@/data/news';
import { heure, momentDuJour, nextSession } from '@/features/planning/model';
import { dateLineFromIso, formatIn, moisCourt } from '@/features/time';
import { useSession } from '@/state/session';
import { LowerThird } from '@/ui/LowerThird';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, MAX_CONTENT_WIDTH, radius, skew, space, stroke, TAB_BAR_HEIGHT, whiteAlpha } from '@/ui/theme';

/**
 * Direction C — « L’Entrée d’arène » : le programme est la structure.
 * Des affiches pleine largeur, photo réelle traitée charte, index aux coins ;
 * le badge est la première affiche, l’entrée. Le rouge est la barre du lower-third.
 */
const KIND_LABEL: Record<NewsItem['kind'], string> = {
  evenement: 'ÉVÉNEMENT',
  stage: 'STAGE',
  club: 'LE CLUB',
  resultat: 'RÉSULTATS',
  promo: 'OFFRE',
};

export function HomeC() {
  const member = useSession((s) => s.member);
  const club = clubById(member.clubPrincipal);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const posterH = Math.round(colWidth * 1.1);
  const now = new Date();
  const next = nextSession(member.clubPrincipal, now, ageOf(member, now));
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const [clubIndex, setClubIndex] = useState(0);

  return (
    <View style={styles.root}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.column, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space[8] }]}>
        <View style={[styles.programme, { paddingTop: insets.top + space[4] }]}>
          <Body size="caption" eyebrow tone="muted">
            Programme
          </Body>
          <Display size="display3" tight>
            {momentDuJour(now)}, {member.prenom}
          </Display>
        </View>

        <Poster
          index={0}
          scrollY={scrollY}
          height={posterH}
          photo={club.photo}
          cornerLeft="ENTRÉE"
          cornerRight={club.court.toUpperCase()}
          title="Mon badge"
          meta={`JETON VALIDE · ${club.court.toUpperCase()}`}
          sub={`${member.prenom} ${member.nom} · Badge nº ${member.badge.numero}`}
          onPress={() => router.push('/badge')}
        />

        {next ? (
          <Poster
            index={1}
            scrollY={scrollY}
            height={Math.round(posterH * 0.78)}
            photo={require('@/assets/photos/ring-gants.jpg')}
            cornerLeft="PROCHAINE SÉANCE"
            cornerRight={`${next.jourLabel.toUpperCase()} · ${heure(next.slot.debut).toUpperCase()}`}
            title={next.activite.libelle}
            meta={`${club.court.toUpperCase()} · DANS ${formatIn(next.dansMinutes).toUpperCase()} · ${next.slot.fin - next.slot.debut} MIN${next.activite.niveau ? ' · ' + next.activite.niveau.toUpperCase() : ''}`}
            bar={color.accent}
            onPress={() => router.push('/planning')}
          />
        ) : null}

        {NEWS.map((n, i) => (
          <Poster
            key={n.id}
            index={i + 2}
            scrollY={scrollY}
            height={Math.round(posterH * 0.9)}
            photo={n.photo}
            cornerLeft={`Nº ${String(NEWS.length - i).padStart(3, '0')}`}
            cornerRight={moisCourt(n.date)}
            title={n.titre}
            meta={`${KIND_LABEL[n.kind]}${n.club ? ' · ' + clubById(n.club).court.toUpperCase() : ''} · ${dateLineFromIso(n.date)}`}
            sub={n.accroche}
          />
        ))}

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
          snapToInterval={colWidth * 0.72 + space[3]}
          decelerationRate="fast"
          contentContainerStyle={styles.salles}
          onScroll={(e) => setClubIndex(Math.min(CLUBS.length - 1, Math.round(e.nativeEvent.contentOffset.x / (colWidth * 0.72 + space[3]))))}
          scrollEventThrottle={32}>
          {CLUBS.map((c, i) => (
            <Tap key={c.id} style={{ width: colWidth * 0.72 }} accessibilityRole="button" accessibilityLabel={c.nom}>
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
                </View>
              </Photo>
            </Tap>
          ))}
        </ScrollView>
      </Animated.ScrollView>
    </View>
  );
}

type PosterProps = {
  index: number;
  scrollY: SharedValue<number>;
  height: number;
  photo: NewsItem['photo'];
  cornerLeft: string;
  cornerRight: string;
  title: string;
  meta: string;
  sub?: string;
  bar?: string;
  onPress?: () => void;
};

function Poster({ index, scrollY, height, photo, cornerLeft, cornerRight, title, meta, sub, bar = color.accent, onPress }: PosterProps) {
  const [top, setTop] = useState(0);
  const parallax = useAnimatedStyle(() => {
    const delta = (scrollY.value - top) * 0.08;
    const clamped = Math.max(-8, Math.min(8, delta));
    return { transform: [{ translateY: clamped }, { scale: 1.06 }] };
  });
  return (
    <Animated.View entering={FadeIn.duration(duration.slow).delay(Math.min(index, 3) * 120)} onLayout={(e) => setTop(e.nativeEvent.layout.y)} style={styles.posterWrap}>
      <Tap onPress={onPress} scaleTo={0.985} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={title}>
        <View style={[styles.poster, { height }]}>
          <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
            <Photo source={photo} style={StyleSheet.absoluteFill} darken={0.42} scrim={0.62} scrimTop={0.22} />
          </Animated.View>
          <View style={styles.corners}>
            <Mono size="micro" tone="text">
              {cornerLeft}
            </Mono>
            <Mono size="micro" tone="text">
              {cornerRight}
            </Mono>
          </View>
          <View style={styles.posterBottom}>
            <View style={{ transform: [{ skewX: `${skew.momentum}deg` }] }}>
              <Display size="display2" tight numberOfLines={2}>
                {title}
              </Display>
            </View>
            {sub ? (
              <Body size="bodySmall" tone="muted" numberOfLines={2}>
                {sub}
              </Body>
            ) : null}
            <LowerThird meta={meta} bar={bar} compact style={styles.lower} />
          </View>
        </View>
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  programme: { paddingHorizontal: space[4], gap: space[1], marginBottom: space[4] },
  posterWrap: { marginBottom: space[3] },
  poster: { marginHorizontal: space[4], borderRadius: radius.sm, overflow: 'hidden', backgroundColor: ink[100], justifyContent: 'space-between' },
  corners: { flexDirection: 'row', justifyContent: 'space-between', padding: space[4] },
  posterBottom: { padding: space[4], gap: space[2] },
  lower: { marginTop: space[2] },
  sallesHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: space[4], marginTop: space[6], marginBottom: space[3] },
  rule: { alignItems: 'center', gap: 4 },
  ruleLine: { width: stroke.hair, height: 18, backgroundColor: whiteAlpha[20] },
  salles: { paddingHorizontal: space[4], gap: space[3] },
  salle: { height: 200, borderRadius: radius.sm, justifyContent: 'space-between' },
  salleTop: { padding: space[3] },
  salleBottom: { padding: space[3], gap: 2 },
});
