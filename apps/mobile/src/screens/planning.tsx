import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { CLUBS, clubById, estOuvert } from '@/data/clubs';
import type { Slot } from '@/data/planning';
import { track } from '@/features/analytics';
import { espaceLabel, espacesFor, familleColor, heure, jourFr, normaliseActivite, slotsFor } from '@/features/planning/model';
import { shareWeek } from '@/features/planning/share';
import { duree, relativeDay, weekdayIn, WEEKDAYS, WEEKDAYS_SHORT } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { SessionSheet, useSessionSheet } from '@/screens/planning/SessionSheet';
import { WeekPoster } from '@/screens/planning/WeekPoster';
import { selectStatut, useSession } from '@/state/session';
import { topKeys, useUsage } from '@/state/usage';
import { IconShare, IconStar } from '@/ui/icons';
import { Button, Card, Chip, Segmented } from '@/ui/kit';
import { Page, Reveal, RoundButton } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Heading, insecable, Mono } from '@/ui/Text';
import { duration, GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stroke, useTheme, type ClubId } from '@/ui/theme';

type Mode = 'jour' | 'semaine';

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

/**
 * Le jour où un cours reste à venir : aujourd'hui tant qu'un cours n'est pas fini, sinon le
 * prochain jour qui en a. À 21 h, le planning ne s'ouvre plus sur une journée toute grisée.
 */
function firstDayAhead(club: ClubId, today: number, nowMin: number): number {
  if (coursesOn(club, today).some((sl) => sl.fin > nowMin)) return today;
  return firstDayWithCourses(club, (today + 1) % 7);
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
  const statut = useSession(selectStatut);
  const favorites = useUsage((st) => st.favorites);
  const bump = useUsage((st) => st.bump);
  // L'invité retrouve le club qu'il regarde le plus ; l'adhérent, son club actif.
  // Le club d'ouverture, choisi UNE fois : l'invité retrouve celui qu'il regarde le plus, l'adhérent
  // son club actif. Les plaques gardent l'ordre du CDC ; rien ne se réordonne sous le doigt (23/10/2026 :
  // États-Unis passait en tête pendant le défilement et le titre ne suivait plus la plaque).
  const [startClub] = useState<ClubId>(() => (statut === 'invite' ? (topKeys(useUsage.getState().clubs, 1, 2)[0] as ClubId | undefined) : undefined) ?? clubActif);
  const now = new Date();
  const today = jourFr(now);
  const dates = weekDates(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const { width } = useWindowDimensions();
  const colWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const plateW = Math.round((colWidth - GUTTER * 2) * 0.8);
  const step = plateW + space[3];

  const ordered = CLUBS;
  const [club, setClub] = useState<ClubId>(startClub);
  const [espace, setEspace] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('jour');
  const [jour, setJour] = useState(() => firstDayAhead(startClub, today, nowMin));
  const sheet = useSessionSheet();
  const [copied, setCopied] = useState(false);
  const openSession = (slot: Slot, j: number) => {
    const fam = normaliseActivite(slot.activite).famille;
    bump('familles', fam);
    bump('clubs', slot.club);
    track('planning_session_open', { club: slot.club, famille: fam });
    sheet.show(slot, j);
  };
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  // Le carrousel s'ouvre sur le club de départ, sans animation.
  useEffect(() => {
    const i = CLUBS.findIndex((c) => c.id === startClub);
    if (i <= 0) return undefined;
    const id = setTimeout(() => scroller.current?.scrollTo({ x: i * step, animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, à l'ouverture.
  }, []);

  const espaces = espacesFor(club);
  const espaceActif = espaces.length ? (espace && espaces.includes(espace) ? espace : espaces[0]) : undefined;
  const slots = slotsFor(club, jour, espaceActif);
  const index = Math.max(0, ordered.findIndex((c) => c.id === club));
  // Plus rien à venir aujourd'hui (aucun cours, ou tous finis) : le planning a sauté au prochain jour et le dit.
  const todayOver = !coursesOn(club, today).some((sl) => sl.fin > nowMin);
  const firstCourse = coursesOn(club, jour)[0];
  const nextToday = jour === today ? slots.find((sl) => sl.debut > nowMin && normaliseActivite(sl.activite).famille !== 'accesLibre') : undefined;

  const pick = (id: ClubId, scrollTo?: number) => {
    setClub(id);
    bump('clubs', id);
    track('planning_view', { club: id, mode });
    setEspace(undefined);
    if (jour === today || coursesOn(id, jour).length === 0) setJour(firstDayAhead(id, today, nowMin));
    if (scrollTo !== undefined) scroller.current?.scrollTo({ x: scrollTo * step, animated: true });
  };
  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(ordered.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step)));
    if (ordered[i].id !== club) pick(ordered[i].id);
  };

  const share = async () => {
    const ok = await shareWeek(club, lang, espaceActif);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
    track('planning_share', { club, mode });
  };
  const favCount = slotsFor(club, jour).filter((sl) => favorites.includes(sl.id)).length;

  return (
    <Page
      title={T('planning.title')}
      subtitle={T('planning.sub')}
      trailing={
        <RoundButton label={copied ? T('planning.copied') : T('planning.shareWeek')} onPress={share}>
          <IconShare size={20} />
        </RoundButton>
      }>
      <Reveal>
        <View style={s.rule}>
          <Heading level="card" style={{ flex: 1 }}>
            {insecable(clubById(club).nom)}
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
        <Segmented<Mode>
          value={mode}
          onChange={(m) => {
            setMode(m);
            track('planning_view', { club, mode: m });
          }}
          options={[{ value: 'jour', label: T('planning.day') }, { value: 'semaine', label: T('planning.week') }]}
          style={s.modeSeg}
        />
        {espaces.length ? (
          <Animated.View entering={FadeIn.duration(duration.cross)} exiting={FadeOut.duration(duration.jab)} style={s.espaces}>
            {espaces.map((e) => (
              <Chip key={e} label={espaceLabel(e)} selected={e === espaceActif} onPress={() => setEspace(e)} />
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

          {todayOver && jour !== today ? (
            <View style={s.deduction}>
              <View style={s.deductionBar} />
              <Body size="bodySmall" weight="semi" tone="muted" style={{ flex: 1 }}>
                {clubById(club).ouverture.jours.includes(today) ? T('planning.nothingToday', { day: WEEKDAYS[lang][today] }) : T('planning.closedToday', { day: WEEKDAYS[lang][today] })} {T('planning.resume', { day: jour === (today + 1) % 7 ? relativeDay(1, jour, lang, true) : weekdayIn(jour, lang), h: firstCourse ? heure(firstCourse.debut) : '' })}
              </Body>
            </View>
          ) : null}

          <Animated.View layout={LinearTransition.duration(duration.cross)} style={s.listWrap}>
            {slots.length === 0 ? (
              <EmptyDay club={club} jour={jour} today={today} onJump={setJour} />
            ) : (
              <Card padded={false} style={s.list}>
                {slots.map((sl, i) => (
                  <SlotRow key={sl.id} slot={sl} last={i === slots.length - 1} isToday={jour === today} nowMin={nowMin} next={nextToday?.id === sl.id} favorite={favorites.includes(sl.id)} showEspace={!espaceActif} onPress={() => openSession(sl, jour)} />
                ))}
              </Card>
            )}
          </Animated.View>
        </>
      ) : (
        <Reveal delay={100} style={s.posterWrap}>
          <WeekPoster club={club} espace={espaceActif} today={today} nowMin={nowMin} favorites={favorites} onOpen={openSession} onPickDay={(j) => setJour(j)} />
          <Body size="caption" tone="dim" style={s.gridHint}>
            {T('planning.swipeHint')}
          </Body>
          <Button label={copied ? T('planning.copied') : T('planning.shareWeek')} icon={IconShare} variant="secondary" onPress={share} style={s.shareBtn} />
        </Reveal>
      )}
      {favCount > 0 && mode === 'jour' ? (
        <Body size="caption" tone="dim" style={s.favHint}>
          {T('planning.favHint', { n: favCount })}
        </Body>
      ) : null}
      <SessionSheet
        key={sheet.target?.slot.id}
        target={sheet.target}
        open={sheet.open}
        onClose={sheet.close}
        onClosed={sheet.closed}
        onSeeDay={(j) => {
          sheet.close();
          setJour(j);
          setMode('jour');
        }}
      />
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

function SlotRow({ slot, last, isToday, nowMin, next, favorite, showEspace, onPress }: { slot: Slot; last: boolean; isToday: boolean; nowMin: number; next: boolean; favorite: boolean; showEspace: boolean; onPress: () => void }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const a = normaliseActivite(slot.activite);
  const libre = a.famille === 'accesLibre';
  const tint = familleColor(a.famille);
  const enCours = isToday && nowMin >= slot.debut && nowMin < slot.fin;
  const passe = isToday && nowMin >= slot.fin;
  // La salle n'est rappelée que si on ne l'a pas déjà choisie au-dessus.
  const meta = [a.public, a.niveau, showEspace && slot.espace ? espaceLabel(slot.espace) : undefined].filter(Boolean).join(' · ');
  return (
    <Tap onPress={libre ? undefined : onPress} disabled={libre} scaleTo={0.985} style={[s.row, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }, passe && s.rowPast]} accessibilityRole={libre ? undefined : 'button'} accessibilityLabel={`${a.libelle} ${heure(slot.debut)}`}>
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
        <View style={s.titleRow}>
          <Body weight="bold" tone={libre || passe ? 'muted' : 'text'} numberOfLines={2} style={{ flexShrink: 1 }}>
            {a.libelle}
          </Body>
          {favorite ? <IconStar size={14} color={t.accent} fill={t.accent} /> : null}
        </View>
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
    </Tap>
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
  // Deux options de largeur égale : « Semaine » et « Week » doivent tenir sans se couper.
  modeSeg: { minWidth: 232 },
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  posterWrap: { marginTop: space[4], marginHorizontal: -space[2] },
  gridHint: { textAlign: 'center', marginTop: space[3], paddingHorizontal: space[4] },
  shareBtn: { marginTop: space[3], marginHorizontal: space[2] },
  favHint: { textAlign: 'center', marginTop: space[3] },
}));
