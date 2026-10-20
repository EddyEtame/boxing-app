import { Image } from 'expo-image';
import { useEffect, useState, type ComponentType } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import type { Club } from '@/data/clubs';
import type { Personne } from '@/data/coachs';
import type { NewsItem } from '@/data/news';
import type { NextSession } from '@/features/planning/model';
import { heure } from '@/features/planning/model';
import type { Stats } from '@/features/stats/model';
import { duree, relativeDay, shortDay } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import type { IconProps } from '@/ui/icons';
import { IconChevron } from '@/ui/icons';
import { Chip, IconTile, LiveDot } from '@/ui/kit';
import { LowerThird } from '@/ui/LowerThird';
import { usePageScrollY } from '@/ui/Page';
import { Photo, type PhotoSource } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Heading, Mono, OnPhotoContext, type Tone } from '@/ui/Text';
import { duration, easing, GUTTER, makeStyles, radius, skew, space, spring, stagger, stroke, useTheme, type ClubId } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/* ------------------------------------------------------------------ */
/* Les clubs choisis                                                     */
/* ------------------------------------------------------------------ */

export function ClubChips({ clubs, actif, onPick, label }: { clubs: Club[]; actif: ClubId; onPick: (c: ClubId) => void; label: string }) {
  const s = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chips} accessibilityLabel={label}>
      {clubs.map((c) => (
        <Chip key={c.id} label={c.court} selected={c.id === actif} onPress={() => onPick(c.id)} />
      ))}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* La prochaine séance : la plaque photo du club                         */
/* ------------------------------------------------------------------ */

export function NextSessionCard({ club, next, ouvert, onPress }: { club: Club; next: NextSession | null; ouvert: boolean; onPress: () => void }) {
  const s = useStyles();
  const T = useT();
  const lang = useLocale();
  return (
    <Tap onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={next ? `${next.activite.libelle}, ${heure(next.slot.debut)}` : club.court}>
      <Photo source={club.photo} style={s.plate} darken={0.42} scrim={0.78} scrimTop={0.3}>
        <View style={s.plateTop}>
          <Body size="bodySmall" weight="bold">
            {club.court}
          </Body>
          <View style={s.openPill}>
            <View style={[s.openDot, { backgroundColor: ouvert ? '#3DDC84' : 'rgba(245,245,245,0.5)' }]} />
            <Body size="caption" weight="bold">
              {ouvert ? T('home.openUntil', { h: heure(club.ouverture.fin) }) : T('home.closed')}
            </Body>
          </View>
        </View>
        <View style={s.plateBottom}>
          <Body size="caption" weight="bold" eyebrow tone="muted">
            {T('home.nextSession')}
          </Body>
          {next ? (
            <>
              <View style={s.nextRow}>
                <Display size="display1" tabular upper={false} tight style={s.nextHour}>
                  {heure(next.slot.debut)}
                </Display>
                <View style={s.nextText}>
                  <Heading level="card" numberOfLines={2}>
                    {next.activite.libelle}
                  </Heading>
                  <Body size="caption" tone="muted" numberOfLines={1}>
                    {relativeDay(next.offset, next.jour, lang)} · {next.slot.fin - next.slot.debut} min
                    {next.activite.public ? ` · ${next.activite.public}` : ''}
                  </Body>
                </View>
              </View>
              <View style={s.countdown}>
                <LiveDot size={8} color="#FF4D5E" />
                <Body size="bodySmall" weight="bold" style={s.countdownText}>
                  {T('home.inTime', { t: duree(next.dansMinutes, lang) })}
                </Body>
              </View>
            </>
          ) : (
            <Body tone="muted">{T('home.noSession')}</Body>
          )}
        </View>
      </Photo>
    </Tap>
  );
}

/* ------------------------------------------------------------------ */
/* Les tuiles vivantes (prototype du collègue, en mieux : un chiffre vrai) */
/* ------------------------------------------------------------------ */

export function QuickTile({ icon, title, sub, subTone = 'muted', tone = 'neutral', onPress, live, index = 0 }: { icon: ComponentType<IconProps>; title: string; sub: string; subTone?: Tone; tone?: 'neutral' | 'accent' | 'positive'; onPress: () => void; live?: boolean; index?: number }) {
  const s = useStyles();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(Math.min(index, stagger.max) * stagger.step, withTiming(1, { duration: 460, easing: ARRIVE }));
  }, [index, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.94 + p.value * 0.06 }] }));
  return (
    <Animated.View style={[s.tileWrap, style]}>
      <Tap onPress={onPress} scaleTo={0.96} haptic="light" accessibilityRole="button" accessibilityLabel={`${title}, ${sub}`} style={s.tile}>
        <View style={s.tileHead}>
          <IconTile icon={icon} tone={tone} size={42} />
          {live ? <LiveDot size={8} /> : null}
        </View>
        <Heading level="card" numberOfLines={1}>
          {title}
        </Heading>
        <Body size="caption" weight="semi" tone={subTone} numberOfLines={2} tabular>
          {sub}
        </Body>
      </Tap>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Les actualités en lignes                                               */
/* ------------------------------------------------------------------ */

export function NewsRow({ item, onPress, last }: { item: NewsItem; onPress?: () => void; last?: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  return (
    <Tap onPress={onPress} disabled={!onPress} scaleTo={0.985} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={item.titre} style={[s.news, !last && s.newsLine]}>
      <Image source={item.photo} style={s.newsThumb} contentFit="cover" cachePolicy="memory-disk" transition={duration.cross} />
      <View style={s.newsBody}>
        <Body weight="bold" numberOfLines={2}>
          {item.titre}
        </Body>
        <Body size="caption" tone="muted" numberOfLines={2}>
          {item.accroche}
        </Body>
        <Body size="caption" weight="semi" tone="dim">
          {shortDay(item.date, lang)}
        </Body>
      </View>
      {onPress ? <IconChevron size={18} color={t.textDim} /> : null}
    </Tap>
  );
}

/* ------------------------------------------------------------------ */
/* Les visages des coachs                                                 */
/* ------------------------------------------------------------------ */

export function Faces({ people, max = 4 }: { people: Personne[]; max?: number }) {
  const s = useStyles();
  return (
    <View style={s.faces}>
      {people.slice(0, max).map((p, i) => (
        <View key={p.id} style={[s.face, i > 0 && s.faceOverlap]}>
          {p.photo ? (
            <Image source={p.photo} style={s.faceImg} contentFit="cover" contentPosition="top" cachePolicy="memory-disk" />
          ) : (
            <Body size="caption" weight="bold">
              {p.initiales}
            </Body>
          )}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Statistiques : les semaines et les clubs                               */
/* ------------------------------------------------------------------ */

export const CLUB_HUE: Record<ClubId, string> = {
  minimes: '#2F6BFF',
  'saint-cyprien': '#8B5CF6',
  'etats-unis': '#10B981',
  ramonville: '#D946EF',
  portet: '#F97316',
};

export function WeekBars({ stats, weekLabel }: { stats: Stats; weekLabel: (start: string) => string }) {
  const s = useStyles();
  const [week, setWeek] = useState(stats.weeks.length - 1);
  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.count));
  return (
    <View>
      <View style={s.bars}>
        {stats.weeks.map((w, i) => (
          <Bar key={w.start} index={i} value={w.count} max={maxWeek} selected={i === week} onPress={() => setWeek(i)} label={weekLabel(w.start)} />
        ))}
      </View>
      <View style={s.barsCaption}>
        <Body size="caption" weight="semi" tone="muted">
          {weekLabel(stats.weeks[week].start)}
        </Body>
        <Body size="caption" weight="bold" tabular>
          {stats.weeks[week].count}
        </Body>
      </View>
    </View>
  );
}

function Bar({ index, value, max, selected, onPress, label }: { index: number; value: number; max: number; selected: boolean; onPress: () => void; label: string }) {
  const s = useStyles();
  const t = useTheme();
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(index * stagger.step, withSpring(Math.max(0.04, value / max), spring.settle));
  }, [value, max, index, h]);
  const style = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));
  return (
    <Tap onPress={onPress} haptic="selection" scaleTo={0.94} style={s.barHit} accessibilityRole="button" accessibilityLabel={`${label} : ${value}`}>
      <View style={s.barTrack}>
        <Animated.View style={[s.bar, { backgroundColor: selected ? t.accent : t.lineStrong }, style]} />
      </View>
    </Tap>
  );
}

/* ------------------------------------------------------------------ */
/* Le tampon du carnet                                                    */
/* ------------------------------------------------------------------ */

/** Le tampon : Bebas incliné, posé une fois (le seul rebond de l'app : l'encre). */
export function Stamp({ label, ink: red, delay = 0 }: { label: string; ink?: boolean; delay?: number }) {
  const t = useTheme();
  const sc = useSharedValue(red ? 1.6 : 1);
  const o = useSharedValue(red ? 0 : 1);
  useEffect(() => {
    if (!red) return;
    sc.value = withDelay(delay, withTiming(1, { duration: duration.cross }));
    o.value = withDelay(delay, withTiming(1, { duration: duration.jab }));
  }, [red, delay, sc, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ rotate: '-5deg' }, { scale: sc.value }] }));
  const tint = red ? t.accentText : t.textDim;
  return (
    <Animated.View style={[styles.stamp, { borderColor: tint }, style]}>
      <Display size="display5" tight style={{ color: tint, fontSize: 15, lineHeight: 15 }}>
        {label}
      </Display>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* L'affiche (vitrine de l'invité)                                        */
/* ------------------------------------------------------------------ */

type PosterProps = {
  index: number;
  scrollY?: SharedValue<number>;
  height: number;
  width?: number;
  photo: PhotoSource;
  cornerLeft: string;
  cornerRight?: string;
  title: string;
  meta: string;
  sub?: string;
  bar?: string;
  onPress?: () => void;
};

export function Poster({ index, scrollY, height, width, photo, cornerLeft, cornerRight, title, meta, sub, bar, onPress }: PosterProps) {
  const s = useStyles();
  const pageY = usePageScrollY();
  const fallback = useSharedValue(0);
  const y = scrollY ?? pageY ?? fallback;
  const [top, setTop] = useState(0);
  const parallax = useAnimatedStyle(() => {
    const delta = (y.value - top) * 0.06;
    return { transform: [{ translateY: Math.max(-10, Math.min(10, delta)) }, { scale: 1.08 }] };
  });
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(Math.min(index, 3) * 110, withTiming(1, { duration: 620, easing: ARRIVE }));
  }, [index, p]);
  const enter = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 18 }] }));
  return (
    <Animated.View onLayout={(e) => setTop(e.nativeEvent.layout.y)} style={[width ? { width } : null, enter]}>
      <Tap onPress={onPress} scaleTo={0.985} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={title}>
        <View style={[s.poster, { height }]}>
          <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
            <Photo source={photo} style={StyleSheet.absoluteFill} darken={0.4} scrim={0.7} scrimTop={0.25} />
          </Animated.View>
          <OnPhotoContext.Provider value>
            <View style={StyleSheet.absoluteFill}>
            <View style={s.corners}>
              <Body size="caption" weight="bold">
                {cornerLeft}
              </Body>
              {cornerRight ? (
                <Body size="caption" weight="bold" tone="muted">
                  {cornerRight}
                </Body>
              ) : null}
            </View>
            <View style={s.posterBottom}>
              <View style={{ transform: [{ skewX: `${skew.momentum}deg` }] }}>
                <Display size="display2" tight numberOfLines={2}>
                  {title}
                </Display>
              </View>
              {sub ? (
                <Body size="bodySmall" tone="muted" numberOfLines={3}>
                  {sub}
                </Body>
              ) : null}
              <LowerThird meta={meta} bar={bar} compact style={s.lower} />
            </View>
            </View>
          </OnPhotoContext.Provider>
        </View>
      </Tap>
    </Animated.View>
  );
}

/** Un en-tête de section avec compteur « 1 / 5 » (règle verticale A24) pour les carrousels. */
export function CarouselHead({ title, index, total, action }: { title: string; index: number; total: number; action?: { label: string; onPress: () => void } }) {
  const s = useStyles();
  return (
    <View style={s.carHead}>
      <Heading level="section" style={{ flex: 1 }}>
        {title}
      </Heading>
      {action ? (
        <Tap onPress={action.onPress} scaleTo={0.95} haptic="selection" accessibilityRole="button" accessibilityLabel={action.label}>
          <Body size="bodySmall" weight="bold" tone="accent">
            {action.label}
          </Body>
        </Tap>
      ) : (
        <Mono size="caption" tone="dim">
          {index + 1} / {total}
        </Mono>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: { borderWidth: 1.5, borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 3 },
});

const useStyles = makeStyles((t) => ({
  chipsScroll: { flexGrow: 0, marginHorizontal: -GUTTER },
  chips: { paddingHorizontal: GUTTER, gap: space[2] },
  plate: { height: 320, borderRadius: radius.card, justifyContent: 'space-between' },
  plateTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[5] },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(8,8,8,0.45)' },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  plateBottom: { padding: space[5], gap: space[2] },
  nextRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[4] },
  nextHour: { marginBottom: -6 },
  nextText: { flex: 1, gap: 2, paddingBottom: 4 },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: space[2], alignSelf: 'flex-start', marginTop: space[1], paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(232,0,28,0.2)', borderWidth: 1, borderColor: 'rgba(255,77,94,0.5)' },
  countdownText: { color: '#FFFFFF' },
  tileWrap: { width: '48.5%' },
  tile: {
    minHeight: 148,
    padding: space[4],
    gap: space[2],
    borderRadius: radius.card,
    backgroundColor: t.card,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : { borderWidth: stroke.hair, borderColor: t.line }),
  },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space[1] },
  news: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingVertical: space[4] },
  newsLine: { borderBottomWidth: stroke.hair, borderBottomColor: t.line },
  newsThumb: { width: 76, height: 76, borderRadius: radius.tile, backgroundColor: t.cardAlt },
  newsBody: { flex: 1, gap: 3 },
  faces: { flexDirection: 'row' },
  face: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: t.cardAlt, borderWidth: 2.5, borderColor: t.card, alignItems: 'center', justifyContent: 'center' },
  faceOverlap: { marginLeft: -12 },
  faceImg: { width: '100%', height: '100%' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 },
  barHit: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, justifyContent: 'flex-end', backgroundColor: t.chip, borderRadius: 8, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8 },
  barsCaption: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] },
  poster: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: '#11152A' },
  corners: { flexDirection: 'row', justifyContent: 'space-between', padding: space[5] },
  posterBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space[5], gap: space[2] },
  lower: { marginTop: space[2] },
  carHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[3], marginBottom: space[4] },
}));
