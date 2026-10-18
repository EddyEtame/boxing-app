import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { CLUBS, clubById, estOuvert } from '@/data/clubs';
import type { Slot } from '@/data/planning';
import { espacesFor, familleColor, heure, JOURS, JOURS_COURTS, jourFr, normaliseActivite, slotsFor } from '@/features/planning/model';
import { formatIn } from '@/features/time';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, MAX_CONTENT_WIDTH, radius, space, stroke, whiteAlpha, type ClubId } from '@/ui/theme';

type Mode = 'jour' | 'semaine';

const GRID_START = 7 * 60;
const GRID_END = 22 * 60 + 30;
const HOUR_PX = 46;

/** Les cours d’un jour, sans les plages d’accès libre. */
function coursesOn(club: ClubId, jour: number, espace?: string): Slot[] {
  return slotsFor(club, jour, espace).filter((s) => normaliseActivite(s.activite).famille !== 'accesLibre');
}

/** Le premier jour, à partir d’aujourd’hui, où ce club donne des cours. */
function firstDayWithCourses(club: ClubId, from: number): number {
  for (let k = 0; k < 7; k++) {
    const j = (from + k) % 7;
    if (coursesOn(club, j).length) return j;
  }
  return from;
}

/**
 * Le planning des cinq clubs : les salles en plaques photo qui s’enclenchent,
 * la journée en lignes, le prochain cours en rouge. Un jour sans cours n’est
 * pas un trou : l’app ouvre sur le prochain jour où il se passe quelque chose,
 * et le dit.
 */
export function Screen() {
  const t = useT();
  const clubActif = useSession((s) => s.clubActif);
  const now = new Date();
  const today = jourFr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const { width } = useWindowDimensions();
  const colWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const plateW = Math.round(colWidth * 0.76);
  const step = plateW + space[3];

  const ordered = [clubById(clubActif), ...CLUBS.filter((c) => c.id !== clubActif)];
  const [club, setClub] = useState<ClubId>(clubActif);
  const [espace, setEspace] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('jour');
  const [jour, setJour] = useState(() => firstDayWithCourses(clubActif, today));
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  const espaces = espacesFor(club);
  const espaceActif = espaces.length ? (espace && espaces.includes(espace) ? espace : espaces[0]) : undefined;
  const slots = slotsFor(club, jour, espaceActif);
  const index = Math.max(0, ordered.findIndex((c) => c.id === club));
  const todayEmpty = coursesOn(club, today).length === 0;
  const firstCourse = coursesOn(club, jour)[0];
  const nextToday = jour === today ? slots.find((s) => s.debut > nowMin && normaliseActivite(s.activite).famille !== 'accesLibre') : undefined;

  const pick = (id: ClubId, scrollTo?: number) => {
    setClub(id);
    setEspace(undefined);
    if (coursesOn(id, jour).length === 0) setJour(firstDayWithCourses(id, today));
    if (scrollTo !== undefined) scroller.current?.scrollTo({ x: scrollTo * step, animated: true });
  };
  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(ordered.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step)));
    if (ordered[i].id !== club) pick(ordered[i].id);
  };

  return (
    <Page padded={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Body size="caption" eyebrow tone="muted">
            {t('planning.title')}
          </Body>
          <Display size="display3" tight>
            Les cinq salles
          </Display>
        </View>
        <View style={styles.rule}>
          <Mono size="micro" tone="text">
            {index + 1}
          </Mono>
          <View style={styles.ruleLine} />
          <Mono size="micro">{ordered.length}</Mono>
        </View>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onMomentumScrollEnd={onSettle}
        onScrollEndDrag={onSettle}
        style={styles.platesScroll}
        contentContainerStyle={[styles.plates, { paddingRight: colWidth - plateW - space[4] }]}>
        {ordered.map((c, i) => {
          const on = c.id === club;
          const ouvert = estOuvert(c, now);
          const n = coursesOn(c.id, jour).length;
          return (
            <Tap key={c.id} onPress={() => pick(c.id, i)} scaleTo={0.985} style={{ width: plateW }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={c.nom}>
              <Photo source={c.photo} style={[styles.plate, on && styles.plateOn]} darken={on ? 0.35 : 0.6} scrim={0.72} scrimTop={0.25}>
                <View style={styles.plateTop}>
                  <Mono size="micro" tone="text">
                    {String(i + 1).padStart(2, '0')} — {c.court.toUpperCase()}
                  </Mono>
                  <Mono size="micro" tone={ouvert ? 'text' : 'muted'}>
                    {ouvert ? `OUVERT · ${heure(c.ouverture.fin).toUpperCase()}` : 'FERMÉ'}
                  </Mono>
                </View>
                <View style={styles.plateBottom}>
                  <Display size="display3" tight numberOfLines={1}>
                    {c.court}
                  </Display>
                  <Mono size="micro">
                    {n ? `${n} COURS ${JOURS_COURTS[jour].toUpperCase()}` : `RIEN ${JOURS_COURTS[jour].toUpperCase()}`}
                    {c.espaces?.length ? ` · ${c.espaces.length} ESPACES` : ''}
                  </Mono>
                </View>
              </Photo>
            </Tap>
          );
        })}
      </ScrollView>

      <View style={styles.controls}>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'jour', label: t('planning.day') }, { value: 'semaine', label: t('planning.week') }]} />
        {espaces.length ? (
          <Animated.View entering={FadeIn.duration(duration.cross)} exiting={FadeOut.duration(duration.jab)} style={styles.espaces}>
            {espaces.map((e) => (
              <Chip key={e} label={e} active={e === espaceActif} onPress={() => setEspace(e)} />
            ))}
          </Animated.View>
        ) : null}
      </View>

      {mode === 'jour' ? (
        <>
          <View style={styles.days}>
            {JOURS_COURTS.map((d, i) => {
              const active = i === jour;
              const empty = coursesOn(club, i).length === 0;
              return (
                <Pressable key={d} onPress={() => setJour(i)} style={styles.day} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={JOURS[i]}>
                  <Body size="micro" weight="bold" caps tone={active ? 'text' : empty ? 'dim' : 'muted'}>
                    {d}
                  </Body>
                  <View style={[styles.dayDot, i === today && styles.dayDotToday, active && styles.dayDotActive]} />
                </Pressable>
              );
            })}
          </View>

          {todayEmpty && jour !== today ? (
            <View style={styles.deduction}>
              <View style={styles.deductionBar} />
              <Mono size="micro">
                {clubById(club).ouverture.jours.includes(today) ? `RIEN ${JOURS[today].toUpperCase()}` : `FERMÉ ${JOURS[today].toUpperCase()}`} · REPRISE {JOURS[jour].toUpperCase()}
                {firstCourse ? ` ${heure(firstCourse.debut).toUpperCase()}` : ''}
              </Mono>
            </View>
          ) : null}

          <Animated.View layout={LinearTransition.duration(duration.cross)} style={styles.list}>
            {slots.length === 0 ? (
              <EmptyDay club={club} jour={jour} today={today} onJump={setJour} />
            ) : (
              slots.map((s, i) => <SlotRow key={s.id} slot={s} first={i === 0} isToday={jour === today} nowMin={nowMin} next={nextToday?.id === s.id} />)
            )}
          </Animated.View>
        </>
      ) : (
        <WeekGrid
          club={club}
          espace={espaceActif}
          today={today}
          onPick={(j) => {
            setJour(j);
            setMode('jour');
          }}
        />
      )}
    </Page>
  );
}

function EmptyDay({ club, jour, today, onJump }: { club: ClubId; jour: number; today: number; onJump: (j: number) => void }) {
  const next = firstDayWithCourses(club, (jour + 1) % 7);
  const first = coursesOn(club, next)[0];
  const c = clubById(club);
  const ouvert = c.ouverture.jours.includes(jour);
  return (
    <View style={styles.empty}>
      <Display size="display4" tone="dim" tight>
        {JOURS[jour]}
      </Display>
      <Body tone="muted">{ouvert ? `Pas de cours ce ${JOURS[jour].toLowerCase()}${jour === today ? '' : '-là'} : la salle est ouverte en accès libre.` : `Le club est fermé le ${JOURS[jour].toLowerCase()}.`}</Body>
      {first ? (
        <Tap onPress={() => onJump(next)} style={styles.emptyCta} accessibilityRole="button" accessibilityLabel={`Voir ${JOURS[next]}`}>
          <Body size="caption" weight="bold" caps tone="inverse">
            {JOURS[next]} {heure(first.debut)} · {normaliseActivite(first.activite).libelle}
          </Body>
        </Tap>
      ) : null}
    </View>
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

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Tap onPress={onPress} scaleTo={0.95} haptic="selection" style={[styles.chip, active && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Body size="caption" weight="bold" caps tone={active ? 'inverse' : 'muted'}>
        {label}
      </Body>
    </Tap>
  );
}

function SlotRow({ slot, first, isToday, nowMin, next }: { slot: Slot; first: boolean; isToday: boolean; nowMin: number; next: boolean }) {
  const a = normaliseActivite(slot.activite);
  const libre = a.famille === 'accesLibre';
  const tint = familleColor(a.famille);
  const enCours = isToday && nowMin >= slot.debut && nowMin < slot.fin;
  const passe = isToday && nowMin >= slot.fin;
  const meta = [a.public, a.niveau, slot.espace].filter(Boolean).join(' · ');
  return (
    <View style={[styles.row, first && styles.rowFirst, passe && styles.rowPast]}>
      <View style={styles.time}>
        <Display size="display5" tone={passe ? 'dim' : 'text'} tight upper={false} tabular>
          {heure(slot.debut)}
        </Display>
        <Mono size="micro">{heure(slot.fin)}</Mono>
      </View>
      <View style={[styles.bar, { backgroundColor: libre ? ink[400] : tint }, (enCours || next) && styles.barLive]} />
      <View style={styles.body}>
        <Body weight="semi" tone={libre || passe ? 'muted' : 'text'}>
          {a.libelle}
        </Body>
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
        ) : next ? (
          <Mono size="micro" tone="accent">
            DANS {formatIn(slot.debut - nowMin).toUpperCase()}
          </Mono>
        ) : (
          <Mono size="micro">{slot.fin - slot.debut} MIN</Mono>
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
            <Body size="micro" weight="bold" caps tone={i === today ? 'text' : 'dim'} style={{ textAlign: 'center' }}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: space[4], marginBottom: space[3] },
  headerText: { gap: 2 },
  rule: { alignItems: 'center', gap: 4, paddingBottom: 4 },
  ruleLine: { width: stroke.hair, height: 18, backgroundColor: whiteAlpha[20] },
  platesScroll: { flexGrow: 0 },
  plates: { paddingHorizontal: space[4], gap: space[3] },
  plate: { height: 164, borderRadius: radius.sm, justifyContent: 'space-between', borderWidth: stroke.thin, borderColor: 'transparent' },
  plateOn: { borderColor: whiteAlpha[20] },
  plateTop: { flexDirection: 'row', justifyContent: 'space-between', padding: space[3] },
  plateBottom: { padding: space[3], gap: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], marginTop: space[4] },
  segmented: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: ink[150], borderRadius: radius.sm, padding: 3 },
  segment: { paddingHorizontal: space[3], paddingVertical: 7, borderRadius: radius.xs },
  segmentOn: { backgroundColor: color.text },
  espaces: { flexDirection: 'row', gap: space[2], flex: 1, flexWrap: 'wrap' },
  chip: { paddingHorizontal: space[3], paddingVertical: 7, borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: ink[300] },
  chipOn: { backgroundColor: color.text, borderColor: color.text },
  days: { flexDirection: 'row', paddingHorizontal: space[3], marginTop: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  day: { flex: 1, alignItems: 'center', paddingVertical: space[3], gap: 6 },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dayDotToday: { backgroundColor: ink[600] },
  dayDotActive: { backgroundColor: color.text, width: 18, borderRadius: 2 },
  deduction: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginHorizontal: space[4], marginTop: space[3] },
  deductionBar: { width: stroke.accentBar, height: 14, backgroundColor: color.accent },
  list: { paddingHorizontal: space[4] },
  empty: { paddingVertical: space[8], gap: space[3], alignItems: 'flex-start' },
  emptyCta: { backgroundColor: color.text, borderRadius: radius.sm, paddingHorizontal: space[4], paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200], gap: space[3] },
  rowFirst: { borderTopWidth: 0 },
  rowPast: { opacity: 0.5 },
  time: { width: 58 },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  barLive: { backgroundColor: color.accent, width: stroke.accentBar },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', minWidth: 64 },
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
