import { createContext, useContext } from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { fontFamily, fontSize, letterSpacing, lineHeight, useTheme, type Theme } from '@/ui/theme';

type DisplaySize = 'display1' | 'display2' | 'display3' | 'display4' | 'display5';
type TextSize = 'title' | 'body' | 'bodySmall' | 'caption' | 'micro';
type Weight = 'regular' | 'medium' | 'semi' | 'bold' | 'black';
export type Tone = 'text' | 'muted' | 'dim' | 'accent' | 'inverse' | 'positive' | 'negative' | 'warning' | 'onAccent' | 'onPrimary';

/**
 * Ce qui est posé sur une photo (voile sombre) reste clair dans les deux
 * ambiances. `Photo` fournit ce contexte ; les textes le lisent seuls.
 */
export const OnPhotoContext = createContext(false);

const weightFamily: Record<Weight, string> = {
  regular: fontFamily.text,
  medium: fontFamily.textMedium,
  semi: fontFamily.textSemi,
  bold: fontFamily.textBold,
  black: fontFamily.textBlack,
};

function toneColor(t: Theme, tone: Tone, onPhoto: boolean): string {
  if (onPhoto) {
    if (tone === 'text') return t.photo.text;
    if (tone === 'muted') return t.photo.muted;
    if (tone === 'dim') return t.photo.dim;
    if (tone === 'accent') return '#FF4D5E';
  }
  switch (tone) {
    case 'muted':
      return t.textMuted;
    case 'dim':
      return t.textDim;
    case 'accent':
      return t.accentText;
    case 'inverse':
      return t.textInverse;
    case 'positive':
      return t.positive;
    case 'negative':
      return t.negative;
    case 'warning':
      return t.warning;
    case 'onAccent':
      return t.onAccent;
    case 'onPrimary':
      return t.onPrimary;
    default:
      return t.text;
  }
}

export function useToneColor(tone: Tone = 'text'): string {
  const t = useTheme();
  const onPhoto = useContext(OnPhotoContext);
  return toneColor(t, tone, onPhoto);
}

export type DisplayProps = TextProps & {
  size?: DisplaySize;
  tone?: Tone;
  /** Interlettrage à 0 (par défaut au-dessus de 44 pt). */
  tight?: boolean;
  /** Chiffres tabulaires : chronos, montants, numéros. */
  tabular?: boolean;
  /** Bebas se lit en capitales ; `false` pour les heures (« 18h30 »). */
  upper?: boolean;
};

/** Titres courts et chiffres d'affiche : Bebas Neue, capitales, interligne serré. */
export function Display({ size = 'display3', tone = 'text', tight, tabular, upper = true, style, children, ...rest }: DisplayProps) {
  const c = useToneColor(tone);
  const px = fontSize[size];
  // Un texte tronqué (numberOfLines) est rogné à sa boîte : les accents des capitales
  // dépassent l'interligne serré de Bebas. On ouvre l'interligne dans ce cas seulement.
  const clamped = rest.numberOfLines !== undefined;
  const base: TextStyle = {
    fontFamily: fontFamily.display,
    fontSize: px,
    lineHeight: Math.round(px * (clamped ? 1.04 : lineHeight.display)),
    letterSpacing: tight || px > 44 ? letterSpacing.displayTight : letterSpacing.display,
    color: c,
    textTransform: upper ? 'uppercase' : 'none',
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
  };
  return (
    <RNText {...rest} style={[base, style]} maxFontSizeMultiplier={1.2}>
      {children}
    </RNText>
  );
}

export type BodyProps = TextProps & {
  size?: TextSize;
  weight?: Weight;
  tone?: Tone;
  caps?: boolean;
  /** Avant-titre : capitales espacées, une ligne. */
  eyebrow?: boolean;
  tabular?: boolean;
};

/** Texte courant : Montserrat, 500 par défaut (jamais sous 400). */
export function Body({ size = 'body', weight = 'medium', tone = 'text', caps, eyebrow, tabular, style, children, ...rest }: BodyProps) {
  const c = useToneColor(tone);
  const px = fontSize[size];
  const base: TextStyle = {
    fontFamily: weightFamily[weight],
    fontSize: px,
    lineHeight: Math.round(px * (size === 'title' ? lineHeight.tight : lineHeight.text)),
    letterSpacing: px <= 14 ? letterSpacing.small : 0,
    color: c,
    ...(caps ? { textTransform: 'uppercase', letterSpacing: 1.2 } : null),
    ...(eyebrow ? { textTransform: 'uppercase', letterSpacing: 1.6 } : null),
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
  };
  return (
    <RNText {...rest} style={[base, style]} maxFontSizeMultiplier={1.4}>
      {children}
    </RNText>
  );
}

/**
 * Titres en phrase, lisibles d'abord (20/10/2026) :
 *  - `section` : Montserrat 800, 21 pt — « Prochain cours », « Actualités » ;
 *  - `card` : Montserrat 700, 17 pt — le titre d'une carte ou d'une ligne.
 */
export function Heading({ level = 'section', tone = 'text', style, children, ...rest }: TextProps & { level?: 'section' | 'card'; tone?: Tone }) {
  const c = useToneColor(tone);
  const section = level === 'section';
  const base: TextStyle = {
    fontFamily: section ? fontFamily.textBlack : fontFamily.textBold,
    fontSize: section ? 21 : 17,
    lineHeight: section ? 26 : 22,
    letterSpacing: section ? -0.3 : -0.1,
    color: c,
  };
  return (
    <RNText accessibilityRole="header" {...rest} style={[base, style]} maxFontSizeMultiplier={1.35}>
      {children}
    </RNText>
  );
}

/** Étiquettes techniques (numéro de badge, horodatages, codes) : IBM Plex Mono, chiffres tabulaires. */
export function Mono({ size = 'caption', tone = 'muted', style, children, ...rest }: Omit<BodyProps, 'weight'>) {
  const c = useToneColor(tone);
  const px = fontSize[size];
  const base: TextStyle = {
    fontFamily: fontFamily.mono,
    fontSize: px,
    lineHeight: Math.round(px * lineHeight.text),
    letterSpacing: letterSpacing.mono,
    color: c,
    fontVariant: ['tabular-nums'],
  };
  return (
    <RNText {...rest} style={[base, style]} maxFontSizeMultiplier={1.3}>
      {children}
    </RNText>
  );
}
