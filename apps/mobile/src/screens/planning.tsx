import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { CLUBS } from '@/data/clubs';
import type { Slot } from '@/data/planning';
import { espacesFor, familleColor, heure, JOURS, JOURS_COURTS, jourFr, normaliseActivite, slotsFor } from '@/features/planning/model';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { Page } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, radius, space, stroke, type ClubId } from '@/ui/theme';

type Mode = 'jour' | 'semaine';

const GRID_START = 7 * 60;
const GRID_END = 22 * 60 + 30;
const HOUR_PX = 46;

export function Screen() {
  const t = useT();
  const clubActif = useSession((s) => s.clubActif);
  const today = jourFr(new Date());
  const [club, setClub] = useState<ClubId>(clubActif);
  const [espace, setEspace] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('jour');
  const [jour, setJour] = useState(today);

  const espaces = espacesFor(club);
  const espaceActif = espaces.length ? (espace && espaces.includes(espace) ? espace : espaces[0]) : undefined;
  const slots = slotsFor(club, jour, espaceActif);

  return (
    <Page padded={false}>
      <View style={styles.header}>
        <Display size="display2">{t('planning.title')}</Display>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'jour', label: t('planning.day') }, { value: 'semaine', label: t('planning.week') }]} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
        {CLUBS.map((c) => (
          <Chip key={c.id} label={c.court} active={c.id === club} onPress={() => setClub(c.id)} />
        ))}
      </ScrollView>

      {espaces.length ? (
        <Animated.View entering={FadeIn.duration(duration.cross)} exiting={FadeOut.duration(duration.jab)} style={styles.espaces}>
          {espaces.map((e) => (
            <Chip key={e} label={e} small active={e === espaceActif} onPress={() => setEspace(e)} />
          ))}
        </Animated.View>
      ) : null}

      {mode === 'jour' ? (
        <>
          <View style={styles.days}>
            {JOURS_COURTS.map((d, i) => {
              const active = i === jour;
              return (
                <Pressable key={d} onPress={() => setJour(i)} style={styles.day} accessibilityRole="button" accessibilityState={{ selected: active }}>
                  <Body size="micro" weight={active ? 'bold' : 'medium'} caps tone={active ? 'text' : 'dim'}>
                    {d}
                  </Body>
                  <View style={[styles.dayDot, i === today && styles.dayDotToday, active && styles.dayDotActive]} />
                </Pressable>
              );
            })}
          </View>
          <Animated.View layout={LinearTransition.duration(duration.cross)} style={styles.list}>
            {slots.length === 0 ? (
              <View style={styles.empty}>
                <Display size="display4" tone="dim">
                  {JOURS[jour]}
                </Display>
                <Body tone="muted">Pas de cours ce jour-là dans ce club.</Body>
              </View>
            ) : (
              slots.map((s, i) => <SlotRow key={s.id} slot={s} first={i === 0} isToday={jour === today} />)
            )}
          </Animated.View>
        </>
      ) : (
        <WeekGrid club={club} espace={espaceActif} today={today} onPick={(j) => { setJour(j); setMode('jour'); }} />
      )}
    </Page>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, on && styles.segmentOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Body size="caption" weight="bold" caps tone={on ? 'inverse' : 'muted'}>
              {o.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}

function Chip({ label, active, onPress, small }: { label: string; active: boolean; onPress: () => void; small?: boolean }) {
  return (
    <Tap onPress={onPress} scaleTo={0.95} haptic="selection" style={[styles.chip, small && styles.chipSmall, active && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Body size={small ? 'caption' : 'bodySmall'} weight="bold" caps tone={active ? 'inverse' : 'muted'}>
        {label}
      </Body>
    </Tap>
  );
}

function SlotRow({ slot, first, isToday }: { slot: Slot; first: boolean; isToday: boolean }) {
  const a = normaliseActivite(slot.activite);
  const libre = a.famille === 'accesLibre';
  const tint = familleColor(a.famille);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const enCours = isToday && nowMin >= slot.debut && nowMin < slot.fin;
  const passe = isToday && nowMin >= slot.fin;
  const meta = [a.public, a.niveau, slot.espace].filter(Boolean).join(' · ');
  return (
    <View style={[styles.row, first && styles.rowFirst, passe && styles.rowPast]}>
      <View style={styles.time}>
        <Display size="display5" tone={passe ? 'dim' : 'text'} tight style={styles.hour}>
          {heure(slot.debut)}
        </Display>
        <Mono size="micro">{heure(slot.fin)}</Mono>
      </View>
      <View style={[styles.bar, { backgroundColor: libre ? ink[400] : tint }, enCours && styles.barLive]} />
      <View style={styles.body}>
        {libre ? (
          <Body weight="semi" tone="muted">
            {a.libelle}
          </Body>
        ) : (
          <Body weight="semi" tone={passe ? 'dim' : 'text'}>
            {a.libelle}
          </Body>
        )}
        {meta ? (
          <Body size="caption" tone="dim">
            {meta}
          </Body>
        ) : null}
      </View>
      <View style={styles.right}>
        {enCours ? (
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Mono size="micro" tone="accent">
              EN COURS
            </Mono>
          </View>
        ) : (
          <Mono size="micro">{slot.fin - slot.debut} min</Mono>
        )}
      </View>
    </View>
  );
}

function WeekGrid({ club, espace, today, onPick }: { club: ClubId; espace?: string; today: number; onPick: (jour: number) => void }) {
  const hours: number[] = [];
  for (let m = GRID_START; m < GRID_END; m += 60) hours.push(m);
  const height = ((GRID_END - GRID_START) / 60) * HOUR_PX;
  return (
    <View style={styles.grid}>
      <View style={styles.gridHead}>
        <View style={styles.gridGutter} />
        {JOURS_COURTS.map((d, i) => (
          <Pressable key={d} style={styles.gridCol} onPress={() => onPick(i)} accessibilityRole="button" accessibilityLabel={JOURS[i]}>
            <Body size="micro" weight={i === today ? 'bold' : 'medium'} caps tone={i === today ? 'text' : 'dim'} style={{ textAlign: 'center' }}>
              {d}
            </Body>
          </Pressable>
        ))}
      </View>
      <View style={[styles.gridBody, { height }]}>
        <View style={styles.gridGutter}>
          {hours.map((m) => (
            <Mono key={m} size="micro" tone="dim" style={[styles.gridHour, { top: ((m - GRID_START) / 60) * HOUR_PX - 6 }]}>
              {heure(m)}
            </Mono>
          ))}
        </View>
        {JOURS_COURTS.map((_, i) => {
          const daySlots = slotsFor(club, i, espace);
          return (
            <Pressable key={i} style={[styles.gridCol, styles.gridDay, i === today && styles.gridToday]} onPress={() => onPick(i)} accessibilityRole="button" accessibilityLabel={JOURS[i]}>
              {hours.map((m) => (
                <View key={m} style={[styles.gridLine, { top: ((m - GRID_START) / 60) * HOUR_PX }]} />
              ))}
              {daySlots.map((s) => {
                const a = normaliseActivite(s.activite);
                const libre = a.famille === 'accesLibre';
                const top = Math.max(0, ((s.debut - GRID_START) / 60) * HOUR_PX);
                const h = Math.max(10, ((s.fin - s.debut) / 60) * HOUR_PX - 2);
                const tint = familleColor(a.famille);
                return (
                  <View key={s.id} style={[styles.block, { top, height: h, backgroundColor: libre ? 'rgba(170,170,170,0.08)' : `${tint}2E`, borderLeftColor: libre ? ink[400] : tint }]}>
                    {h >= 26 ? (
                      <Mono size="micro" tone={libre ? 'dim' : 'text'} numberOfLines={h >= 40 ? 2 : 1} style={styles.blockText}>
                        {libre ? 'Libre' : a.libelle}
                      </Mono>
                    ) : null}
                  </View>
                );
              })}
            </Pressable>
          );
        })}
      </View>
      <Body size="caption" tone="dim" style={styles.gridHint}>
        Touche un jour pour le détail.
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space[4], gap: space[3], marginBottom: space[3] },
  segmented: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: ink[150], borderRadius: radius.sm, padding: 3 },
  segment: { paddingHorizontal: space[4], paddingVertical: 7, borderRadius: radius.xs },
  segmentOn: { backgroundColor: color.text },
  chipsScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: space[4], gap: space[2], paddingBottom: space[2], alignItems: 'center' },
  chip: { paddingHorizontal: space[4], paddingVertical: 10, borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: ink[300] },
  chipSmall: { paddingHorizontal: space[3], paddingVertical: 6 },
  chipOn: { backgroundColor: color.text, borderColor: color.text },
  espaces: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingBottom: space[2] },
  days: { flexDirection: 'row', paddingHorizontal: space[3], marginTop: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  day: { flex: 1, alignItems: 'center', paddingVertical: space[3], gap: 6 },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dayDotToday: { backgroundColor: ink[600] },
  dayDotActive: { backgroundColor: color.text, width: 18, borderRadius: 2 },
  list: { paddingHorizontal: space[4] },
  empty: { paddingVertical: space[10], gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200], gap: space[3] },
  rowFirst: { borderTopWidth: 0 },
  rowPast: { opacity: 0.55 },
  time: { width: 56 },
  hour: { textTransform: 'none' },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  barLive: { backgroundColor: color.accent },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', minWidth: 56 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.accent },
  grid: { paddingHorizontal: space[3], marginTop: space[3] },
  gridHead: { flexDirection: 'row', paddingBottom: space[2] },
  gridGutter: { width: 34 },
  gridCol: { flex: 1 },
  gridBody: { flexDirection: 'row', borderTopWidth: stroke.hair, borderTopColor: ink[300] },
  gridHour: { position: 'absolute', left: 0 },
  gridDay: { borderLeftWidth: stroke.hair, borderLeftColor: ink[200] },
  gridToday: { backgroundColor: 'rgba(245,245,245,0.025)' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: stroke.hair, backgroundColor: ink[200] },
  block: { position: 'absolute', left: 2, right: 2, borderLeftWidth: 2, borderRadius: radius.xs, paddingHorizontal: 3, paddingTop: 2, overflow: 'hidden' },
  blockText: { fontSize: 9, lineHeight: 11 },
  gridHint: { textAlign: 'center', marginTop: space[3] },
});
