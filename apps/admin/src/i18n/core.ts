/**
 * Le texte de l'admin : français d'abord, anglais disponible (décision du
 * 17/10/2026). Mêmes règles d'écriture que l'app (apps/mobile/src/i18n/fr.ts) :
 *  - apostrophe typographique ’ ;
 *  - espace insécable avant « : » et dans « » ; espace fine avant « ? ! ; »,
 *    posées ici automatiquement pour qu'un signe ne parte jamais seul à la ligne ;
 *  - `{n:séance|séances}` accorde selon le nombre (0 et 1 au singulier en français).
 * L'admin vouvoie, comme le panneau de la boutique ; l'app tutoie ses adhérents.
 */
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = 'bca_lang';

export type Vars = Record<string, string | number | undefined | null>;

const NBSP = ' ';
const THIN = ' ';

/** La typographie française, appliquée aux textes de l'admin et proposée pour les contenus. */
export function frTypo(input: string): string {
  return input
    .replace(/(\S)'(?=\S)/g, '$1’')
    .replace(/« ?/g, `«${NBSP}`)
    .replace(/ ?»/g, `${NBSP}»`)
    .replace(/ +:(?=\s|$)/g, `${NBSP}:`)
    .replace(/ +([;!?])/g, `${THIN}$1`);
}

/** Combien de corrections la typographie ferait (montré dans l'aperçu des assistants). */
export function frTypoChanges(input: string): number {
  const fixed = frTypo(input);
  let n = 0;
  const len = Math.max(fixed.length, input.length);
  for (let i = 0; i < len; i++) if (fixed[i] !== input[i]) n++;
  return n;
}

function isSingular(locale: Locale, n: number): boolean {
  const a = Math.abs(n);
  return locale === 'fr' ? a < 2 : a === 1;
}

const numberFormats = new Map<string, Intl.NumberFormat>();
export function formatNumber(locale: Locale, n: number, digits = 0): string {
  const key = `${locale}|${digits}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    numberFormats.set(key, f);
  }
  return f.format(n);
}

/** `{nom}` et `{n:un|plusieurs}` ; les nombres sont mis en forme selon la langue. */
export function format(locale: Locale, template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)(?::([^|}]*)\|([^}]*))?\}/g, (whole, name: string, one?: string, other?: string) => {
    const value = vars[name];
    if (one !== undefined && other !== undefined) {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) && isSingular(locale, n) ? one : other;
    }
    if (value === undefined || value === null) return whole;
    return typeof value === 'number' ? formatNumber(locale, value, Number.isInteger(value) ? 0 : 1) : value;
  });
}
