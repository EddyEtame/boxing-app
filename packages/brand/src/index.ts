/**
 * Jetons de marque Boxing Center.
 *
 * Sources : charte BC_Brand_Guidelines v1.0 (juin 2026), bc-design, et les lois
 * chiffrées extraites de la banque de références le 17/10/2026
 * (.research/veille/banque-registre.md §4).
 *
 * Règles non négociables :
 *  - le logo est un FICHIER (assets/brand), jamais recomposé en texte ;
 *  - le rouge #E8001C est la seule couleur d'énergie : un élément chaud par écran,
 *    jamais en fond de composant — texte `accentOnDark`, barre 6 px, filet de vie, tampon ;
 *  - photo réelle uniquement, jamais d'image générée ;
 *  - une courbe tenue partout (`standard`) : la signature est la répétition, pas l'effet.
 */

/* ------------------------------------------------------------------ */
/* Couleurs primitives — valeurs exactes de la charte                  */
/* ------------------------------------------------------------------ */

export const primitives = {
  navy: '#20254B',       // logo, titres corporate
  navyDeep: '#0C1829',   // fond profond, coulisses
  bronze: '#6D3111',     // contour du logo uniquement
  black: '#080808',      // fond principal
  white: '#F5F5F5',      // texte sur fond sombre
  red: '#E8001C',        // THE énergie — un élément par écran
  redBadge: '#C8001A',   // plaques de prix (supports de campagne)
  gray: '#AAAAAA',       // texte secondaire
  gold: '#FFB347',       // campagne uniquement, jamais dans l'app
} as const;

/**
 * Gamme neutre teintée navy. Le noir BC est le sol ; au-dessus, chaque palier
 * emprunte une pointe de navy pour que les surfaces lisent « Boxing Center » et
 * pas « mode sombre générique ».
 */
export const ink = {
  0: '#080808',
  50: '#0B0D14',
  100: '#0F111A',
  150: '#141724',
  200: '#191D2C',
  300: '#222739',
  400: '#2E3449',
  500: '#3F465D',
  600: '#5A6178',
  700: '#7E8498',
  800: '#AAAAAA',
  900: '#D7D9E0',
  1000: '#F5F5F5',
} as const;

/** Blanc à faible opacité : squelettes, filets, plaques superposées (Mercury / Exo Ape). */
export const whiteAlpha = {
  2: 'rgba(245,245,245,0.02)',
  4: 'rgba(245,245,245,0.04)',
  6: 'rgba(245,245,245,0.06)',
  8: 'rgba(245,245,245,0.08)',
  12: 'rgba(245,245,245,0.12)',
  20: 'rgba(245,245,245,0.20)',
} as const;

export const blackAlpha = {
  40: 'rgba(8,8,8,0.40)',
  60: 'rgba(8,8,8,0.60)',
  72: 'rgba(8,8,8,0.72)',
  88: 'rgba(8,8,8,0.88)',
  92: 'rgba(8,8,8,0.92)',
} as const;

/* ------------------------------------------------------------------ */
/* Couleurs sémantiques — ce que les écrans utilisent                  */
/* ------------------------------------------------------------------ */

export const color = {
  bg: ink[0],
  bgRaised: ink[100],
  bgSunken: '#000000',
  surface: ink[150],
  surfaceHover: ink[200],
  surfaceActive: ink[300],
  surfaceEmphasized: ink[200],
  /** Verre : iOS flou 20 ; Android et web, cette couleur à 92 % + filet whiteAlpha 6. */
  surfaceFrosted: blackAlpha[92],
  line: ink[300],
  lineStrong: ink[400],
  lineSoft: whiteAlpha[6],
  text: primitives.white,
  textMuted: ink[800],
  textDim: ink[700],
  textInverse: primitives.black,
  accent: primitives.red,
  accentDeep: primitives.redBadge,
  /** Rouge relevé pour du texte sur noir (contraste AA). */
  accentOnDark: '#FF3B4E',
  /** Texte posé sur une plaque rouge (affiches, prix). */
  onAccent: primitives.white,
  /** États : à jour / valide, impayé / expiré. */
  positive: '#3DDC84',
  negative: '#FF3B4E',
  warning: '#FFB347',
  brand: primitives.navy,
  brandDeep: primitives.navyDeep,
  focus: '#4DAAFF',
} as const;

/**
 * Couleur par discipline — reprise de bc-plannings pour que l'app, les affiches
 * et les sites parlent la même langue. Teintes de données : une par barre, jamais en fond.
 */
export const discipline = {
  anglaise: '#2F6BFF',
  piedsPoings: '#1E90FF',
  mma: '#E8001C',
  grappling: '#8B5CF6',
  crossTraining: '#10B981',
  hyrox: '#22C55E',
  ladyPunch: '#D946EF',
  educative: '#EF4444',
  baby: '#F97316',
  boxingCamp: '#9F1239',
  accesLibre: '#AAAAAA',
} as const;

/* ------------------------------------------------------------------ */
/* Typographie                                                         */
/* ------------------------------------------------------------------ */

export const fontFamily = {
  display: 'BebasNeue_400Regular',
  text: 'Montserrat_400Regular',
  textMedium: 'Montserrat_500Medium',
  textSemi: 'Montserrat_600SemiBold',
  textBold: 'Montserrat_700Bold',
  textBlack: 'Montserrat_800ExtraBold',
  mono: 'IBMPlexMono_500Medium',
} as const;

/**
 * Échelle en points. Trois tailles par écran, jamais plus.
 * Montserrat : 500 corps, 600 titres moyens, 700 jamais sous 16 pt, 800 réservé aux chiffres d'affiche.
 */
export const fontSize = {
  display1: 72,
  display2: 56,
  display3: 44,
  display4: 34,
  display5: 26,
  title: 20,
  body: 16,
  bodySmall: 15,
  /** Plancher de lisibilité (20/10/2026) : rien sous 13 pt hors barre d'onglets et codes. */
  caption: 13,
  micro: 12,
} as const;

export const lineHeight = {
  display: 0.92,
  tight: 1.15,
  text: 1.45,
} as const;

/** Bebas à 0 au-dessus de 44 pt ; petites tailles légèrement ouvertes (+0,2) ; avant-titres larges. */
export const letterSpacing = {
  display: 0.5,
  displayTight: 0,
  small: 0.2,
  caps: 1.6,
  capsWide: 3.2,
  mono: 0.4,
} as const;

/* ------------------------------------------------------------------ */
/* Espace, rayons, traits                                              */
/* ------------------------------------------------------------------ */

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
  11: 80,
  12: 96,
} as const;

/**
 * Rayons concentriques (20/10/2026, Liquid Glass) : la carte enveloppe ses
 * éléments, chaque niveau intérieur perd 4 à 8 points. La capsule est pleine.
 */
export const radius = {
  none: 0,
  xs: 2,
  sm: 6,
  md: 10,
  control: 12,
  lg: 16,
  tile: 16,
  card: 22,
  xl: 24,
  pill: 999,
} as const;

/** Inclinaisons signature (charte : plaque de prix en parallélogramme à 8°, momentum à 5°). */
export const skew = {
  plate: -8,
  momentum: -5,
} as const;

export const stroke = {
  hair: 0.5,
  thin: 1,
  regular: 1.5,
  bold: 3,
  /** La barre du lower-third (charte) et la seule largeur du rouge en filet. */
  accentBar: 6,
} as const;

/* ------------------------------------------------------------------ */
/* Mouvement — le vocabulaire du ring                                  */
/* ------------------------------------------------------------------ */

/**
 * Durées en millisecondes, nommées par ce qu'elles communiquent.
 *  - jab   : réponse immédiate au doigt (pression, bascule)
 *  - cross : transition locale (carte qui s'ouvre, étiquette qui change)
 *  - round : transition d'écran
 *  - bell  : moment de cérémonie (QR qui apparaît, statistique qui se construit)
 *  - slow  : réservé aux plaques photo (direction C), jamais à l'interface
 * Asymétrie Linear : la pression est instantanée, le relâchement prend `pressOut`.
 */
export const duration = {
  pressIn: 0,
  pressOut: 120,
  jab: 120,
  cross: 220,
  round: 360,
  bell: 640,
  slow: 1000,
} as const;

/**
 * Courbes cubic-bezier [x1, y1, x2, y2].
 * `standard` partout : c'est la répétition qui signe, pas la courbe.
 * `punch` est la courbe la plus répandue de la banque : réservée aux sorties de micro-états.
 */
export const easing = {
  standard: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
  arrive: [0.35, 0, 0, 1],
  punch: [0.16, 1, 0.3, 1],
  glide: [0.33, 1, 0.68, 1],
} as const;

/** Ressorts (react-native-reanimated withSpring). Jamais de rebond. */
export const spring = {
  snappy: { damping: 22, stiffness: 320, mass: 0.9 },
  settle: { damping: 26, stiffness: 180, mass: 1 },
  heavy: { damping: 30, stiffness: 120, mass: 1.4 },
  /** Lourd et raide (Family) : le tiroir du badge, les plaques. */
  glove: { damping: 60, stiffness: 600, mass: 2 },
} as const;

/** Échelles de pression et d'entrée (Rauno) : jamais depuis 0. */
export const scale = {
  press: 0.96,
  pressHard: 0.92,
  enter: 0.96,
  sheet: 0.92,
} as const;

/** Décalage entre éléments d'une liste : 5 images à 60 Hz, 5 éléments au plus. */
export const stagger = {
  step: 83,
  max: 5,
} as const;

/* ------------------------------------------------------------------ */
/* Clubs — vérité du réseau (5 clubs, Balma vendue)                    */
/* ------------------------------------------------------------------ */

export const clubs = [
  { id: 'minimes', nom: 'Minimes', ville: 'Toulouse' },
  { id: 'saint-cyprien', nom: 'Saint-Cyprien', ville: 'Toulouse' },
  { id: 'etats-unis', nom: 'États-Unis', ville: 'Toulouse' },
  { id: 'ramonville', nom: 'Ramonville', ville: 'Ramonville-Saint-Agne' },
  { id: 'portet', nom: 'Portet', ville: 'Portet-sur-Garonne' },
] as const;

export type ClubId = (typeof clubs)[number]['id'];

/* ------------------------------------------------------------------ */
/* Les deux ambiances (20/10/2026) — l'utilisateur choisit à l'entrée   */
/* ------------------------------------------------------------------ */

/**
 * Jetons sémantiques par ambiance. Contrastes WCAG calculés le 20/10/2026
 * (.research/12-ANALYSE-PROTOTYPE-ET-REFONTE-2026-10-20.md §7) : tout texte
 * secondaire ou tertiaire passe 4,5:1 sur son fond, dans les deux thèmes.
 *  - Clair « le tapis » : la toile du ring à midi, l'encre navy des affiches.
 *  - Sombre « la salle » : la salle le soir, navy-nuit, des cartes qui se détachent.
 * Ce qui est posé sur une photo reste clair dans les deux (voile sombre).
 */
export type Scheme = 'light' | 'dark';

export type Theme = {
  scheme: Scheme;
  bg: string;
  bgElevated: string;
  card: string;
  cardAlt: string;
  cardPressed: string;
  line: string;
  lineStrong: string;
  text: string;
  textMuted: string;
  textDim: string;
  textInverse: string;
  primary: string;
  onPrimary: string;
  accent: string;
  accentText: string;
  onAccent: string;
  accentSoft: string;
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
  warning: string;
  brand: string;
  tint: string;
  chip: string;
  glass: string;
  glassBorder: string;
  glassPill: string;
  overlay: string;
  shadowCard: string;
  shadowFloat: string;
  statusBar: 'light' | 'dark';
  photo: { text: string; muted: string; dim: string };
};

const onPhoto = { text: '#F5F5F5', muted: 'rgba(245,245,245,0.86)', dim: 'rgba(245,245,245,0.72)' } as const;

export const themes: Record<Scheme, Theme> = {
  light: {
    scheme: 'light',
    bg: '#F4F2EE',
    bgElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardAlt: '#ECE9E3',
    cardPressed: '#E4E0D8',
    line: 'rgba(32,37,75,0.10)',
    lineStrong: 'rgba(32,37,75,0.18)',
    text: '#10132A',
    textMuted: '#454A66',
    textDim: '#62677F',
    textInverse: '#FFFFFF',
    primary: primitives.navy,
    onPrimary: '#FFFFFF',
    accent: primitives.red,
    accentText: '#D10019',
    onAccent: '#FFFFFF',
    accentSoft: 'rgba(232,0,28,0.09)',
    positive: '#0A7342',
    positiveSoft: 'rgba(10,115,66,0.10)',
    negative: '#C8001A',
    negativeSoft: 'rgba(200,0,26,0.09)',
    warning: '#9A5B00',
    brand: primitives.navy,
    tint: 'rgba(32,37,75,0.07)',
    chip: 'rgba(32,37,75,0.06)',
    glass: 'rgba(255,255,255,0.74)',
    glassBorder: 'rgba(32,37,75,0.09)',
    glassPill: 'rgba(32,37,75,0.08)',
    overlay: 'rgba(16,19,42,0.32)',
    shadowCard: '0px 1px 2px rgba(16,19,42,0.05), 0px 6px 20px rgba(16,19,42,0.06)',
    shadowFloat: '0px 10px 30px rgba(16,19,42,0.14), 0px 2px 6px rgba(16,19,42,0.06)',
    statusBar: 'dark',
    photo: onPhoto,
  },
  dark: {
    scheme: 'dark',
    bg: '#0D1120',
    bgElevated: '#141933',
    card: '#171C30',
    cardAlt: '#1F2540',
    cardPressed: '#262D4C',
    line: 'rgba(245,245,245,0.09)',
    lineStrong: 'rgba(245,245,245,0.16)',
    text: primitives.white,
    textMuted: '#BCC0D4',
    textDim: '#9398B2',
    textInverse: '#10132A',
    primary: primitives.white,
    onPrimary: '#10132A',
    accent: primitives.red,
    accentText: '#FF4D5E',
    onAccent: '#FFFFFF',
    accentSoft: 'rgba(255,77,94,0.14)',
    positive: '#3DDC84',
    positiveSoft: 'rgba(61,220,132,0.14)',
    negative: '#FF4D5E',
    negativeSoft: 'rgba(255,77,94,0.14)',
    warning: '#FFB347',
    brand: primitives.navy,
    tint: 'rgba(245,245,245,0.08)',
    chip: 'rgba(245,245,245,0.08)',
    glass: 'rgba(23,28,48,0.72)',
    glassBorder: 'rgba(245,245,245,0.10)',
    glassPill: 'rgba(245,245,245,0.13)',
    overlay: 'rgba(4,6,14,0.55)',
    shadowCard: '0px 0px 0px rgba(0,0,0,0)',
    shadowFloat: '0px 12px 34px rgba(0,0,0,0.45)',
    statusBar: 'light',
    photo: onPhoto,
  },
};

export const brand = {
  primitives,
  themes,
  ink,
  whiteAlpha,
  blackAlpha,
  color,
  discipline,
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  space,
  radius,
  skew,
  stroke,
  duration,
  easing,
  spring,
  scale,
  stagger,
  clubs,
} as const;

export type Brand = typeof brand;
export default brand;
