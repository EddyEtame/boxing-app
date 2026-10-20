import { StyleSheet, useColorScheme } from 'react-native';

import { themes, type Scheme, type Theme } from '@bc/brand';

import { usePrefs } from '@/state/prefs';

/**
 * Point d'entrée unique du thème dans l'app : tout vient de @bc/brand.
 * Aucune couleur écrite en dur dans un écran : on lit `useTheme()`, et les
 * feuilles de style se déclarent avec `makeStyles((t) => ({ ... }))`, calculées
 * une fois par ambiance.
 */
export {
  blackAlpha,
  clubs,
  discipline,
  duration,
  easing,
  fontFamily,
  fontSize,
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
  themes,
} from '@bc/brand';

export type { ClubId, Scheme, Theme } from '@bc/brand';

/** L'ambiance effective : le choix de l'utilisateur, ou celle du téléphone. */
export function useScheme(): Scheme {
  const appearance = usePrefs((s) => s.appearance);
  const system = useColorScheme();
  if (appearance === 'system') return system === 'dark' ? 'dark' : 'light';
  return appearance;
}

export function useTheme(): Theme {
  return themes[useScheme()];
}

/**
 * Feuilles de style par ambiance, créées une seule fois au chargement du
 * module : le passage clair ↔ sombre ne recrée rien, il change de feuille.
 */
type NamedStyles = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<S extends NamedStyles>(factory: (t: Theme) => S & NamedStyles) {
  // Le `& NamedStyles` donne aux littéraux leur type exact (« row », pas string), comme StyleSheet.create.
  const sheets = { light: StyleSheet.create(factory(themes.light)), dark: StyleSheet.create(factory(themes.dark)) };
  return function useStyles(): Readonly<S> {
    return sheets[useScheme()];
  };
}

/** Hauteur de la capsule d'onglets (hors marge et zone sûre). */
export const TAB_BAR_HEIGHT = 64;

/** Marge latérale de la capsule d'onglets. */
export const TAB_BAR_SIDE = 16;

/** Gouttière de lecture (20/10/2026 : 20 pt, la page respire). */
export const GUTTER = 20;

/** Largeur de lecture maximale sur grand écran (web / tablette). */
export const MAX_CONTENT_WIDTH = 480;
