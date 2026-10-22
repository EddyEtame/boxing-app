import { useEffect, type ComponentType, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import type { IconProps } from '@/ui/icons';
import { IconChevron } from '@/ui/icons';
import { Tap } from '@/ui/Tap';
import { Body, Heading, type Tone } from '@/ui/Text';
import { duration, easing, makeStyles, radius, space, spring, stroke, useTheme } from '@/ui/theme';

const STANDARD = Easing.bezier(easing.standard[0], easing.standard[1], easing.standard[2], easing.standard[3]);

/* ------------------------------------------------------------------ */
/* Carte                                                                 */
/* ------------------------------------------------------------------ */

type CardProps = PropsWithChildren<{ style?: StyleProp<ViewStyle>; padded?: boolean; onPress?: () => void; accessibilityLabel?: string }>;

/** La carte : blanche sur la toile (clair), un palier au-dessus de la salle (sombre). */
export function Card({ style, padded = true, onPress, accessibilityLabel, children }: CardProps) {
  const s = useStyles();
  const body = <View style={[s.card, padded && s.cardPadded, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Tap onPress={onPress} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {body}
    </Tap>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                               */
/* ------------------------------------------------------------------ */

type SectionProps = PropsWithChildren<{ title: string; action?: { label: string; onPress: () => void }; style?: StyleProp<ViewStyle>; note?: string }>;

/** Un titre en phrase, un lien à droite, du contenu. 32 pt avant chaque section. */
export function Section({ title, action, note, style, children }: SectionProps) {
  const s = useStyles();
  return (
    <View style={[s.section, style]}>
      <View style={s.sectionHead}>
        <Heading level="section" style={s.sectionTitle}>
          {title}
        </Heading>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={action.label}>
            <Body size="bodySmall" weight="bold" tone="accent">
              {action.label}
            </Body>
          </Pressable>
        ) : null}
      </View>
      {note ? (
        <Body size="caption" tone="dim" style={s.sectionNote}>
          {note}
        </Body>
      ) : null}
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Boutons                                                               */
/* ------------------------------------------------------------------ */

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary = navy (clair) / blanc (sombre) · accent = rouge, une fois par écran · secondary = contour · ghost = texte. */
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost';
  icon?: ComponentType<IconProps>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon: Icon, disabled, style, small }: ButtonProps) {
  const t = useTheme();
  const s = useStyles();
  const bg = variant === 'primary' ? t.primary : variant === 'accent' ? t.accent : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : variant === 'accent' ? t.onAccent : t.text;
  const tone: Tone = variant === 'primary' ? 'onPrimary' : variant === 'accent' ? 'onAccent' : 'text';
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.97}
      haptic="medium"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[s.button, small && s.buttonSmall, { backgroundColor: bg }, variant === 'secondary' && s.buttonOutline, disabled && s.disabled, style]}>
      {Icon ? <Icon size={small ? 18 : 20} color={fg} /> : null}
      <Body size={small ? 'bodySmall' : 'body'} weight="bold" tone={tone}>
        {label}
      </Body>
    </Tap>
  );
}

/* ------------------------------------------------------------------ */
/* Puces et contrôle segmenté                                            */
/* ------------------------------------------------------------------ */

export function Chip({ label, selected, onPress, icon: Icon, style }: { label: string; selected: boolean; onPress: () => void; icon?: ComponentType<IconProps>; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <Tap onPress={onPress} scaleTo={0.94} haptic="selection" accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} style={[s.chip, selected && s.chipOn, style]}>
      {Icon ? <Icon size={16} color={selected ? t.onPrimary : t.textMuted} /> : null}
      <Body size="bodySmall" weight="bold" tone={selected ? 'onPrimary' : 'muted'} numberOfLines={1}>
        {label}
      </Body>
    </Tap>
  );
}

type SegOption<T extends string> = { value: T; label: string; icon?: ComponentType<IconProps> };

/** Contrôle segmenté : la pastille glisse sous l'option choisie (ressort, sans rebond). */
export function Segmented<T extends string>({ value, options, onChange, style, full }: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; style?: StyleProp<ViewStyle>; full?: boolean }) {
  const t = useTheme();
  const s = useStyles();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(index);
  const width = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(index, spring.snappy);
  }, [index, x]);
  const pill = useAnimatedStyle(() => ({
    width: width.value / options.length - 6,
    transform: [{ translateX: x.value * (width.value / options.length) }],
  }));
  return (
    <View
      style={[s.seg, full && s.segFull, style]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width - 0;
      }}>
      <Animated.View style={[s.segPill, pill]} />
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={s.segBtn} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={o.label}>
            {Icon ? <Icon size={17} color={on ? t.text : t.textMuted} /> : null}
            <Body size="bodySmall" weight="bold" tone={on ? 'text' : 'muted'} numberOfLines={1}>
              {o.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Ligne de liste et tuile d'icône                                       */
/* ------------------------------------------------------------------ */

export function IconTile({ icon: Icon, tone = 'neutral', size = 40 }: { icon: ComponentType<IconProps>; tone?: 'neutral' | 'accent' | 'positive' | 'brand'; size?: number }) {
  const t = useTheme();
  const bg = tone === 'accent' ? t.accentSoft : tone === 'positive' ? t.positiveSoft : tone === 'brand' ? t.primary : t.tint;
  const fg = tone === 'accent' ? t.accentText : tone === 'positive' ? t.positive : tone === 'brand' ? t.onPrimary : t.text;
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={Math.round(size * 0.52)} color={fg} />
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  icon?: ComponentType<IconProps>;
  iconTone?: 'neutral' | 'accent' | 'positive' | 'brand';
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  tone?: Tone;
};

/** La ligne réglage / rubrique : icône en tuile, titre lisible, chevron. 56 pt au moins. */
export function Row({ title, subtitle, icon, iconTone, right, onPress, chevron = !!onPress, last, tone = 'text' }: RowProps) {
  const t = useTheme();
  const s = useStyles();
  const content = (
    <View style={[s.row, !last && s.rowLine]}>
      {icon ? <IconTile icon={icon} tone={iconTone} size={36} /> : null}
      <View style={s.rowText}>
        <Body weight="semi" tone={tone} numberOfLines={2}>
          {title}
        </Body>
        {subtitle ? (
          <Body size="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Body>
        ) : null}
      </View>
      {right}
      {chevron ? <IconChevron size={18} color={t.textDim} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Tap onPress={onPress} scaleTo={0.985} haptic="light" accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </Tap>
  );
}

/** Pastille de compte (messages non lus) : rouge, chiffre blanc, comme WhatsApp. */
export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  const scale = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(1, { duration: duration.cross, easing: STANDARD });
  }, [count, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (count <= 0) return null;
  return (
    <Animated.View style={[s.count, animated, style]}>
      <Body size="micro" weight="bold" tone="onAccent" style={s.countText}>
        {count > 99 ? '99+' : count}
      </Body>
    </Animated.View>
  );
}

/** Point vivant (pulsation douce) : un code actif, un message non lu. */
export function LiveDot({ color, size = 8 }: { color?: string; size?: number }) {
  const t = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) });
    const id = setInterval(() => {
      pulse.value = 0;
      pulse.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) });
    }, 1800);
    return () => clearInterval(id);
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.6 }] }));
  const c = color ?? t.accent;
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: c }, ring]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: c }]} />
    </View>
  );
}

/** L'interrupteur aux couleurs de l'ambiance (vert = actif, comme iOS ; pouce blanc). */
export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      trackColor={{ false: t.lineStrong, true: t.positive }}
      thumbColor="#FFFFFF"
      {...({ activeTrackColor: t.positive, activeThumbColor: '#FFFFFF' } as object)}
      accessibilityLabel={label}
    />
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.card,
    borderRadius: radius.card,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : { borderWidth: stroke.hair, borderColor: t.line }),
  },
  cardPadded: { padding: space[5] },
  section: { marginTop: space[8] },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[3], marginBottom: space[4] },
  sectionTitle: { flex: 1 },
  sectionNote: { marginTop: -space[2], marginBottom: space[3] },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], minHeight: 54, borderRadius: radius.control + 4, paddingHorizontal: space[5] },
  buttonSmall: { minHeight: 42, paddingHorizontal: space[4], borderRadius: radius.control },
  buttonOutline: { borderWidth: stroke.thin, borderColor: t.lineStrong },
  disabled: { opacity: 0.4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: space[4], borderRadius: radius.pill, backgroundColor: t.chip },
  chipOn: { backgroundColor: t.primary },
  seg: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: t.chip, borderRadius: radius.control + 2, padding: 3 },
  segFull: { alignSelf: 'stretch' },
  segPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: radius.control,
    backgroundColor: t.card,
    ...(t.scheme === 'light' ? { boxShadow: '0px 1px 3px rgba(16,19,42,0.12)' } : null),
  },
  segBtn: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 60, paddingVertical: space[3] },
  rowLine: { borderBottomWidth: stroke.hair, borderBottomColor: t.line },
  rowText: { flex: 1, gap: 2 },
  count: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, lineHeight: 14 },
}));
