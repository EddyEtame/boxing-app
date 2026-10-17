import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { color, fontFamily, fontSize, letterSpacing, lineHeight } from '@/ui/theme';

type DisplaySize = 'display1' | 'display2' | 'display3' | 'display4' | 'display5';
type TextSize = 'title' | 'body' | 'bodySmall' | 'caption' | 'micro';
type Weight = 'regular' | 'medium' | 'semi' | 'bold' | 'black';
type Tone = 'text' | 'muted' | 'dim' | 'accent' | 'inverse' | 'positive' | 'negative' | 'onAccent';

const weightFamily: Record<Weight, string> = {
  regular: fontFamily.text,
  medium: fontFamily.textMedium,
  semi: fontFamily.textSemi,
  bold: fontFamily.textBold,
  black: fontFamily.textBlack,
};

const toneColor: Record<Tone, string> = {
  text: color.text,
  muted: color.textMuted,
  dim: color.textDim,
  accent: color.accentOnDark,
  inverse: color.textInverse,
  positive: color.positive,
  negative: color.negative,
  onAccent: color.onAccent,
};

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

/** Titres et chiffres : Bebas Neue, capitales, interligne serré. */
export function Display({ size = 'display3', tone = 'text', tight, tabular, upper = true, style, children, ...rest }: DisplayProps) {
  const px = fontSize[size];
  // Un texte tronqué (numberOfLines) est rogné à sa boîte : les accents des capitales
  // dépassent l’interligne serré de Bebas. On ouvre l’interligne dans ce cas seulement.
  const clamped = rest.numberOfLines !== undefined;
  const base: TextStyle = {
    fontFamily: fontFamily.display,
    fontSize: px,
    lineHeight: Math.round(px * (clamped ? 1.04 : lineHeight.display)),
    letterSpacing: tight || px > 44 ? letterSpacing.displayTight : letterSpacing.display,
    color: toneColor[tone],
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
  /** Avant-titre : capitales très espacées. */
  eyebrow?: boolean;
  tabular?: boolean;
};

/** Texte courant : Montserrat, 500 par défaut (jamais sous 400). */
export function Body({ size = 'body', weight = 'medium', tone = 'text', caps, eyebrow, tabular, style, children, ...rest }: BodyProps) {
  const px = fontSize[size];
  const base: TextStyle = {
    fontFamily: weightFamily[weight],
    fontSize: px,
    lineHeight: Math.round(px * (size === 'title' ? lineHeight.tight : lineHeight.text)),
    letterSpacing: px <= 14 ? letterSpacing.small : 0,
    color: toneColor[tone],
    ...(caps ? { textTransform: 'uppercase', letterSpacing: letterSpacing.caps } : null),
    ...(eyebrow ? { textTransform: 'uppercase', letterSpacing: letterSpacing.capsWide } : null),
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
  };
  return (
    <RNText {...rest} style={[base, style]} maxFontSizeMultiplier={1.4}>
      {children}
    </RNText>
  );
}

/** Étiquettes techniques (numéro de badge, horodatages, codes) : IBM Plex Mono, chiffres tabulaires. */
export function Mono({ size = 'caption', tone = 'muted', style, children, ...rest }: Omit<BodyProps, 'weight'>) {
  const px = fontSize[size];
  const base: TextStyle = {
    fontFamily: fontFamily.mono,
    fontSize: px,
    lineHeight: Math.round(px * lineHeight.text),
    letterSpacing: letterSpacing.mono,
    color: toneColor[tone],
    fontVariant: ['tabular-nums'],
  };
  return (
    <RNText {...rest} style={[base, style]} maxFontSizeMultiplier={1.3}>
      {children}
    </RNText>
  );
}
