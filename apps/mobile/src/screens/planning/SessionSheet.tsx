import { useEffect, useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubById } from '@/data/clubs';
import type { Slot } from '@/data/planning';
import { familleColor, heure, normaliseActivite } from '@/features/planning/model';
import { shareSession } from '@/features/planning/share';
import { longDate, WEEKDAYS } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useUsage } from '@/state/usage';
import { IconClose, IconShare, IconStar } from '@/ui/icons';
import { Button } from '@/ui/kit';
import { Tap } from '@/ui/Tap';
import { Body, Display } from '@/ui/Text';
import { easing, GUTTER, makeStyles, MAX_CONTENT_WIDTH, radius, space, stroke, useTheme } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

export type SheetTarget = { slot: Slot; jour: number } | null;

/** Ouvre, ferme, et ne vide la cible qu'une fois la feuille descendue. */
export function useSessionSheet() {
  const [target, setTarget] = useState<SheetTarget>(null);
  const [open, setOpen] = useState(false);
  return {
    target,
    open,
    show: (slot: Slot, jour: number) => {
      setTarget({ slot, jour });
      setOpen(true);
    },
    close: () => setOpen(false),
    closed: () => setTarget(null),
  };
}

/** La prochaine date où ce cours a lieu (aujourd'hui s'il n'est pas fini). */
function nextDate(jour: number, fin: number, now: Date): Date {
  const today = (now.getDay() + 6) % 7;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let offset = (jour - today + 7) % 7;
  if (offset === 0 && fin <= nowMin) offset = 7;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
  return d;
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * La fiche d'un cours, en feuille qui monte du bas : la discipline, l'heure,
 * la durée, la salle, le public, la prochaine date. Suivre le cours (étoile)
 * et le partager. Pas de réservation : les cours ne se réservent pas (CDC §7).
 */
export function SessionSheet({ target, open, onClose, onClosed, onSeeDay }: { target: SheetTarget; open: boolean; onClose: () => void; onClosed: () => void; onSeeDay: (jour: number) => void }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const favorites = useUsage((st) => st.favorites);
  const toggleFavorite = useUsage((st) => st.toggleFavorite);
  const [copied, setCopied] = useState(false);
  const p = useSharedValue(0);

  // La cible reste montée pendant la descente ; le parent la vide quand `onClosed` arrive.
  useEffect(() => {
    if (open) {
      p.value = withTiming(1, { duration: reduced ? 0 : 360, easing: ARRIVE });
      return;
    }
    p.value = withTiming(0, { duration: reduced ? 0 : 220, easing: ARRIVE }, (done) => {
      if (done) runOnJS(onClosed)();
    });
  }, [open, reduced, p, onClosed]);

  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 80 }], opacity: p.value }));

  if (!target) return null;
  const { slot, jour } = target;
  const a = normaliseActivite(slot.activite);
  const club = clubById(slot.club);
  const tint = familleColor(a.famille);
  const fav = favorites.includes(slot.id);
  const when = nextDate(jour, slot.fin, new Date());
  const minutes = slot.fin - slot.debut;
  const facts = [
    [T('planning.sheet.when'), `${WEEKDAYS[lang][jour]} · ${heure(slot.debut)}–${heure(slot.fin)}`],
    [T('planning.sheet.duration'), T('planning.sheet.minutes', { n: minutes })],
    [T('planning.sheet.club'), `Boxing Center ${club.court}${slot.espace ? ` · ${slot.espace}` : ''}`],
    a.public || a.niveau ? [T('planning.sheet.who'), [a.public, a.niveau].filter(Boolean).join(' · ')] : null,
    [T('planning.sheet.next'), longDate(ymd(when), lang)],
  ].filter((x): x is [string, string] => !!x);

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={s.root}>
        <Animated.View style={[s.backdrop, { backgroundColor: t.overlay }, backdrop]}>
          <Pressable style={s.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel={T('common.close')} />
        </Animated.View>
        <Animated.View style={[s.sheet, { width: Math.min(width, MAX_CONTENT_WIDTH), paddingBottom: Math.max(insets.bottom, 16) + space[4], backgroundColor: t.bgElevated, boxShadow: t.shadowFloat }, sheet]}>
          <View style={[s.handle, { backgroundColor: t.lineStrong }]} />
          <View style={[s.band, { backgroundColor: tint }]} />
          <View style={s.headRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Body size="caption" weight="bold" eyebrow tone="muted">
                {club.court}
              </Body>
              <Display size="display3" tight numberOfLines={2}>
                {a.libelle}
              </Display>
            </View>
            <Tap onPress={onClose} scaleTo={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={T('common.close')} style={[s.close, { backgroundColor: t.chip }]}>
              <IconClose size={18} />
            </Tap>
          </View>

          <View style={[s.facts, { borderColor: t.line }]}>
            {facts.map(([k, v], i) => (
              <View key={k} style={[s.fact, i < facts.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
                <Body size="caption" weight="semi" tone="muted" style={s.factKey}>
                  {k}
                </Body>
                <Body size="bodySmall" weight="bold" style={{ flex: 1 }}>
                  {v}
                </Body>
              </View>
            ))}
          </View>

          <View style={s.actions}>
            <Button
              label={fav ? T('planning.sheet.favorited') : T('planning.sheet.favorite')}
              icon={IconStar}
              variant={fav ? 'primary' : 'secondary'}
              onPress={() => toggleFavorite(slot.id)}
              style={{ flex: 1 }}
            />
            <Button
              label={copied ? T('planning.copied') : T('planning.share')}
              icon={IconShare}
              variant="secondary"
              onPress={async () => {
                const ok = await shareSession(slot, jour, lang);
                if (ok) setCopied(true);
              }}
              style={{ flex: 1 }}
            />
          </View>
          <Body size="caption" tone="dim" style={s.note}>
            {T('planning.sheet.favoriteNote')}
          </Body>
          <Pressable onPress={() => onSeeDay(jour)} hitSlop={8} accessibilityRole="button" style={s.seeDay}>
            <Body size="bodySmall" weight="bold" tone="accent">
              {T('planning.sheet.seeDay', { day: WEEKDAYS[lang][jour] })}
            </Body>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(() => ({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  fill: { flex: 1 },
  sheet: { borderTopLeftRadius: radius.card + 6, borderTopRightRadius: radius.card + 6, paddingHorizontal: GUTTER, paddingTop: space[3], gap: space[4], overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space[1] },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  facts: { borderWidth: stroke.hair, borderRadius: radius.tile, paddingHorizontal: space[4] },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 10 },
  factKey: { width: 92 },
  actions: { flexDirection: 'row', gap: space[3] },
  note: { textAlign: 'center' },
  seeDay: { alignSelf: 'center', paddingVertical: 4 },
}));
