import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import type { Slot } from '@/data/planning';
import { bandAt, buildWeekGrid, inkOn, type GridCell } from '@/features/planning/grid';
import { familleColor, heure, normaliseActivite } from '@/features/planning/model';
import { WEEKDAYS, WEEKDAYS_SHORT } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { IconStar } from '@/ui/icons';
import { Tap } from '@/ui/Tap';
import { Body } from '@/ui/Text';
import { easing, makeStyles, radius, stroke, useTheme, type ClubId } from '@/ui/theme';

const ROW = 56;
const GUTTER_W = 58;
const DAY_W = 112;
const SUB_W = 80;
const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

type Props = {
  club: ClubId;
  espace?: string;
  today: number;
  nowMin: number;
  favorites: string[];
  onOpen: (slot: Slot, jour: number) => void;
  onPickDay: (jour: number) => void;
};

/**
 * La semaine telle que l'affiche du club la montre : des bandes horaires de
 * hauteur égale, les jours en colonnes (deux sous-colonnes quand deux cours
 * se chevauchent), les cours en blocs pleins, l'accès libre en creux. L'heure
 * reste à gauche pendant que les jours défilent ; aujourd'hui est teinté et la
 * bande en cours est soulignée. Chaque bloc s'ouvre.
 */
export function WeekPoster({ club, espace, today, nowMin, favorites, onOpen, onPickDay }: Props) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const grid = useMemo(() => buildWeekGrid(club, espace), [club, espace]);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const liveRow = bandAt(grid.bands, nowMin);
  const multi = grid.columns.some((c) => c.subCount > 1);
  const widthOf = (subCount: number) => (subCount > 1 ? SUB_W : DAY_W);

  // Le jour d'aujourd'hui arrive à l'écran tout seul.
  useEffect(() => {
    let x = 0;
    for (const j of grid.days) {
      if (j === today) break;
      const c = grid.columns.find((col) => col.jour === j)!;
      x += widthOf(c.subCount) * c.subCount;
    }
    const id = setTimeout(() => scroller.current?.scrollTo({ x: Math.max(0, x - 8), animated: false }), 0);
    return () => clearTimeout(id);
  }, [grid, today]);

  if (!grid.bands.length) return null;

  const headH = multi ? 48 : 34;
  const navy = t.scheme === 'light' ? t.primary : t.cardAlt;
  const navyInk = t.scheme === 'light' ? t.onPrimary : t.text;

  return (
    <View style={[s.frame, { borderColor: t.line }]}>
      <View style={s.row}>
        {/* Colonne des heures, fixe. */}
        <View style={[s.gutter, { width: GUTTER_W, backgroundColor: t.cardAlt }]}>
          <View style={[s.gutterHead, { height: headH, backgroundColor: navy }]}>
            <Body size="micro" weight="bold" style={{ color: navyInk, opacity: 0.8 }}>
              {T('planning.hour')}
            </Body>
          </View>
          {grid.bands.map((b, r) => (
            <View key={b.debut} style={[s.gutterCell, { height: ROW, borderTopColor: t.line }, r === liveRow && { backgroundColor: t.accentSoft }]}>
              <Body size="micro" weight="bold" tone={r === liveRow ? 'accent' : 'muted'} tabular>
                {heure(b.debut)}
              </Body>
              <Body size="micro" tone="dim" tabular style={s.gutterEnd}>
                {heure(b.fin)}
              </Body>
            </View>
          ))}
        </View>

        <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} bounces={false} style={s.scroll}>
          <View>
            {/* En-tête : les jours, puis les sous-colonnes. */}
            <View style={[s.head, { height: headH, backgroundColor: navy }]}>
              {grid.days.map((j) => {
                const col = grid.columns.find((c) => c.jour === j)!;
                const w = widthOf(col.subCount) * col.subCount;
                const isToday = j === today;
                return (
                  <Tap key={j} onPress={() => onPickDay(j)} scaleTo={0.96} haptic="selection" style={[s.headDay, { width: w, borderLeftColor: 'rgba(255,255,255,0.12)' }]} accessibilityRole="button" accessibilityLabel={WEEKDAYS[lang][j]}>
                    <View style={[s.headLabel, isToday && { backgroundColor: t.accent }]}>
                      <Body size="caption" weight="bold" style={{ color: isToday ? '#FFFFFF' : navyInk }}>
                        {(w >= DAY_W ? WEEKDAYS[lang][j] : WEEKDAYS_SHORT[lang][j]).toUpperCase()}
                      </Body>
                    </View>
                    {multi ? (
                      <View style={s.subRow}>
                        {Array.from({ length: col.subCount }).map((_, k) => (
                          <Body key={k} size="micro" weight="bold" style={{ flex: 1, textAlign: 'center', color: navyInk, opacity: col.subCount > 1 ? 0.7 : 0 }}>
                            {k + 1}
                          </Body>
                        ))}
                      </View>
                    ) : null}
                  </Tap>
                );
              })}
            </View>

            {/* Le corps : colonne par colonne, pour que les blocs fusionnés restent simples. */}
            <View style={s.body}>
              {grid.columns.map((col, c) => {
                const w = widthOf(col.subCount);
                const isToday = col.jour === today;
                const firstOfDay = col.sub === 0;
                return (
                  <View key={`${col.jour}-${col.sub}`} style={[s.col, { width: w, borderLeftWidth: firstOfDay ? stroke.hair : 0, borderLeftColor: t.lineStrong }, isToday && { backgroundColor: t.tint }]}>
                    {grid.bands.map((b, r) => (
                      <View key={b.debut} style={[s.cell, { height: ROW, borderTopColor: t.line }]} />
                    ))}
                    {grid.cells.map((rowCells, r) => {
                      const cell = rowCells[c];
                      if (cell.kind === 'covered') return null;
                      // Comme sur l'affiche : une case vide, c'est la salle en accès libre.
                      if (cell.kind === 'empty') return <EmptyCell key={`${r}-${c}`} top={r * ROW} label={T('planning.freeAccess')} />;
                      return <Block key={`${r}-${c}`} cell={cell} top={r * ROW} index={c + r} jour={col.jour} favorite={favorites.includes(cell.slot.id)} onOpen={onOpen} freeLabel={T('planning.freeAccess')} />;
                    })}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function EmptyCell({ top, label }: { top: number; label: string }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View pointerEvents="none" style={[s.free, { top: top + 2, height: ROW - 4, borderColor: t.line }]}>
      <Body size="micro" weight="bold" tone="dim" style={s.freeText} numberOfLines={1}>
        {label.toUpperCase()}
      </Body>
    </View>
  );
}

function Block({ cell, top, index, jour, favorite, onOpen, freeLabel }: { cell: Extract<GridCell, { kind: 'free' | 'course' }>; top: number; index: number; jour: number; favorite: boolean; onOpen: (slot: Slot, jour: number) => void; freeLabel: string }) {
  const s = useStyles();
  const t = useTheme();
  const a = normaliseActivite(cell.slot.activite);
  const h = cell.rowSpan * ROW - 4;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(Math.min(index, 14) * 22, withTiming(1, { duration: 360, easing: ARRIVE }));
  }, [index, p]);
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.94 + p.value * 0.06 }] }));

  if (cell.kind === 'free') {
    return (
      <Animated.View pointerEvents="none" style={[s.free, { top: top + 2, height: h, borderColor: t.line }, anim]}>
        {h >= 30 ? (
          <Body size="micro" weight="bold" tone="dim" style={s.freeText} numberOfLines={1}>
            {freeLabel.toUpperCase()}
          </Body>
        ) : null}
      </Animated.View>
    );
  }
  const bg = familleColor(a.famille);
  const ink = inkOn(bg);
  const meta = [a.public, a.niveau].filter(Boolean).join(' · ');
  return (
    <Animated.View style={[s.blockWrap, { top: top + 2, height: h }, anim]}>
      <Tap onPress={() => onOpen(cell.slot, jour)} scaleTo={0.95} haptic="selection" style={[s.block, { backgroundColor: bg }]} accessibilityRole="button" accessibilityLabel={`${a.libelle}, ${heure(cell.slot.debut)}`}>
        <Body size="micro" weight="bold" numberOfLines={h >= 52 ? 3 : 2} style={[s.blockTitle, { color: ink }]}>
          {a.libelle.toUpperCase()}
        </Body>
        {meta && (h >= 100 || (h >= 52 && a.libelle.length <= 14)) ? (
          <Body size="micro" weight="semi" numberOfLines={1} style={[s.blockMeta, { color: ink }]}>
            {meta}
          </Body>
        ) : null}
        {favorite ? (
          <View style={s.star}>
            <IconStar size={11} color={ink} fill={ink} />
          </View>
        ) : null}
      </Tap>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  frame: { borderRadius: radius.card, overflow: 'hidden', borderWidth: stroke.hair, backgroundColor: t.card },
  row: { flexDirection: 'row' },
  gutter: { zIndex: 2 },
  gutterHead: { alignItems: 'center', justifyContent: 'center' },
  gutterCell: { borderTopWidth: stroke.hair, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  gutterEnd: { marginTop: 1 },
  scroll: { flex: 1 },
  head: { flexDirection: 'row' },
  headDay: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4, borderLeftWidth: stroke.hair },
  headLabel: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  subRow: { flexDirection: 'row', alignSelf: 'stretch' },
  body: { flexDirection: 'row' },
  col: {},
  cell: { borderTopWidth: stroke.hair },
  blockWrap: { position: 'absolute', left: 3, right: 3 },
  block: { flex: 1, borderRadius: 8, paddingHorizontal: 3, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden' },
  blockTitle: { fontSize: 10, lineHeight: 12, textAlign: 'center', letterSpacing: 0 },
  blockMeta: { fontSize: 9, lineHeight: 11, textAlign: 'center', opacity: 0.85 },
  star: { position: 'absolute', top: 3, right: 4 },
  free: { position: 'absolute', left: 3, right: 3, borderRadius: 8, borderWidth: stroke.hair, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: t.scheme === 'light' ? 'rgba(32,37,75,0.03)' : 'rgba(245,245,245,0.03)' },
  freeText: { fontSize: 8, letterSpacing: 1 },
}));
