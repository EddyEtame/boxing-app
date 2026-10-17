/**
 * Point d’entrée unique du thème dans l’app : tout vient de @bc/brand.
 * Aucune couleur, aucune taille écrite en dur dans un écran.
 */
export {
  blackAlpha,
  clubs,
  color,
  discipline,
  duration,
  easing,
  fontFamily,
  fontSize,
  ink,
  letterSpacing,
  lineHeight,
  primitives,
  radius,
  scale,
  skew,
  space,
  spring,
  stagger,
  stroke,
  whiteAlpha,
} from '@bc/brand';

export type { ClubId } from '@bc/brand';

/** Hauteur de la barre d’onglets (hors zone sûre). */
export const TAB_BAR_HEIGHT = 64;

/** Largeur de lecture maximale sur grand écran (web / tablette). */
export const MAX_CONTENT_WIDTH = 480;
