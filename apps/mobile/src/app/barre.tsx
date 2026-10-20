import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { SECTIONS } from '@/features/sections';
import { useT } from '@/i18n';
import { BAR_SIZE, BAR_SLOTS, DEFAULT_BAR, usePrefs, type BarSlot } from '@/state/prefs';
import { IconArrow, IconCheck } from '@/ui/icons';
import { Button, Card, IconTile, Section } from '@/ui/kit';
import { Page } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body } from '@/ui/Text';
import { duration, makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

import { BarPreview } from '@/screens/plus';

/**
 * Ta barre (Facebook « personnaliser la barre », en plus lisible) : Accueil et
 * Plus restent, l'adhérent choisit les trois du milieu et leur ordre ;
 * l'aperçu se recompose sous ses yeux.
 */
export default function BarreScreen() {
  const T = useT();
  const s = useStyles();
  const saved = usePrefs((st) => st.bar);
  const setBar = usePrefs((st) => st.setBar);
  const [draft, setDraft] = useState<BarSlot[]>(saved);
  const available = BAR_SLOTS.filter((id) => !draft.includes(id));
  const full = draft.length >= BAR_SIZE;

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  };

  return (
    <Page title={T('bar.title')} subtitle={T('bar.sub')} leading="close" tabBar={false}>
      <Animated.View layout={LinearTransition.duration(duration.round)}>
        <BarPreview bar={draft.length === BAR_SIZE ? draft : [...draft, ...available].slice(0, BAR_SIZE)} />
      </Animated.View>

      <Section title={T('bar.inBar', { n: draft.length, max: BAR_SIZE })}>
        <Card padded={false} style={s.list}>
          {draft.map((id, i) => (
            <Animated.View key={id} layout={LinearTransition.duration(duration.round)} entering={FadeIn.duration(duration.cross)} exiting={FadeOut.duration(duration.jab)}>
              <SlotRow id={id} position={i + 1} last={i === draft.length - 1} onUp={i > 0 ? () => move(i, -1) : undefined} onDown={i < draft.length - 1 ? () => move(i, 1) : undefined} onRemove={() => setDraft(draft.filter((x) => x !== id))} />
            </Animated.View>
          ))}
          {draft.length === 0 ? (
            <Body tone="muted" style={s.empty}>
              {T('bar.empty')}
            </Body>
          ) : null}
        </Card>
      </Section>

      <Section title={T('bar.available')} note={full ? T('bar.fullNote') : undefined}>
        <Card padded={false} style={s.list}>
          {available.map((id, i) => (
            <Animated.View key={id} layout={LinearTransition.duration(duration.round)} entering={FadeIn.duration(duration.cross)} exiting={FadeOut.duration(duration.jab)}>
              <AddRow id={id} disabled={full} last={i === available.length - 1} onAdd={() => setDraft([...draft, id])} />
            </Animated.View>
          ))}
        </Card>
      </Section>

      <Button
        label={T('bar.save')}
        icon={IconCheck}
        disabled={draft.length !== BAR_SIZE}
        onPress={() => {
          setBar(draft);
          router.back();
        }}
        style={s.save}
      />
      <Button label={T('bar.reset')} variant="ghost" onPress={() => setDraft(DEFAULT_BAR)} style={s.reset} />
    </Page>
  );
}

function SlotRow({ id, position, last, onUp, onDown, onRemove }: { id: BarSlot; position: number; last: boolean; onUp?: () => void; onDown?: () => void; onRemove: () => void }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const section = SECTIONS[id];
  return (
    <View style={[s.row, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
      <Body weight="black" tone="dim" style={s.pos}>
        {position}
      </Body>
      <IconTile icon={section.icon} size={36} />
      <Body weight="semi" style={{ flex: 1 }} numberOfLines={1}>
        {T(section.title)}
      </Body>
      <RoundIcon label={T('bar.up')} onPress={onUp}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <IconArrow size={18} color={onUp ? t.text : t.textDim} />
        </View>
      </RoundIcon>
      <RoundIcon label={T('bar.down')} onPress={onDown}>
        <View style={{ transform: [{ rotate: '90deg' }] }}>
          <IconArrow size={18} color={onDown ? t.text : t.textDim} />
        </View>
      </RoundIcon>
      <RoundIcon label={T('bar.remove')} onPress={onRemove} danger>
        <Body weight="black" tone="negative" style={s.sign}>
          −
        </Body>
      </RoundIcon>
    </View>
  );
}

function AddRow({ id, disabled, last, onAdd }: { id: BarSlot; disabled: boolean; last: boolean; onAdd: () => void }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const section = SECTIONS[id];
  return (
    <View style={[s.row, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
      <IconTile icon={section.icon} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="semi" numberOfLines={1}>
          {T(section.title)}
        </Body>
        <Body size="caption" tone="muted" numberOfLines={1}>
          {T(section.sub)}
        </Body>
      </View>
      <RoundIcon label={T('bar.add')} onPress={disabled ? undefined : onAdd}>
        <Body weight="black" tone={disabled ? 'dim' : 'positive'} style={s.sign}>
          +
        </Body>
      </RoundIcon>
    </View>
  );
}

function RoundIcon({ label, onPress, children, danger }: { label: string; onPress?: () => void; children: React.ReactNode; danger?: boolean }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Tap onPress={onPress} disabled={!onPress} scaleTo={0.88} haptic="selection" accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !onPress }} style={[s.round, { backgroundColor: danger ? t.negativeSoft : t.chip, opacity: onPress ? 1 : 0.45 }]}>
      {children}
    </Tap>
  );
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64, paddingVertical: space[3] },
  pos: { width: 16, textAlign: 'center' },
  round: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sign: { fontSize: 22, lineHeight: 24 },
  empty: { paddingVertical: space[4] },
  save: { marginTop: space[7] },
  reset: { marginTop: space[2] },
}));
