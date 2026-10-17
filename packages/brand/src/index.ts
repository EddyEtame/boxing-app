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
  bodySmall: 14,
  caption: 12,
  micro: 11,
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

/** Les angles sont nets : le ring est carré. Les rayons restent petits. */
export const radius = {
  none: 0,
  xs: 2,
  sm: 6,
  md: 10,
  lg: 16,
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

export const brand = {
  primitives,
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
