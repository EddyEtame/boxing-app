import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { CLUBS, clubById, estOuvert } from '@/data/clubs';
import type { Slot } from '@/data/planning';
import { espacesFor, familleColor, heure, jourFr, normaliseActivite, slotsFor } from '@/features/planning/model';
import { duree, weekdayIn, WEEKDAYS, WEEKDAYS_SHORT } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { Button, Card, Chip, Segmented } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Heading, Mono } from '@/ui/Text';
import { duration, GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stroke, useTheme, type ClubId } from '@/ui/theme';

type Mode = 'jour' | 'semaine';

const GRID_START = 7 * 60;
const GRID_END = 22 * 60 + 30;
const HOUR_PX = 46;

/** Les cours d'un jour, sans les plages d'accès libre. */
function coursesOn(club: ClubId, jour: number, espace?: string): Slot[] {
  return slotsFor(club, jour, espace).filter((s) => normaliseActivite(s.activite).famille !== 'accesLibre');
}

/** Le premier jour, à partir d'aujourd'hui, où ce club donne des cours. */
function firstDayWithCourses(club: ClubId, from: number): number {
  for (let k = 0; k < 7; k++) {
    const j = (from + k) % 7;
    if (coursesOn(club, j).length) return j;
  }
  return from;
}

/** Les dates de la semaine en cours, lundi en premier. */
function weekDates(now: Date): Date[] {
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * Le planning des cinq clubs (CDC §7) : les salles en plaques photo qui
 * s'enclenchent, les jours avec leur date, le prochain cours en rouge. Un jour
 * sans cours n'est pas un trou : l'app ouvre sur le prochain jour qui en a.
 */
export function Screen() {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  const clubActif = useSession((st) => st.clubActif);
  const now = new Date();
  const today = jourFr(now);
  const dates = weekDates(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const { width } = useWindowDimensions();
  const colWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const plateW = Math.round((colWidth - GUTTER * 2) * 0.8);
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
  const nextToday = jour === today ? slots.find((sl) => sl.debut > nowMin && normaliseActivite(sl.activite).famille !== 'accesLibre') : undefined;

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
    <Page title={T('planning.title')} subtitle={T('planning.sub')}>
      <Reveal>
        <View style={s.rule}>
          <Heading level="card" style={{ flex: 1 }}>
            {clubById(club).nom}
          </Heading>
          <Mono size="caption" tone="dim">
            {index + 1} / {ordered.length}
          </Mono>
        </View>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          onMomentumScrollEnd={onSettle}
          onScrollEndDrag={onSettle}
          style={s.platesScroll}
          contentContainerStyle={[s.plates, { paddingRight: colWidth - plateW - GUTTER }]}>
          {ordered.map((c, i) => {
            const on = c.id === club;
            const ouvert = estOuvert(c, now);
            const n = coursesOn(c.id, jour).length;
            return (
              <Tap key={c.id} onPress={() => pick(c.id, i)} scaleTo={0.985} style={{ width: plateW }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={c.nom}>
                <Photo source={c.photo} style={[s.plate, on && s.plateOn]} darken={on ? 0.32 : 0.58} scrim={0.75}>
                  <View style={s.plateTop}>
                    <View style={s.openPill}>
                      <View style={[s.openDot, { backgroundColor: ouvert ? '#3DDC84' : 'rgba(245,245,245,0.55)' }]} />
                      <Body size="caption" weight="bold">
                        {ouvert ? T('home.openUntil', { h: heure(c.ouverture.fin) }) : T('home.closed')}
                      </Body>
                    </View>
                  </View>
                  <View style={s.plateBottom}>
                    <Display size="display4" tight numberOfLines={1}>
                      {c.court}
                    </Display>
                    <Body size="caption" weight="bold" tone="muted">
                      {n ? T('planning.coursesOn', { n, day: weekdayIn(jour, lang) }) : T('planning.noneOn', { day: weekdayIn(jour, lang) })}
                      {c.espaces?.length ? ` · ${T('planning.spaces', { n: c.espaces.length })}` : ''}
                    </Body>
                  </View>
                </Photo>
              </Tap>
            );
          })}
        </ScrollView>
      </Reveal>

      <Reveal delay={60} style={s.controls}>
        <Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'jour', label: T('planning.day') }, { value: 'semaine', label: T('planning.week') }]} />
        {espaces.length ? (
          <Animated.View entering={FadeIn.duration(duration.cross)} exiting={FadeOut.duration(duration.jab)} style={s.espaces}>
            {espaces.map((e) => (
              <Chip key={e} label={e} selected={e === espaceActif} onPress={() => setEspace(e)} />
            ))}
          </Animated.View>
        ) : null}
      </Reveal>

      {mode === 'jour' ? (
        <>
          <Reveal delay={100}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.daysScroll} contentContainerStyle={s.days}>
              {dates.map((d, i) => {
                const active = i === jour;
                const empty = coursesOn(club, i).length === 0;
                return <DayPill key={i} label={WEEKDAYS_SHORT[lang][i]} date={d.getDate()} active={active} today={i === today} empty={empty} onPress={() => setJour(i)} a11y={WEEKDAYS[lang][i]} />;
              })}
            </ScrollView>
          </Reveal>

          {todayEmpty && jour !== today ? (
            <View style={s.deduction}>
              <View style={s.deductionBar} />
              <Body size="bodySmall" weight="semi" tone="muted" style={{ flex: 1 }}>
                {clubById(club).ouverture.jours.includes(today) ? T('planning.nothingToday', { day: WEEKDAYS[lang][today] }) : T('planning.closedToday', { day: WEEKDAYS[lang][today] })} {T('planning.resume', { day: weekdayIn(jour, lang), h: firstCourse ? heure(firstCourse.debut) : '' })}
              </Body>
            </View>
          ) : null}

          <Animated.View layout={LinearTransition.duration(duration.cross)} style={s.listWrap}>
            {slots.length === 0 ? (
              <EmptyDay club={club} jour={jour} today={today} onJump={setJour} />
            ) : (
              <Card padded={false} style={s.list}>
                {slots.map((sl, i) => (
                  <SlotRow key={sl.id} slot={sl} last={i === slots.length - 1} isToday={jour === today} nowMin={nowMin} next={nextToday?.id === sl.id} />
                ))}
              </Card>
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

function DayPill({ label, date, active, today, empty, onPress, a11y }: { label: string; date: number; active: boolean; today: boolean; empty: boolean; onPress: () => void; a11y: string }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Tap onPress={onPress} scaleTo={0.92} haptic="selection" accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={a11y} style={[s.day, active && { backgroundColor: t.primary }]}>
      <Body size="caption" weight="bold" tone={active ? 'onPrimary' : empty ? 'dim' : 'muted'}>
        {label}
      </Body>
      <Body size="title" weight="black" tabular tone={active ? 'onPrimary' : empty ? 'dim' : 'text'}>
        {date}
      </Body>
      <View style={[s.todayDot, { backgroundColor: today ? (active ? t.onPrimary : t.accent) : 'transparent' }]} />
    </Tap>
  );
}

function EmptyDay({ club, jour, today, onJump }: { club: ClubId; jour: number; today: number; onJump: (j: number) => void }) {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  const next = firstDayWithCourses(club, (jour + 1) % 7);
  const first = coursesOn(club, next)[0];
  const c = clubById(club);
  const ouvert = c.ouverture.jours.includes(jour);
  return (
    <Card style={s.empty}>
      <Display size="display4" tone="dim" tight>
        {WEEKDAYS[lang][jour]}
      </Display>
      <Body tone="muted">{ouvert ? T('planning.emptyOpen', { day: weekdayIn(jour, lang) }) : T('planning.emptyClosed', { day: weekdayIn(jour, lang) })}</Body>
      {first ? <Button small label={`${WEEKDAYS[lang][next]} ${heure(first.debut)} · ${normaliseActivite(first.activite).libelle}`} onPress={() => onJump(next)} style={s.emptyCta} /> : null}
    </Card>
  );
}

function SlotRow({ slot, last, isToday, nowMin, next }: { slot: Slot; last: boolean; isToday: boolean; nowMin: number; next: boolean }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const a = normaliseActivite(slot.activite);
  const libre = a.famille === 'accesLibre';
  const tint = familleColor(a.famille);
  const enCours = isToday && nowMin >= slot.debut && nowMin < slot.fin;
  const passe = isToday && nowMin >= slot.fin;
  const meta = [a.public, a.niveau, slot.espace].filter(Boolean).join(' · ');
  return (
    <View style={[s.row, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }, passe && s.rowPast]}>
      <View style={s.time}>
        <Display size="display5" tone={passe ? 'dim' : 'text'} tight upper={false} tabular>
          {heure(slot.debut)}
        </Display>
        <Body size="caption" weight="semi" tone="dim" tabular>
          {heure(slot.fin)}
        </Body>
      </View>
      <View style={[s.bar, { backgroundColor: libre ? t.lineStrong : tint }, (enCours || next) && { backgroundColor: t.accent, width: stroke.accentBar }]} />
      <View style={s.body}>
        <Body weight="bold" tone={libre || passe ? 'muted' : 'text'}>
          {a.libelle}
        </Body>
        {meta ? (
          <Body size="caption" tone="muted">
            {meta}
          </Body>
        ) : null}
      </View>
      <View style={s.right}>
        {enCours ? (
          <Body size="caption" weight="bold" tone="accent">
            {T('planning.live')}
          </Body>
        ) : next ? (
          <Body size="caption" weight="bold" tone="accent" style={s.rightText}>
            {T('home.inTime', { t: duree(slot.debut - nowMin, lang) })}
          </Body>
        ) : (
          <Body size="caption" weight="semi" tone="dim">
            {slot.fin - slot.debut} min
          </Body>
        )}
      </View>
    </View>
  );
}

function WeekGrid({ club, espace, today, onPick }: { club: ClubId; espace?: string; today: number; onPick: (jour: number) => void }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const hours: number[] = [];
  for (let m = GRID_START; m < GRID_END; m += 60) hours.push(m);
  const height = ((GRID_END - GRID_START) / 60) * HOUR_PX;
  return (
    <Card style={s.grid}>
      <View style={s.gridHead}>
        <View style={s.gridGutter} />
        {WEEKDAYS_SHORT[lang].map((d, i) => (
          <Pressable key={d} style={s.gridCol} onPress={() => onPick(i)} accessibilityRole="button" accessibilityLabel={WEEKDAYS[lang][i]}>
            <Body size="caption" weight="bold" tone={i === today ? 'accent' : 'muted'} style={{ textAlign: 'center' }}>
              {d}
            </Body>
          </Pressable>
        ))}
      </View>
      <View style={[s.gridBody, { height, borderTopColor: t.line }]}>
        <View style={s.gridGutter}>
          {hours.map((m) => (
            <Body key={m} size="caption" tone="dim" style={[s.gridHour, { top: ((m - GRID_START) / 60) * HOUR_PX - 8 }]}>
              {heure(m)}
            </Body>
          ))}
        </View>
        {WEEKDAYS_SHORT[lang].map((_, i) => {
          const daySlots = slotsFor(club, i, espace);
          return (
            <Pressable key={i} style={[s.gridCol, { borderLeftWidth: stroke.hair, borderLeftColor: t.line }, i === today && { backgroundColor: t.tint }]} onPress={() => onPick(i)} accessibilityRole="button" accessibilityLabel={WEEKDAYS[lang][i]}>
              {hours.map((m) => (
                <View key={m} style={[s.gridLine, { top: ((m - GRID_START) / 60) * HOUR_PX, backgroundColor: t.line }]} />
              ))}
              {daySlots.map((sl) => {
                const a = normaliseActivite(sl.activite);
                const libre = a.famille === 'accesLibre';
                const top = Math.max(0, ((sl.debut - GRID_START) / 60) * HOUR_PX);
                const h = Math.max(10, ((sl.fin - sl.debut) / 60) * HOUR_PX - 2);
                const tint = familleColor(a.famille);
                return (
                  <View key={sl.id} style={[s.block, { top, height: h, backgroundColor: libre ? t.chip : `${tint}33`, borderLeftColor: libre ? t.lineStrong : tint }]}>
                    {h >= 26 ? (
                      <Body size="micro" weight="bold" tone={libre ? 'dim' : 'text'} numberOfLines={h >= 40 ? 2 : 1} style={s.blockText}>
                        {libre ? T('planning.free') : a.libelle}
                      </Body>
                    ) : null}
                  </View>
                );
              })}
            </Pressable>
          );
        })}
      </View>
      <Body size="caption" tone="dim" style={s.gridHint}>
        {T('planning.tapDay')}
      </Body>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  rule: { flexDirection: 'row', alignItems: 'baseline', gap: space[3], marginBottom: space[3] },
  platesScroll: { flexGrow: 0, marginHorizontal: -GUTTER },
  plates: { paddingLeft: GUTTER, gap: space[3] },
  plate: { height: 170, borderRadius: radius.card, justifyContent: 'space-between', borderWidth: 2, borderColor: 'transparent' },
  plateOn: { borderColor: t.scheme === 'light' ? t.primary : 'rgba(245,245,245,0.6)' },
  plateTop: { padding: space[4], alignItems: 'flex-start' },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(8,8,8,0.45)' },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  plateBottom: { padding: space[4], gap: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[3], marginTop: space[6] },
  espaces: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  daysScroll: { flexGrow: 0, marginHorizontal: -GUTTER, marginTop: space[5] },
  days: { paddingHorizontal: GUTTER, gap: space[2] },
  day: { width: 52, paddingVertical: space[3], borderRadius: radius.tile, alignItems: 'center', gap: 2, backgroundColor: t.chip },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  deduction: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[4], padding: space[3], borderRadius: radius.tile, backgroundColor: t.accentSoft },
  deductionBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: t.accent },
  listWrap: { marginTop: space[4] },
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  empty: { gap: space[3], alignItems: 'flex-start' },
  emptyCta: { marginTop: space[1] },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingVertical: space[3], gap: space[3] },
  rowPast: { opacity: 0.5 },
  time: { width: 62 },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', minWidth: 64 },
  rightText: { textAlign: 'right' },
  grid: { marginTop: space[4], paddingHorizontal: space[2] },
  gridHead: { flexDirection: 'row', paddingBottom: space[2] },
  gridGutter: { width: 40 },
  gridCol: { flex: 1 },
  gridBody: { flexDirection: 'row', borderTopWidth: stroke.hair },
  gridHour: { position: 'absolute', left: 0, fontSize: 11 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: stroke.hair },
  block: { position: 'absolute', left: 2, right: 2, borderLeftWidth: 3, borderRadius: 4, paddingHorizontal: 3, paddingTop: 2, overflow: 'hidden' },
  blockText: { fontSize: 10, lineHeight: 12 },
  gridHint: { textAlign: 'center', marginTop: space[3] },
}));
