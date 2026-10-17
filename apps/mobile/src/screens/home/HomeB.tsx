import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { INVOICES } from '@/data/member';
import { NEWS } from '@/data/news';
import { auClub } from '@/features/planning/model';
import { computeStats } from '@/features/stats/model';
import { dateLineFromIso, euros, moisLabel } from '@/features/time';
import { useSession } from '@/state/session';
import { Page } from '@/ui/Page';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, radius, space, spring, stagger, stroke, whiteAlpha, type ClubId } from '@/ui/theme';

/**
 * Direction B — « Le Vestiaire » : la donnée est le sujet.
 * Un carnet chronologique ; Montserrat porte tout ; Bebas pour un seul nombre-héros
 * et les tampons ; le rouge est l’encre du tampon, et rien d’autre.
 */

const CLUB_HUE: Record<ClubId, string> = {
  minimes: '#2F6BFF',
  'saint-cyprien': '#8B5CF6',
  'etats-unis': '#10B981',
  ramonville: '#D946EF',
  portet: '#F97316',
};

type Entry =
  | { kind: 'passage'; date: string; club: ClubId; heure: string }
  | { kind: 'facture'; date: string; numero: string; montant: number; origine: string }
  | { kind: 'actu'; date: string; titre: string };

export function HomeB() {
  const member = useSession((s) => s.member);
  const now = new Date();
  const stats = computeStats(member, now);
  const [week, setWeek] = useState(stats.serie.length - 1);
  const top = stats.parClub[0];
  const topClub = top ? clubById(top.club) : clubById(member.clubPrincipal);
  const usual = usualSlot(member.passages);

  const today = now.toISOString().slice(0, 10);
  const entries: Entry[] = [
    ...member.passages.map((p) => ({ kind: 'passage' as const, date: p.date, club: p.club, heure: p.heure })),
    ...INVOICES.filter((f) => f.origine === 'Deciplus').map((f) => ({ kind: 'facture' as const, date: f.date, numero: f.numero, montant: f.montant, origine: f.origine })),
    ...NEWS.filter((n) => n.date <= today).map((n) => ({ kind: 'actu' as const, date: n.date, titre: n.titre })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 9);

  const maxWeek = Math.max(1, ...stats.serie.map((w) => w.passages));

  return (
    <Page padded={false}>
      <View style={styles.head}>
        <Body size="caption" eyebrow tone="muted">
          Ton carnet · {moisLabel(now)} {now.getFullYear()}
        </Body>
        <View style={styles.hero}>
          <Display size="display1" tabular tight>
            {stats.mois}
          </Display>
          <View style={styles.heroText}>
            <Body size="title" weight="semi">
              {stats.mois > 1 ? 'séances' : 'séance'} en {stats.moisLabel}
            </Body>
            <Body size="bodySmall" tone="muted">
              {stats.total} depuis la rentrée
            </Body>
          </View>
        </View>
        <Body tone="muted" style={styles.legend}>
          <Body weight="bold" tabular style={{ color: color.text }}>
            {stats.moyenneParSemaine}
          </Body>{' '}
          {stats.moyenneParSemaine > 1 ? 'séances' : 'séance'} par semaine en moyenne, surtout{' '}
          <Body weight="bold" style={{ color: CLUB_HUE[topClub.id] }}>
            {auClub(topClub.id, topClub.court)}
          </Body>
          {usual ? (
            <>
              , le{' '}
              <Body weight="bold" style={{ color: color.text }}>
                {usual}
              </Body>
            </>
          ) : null}
          .
        </Body>
      </View>

      <View style={styles.figure}>
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
      </View>

      <View style={styles.clubs}>
        {stats.parClub.map((c, i) => {
          const club = clubById(c.club);
          const pct = Math.max(0.28, c.passages / stats.mois);
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

      <View style={styles.ledger}>
        <View style={styles.ledgerHead}>
          <Mono size="micro">Nº</Mono>
          <Mono size="micro">ENTRÉE</Mono>
          <Mono size="micro">TAMPON</Mono>
        </View>
        {entries.map((e, i) => (
          <LedgerRow key={`${e.kind}-${e.date}-${i}`} entry={e} index={i} numero={stats.total + INVOICES.length - i} latest={i === 0} />
        ))}
      </View>
    </Page>
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

function LedgerRow({ entry, index, numero, latest }: { entry: Entry; index: number; numero: number; latest: boolean }) {
  const delay = Math.min(index, stagger.max) * stagger.step;
  const main =
    entry.kind === 'passage' ? `${clubById(entry.club).court} · ${entry.heure}` : entry.kind === 'facture' ? `Facture ${entry.numero}` : entry.titre;
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
      <View style={styles.rowStamp}>
        {entry.kind === 'passage' ? <Stamp label="PRÉSENT" ink={latest} delay={latest ? 300 : 0} /> : entry.kind === 'facture' ? <Stamp label="PAYÉ" /> : null}
      </View>
    </Animated.View>
  );
}

/** Le tampon : Bebas incliné, posé une fois avec le seul rebond de l’app (l’encre). */
function Stamp({ label, ink: red, delay = 0 }: { label: string; ink?: boolean; delay?: number }) {
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

function usualSlot(passages: { date: string; heure: string }[]): string | null {
  if (!passages.length) return null;
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const count = new Map<string, number>();
  for (const p of passages) {
    const d = new Date(p.date + 'T12:00:00');
    const h = p.heure.slice(0, 2);
    const key = `${jours[d.getDay()]} ${Number(h)} h`;
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? best[0] : null;
}

function weekNumber(d: Date): number {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space[4], gap: space[3] },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3] },
  heroText: { paddingBottom: 6, gap: 2 },
  legend: { marginTop: space[1] },
  figure: { marginTop: space[6], paddingHorizontal: space[4] },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 6 },
  barHit: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, justifyContent: 'flex-end', backgroundColor: whiteAlpha[2], borderRadius: radius.xs, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: radius.xs },
  weeks: { flexDirection: 'row', gap: 6, marginTop: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 9 },
  figureCaption: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2], paddingTop: space[2], borderTopWidth: stroke.hair, borderTopColor: ink[300] },
  clubs: { marginTop: space[5], paddingHorizontal: space[4], alignItems: 'flex-start' },
  clubPlate: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.xs, borderWidth: stroke.hair, borderColor: whiteAlpha[6], minWidth: 150, justifyContent: 'space-between' },
  clubDot: { width: 6, height: 6, borderRadius: 3 },
  ledger: { marginTop: space[6], paddingHorizontal: space[4] },
  ledgerHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  rowNo: { width: 30 },
  rowBody: { flex: 1, gap: 2 },
  rowStamp: { width: 84, alignItems: 'flex-end' },
  stamp: { borderWidth: 1.5, borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 3 },
});
