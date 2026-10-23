import { discipline, duration, easing, radius, space, stagger, themes, type Scheme, type Theme } from '@bc/brand';

/**
 * Les jetons de @bc/brand traduits en variables CSS, calculés une fois au
 * chargement du serveur. Aucune couleur de l'admin n'est écrite à la main
 * ailleurs : si la charte change, l'admin suit l'app.
 *
 * Trois ambiances côté HTML : `light` (le tapis), `dark` (la salle) et
 * `system`, qui suit l'ordinateur par media query — donc aucun éclair de
 * mauvais thème au chargement, et aucun script pour l'éviter. L'attribut
 * peut aussi se poser sur un élément : l'aperçu « téléphone » d'un assistant
 * montre l'app dans l'autre ambiance que celle de l'admin.
 */
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Ce que la charte ne dit pas et que l'admin ajoute : le rail navy, les données, la carte de régularité. */
const EXTRA: Record<Scheme, Record<string, string>> = {
  light: {
    'rail-bg': '#20254B',
    'rail-text': '#F5F5F5',
    'rail-muted': 'rgba(245,245,245,0.66)',
    'rail-line': 'rgba(245,245,245,0.12)',
    'rail-hover': 'rgba(245,245,245,0.08)',
    'rail-active-bg': '#F4F2EE',
    'rail-active-text': '#10132A',
    'chart-bar': '#20254B',
    'chart-bar-soft': 'rgba(32,37,75,0.18)',
    'chart-grid': 'rgba(32,37,75,0.10)',
    'heat-0': 'rgba(32,37,75,0.06)',
    'heat-1': 'rgba(32,37,75,0.28)',
    'heat-2': 'rgba(32,37,75,0.55)',
    'heat-3': 'rgba(32,37,75,0.88)',
    'hatch': 'rgba(32,37,75,0.07)',
    'kbd-bg': '#FFFFFF',
    'scrim': 'rgba(16,19,42,0.42)',
    'field': '#FFFFFF',
    'selection': 'rgba(32,37,75,0.16)',
    'title': '#20254B',
    'card-border': 'rgba(32,37,75,0.07)',
    'warning-soft': 'rgba(154,91,0,0.10)',
    'hover': 'rgba(16,19,42,0.05)',
    'press': 'rgba(16,19,42,0.09)',
  },
  dark: {
    'rail-bg': '#080B16',
    'rail-text': '#F5F5F5',
    'rail-muted': 'rgba(245,245,245,0.62)',
    'rail-line': 'rgba(245,245,245,0.09)',
    'rail-hover': 'rgba(245,245,245,0.06)',
    'rail-active-bg': '#F5F5F5',
    'rail-active-text': '#10132A',
    'chart-bar': '#C9CCDD',
    'chart-bar-soft': 'rgba(245,245,245,0.18)',
    'chart-grid': 'rgba(245,245,245,0.09)',
    'heat-0': 'rgba(245,245,245,0.06)',
    'heat-1': 'rgba(245,245,245,0.26)',
    'heat-2': 'rgba(245,245,245,0.52)',
    'heat-3': 'rgba(245,245,245,0.86)',
    'hatch': 'rgba(245,245,245,0.05)',
    'kbd-bg': '#1F2540',
    'scrim': 'rgba(4,6,14,0.62)',
    'field': '#141933',
    'selection': 'rgba(245,245,245,0.16)',
    'title': '#F5F5F5',
    'card-border': 'rgba(245,245,245,0.08)',
    'warning-soft': 'rgba(255,179,71,0.14)',
    'hover': 'rgba(245,245,245,0.05)',
    'press': 'rgba(245,245,245,0.09)',
  },
};

function block(t: Theme): string {
  const base = Object.entries(t)
    .filter(([k, v]) => typeof v === 'string' && k !== 'scheme' && k !== 'statusBar')
    .map(([k, v]) => `--${kebab(k)}:${v as string}`);
  const extra = Object.entries(EXTRA[t.scheme]).map(([k, v]) => `--${k}:${v}`);
  return [...base, ...extra, `color-scheme:${t.scheme}`].join(';');
}

const ms = (n: number) => `${n}ms`;
const bezier = (b: readonly number[]) => `cubic-bezier(${b.join(',')})`;

function staticTokens(): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(radius)) out.push(`--r-${kebab(k)}:${v}px`);
  for (const [k, v] of Object.entries(space)) out.push(`--s-${k}:${v}px`);
  for (const [k, v] of Object.entries(duration)) out.push(`--d-${kebab(k)}:${ms(v)}`);
  for (const [k, v] of Object.entries(easing)) out.push(`--e-${kebab(k)}:${bezier(v)}`);
  for (const [k, v] of Object.entries(discipline)) out.push(`--disc-${kebab(k)}:${v}`);
  out.push(`--stagger:${ms(stagger.step)}`, '--red:#E8001C', '--navy:#20254B', '--focus:#4DAAFF');
  return out.join(';');
}

export const THEME_CSS = [
  `:root{${staticTokens()}}`,
  `:root,[data-theme=light],[data-theme=system]{${block(themes.light)}}`,
  `[data-theme=dark]{${block(themes.dark)}}`,
  `@media (prefers-color-scheme:dark){[data-theme=system]{${block(themes.dark)}}}`,
].join('\n');

export type ThemePref = 'light' | 'dark' | 'system';
export const THEME_COOKIE = 'bca_theme';

export function parseThemePref(value: string | undefined): ThemePref {
  return value === 'light' || value === 'dark' ? value : 'system';
}
