import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import type { NewsItem } from '@/data/news';
import { formatClock, useBadgeClock } from '@/features/badge/clock';
import type { Stats } from '@/features/stats/model';
import { dateLineFromIso, daysUntil, euros } from '@/features/time';
import { LifeLine } from '@/ui/LifeLine';
import { LowerThird } from '@/ui/LowerThird';
import { Photo, type PhotoSource } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, radius, skew, space, spring, stagger, stroke, whiteAlpha, type ClubId } from '@/ui/theme';

/* ------------------------------------------------------------------ */
/* Le jeton d’accès, vu depuis l’accueil                                */
/* ------------------------------------------------------------------ */

export function TokenCard({ clubCourt }: { clubCourt: string }) {
  const secondsLeft = useBadgeClock((s) => s.secondsLeft);
  const windowSeconds = useBadgeClock((s) => s.windowSeconds);
  return (
    <Tap onPress={() => router.push('/badge')} style={styles.token} accessibilityRole="button" accessibilityLabel="Ouvrir mon badge">
      <View style={styles.tokenRow}>
        <View style={styles.tokenText}>
          <Mono size="micro">JETON D’ACCÈS · {clubCourt.toUpperCase()}</Mono>
          <Body size="bodySmall" tone="muted">
            Nouveau code à la cloche
          </Body>
        </View>
        <Display size="display4" tabular upper={false} tone="accent" tight>
          {formatClock(secondsLeft)}
        </Display>
      </View>
      <LifeLine secondsLeft={secondsLeft} windowSeconds={windowSeconds} height={2} />
    </Tap>
  );
}

/* ------------------------------------------------------------------ */
/* Les clubs choisis                                                     */
/* ------------------------------------------------------------------ */

export function ClubChips({ clubs, actif, onPick, onMore }: { clubs: ClubId[]; actif: ClubId; onPick: (c: ClubId) => void; onMore: () => void }) {
  return (
    <View style={styles.chips}>
      {clubs.map((id) => {
        const on = id === actif;
        return (
          <Tap key={id} onPress={() => onPick(id)} scaleTo={0.95} haptic="selection" style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Body size="caption" weight="bold" caps tone={on ? 'inverse' : 'muted'}>
              {clubById(id).court}
            </Body>
          </Tap>
        );
      })}
      <Tap onPress={onMore} scaleTo={0.95} haptic="selection" style={[styles.chip, styles.chipMore]} accessibilityRole="button" accessibilityLabel="Choisir mes clubs">
        <Body size="caption" weight="bold" tone="muted">
          +
        </Body>
      </Tap>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* La figure des semaines et la répartition par club                     */
/* ------------------------------------------------------------------ */

export const CLUB_HUE: Record<ClubId, string> = {
  minimes: '#2F6BFF',
  'saint-cyprien': '#8B5CF6',
  'etats-unis': '#10B981',
  ramonville: '#D946EF',
  portet: '#F97316',
};

export function StatsFigure({ stats }: { stats: Stats }) {
  const [week, setWeek] = useState(stats.serie.length - 1);
  const maxWeek = Math.max(1, ...stats.serie.map((w) => w.passages));
  return (
    <View>
      <View style={styles.bars}>
        {stats.serie.map((w, i) => (
          <Bar key={w.semaine} index={i} value={w.passages} max={maxWeek} selected={i === week} onPress={() => setWeek(i)} />
        ))}
      </View>
      <View style={styles.weeks}>
        {stats.serie.map((w, i) => (
          <Mono key={w.semaine} size="micro" tone={i === week ? 'text' : 'dim'} style={styles.weekLabel}>
            {i === 0 || i === stats.serie.length - 1 || i === week ? `S${weekNumber(w.debut)}` : '·'}
          </Mono>
        ))}
      </View>
      <View style={styles.figureCaption}>
        <Mono size="micro">SEM. {weekNumber(stats.serie[week].debut)}</Mono>
        <Mono size="micro" tone="text">
          {stats.serie[week].passages} {stats.serie[week].passages > 1 ? 'SÉANCES' : 'SÉANCE'}
        </Mono>
      </View>
      <View style={styles.clubs}>
        {stats.parClub.map((c, i) => {
          const club = clubById(c.club);
          const pct = Math.max(0.3, c.passages / Math.max(1, stats.mois));
          return (
            <View key={c.club} style={[styles.clubPlate, { width: `${Math.round(pct * 100)}%`, backgroundColor: i === 0 ? whiteAlpha[8] : i === 1 ? whiteAlpha[6] : whiteAlpha[4], marginTop: i === 0 ? 0 : -6 }]}>
              <View style={[styles.clubDot, { backgroundColor: CLUB_HUE[club.id] }]} />
              <Mono size="micro" tone="text">
                {club.court.toUpperCase()}
              </Mono>
              <Mono size="micro">{c.passages}</Mono>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Bar({ index, value, max, selected, onPress }: { index: number; value: number; max: number; selected: boolean; onPress: () => void }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(index * stagger.step, withSpring(Math.max(0.02, value / max), spring.settle));
  }, [value, max, index, h]);
  const style = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));
  return (
    <Pressable onPress={onPress} style={styles.barHit} accessibilityRole="button" accessibilityLabel={`Semaine ${index + 1} : ${value} séances`}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.bar, { backgroundColor: selected ? color.text : whiteAlpha[20] }, style]} />
      </View>
    </Pressable>
  );
}

export function weekNumber(d: Date): number {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

/* ------------------------------------------------------------------ */
/* Le carnet : entrées numérotées et tampons                              */
/* ------------------------------------------------------------------ */

export type Entry =
  | { kind: 'passage'; date: string; club: ClubId; heure: string }
  | { kind: 'facture'; date: string; numero: string; montant: number; origine: string }
  | { kind: 'actu'; date: string; titre: string };

export function LedgerRow({ entry, index, numero, latest }: { entry: Entry; index: number; numero: number; latest: boolean }) {
  const delay = Math.min(index, stagger.max) * stagger.step;
  const main = entry.kind === 'passage' ? `${clubById(entry.club).court} · ${entry.heure}` : entry.kind === 'facture' ? `Facture ${entry.numero}` : entry.titre;
  const sub = entry.kind === 'passage' ? 'Passage' : entry.kind === 'facture' ? `${euros(entry.montant)} · ${entry.origine.toUpperCase()}` : 'Actualité';
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(duration.cross)} style={styles.row}>
      <Mono size="micro" style={styles.rowNo}>
        {String(numero).padStart(3, '0')}
      </Mono>
      <View style={styles.rowBody}>
        <Body size="bodySmall" weight="semi" numberOfLines={1}>
          {main}
        </Body>
        <Mono size="micro">
          {dateLineFromIso(entry.date)} · {sub.toUpperCase()}
        </Mono>
      </View>
      <View style={styles.rowStamp}>{entry.kind === 'passage' ? <Stamp label="PRÉSENT" ink={latest} delay={latest ? 300 : 0} /> : entry.kind === 'facture' ? <Stamp label="PAYÉ" /> : null}</View>
    </Animated.View>
  );
}

/** Le tampon : Bebas incliné, posé une fois avec le seul rebond de l’app (l’encre). */
export function Stamp({ label, ink: red, delay = 0 }: { label: string; ink?: boolean; delay?: number }) {
  const s = useSharedValue(red ? 1.6 : 1);
  const o = useSharedValue(red ? 0 : 1);
  useEffect(() => {
    if (!red) return;
    s.value = withDelay(delay, withTiming(1, { duration: duration.cross }));
    o.value = withDelay(delay, withTiming(1, { duration: duration.jab }));
  }, [red, delay, s, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ rotate: '-5deg' }, { scale: s.value }] }));
  const tint = red ? color.accentOnDark : color.textDim;
  return (
    <Animated.View style={[styles.stamp, { borderColor: tint }, style]}>
      <Display size="display5" tight style={{ color: tint, fontSize: 15, lineHeight: 15 }}>
        {label}
      </Display>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Les actualités en lignes                                               */
/* ------------------------------------------------------------------ */

export function NewsRow({ item, index, total, now }: { item: NewsItem; index: number; total: number; now: Date }) {
  const d = daysUntil(item.date, now);
  const future = d > 0;
  return (
    <Tap style={styles.news} accessibilityRole="button" accessibilityLabel={item.titre}>
      <View style={styles.newsIndex}>
        <Mono size="micro">Nº {String(total - index).padStart(3, '0')}</Mono>
        <Mono size="micro" tone={future ? 'accent' : 'dim'}>
          {future ? `DANS ${d} J` : dateLineFromIso(item.date)}
        </Mono>
      </View>
      <View style={styles.newsBody}>
        <Body weight="semi" numberOfLines={2}>
          {item.titre}
        </Body>
        <Body size="caption" tone="muted" numberOfLines={2}>
          {item.accroche}
        </Body>
      </View>
      <Photo source={item.photo} style={styles.newsThumb} darken={0.2} scrim={0} vignette={false} grain={false} />
    </Tap>
  );
}

/* ------------------------------------------------------------------ */
/* L’affiche (programme de la vitrine)                                    */
/* ------------------------------------------------------------------ */

type PosterProps = {
  index: number;
  scrollY: SharedValue<number>;
  height: number;
  photo: PhotoSource;
  cornerLeft: string;
  cornerRight: string;
  title: string;
  meta: string;
  sub?: string;
  bar?: string;
  onPress?: () => void;
};

export function Poster({ index, scrollY, height, photo, cornerLeft, cornerRight, title, meta, sub, bar = color.accent, onPress }: PosterProps) {
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
  token: { marginHorizontal: space[4], backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: whiteAlpha[6], overflow: 'hidden' },
  tokenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4], gap: space[3] },
  tokenText: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingHorizontal: space[4] },
  chip: { paddingHorizontal: space[3], paddingVertical: 8, borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: ink[300] },
  chipOn: { backgroundColor: color.text, borderColor: color.text },
  chipMore: { paddingHorizontal: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 88, gap: 6 },
  barHit: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, justifyContent: 'flex-end', backgroundColor: whiteAlpha[2], borderRadius: radius.xs, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: radius.xs },
  weeks: { flexDirection: 'row', gap: 6, marginTop: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 9 },
  figureCaption: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2], paddingTop: space[2], borderTopWidth: stroke.hair, borderTopColor: ink[300] },
  clubs: { marginTop: space[4], alignItems: 'flex-start' },
  clubPlate: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.xs, borderWidth: stroke.hair, borderColor: whiteAlpha[6], minWidth: 150, justifyContent: 'space-between' },
  clubDot: { width: 6, height: 6, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  rowNo: { width: 30 },
  rowBody: { flex: 1, gap: 2 },
  rowStamp: { width: 84, alignItems: 'flex-end' },
  stamp: { borderWidth: 1.5, borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 3 },
  news: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  newsIndex: { width: 64, gap: 2 },
  newsBody: { flex: 1, gap: 2 },
  newsThumb: { width: 64, height: 64, borderRadius: radius.xs },
  posterWrap: { marginBottom: space[3] },
  poster: { marginHorizontal: space[4], borderRadius: radius.sm, overflow: 'hidden', backgroundColor: ink[100], justifyContent: 'space-between' },
  corners: { flexDirection: 'row', justifyContent: 'space-between', padding: space[4] },
  posterBottom: { padding: space[4], gap: space[2] },
  lower: { marginTop: space[2] },
});
